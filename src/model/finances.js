import {PRODUCTS,ECONOMY,generalHour,productFor} from '../data/commerce.js';
import {hash} from './generator.js';
import {serviceHourlyCost,serviceCapacity} from './service-staff.js';
import {ensureInventory,orderStock,takePortion,maybeAutoOrder,receiveOrders,availableServiceBatches} from './inventory.js';
import {ensureOperations,serviceAvailability,serviceDirt,registerServiceRequest,equipmentRunning,safetyEvents,checkIncidents,physicalServiceAccess} from './operations.js';
import {minute} from '../data/operations-catalog.js';
import {STOCK_PRODUCTS,OPERATIONS_BALANCE} from '../data/operations-catalog.js';
import {KIT_BALANCE} from './kit-lifecycle.js';
export const cashText=value=>Math.round(value).toLocaleString('ru-RU')+' ₽';
export const activeRooms=club=>club.rooms.filter(r=>r.operational||r.status==='running');
export function obligations(club){return club.rooms.filter(r=>r.status==='running').reduce((sum,r)=>sum+(r.run.contract?.wageTotal??0),0);}
export function hourlyCosts(club){
 const count=activeRooms(club).length,runningGuests=club.rooms.filter(r=>r.status==='running').reduce((n,r)=>n+r.run.guests.length,0);
 return{general:generalHour(count),rooms:count*ECONOMY.roomHour,consumables:runningGuests*ECONOMY.consumableHour,equipment:club.layout.objects.filter(i=>i.enabled!==false&&(!club.operations||equipmentRunning(club,i))).reduce((n,i)=>n+(productFor(i).hourly??0),0),serviceStaff:serviceHourlyCost(club)};
}
// Cash still needed to finish existing commitments in the current open/shift
// configuration. Purchases, courses and repairs are already paid: only their
// remaining clock time belongs here, never their purchase price or future sales.
export function reserveEstimate(club,{through=club.clock}={}){
 const now=club.clock,rooms=club.rooms??[],runs=rooms.filter(r=>r.status==='running'&&r.run).map(r=>({room:r,run:r.run}));
 const tasks=(club.operations?.tasks??[]).filter(t=>['active','queued'].includes(t.state));
 const courses=(club.staff??[]).filter(m=>m.training).map(m=>m.training);
 const copies=club.library?.copies??[],deadlines=[now,through];
 const add=time=>{if(Number.isFinite(time)&&time>now)deadlines.push(time);};
 for(const order of club.inventory?.orders??[])if(order.state==='ordered')add(order.dueAt);
 for(const task of tasks){add(task.startsAt);add(task.dueAt);}
 for(const course of courses)add(course.endsAt);
 for(const kit of copies){add(kit.preparingUntil);add(kit.repair?.endsAt);}
 for(const room of rooms)add(room.tablePreparation?.endsAt);
 // One manager collects tables in session-end order, then room order at ties.
 // This is the same free fifteen-minute task that settlement will schedule.
 let preparationEnd=Math.max(now,...rooms.map(r=>r.tablePreparation?.endsAt??now),...copies.map(k=>k.preparingUntil??now));
 for(const {room,run} of runs.toSorted((a,b)=>a.run.endsAt-b.run.endsAt)){
  add(run.endsAt);
  const kit=copies.find(k=>k.id===(run.room?.kitId??room.kitId));
  if(kit&&!kit.usedRunIds?.includes(run.id)){preparationEnd=Math.max(preparationEnd,run.endsAt)+KIT_BALANCE.preparationHours;add(preparationEnd);}
 }
 const until=Math.max(...deadlines.filter(Number.isFinite)),boundaries=[...new Set(deadlines.filter(t=>Number.isFinite(t)&&t>=now&&t<=until))].sort((a,b)=>a-b);
 const active=activeRooms(club).length;
 // Finishing a course can let syncRooms assign its master to a previously
 // closed furnished room. Do not assume income, a specific assignment, or a
 // new purchase: at most one such room per returning master can open. Ignoring
 // compatibility here deliberately over-reserves rather than hiding that cost.
 const closed=rooms.filter(r=>!r.operational&&r.status!=='running'&&r.enabled!==false&&r.layout?.valid).length;
 const shift=serviceHourlyCost(club),segments=[];
 for(let index=0;index<boundaries.length-1;index++){
  const from=boundaries[index],to=boundaries[index+1],hours=to-from;
  const count=active+Math.min(closed,courses.filter(c=>c.endsAt<=from).length);
  const equipment=(club.layout?.objects??[]).reduce((sum,item)=>{
   if(item.enabled===false)return sum;
   const maintenance=tasks.filter(t=>t.itemId===item.id&&['maintenance','repair'].includes(t.type));
   if(maintenance.some(t=>t.startsAt<=from&&t.dueAt>from))return sum;
   const repaired=maintenance.some(t=>t.dueAt<=from);
   const condition=club.operations?.equipment?.[item.id]?.condition??100;
   // A possible future breakdown can only reduce consumption. Keeping a
   // repaired/enabled appliance powered is the conservative cost bound.
   return sum+(repaired||condition>0?(productFor(item)?.hourly??0):0);
  },0);
  const guests=runs.filter(({run})=>run.endsAt>from).reduce((sum,{run})=>sum+run.guests.length,0);
  const costs={general:generalHour(count)*hours,rooms:count*ECONOMY.roomHour*hours,equipment:equipment*hours,serviceStaff:shift*hours,consumables:guests*ECONOMY.consumableHour*hours};
  segments.push({from,to,roomCount:count,...costs,total:Object.values(costs).reduce((sum,n)=>sum+n,0)});
 }
 const wages=obligations(club),operating=segments.reduce((sum,s)=>sum+s.total,0);
 return{total:Math.ceil(wages+operating),wages,operating,through:until,hours:until-now,segments};
}
export const reserveRequired=(club,options)=>reserveEstimate(club,options).total;
export function recordMoney(club,amount,kind,text,{id,details}={}){
 if(!Number.isFinite(amount)||!amount)return false;
 const ledgerId=id??`entry-${club.finance.nextId++}`;if(club.finance.ledger.some(e=>e.id===ledgerId))return false;
 club.finance.cash=Math.round((club.finance.cash+amount)*100)/100;
 club.finance.ledger.push({id:ledgerId,clock:club.clock,amount:Math.round(amount*100)/100,kind,text,...(details?{details}:{} )});return true;
}
export function stockCost(item,quantity){return (productFor(item).unitCost??0)*quantity;}
export function restock(club,itemId,quantity=20){return orderStock(club,itemId,quantity);}
export function serviceAt(club,time=club.clock){
 ensureOperations(club);let sales=0,portions=0;const uses=[],capacity=new Map();
 const tickId='service-requests-'+minute(time);if(club.operations.processedEventIds.includes(tickId))return{sales,portions,uses};club.operations.processedEventIds.push(tickId);
 const hour=Math.floor(time),guests=club.guests.filter(guest=>{
  const room=club.rooms.find(r=>r.id===guest.roomId);return room?.status==='running'?room.run.endsAt>time:guest.schedule.leaveAt>time;
 }).toSorted((a,b)=>a.id.localeCompare(b.id));
 for(const guest of guests){
  const prefs=guest.preferences?.comfort??{},drink=prefs.drink??['water','tea','coffee','none'][hash(guest.id+'|drink')%4],wanted=[];
  if(drink!=='none'&&hash(`${club.seed}|service|${guest.id}|${hour}|drink`)%1000<(drink==='water'?1000:400))wanted.push(drink);
  if(prefs.cold&&hash(`${club.seed}|service|${guest.id}|${hour}|cold`)%1000<400)wanted.push('cold');
  if(prefs.snack&&hash(`${club.seed}|service|${guest.id}|${hour}|snack`)%1000<225)wanted.push('cookie');
  for(const service of wanted){
   const useId=`${guest.id}|${hour}|${service}`;if(club.finance.serviceIds.includes(useId))continue;
   const items=club.layout.objects.filter(i=>productFor(i)?.service===service).toSorted((a,b)=>a.id.localeCompare(b.id));
   for(const candidate of items)if(candidate.serviceEnabled!==false&&physicalServiceAccess(club,candidate.id).ok)registerServiceRequest(club,candidate,guest);
   const probability=service==='water'?1:service==='cookie'?.225:.4,life=STOCK_PRODUCTS[service].openedLife??STOCK_PRODUCTS[service].life,arrival=time+OPERATIONS_BALANCE.deliveryHours;
   const forecast=guests.filter(g=>service==='cookie'?g.preferences?.comfort?.snack:service==='cold'?g.preferences?.comfort?.cold:(g.preferences?.comfort?.drink??'none')===service).reduce((n,g)=>{const playing=club.rooms.find(r=>r.id===g.roomId&&r.status==='running');return n+Math.max(0,Math.min(arrival+life,playing?.run.endsAt??g.schedule.leaveAt)-arrival)*probability;},0);
   for(const candidate of items)if(serviceAvailability(club,candidate).ok)maybeAutoOrder(club,candidate,forecast);
   const item=items.find(i=>serviceAvailability(club,i).ok&&(capacity.get(i.id)??0)<serviceCapacity(club,productFor(i).capacity,i.id)&&availableServiceBatches(club,i,time).length);
   if(!item)continue;const portion=takePortion(club,item,time);if(!portion)continue;
   const p=productFor(item);capacity.set(item.id,(capacity.get(item.id)??0)+1);club.finance.serviceIds.push(useId);
   const price=p.salePrice??0;if(price){recordMoney(club,price,'cafe',`${guest.profile.name}: ${service==='coffee'?'кофе':'напиток'}`,{id:'service-'+useId,details:{batchId:portion.batchId,unitCost:portion.unitCost}});sales+=price;}
   serviceDirt(club,item);portions++;uses.push({guestId:guest.id,service,itemId:item.id,hour,clock:time,...portion});
  }
 }
 return{sales,portions,uses};
}
// Compatibility helper for callers inspecting service only. The live game advances
// through event-clock, which also integrates costs, wear, safety and session ends.
export function serviceInterval(club,from,to){
 ensureOperations(club);const savedClock=club.clock,result={sales:0,portions:0,uses:[]};
 for(let time=Math.ceil(from);time<to;time++){
  club.clock=time;receiveOrders(club);safetyEvents(club);checkIncidents(club);const served=serviceAt(club,time);result.sales+=served.sales;result.portions+=served.portions;result.uses.push(...served.uses);
 }
 club.clock=savedClock;return result;
}
export function chargeInterval(club,from,to){
 ensureOperations(club);const costs=hourlyCosts(club),hours=Math.max(0,to-from),details={...Object.fromEntries(Object.entries(costs).map(([k,v])=>[k,v*hours])),hours};
 const id=`operations-${minute(from)}-${minute(to)}`;
 if(club.finance.ledger.some(e=>e.id===id))return{...Object.fromEntries(Object.keys(details).map(k=>[k,0])),total:0};
 const exact=Object.values(costs).reduce((n,v)=>n+v,0)*hours+club.operations.financeCarry,total=Math.round((exact+Number.EPSILON)*100)/100;
 club.operations.financeCarry=exact-total;
 recordMoney(club,-total,'operations','Содержание клуба и расходники',{id,details});
 return{...details,total};
}
export function settlementFor(run,review){
 const hours=run.endsAt-run.startedAt,price=run.contract?.guestPrice??hours*ECONOMY.guestHour;
 const paid=review.score>=ECONOMY.payThreshold?price:0;
 const useful=Boolean(review.comfort?.helped?.length),chance=review.score>=7?Math.min(.5,(review.score-6)*.1+(useful?.1:0)):0;
 const draw=run.contract?.tipRolls?.[review.guestId]??1,tips=paid&&draw<chance?Math.round(price*.1):0;
 return{price,payment:paid,tips,chance,draw,paid:Boolean(paid)};
}
export function settleRun(club,run,reviews){
 if(club.finance.settledRuns.includes(run.id))return null;
 const results=reviews.map(review=>({...review,financial:settlementFor(run,review)}));
 const payments=results.reduce((n,r)=>n+r.financial.payment,0),tips=results.reduce((n,r)=>n+r.financial.tips,0),wages=run.contract?.wageTotal??0;
 recordMoney(club,payments,'session','Оплата гостей',{id:'payment-'+run.id});recordMoney(club,tips,'tips','Чаевые гостей',{id:'tips-'+run.id});
 recordMoney(club,-wages,'wage',`Мастер ${run.room.master.name}: ${run.endsAt-run.startedAt} ч`,{id:'wage-'+run.id});
 club.finance.settledRuns.push(run.id);
 return{reviews:results,payments,tips,wages,paidCount:results.filter(r=>r.financial.paid).length};
}
