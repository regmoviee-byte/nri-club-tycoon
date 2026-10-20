import {PRODUCTS,gameProduct,availableMasterCandidates} from '../data/commerce.js';
import {BUILD_CATALOG,WALL_PRICES,FLOOR_PRICES} from '../data/build-catalog.js';
import {createStarterLayout,roomReadiness,validateLayout,edgeKey,objectCells,roomPurpose} from './layout.js';
import {shelfCapacity} from './layout-club.js';
import {canHireStaff,validateStaffCapacity,staffRoomStatus} from './staff-room.js';
import {writeOffBatch,batchUsable} from './inventory.js';
import {kitSalvage,kitStatus,ensureKits} from './kit-lifecycle.js';
import {resolveIncidents} from './operations.js';
import {recordMoney} from './finances.js';
import {hash} from './generator.js';

const clone=value=>structuredClone(value),round=n=>Math.round(n*100)/100;
const price=item=>item.price??BUILD_CATALOG[item.kind].price,salvage=item=>Math.floor(price(item)*.6);
const running=club=>club.rooms.some(r=>r.status==='running');
function resources(club){
 const result=[];
 for(const master of club.staff.filter(m=>!m.training)){
  for(const kit of club.library.copies)if(master.known.includes(kit.systemId)&&kitStatus(club,kit.id).ok)result.push({master,kit,cost:0,newMaster:false,newKit:false});
  for(const system of master.known){const p=gameProduct(system);if(p)result.push({master,kit:{id:`recovery-kit-${club.library.nextId}`,systemId:system,price:p.price},cost:p.price,newMaster:false,newKit:true});}
 }
 // Recruitment remains a real purchase, including the useful case where the
 // club already owns a game but has no free master who knows it.
 const candidates=canHireStaff(club)?availableMasterCandidates(club):[];
 for(const master of candidates){
  for(const kit of club.library.copies)if(master.known.includes(kit.systemId)&&kitStatus(club,kit.id).ok)result.push({master,kit,cost:master.fee,newMaster:true,newKit:false});
  for(const system of master.known){const game=gameProduct(system);if(game)result.push({master,kit:{id:`recovery-kit-${club.library.nextId}`,systemId:game.id,price:game.price},cost:game.price+master.fee,newMaster:true,newKit:true});}
 }
 return result;
}
export function liquidationValue(club){return round(club.layout.objects.reduce((s,o)=>s+salvage(o),0)+club.layout.walls.reduce((s,w)=>s+WALL_PRICES[w.kind]*.5,0)+club.layout.floors.reduce((s,f)=>s+FLOOR_PRICES[f.finish]*.5,0)+club.library.copies.reduce((s,k)=>s+kitSalvage(k),0));}
function perimeter(room){
 const inside=new Set(room.cells.map(c=>`${c.x},${c.y}`)),edges=new Map();
 for(const c of room.cells)for(const [dx,dy,axis,x,y] of [[-1,0,'v',c.x,c.y],[1,0,'v',c.x+1,c.y],[0,-1,'h',c.x,c.y],[0,1,'h',c.x,c.y+1]])if(!inside.has(`${c.x+dx},${c.y+dy}`)){const edge={axis,x,y};edges.set(edgeKey(edge),edge);}
 return [...edges.values()];
}
function templates(club){
 const result=[];
 for(const zone of club.layout.rooms.filter(r=>roomPurpose(r)==='game')){
  const ready=roomReadiness(club.layout,zone.id);if(!ready.ok)continue;
  const items=club.layout.objects.filter(o=>o.roomId===zone.id),table=items.find(o=>BUILD_CATALOG[o.kind].family==='table'),light=items.find(o=>BUILD_CATALOG[o.kind].family==='light');
  result.push({room:clone(zone),objects:[table,...ready.seats,ready.master,light].map(clone)});
 }
 for(const [index,plot] of club.layout.plots.entries()){
  const old=club.rooms[index]??club.rooms[0],id=old?.id??'room-1',part=createStarterLayout(id);
  result.push({room:{...part.rooms[0],number:old?.number??1,name:`Комната ${old?.number??1}`,cells:part.rooms[0].cells.map(c=>({x:c.x+plot.x,y:c.y+plot.y}))},objects:part.objects.map(o=>({...o,x:o.x+plot.x,y:o.y+plot.y}))});
 }
 return result;
}
function minimumFurniture(club,template){
 const staffRooms=new Set(club.layout.rooms.filter(r=>roomPurpose(r)==='staff').map(r=>r.id));
 const pendingStorage=new Set((club.inventory?.orders??[]).filter(o=>o.state==='ordered').map(o=>o.location));
 let preserved=club.layout.objects.filter(o=>staffRooms.has(o.roomId)||pendingStorage.has(o.id));
 const staffTarget=Math.min(staffRoomStatus(club).physicalCapacity,Math.max(1,club.staff.length));
 for(const seat of preserved.filter(o=>BUILD_CATALOG[o.kind].family==='staffSeat').toSorted((a,b)=>salvage(b)-salvage(a))){
  const trial={...club,layout:{...club.layout,objects:club.layout.objects.filter(o=>o.id!==seat.id&&!club.layout.objects.some(p=>staffRooms.has(p.roomId)&&p.id===o.id&&!preserved.some(k=>k.id===p.id)))}};
  if(staffRoomStatus(trial).physicalCapacity>=staffTarget)preserved=preserved.filter(o=>o.id!==seat.id);
 }
 const shelf=club.layout.objects.filter(o=>BUILD_CATALOG[o.kind].family==='shelf').sort((a,b)=>salvage(a)-salvage(b))[0];
 if(shelf&&!preserved.some(o=>o.id===shelf.id))preserved.push(shelf);
 const kept=new Set(preserved.map(o=>o.id)),objects=preserved.map(o=>{
  const object=clone(o);if(!staffRooms.has(o.roomId)){
   if(template.room.cells.some(c=>objectCells(o).some(x=>x.x===c.x&&x.y===c.y)))object.roomId=template.room.id;else delete object.roomId;
  }return object;
 }),entries=[];let cost=0;
 for(const target of template.objects){
  const family=BUILD_CATALOG[target.kind].family,basic=family==='table'?'table':family==='chair'?'chair':'light';
  const choices=club.layout.objects.filter(o=>!kept.has(o.id)&&BUILD_CATALOG[o.kind].family===family&&BUILD_CATALOG[o.kind].width===BUILD_CATALOG[basic].width&&BUILD_CATALOG[o.kind].height===BUILD_CATALOG[basic].height).sort((a,b)=>salvage(a)-salvage(b));
  const best=choices[0];
  if(best&&salvage(best)<=BUILD_CATALOG[basic].price){
   kept.add(best.id);const object={...clone(best),x:target.x,y:target.y,rotation:target.rotation,roomId:template.room.id,enabled:true};
   delete object.role;delete object.seat;if(target.role)object.role=target.role;if(target.seat!==undefined)object.seat=target.seat;objects.push(object);
   entries.push({name:BUILD_CATALOG[best.kind].name,action:'move',cost:0,refund:0});
  }else{
   const object={...clone(target),id:`restored-${template.room.id}-${objects.length}`,kind:basic,price:BUILD_CATALOG[basic].price,enabled:true,stock:0,autoRefill:false};objects.push(object);cost+=object.price;entries.push({name:BUILD_CATALOG[basic].name,action:'buy',cost:object.price,refund:0});
  }
 }
 return {objects,kept,cost,entries};
}
function wallPlan(club,edges,doorKey){
 const protectedKeys=new Set(club.layout.rooms.filter(r=>roomPurpose(r)==='staff').flatMap(r=>perimeter(r).map(edgeKey)));
 const prior=new Map(club.layout.walls.map(w=>[edgeKey(w),w])),wanted=new Set([...edges.map(edgeKey),...protectedKeys]),walls=club.layout.walls.filter(w=>protectedKeys.has(edgeKey(w))&&!edges.some(e=>edgeKey(e)===edgeKey(w))).map(clone);let cost=0,refund=0;
 for(const old of club.layout.walls)if(!wanted.has(edgeKey(old)))refund+=WALL_PRICES[old.kind]*.5;
 for(const edge of edges){
  const key=edgeKey(edge),old=prior.get(key),kind=protectedKeys.has(key)&&old?old.kind:key===doorKey?(old?.kind==='wideDoor'?'wideDoor':'door'):'wall';
  if(old){
   if(old.kind!==kind){cost+=WALL_PRICES[kind]-80;refund+=(WALL_PRICES[old.kind]-80)*.5;}
   walls.push({...clone(old),kind});
  }else {cost+=WALL_PRICES[kind];walls.push({...edge,id:`restored-wall-${edge.axis}-${edge.x}-${edge.y}`,kind});}
 }
 return {walls,cost,refund};
}
export function findRecoveryPlan(club){
 if(running(club)||club.rooms.some(r=>r.tablePreparation?.endsAt>club.clock)||club.library.copies.some(k=>k.repair)||club.operations?.tasks.some(t=>['active','queued'].includes(t.state)))return null;
 const staffZones=club.layout.rooms.filter(r=>roomPurpose(r)==='staff'),staffCells=new Set(staffZones.flatMap(r=>r.cells.map(c=>`${c.x},${c.y}`)));
 const keptFloors=[]; // Floor finishes are cosmetic in both room purposes.
 const choices=resources(club),floorRefund=club.layout.floors.reduce((s,f)=>s+FLOOR_PRICES[f.finish]*.5,0),owned=new Set(club.layout.plots.flatMap(p=>Array.from({length:p.w*p.h},(_,i)=>`${p.x+i%p.w},${p.y+Math.floor(i/p.w)}`)));
 let best=null;
 for(const template of templates(club)){
  const assets=minimumFurniture(club,template),furnitureRefund=club.layout.objects.filter(o=>!assets.kept.has(o.id)).reduce((s,o)=>s+salvage(o),0),edges=perimeter(template.room);
  const boundaryDoors=edges.filter(edge=>{const [a,b]=edge.axis==='h'?[[edge.x,edge.y-1],[edge.x,edge.y]]:[[edge.x-1,edge.y],[edge.x,edge.y]];return owned.has(`${a[0]},${a[1]}`)&&owned.has(`${b[0]},${b[1]}`);});
  for(const door of boundaryDoors){
   const structure=wallPlan(club,edges,edgeKey(door)),layout={...clone(club.layout),revision:club.layout.revision+1,floors:clone(keptFloors),walls:structure.walls,rooms:[clone(template.room),...clone(staffZones)],objects:assets.objects};
   if(!validateLayout(layout).ok||!roomReadiness(layout,template.room.id).ok)continue;
   const physicalStaff=staffRoomStatus({...club,layout}),storageCapacity=shelfCapacity(layout);
   for(const r of choices){
    if(physicalStaff.capacity<club.staff.length+Number(r.newMaster)||r.newMaster&&physicalStaff.physicalCapacity<=club.staff.length)continue;
    // A migrated shelf deficit may remain, but a new copy cannot create one.
    if(storageCapacity<Math.min(1,shelfCapacity(club.layout))||storageCapacity<1&&(r.newKit||!club.library.copies.length))continue;
    const gamesRefund=club.library.copies.filter(k=>r.newKit||k.id!==r.kit.id).reduce((s,k)=>s+kitSalvage(k),0),refund=round(floorRefund+furnitureRefund+structure.refund+gamesRefund),cost=round(assets.cost+structure.cost+r.cost),cash=round(club.finance.cash+refund-cost);
    if(cash<0||best&&cash<=best.cash)continue;
    const table=layout.objects.find(o=>BUILD_CATALOG[o.kind].family==='table');
    const writeOffs=(club.inventory?.batches??[]).filter(b=>b.remaining&&!assets.kept.has(b.location)).map(b=>({batchId:b.id,quantity:b.remaining,loss:round(b.remaining*b.unitCost)}));
    best={id:`recovery-${club.layout.revision}-${club.finance.nextId}-${template.room.id}-${door.axis}-${door.x}-${door.y}`,label:'Сохранить одну рабочую комнату и погасить долг',layout,roomId:template.room.id,tableId:table.id,master:clone(r.master),kit:clone(r.kit),newMaster:r.newMaster,newKit:r.newKit,writeOffs,refund,cost,cash,balanceAfter:cash,baseCash:club.finance.cash,baseRevision:club.layout.revision,baseLedgerId:club.finance.nextId,soldItems:club.layout.objects.filter(o=>!assets.kept.has(o.id)).length,soldGames:club.library.copies.filter(k=>r.newKit||k.id!==r.kit.id).length,
     items:[...assets.entries,...writeOffs.map(w=>({name:`Списать ${w.quantity} порций перед продажей хранения; закупочная потеря ${w.loss} ₽, без повторного платежа`,action:'write-off',cost:0,refund:0})),...club.layout.objects.filter(o=>!assets.kept.has(o.id)).map(o=>({name:BUILD_CATALOG[o.kind].name,action:'sell',refund:salvage(o),cost:0})),...club.library.copies.filter(k=>r.newKit||k.id!==r.kit.id).map(k=>({name:gameProduct(k.systemId).name,action:'sell',refund:kitSalvage(k),cost:0})),{name:'Пол и стены',action:'demolish',refund:round(floorRefund+structure.refund),cost:structure.cost},...(r.cost?[{name:r.newMaster?'Игра и приглашение мастера':'Игровой комплект',action:'buy',cost:r.cost,refund:0}]:[])]};
   }
  }
 }
 if(best){
  // The public confirmation carries only this ID: bind it to the complete
  // quoted plan and time-sensitive stock, not the optional ledger counter.
  const fingerprint=JSON.stringify({plan:best,clock:club.clock,inventory:club.inventory,operations:club.operations});
  best.id+=`-${hash(fingerprint).toString(36)}-${hash('recovery|'+fingerprint).toString(36)}`;
 }
 return best;
}
export function canProveInsolvent(club){
 if(running(club)||club.finance.cash>=0)return false;
 // Already-paid deliveries and repairs may still produce value, and queued
 // work may be refundable. Resolve these finite tasks before declaring
 // irreversible bankruptcy; table preparation also has a known deadline.
 if(club.inventory?.orders.some(order=>order.state==='ordered')||club.library.copies.some(kit=>kit.repair)||club.operations?.tasks.some(task=>['active','queued'].includes(task.state))||club.rooms.some(room=>room.tablePreparation?.endsAt>club.clock))return false;
 // An optimistic resource bound is a proof only when even it cannot pay the
 // debt. Coordinates and staff knowledge are deliberately relaxed here.
 let minimum=0;const used=new Set();
 for(const [family,count,basic] of [['table',1,'table'],['chair',5,'chair'],['light',1,'light']])for(let i=0;i<count;i++){
  const piece=club.layout.objects.filter(o=>!used.has(o.id)&&BUILD_CATALOG[o.kind].family===family).sort((a,b)=>salvage(a)-salvage(b))[0];
  if(piece&&salvage(piece)<=BUILD_CATALOG[basic].price){used.add(piece.id);minimum+=salvage(piece);}else minimum+=BUILD_CATALOG[basic].price;
 }
 minimum+=Math.min(900,...club.library.copies.map(kitSalvage));
 // A paid training course can finish while the club is closed. Treating that
 // existing employee as absent would falsely add a recruitment obligation.
 if(!club.staff.length)minimum+=400;
 // Base wall segments survive an addon downgrade at foregone salvage 40.
 // Counting a window as an indivisible 165-ruble segment causes false defeat.
 const door=club.layout.walls.some(w=>['door','wideDoor'].includes(w.kind));
 minimum+=door?140:club.layout.walls.length?240:280;
 const remaining=Math.max(0,club.layout.walls.length-(door?1:0));minimum+=Math.min(19,remaining)*40+Math.max(0,19-remaining)*80;
 // Paid coffee/drink stock can still earn money before its dispenser is sold.
 // Gross revenue is an optimistic bound, not a payment or a guarantee of
 // demand. Ignore future upkeep here so the impossibility proof stays safe.
 const stockRevenue=club.inventory?club.inventory.batches.filter(b=>batchUsable(b,club.clock)).reduce((sum,b)=>sum+b.remaining*(b.sku==='coffee'?30:b.sku==='cold'?35:0),0):club.layout.objects.reduce((sum,item)=>sum+(item.stock??0)*(PRODUCTS[item.kind]?.salePrice??0),0);
 return round(club.finance.cash+liquidationValue(club)+stockRevenue-minimum)<0;
}
export function applyRecoveryPlan(club,plan){
 if(!plan||plan.cash<0||running(club))throw new Error('План сокращения клуба недоступен.');
 const check=findRecoveryPlan(club);if(!check||JSON.stringify(check)!==JSON.stringify(plan))throw new Error('План нужно пересчитать после изменений.');
 const previous=club.rooms.find(r=>r.id===plan.roomId)??club.rooms[0];
 for(const disposal of plan.writeOffs??[]){const result=writeOffBatch(club,disposal.batchId,disposal.quantity);if(!result.ok)throw new Error(result.reason);}resolveIncidents(club);
 recordMoney(club,plan.refund,'sale','Продано лишнее имущество для погашения долга',{id:`recovery-sale-${plan.id}`});recordMoney(club,-plan.cost,'restoration','Восстановлена одна рабочая комната',{id:`recovery-cost-${plan.id}`});
 club.layout=clone(plan.layout);
 for(const person of club.serviceStaff??[]){person.onShift=false;person.assignment=null;}
 if(!club.staff.some(m=>m.id===plan.master.id)){club.staff.push(clone(plan.master));club.personnelArchive=(club.personnelArchive??[]).filter(m=>m.id!==plan.master.id);}
 const staffing=validateStaffCapacity(club);if(!staffing.ok)throw new Error(staffing.reason);
 club.library.copies=[clone(plan.kit)];if(plan.newKit)club.library.nextId++;ensureKits(club);
 const product=gameProduct(plan.kit.systemId);if(!club.library.adventures.includes(product.baseAdventure))club.library.adventures.push(product.baseAdventure);
 for(const guest of club.guests){guest.roomId=null;guest.seat=null;}
 club.rooms=[{...clone(previous),id:plan.roomId,tableId:plan.tableId,masterId:plan.master.id,kitId:plan.kit.id,adventureId:product.baseAdventure,hours:2,capacity:4,enabled:true,status:'seating',run:null}];
}
