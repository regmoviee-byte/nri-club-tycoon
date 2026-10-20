import {OPERATIONS_BALANCE as B,STOCK_PRODUCTS,minute,hour} from '../data/operations-catalog.js';
import {chargeInterval,serviceAt} from './finances.js';
import {receiveOrders,storageCold} from './inventory.js';
import {ensureOperations,integrateOperations,safetyEvents,finishOperationTasks,checkIncidents,equipmentRunning} from './operations.js';
import {kitDeadlines,finishKitTasks} from './kit-lifecycle.js';
import {guestFlowBoundary} from './guest-flow.js';

function nextBoundary(club,target){
 const now=minute(club.clock),times=[minute(target),(Math.floor(now/60)+1)*60],add=t=>{const m=minute(t);if(m>now)times.push(m);};
 for(const batch of club.inventory.batches)if(batch.remaining&&batch.state==='usable'){
  add(batch.expiresAt);add(batch.expiresAt-B.warningHours);
  if(batch.sku==='cold'&&!storageCold(club,club.layout.objects.find(i=>i.id===batch.location)))add(club.clock+Math.max(1,STOCK_PRODUCTS.cold.warmLimit*60-batch.warmMinutes)/60);
 }
 for(const order of club.inventory.orders)if(order.state==='ordered')add(order.dueAt);
 for(const task of club.operations.tasks)if(['active','queued'].includes(task.state)){add(task.startsAt);add(task.dueAt);}
 for(const incident of club.operations.incidents)if(incident.state==='open')add(incident.deadline);
 for(const item of club.layout.objects){const state=club.operations.equipment[item.id];if(state&&equipmentRunning(club,item)){add(club.clock+state.condition/B.wearPerHour);if(state.condition>B.wearWarning)add(club.clock+(state.condition-B.wearWarning)/B.wearPerHour);}}
 for(const master of club.staff)if(master.training)add(master.training.endsAt);
 for(const deadline of kitDeadlines(club))add(deadline);
 for(const room of club.rooms)if(room.status==='running')add(room.run.endsAt);
 add(guestFlowBoundary(club));
 for(const guest of club.guests)add(guest.schedule.leaveAt);
 for(const [zoneId,state] of Object.entries(club.operations.zones)){
  const count=club.guests.filter(g=>(g.roomId??'common')===zoneId&&(club.rooms.some(r=>r.id===g.roomId&&r.status==='running')||g.schedule.leaveAt>club.clock)).length;
  if(count)for(const threshold of [60,40,20])if(state.cleanliness>=threshold)add(club.clock+(Math.floor((state.cleanliness-threshold)/count*60)+1)/60);
 }
 if(club.layout.objects.some(i=>i.serviceEnabled!==false&&equipmentRunning(club,i)&&['water','kettle','coffee','coffeeAuto','cookies','fridge'].includes(i.kind)))add(club.clock+club.operations.nextInspectionHours-club.operations.serviceHours);
 return hour(Math.min(...times.filter(t=>t>now)));
}

/** Advance one atomic draft. Public campaign transactions persist this whole draft.
 * All domain timestamps retain legacy hours; only integer minute ticks choose bounds.
 * Interval costs use a saved sub-cent carry. Session callbacks own contract settlement.
 */
export function advanceEventClock(club,target,{progressInterval=()=>{},settleSessions=()=>{},afterTimestamp=()=>{}}={}){
 ensureOperations(club);if(!Number.isFinite(target)||minute(target)<minute(club.clock))throw new Error('Нельзя перевести часы назад.');
 const from=club.clock,result={from,to:from,stopped:false,reason:null,operations:{general:0,rooms:0,consumables:0,equipment:0,serviceStaff:0,total:0,hours:0},services:{sales:0,portions:0,uses:[]},events:[]};
 const eventStart=club.operations.events.length;
 function processTimestamp({requests=true}={}){
  const warningStart=club.operations.warnings.length;
  safetyEvents(club);finishOperationTasks(club);finishKitTasks(club);settleSessions(club.clock);
  result.events.push(...receiveOrders(club));checkIncidents(club);
  const tick=minute(club.clock),serviceId='service-tick-'+tick;
  if(requests&&tick%60===0&&!club.operations.processedEventIds.includes(serviceId)){
   club.operations.processedEventIds.push(serviceId);const served=serviceAt(club,club.clock);
   result.services.sales+=served.sales;result.services.portions+=served.portions;result.services.uses.push(...served.uses);
   for(const room of club.rooms.filter(r=>r.status==='running')){
    const exposure=club.activity[room.run.id]??={noiseHours:0,services:[]};exposure.services.push(...served.uses.filter(use=>room.run.guests.some(g=>g.id===use.guestId)));
   }
  }
  // A service may cross a cleanliness threshold. Its warning belongs to this same tick.
  safetyEvents(club);afterTimestamp(club.clock);
  const warning=club.operations.warnings.slice(warningStart).find(n=>n.important);
  if(warning){result.stopped=true;result.reason=warning.text;result.warning=warning;}
 }
 // The current boundary was already reached before this command. A new click
 // must not invent an extra hourly request without any elapsed game time.
 processTimestamp({requests:false});
 let guard=0;
 while(!result.stopped&&minute(club.clock)<minute(target)){
  if(++guard>100000)throw new Error('Слишком большой переход времени.');
  const before=club.clock,next=nextBoundary(club,target);
  // Charge the old equipment/room state over [before,next), before any boundary changes.
  const costs=chargeInterval(club,before,next);for(const key of Object.keys(result.operations))result.operations[key]+=costs[key]??0;
  integrateOperations(club,before,next);progressInterval(before,next);club.clock=next;processTimestamp();
 }
 result.to=club.clock;result.events.push(...club.operations.events.slice(eventStart));return result;
}
