import {productFor} from '../data/commerce.js';
import {OPERATIONS_BALANCE as B,STOCK_PRODUCTS,minute} from '../data/operations-catalog.js';
import {recordMoney,reserveRequired} from './finances.js';
import {ensureInventory,validateInventory,storageCold,batchUsable,availableServiceBatches,syncStockMirrors,orderStock,cancelStockOrder,isolateBatch,writeOffBatch,moveBatch,inventoryStorageBlocker} from './inventory.js';
import {physicalServiceAccess} from './staff-room.js';
import {assignServiceStaff} from './service-staff.js';
export {physicalServiceAccess} from './staff-room.js';

const fail=reason=>({ok:false,reason});
const itemFor=(club,id)=>club.layout.objects.find(item=>item.id===id);
const maintained=item=>['coffee','cold'].includes(productFor(item)?.service);
const at=(club,id)=>club.operations.equipment[id];
export const zoneForItem=(club,item)=>item?.roomId??club.layout.rooms.find(r=>r.cells.some(c=>(typeof c==='string'?c:`${c.x},${c.y}`)===`${item?.x},${item?.y}`))?.id??'common';
const zoneCells=(club,id)=>id==='common'?Math.max(1,club.layout.plots.reduce((n,p)=>n+p.w*p.h,0)-club.layout.rooms.reduce((n,r)=>n+r.cells.length,0)):club.layout.rooms.find(r=>r.id===id)?.cells.length??0;
function commonCleaningFootprint(club){
 const zoned=new Set(club.layout.rooms.flatMap(room=>room.cells.map(cell=>typeof cell==='string'?cell:`${cell.x},${cell.y}`))),cells=[];
 for(const plot of club.layout.plots)for(let y=plot.y;y<plot.y+plot.h;y++)for(let x=plot.x;x<plot.x+plot.w;x++)if(!zoned.has(`${x},${y}`))cells.push(`${x},${y}`);
 return cells.sort();
}
const idFor=(club,prefix)=>`${prefix}-${club.operations.nextId++}`;
const notice=(club,key,text,{important=false,type='notice',entityId}={})=>{
 if(club.operations.warnings.some(n=>n.key===key))return null;
 const row={id:idFor(club,'notice'),key,clock:club.clock,text,important,type,entityId};club.operations.warnings.push(row);return row;
};
function event(club,type,entityId,details={}){const e={id:idFor(club,'event'),type,entityId,clock:club.clock,...details};club.operations.events.push(e);return e;}

export function ensureOperations(club){
 if(!club.operations)club.operations={version:1,nextId:1,migratedAt:club.clock,equipment:{},servicePolicies:{},zones:{},tasks:[],incidents:[],warnings:[],events:[],processedEventIds:[],serviceHours:0,nextInspectionHours:B.inspectionHours,financeCarry:0};
 club.operations.servicePolicies??={};
 ensureInventory(club);
 for(const item of club.layout.objects)if(maintained(item))club.operations.equipment[item.id]??={condition:100,broken:false};
 for(const id of ['common',...club.layout.rooms.map(r=>r.id)])club.operations.zones[id]??={cleanliness:100};
 const policy=club.operations.cleaningPolicy,live=new Set(['common',...club.layout.rooms.map(r=>r.id)]);
 if(policy?.zoneIds?.some(id=>!live.has(id))){policy.zoneIds=policy.zoneIds.filter(id=>live.has(id));if(!policy.zoneIds.length){policy.enabled=false;policy.pausedReason='Зоны поручения удалены. Выберите новые зоны и сохраните поручение.';}}
 return club.operations;
}
export function serviceAvailability(club,item){
 ensureOperations(club);
 if(item.enabled===false)return fail('Прибор выключен.');if(item.serviceEnabled===false)return fail('Раздача закрыта.');
 const equipment=at(club,item.id);if(equipment?.broken||equipment?.condition<=0)return fail('Прибор сломан.');
 if(club.operations.tasks.some(t=>t.itemId===item.id&&t.state==='active'))return fail('Прибор на обслуживании.');
 const zoneId=zoneForItem(club,item);if((club.operations.zones[zoneId]?.cleanliness??100)<20)return fail('Пищевая зона приостановлена: требуется уборка.');
 if(club.operations.tasks.some(t=>t.zoneId===zoneId&&t.type==='clean'&&t.state==='active'))return fail('В зоне идёт уборка.');
 return physicalServiceAccess(club,item.id);
}
export function setServiceOpen(club,itemId,open){
 ensureOperations(club);const item=itemFor(club,itemId);if(!item||!productFor(item)?.service)return fail('Раздача не найдена.');
 if(open&&club.inventory.batches.some(b=>b.location===itemId&&b.remaining&&!b.isolated&&(b.state==='unsafe'||minute(club.clock)>=minute(b.expiresAt))))return fail('Сначала изолируйте или спишите непригодный остаток.');
 item.serviceEnabled=Boolean(open);resolveIncidents(club);return{ok:true};
}
function violationOpen(club,batch){const item=itemFor(club,batch.location);return Boolean(batch.remaining&&!batch.isolated&&batch.state==='unsafe'&&item&&productFor(item)?.service&&item.serviceEnabled!==false);}
export function resolveIncidents(club){
 for(const incident of club.operations.incidents){if(incident.state!=='open')continue;const batch=club.inventory.batches.find(b=>b.id===incident.batchId);if(!batch||!violationOpen(club,batch)){incident.state='resolved';incident.resolvedAt=club.clock;event(club,'incident-resolved',incident.id);}}
}
function markUnsafe(club,batch,reason){
 batch.state='unsafe';batch.safetyBlock=true;batch.unsafeAt=club.clock;batch.unsafeReason=reason;
 const warning=notice(club,'unsafe-'+batch.id,`${STOCK_PRODUCTS[batch.sku].name}: ${reason}. Выдача заблокирована. Изолируйте, спишите остаток или закройте раздачу.`,{important:true,type:'unsafe',entityId:batch.id});
 if(violationOpen(club,batch)&&!club.operations.incidents.some(i=>i.batchId===batch.id)){
  const incident={id:idFor(club,'incident'),batchId:batch.id,itemId:batch.location,openedAt:club.clock,deadline:club.clock+B.graceHours,state:'open',reason,complaint:null};club.operations.incidents.push(incident);
  notice(club,'incident-'+incident.id,`Уберите непригодный остаток с открытой раздачи в течение часа: иначе игровой штраф ${club.operations.incidents.some(i=>i.state==='fined'&&i.finedAt>club.clock-B.repeatWindow)?B.repeatFine:B.firstFine} ₽ и закрытие раздачи.`,{important:true,type:'incident',entityId:incident.id});
 }
 return warning;
}
export function safetyEvents(club){
 const warnings=[];
 for(const batch of club.inventory.batches.filter(b=>b.remaining&&b.state==='usable').sort((a,b)=>a.id.localeCompare(b.id))){
  if(batch.sku==='cold'){
   if(storageCold(club,itemFor(club,batch.location)))batch.coldOutageNotified=false;
   else if(!batch.coldOutageNotified){batch.coldOutageNotified=true;notice(club,`cold-risk-${batch.id}-${Math.round(batch.warmMinutes)}`,`Холодные напитки без охлаждения: осталось ${Math.max(0,Math.ceil(STOCK_PRODUCTS.cold.warmLimit*60-batch.warmMinutes))} мин допустимого хранения. Перенесите запас или восстановите холод.`,{type:'cold-risk',entityId:batch.id});}
  }
  if(minute(club.clock)>=minute(batch.expiresAt))warnings.push(markUnsafe(club,batch,'истёк срок годности'));
  else if(batch.sku==='cold'&&batch.warmMinutes>=STOCK_PRODUCTS.cold.warmLimit*60-1e-7)warnings.push(markUnsafe(club,batch,'исчерпано допустимое время без охлаждения'));
  else if(minute(batch.expiresAt-club.clock)<=B.warningHours*60)notice(club,'soon-'+batch.id,`${STOCK_PRODUCTS[batch.sku].name}: срок истекает через ${Math.round((batch.expiresAt-club.clock)*60)} мин.`,{type:'expiry-soon',entityId:batch.id});
 }
 for(const item of club.layout.objects.filter(maintained).sort((a,b)=>a.id.localeCompare(b.id))){
  const e=at(club,item.id);if(e.condition<=0&&!e.broken){e.condition=0;e.broken=true;event(club,'equipment-broken',item.id);warnings.push(notice(club,`broken-${item.id}-${e.cycle??0}`,`${productFor(item).name}: прибор остановлен. Нужен ремонт${productFor(item).service==='cold'?' или перенос напитков до двух часов без охлаждения':''}.`,{important:true,type:'broken',entityId:item.id}));}
  else if(e.condition<=B.wearWarning&&!e.broken)notice(club,`wear-${item.id}-${e.cycle??0}`,`${productFor(item).name}: исправность ${Math.round(e.condition)}%, до остановки ${Math.round(e.condition/B.wearPerHour*60)} мин работы.`,{type:'wear',entityId:item.id});
 }
 for(const [zoneId,state] of Object.entries(club.operations.zones)){
  const tier=state.cleanliness<20?'blocked':state.cleanliness<40?'dirty':state.cleanliness<60?'notice':null;
  const food=club.layout.objects.some(i=>productFor(i)?.service&&zoneForItem(club,i)===zoneId&&i.serviceEnabled!==false);
  if(tier&&tier!==state.warnedTier){state.warnedTier=tier;warnings.push(notice(club,`dirt-${zoneId}-${tier}-${state.cleanCycle??0}`,tier==='blocked'&&food?'Пищевая раздача в грязной зоне приостановлена; нужна уборка.':tier==='dirty'||tier==='blocked'?'В зоне грязно: длительное пребывание создаёт дискомфорт.':'В зоне стоит запланировать уборку.',{important:tier==='blocked'&&food,type:'dirt',entityId:zoneId}));}
 }
 syncStockMirrors(club);return warnings.filter(Boolean);
}
export function checkIncidents(club){
 resolveIncidents(club);const results=[];
 for(const incident of club.operations.incidents.filter(i=>i.state==='open'&&minute(i.deadline)<=minute(club.clock)).sort((a,b)=>a.id.localeCompare(b.id))){
  const batch=club.inventory.batches.find(b=>b.id===incident.batchId);if(!batch||!violationOpen(club,batch))continue;
  const amount=club.operations.incidents.some(i=>i.state==='fined'&&i.finedAt>club.clock-B.repeatWindow)?B.repeatFine:B.firstFine;
  recordMoney(club,-amount,'fine','Игровая проверка: непригодный остаток оставлен на открытой раздаче после предупреждения',{id:'fine-'+incident.id,details:{incidentId:incident.id,batchId:batch.id,deadline:incident.deadline}});
  incident.state='fined';incident.finedAt=club.clock;incident.fine=amount;const item=itemFor(club,incident.itemId);if(item)item.serviceEnabled=false;
  results.push(event(club,'incident-fined',incident.id,{amount}));notice(club,'fine-'+incident.id,`Раздача закрыта; игровой штраф ${amount} ₽ за неустранённый после предупреждения остаток.`,{important:true,type:'fine',entityId:incident.id});
 }
 if(club.operations.serviceHours+1e-8>=club.operations.nextInspectionHours){event(club,'routine-inspection','club',{fine:0});club.operations.nextInspectionHours+=B.inspectionHours;}
 return results;
}
export function registerServiceRequest(club,item,guest){
 const incident=club.operations.incidents.find(i=>i.itemId===item.id&&i.state==='open'&&!i.complaint);
 if(incident){incident.complaint={guestId:guest.id,clock:club.clock};event(club,'complaint',incident.id,{guestId:guest.id});notice(club,'complaint-'+incident.id,`${guest.profile.name}: у открытой раздачи оставлен непригодный продукт. Срок устранения прежний.`,{type:'complaint',entityId:incident.id});}
}
export function serviceDirt(club,item){
 const zoneId=zoneForItem(club,item),bin=club.layout.objects.some(i=>productFor(i)?.kind==='bin'&&i.enabled!==false&&zoneForItem(club,i)===zoneId);const state=club.operations.zones[zoneId];state.cleanliness=Math.max(0,state.cleanliness-(bin?.5:1));
}
export function equipmentRunning(club,item){return item.enabled!==false&&(at(club,item.id)?.condition??100)>0&&!club.operations.tasks.some(t=>t.itemId===item.id&&t.state==='active');}
export function integrateOperations(club,from,to){
 ensureOperations(club);const hours=to-from;if(hours<=0)return;
 const serviceWasWorking=club.layout.objects.some(i=>productFor(i)?.service&&serviceAvailability(club,i).ok);
 for(const batch of club.inventory.batches)if(batch.remaining&&batch.sku==='cold'&&batch.state==='usable'&&!storageCold(club,itemFor(club,batch.location)))batch.warmMinutes+=hours*60;
 for(const item of club.layout.objects.filter(maintained))if(equipmentRunning(club,item))at(club,item.id).condition=Math.max(0,at(club,item.id).condition-hours*B.wearPerHour);
 for(const [id,state] of Object.entries(club.operations.zones)){
  const count=club.guests.filter(g=>(g.roomId??'common')===id&&(g.roomId&&club.rooms.some(r=>r.id===g.roomId&&r.status==='running')||g.schedule.leaveAt>from)).length;
  if(state.cleanliness<40)for(const room of club.rooms.filter(r=>r.status==='running'&&r.id===id)){const exposure=club.activity[room.run.id]??={noiseHours:0,services:[]};exposure.dirtyHours=(exposure.dirtyHours??0)+hours;}
  state.cleanliness=Math.max(0,state.cleanliness-count*hours);
 }
 if(serviceWasWorking)club.operations.serviceHours+=hours;
}
export function cleaningTaskEstimate(club,task){
 const queueHours=Math.max(0,task.startsAt-club.clock),workHours=Math.max(0,task.dueAt-Math.max(club.clock,task.startsAt)),hourlyWage=task.helperId?(club.serviceStaff?.find(p=>p.id===task.helperId)?.hourlyWage??0):0;
 const money=n=>Math.round(n*100)/100,queueWages=money(queueHours*hourlyWage),workWages=money(workHours*hourlyWage),shiftWages=money(queueWages+workWages);
 return{queueHours,workHours,hourlyWage,queueWages,workWages,shiftWages,costThroughFinish:money(task.cost+shiftWages)};
}
export function cleanZone(club,zoneId,{helper=false}={}){
 ensureOperations(club);const state=club.operations.zones[zoneId],cells=zoneCells(club,zoneId);if(!state||!cells)return fail('Зона не найдена.');if(state.cleanliness>=100)return fail('Зона уже чистая.');
 if(club.operations.tasks.some(t=>t.zoneId===zoneId&&t.type==='clean'&&['active','queued'].includes(t.state)))return fail('Уборка этой зоны уже заказана.');
 const person=club.serviceStaff?.find(p=>p.onShift);if(helper&&(!person||club.operations.tasks.some(t=>t.helperId===person.id&&['active','queued'].includes(t.state))))return fail('Нужен свободный помощник на смене.');
 const sections=Math.ceil(cells/B.cleanCells),cost=sections*(helper?B.cleanMaterials:B.cleanExternal),duration=sections*(helper?B.cleanHelperHours:B.cleanHours);
 if(club.finance.cash<cost)return fail(`На уборку требуется ${cost} ₽.`);
 const running=club.rooms.find(r=>r.id===zoneId&&r.status==='running'),startsAt=running?.run.endsAt??club.clock;
 const task={id:idFor(club,'task'),type:'clean',zoneId,cost,sections,helperId:helper?person.id:null,startsAt,dueAt:startsAt+duration,state:startsAt>club.clock?'queued':'active'};
 recordMoney(club,-cost,'cleaning',helper?'Материалы уборки; работа помощника оплачивается только в смене':'Внешняя уборка зоны',{id:'task-'+task.id});club.operations.tasks.push(task);return{ok:true,cost,task,estimate:cleaningTaskEstimate(club,task)};
}
const defaultCleaningPolicy=()=>({version:1,enabled:false,zoneIds:[],cleanlinessBelow:50,maxSpend:200,windowHours:8,orders:[]});
export function cleaningPolicyStatus(club){
 const policy=club.operations?.cleaningPolicy??defaultCleaningPolicy(),spent=Math.round(policy.orders.filter(row=>row.at>club.clock-policy.windowHours).reduce((sum,row)=>sum+row.reserved,0)*100)/100;
 const person=club.serviceStaff?.find(p=>p.onShift),busy=person&&club.operations?.tasks.some(t=>t.helperId===person.id&&['active','queued'].includes(t.state));
 const hasZone=policy.zoneIds.some(id=>id==='common'||club.layout.rooms.some(r=>r.id===id));
 return {...policy,orders:undefined,spent,remaining:Math.max(0,policy.maxSpend-spent),reason:policy.pausedReason??(!hasZone&&policy.enabled?'Зоны поручения удалены. Выберите новые зоны.':!policy.enabled?'Поручение выключено.':!person?'Нужен помощник на явно начатой смене.':busy?'Помощник выполняет порученную работу.':spent>=policy.maxSpend?'Лимит поручений израсходован.':'Проверяет выбранные свободные зоны при продвижении времени.'),budgetNote:'Лимит резервирует материалы и зарплату самой уборки. Обычный простой смены оплачивается отдельно.'};
}
export function setCleaningPolicy(club,settings){
 ensureOperations(club);const old=club.operations.cleaningPolicy??defaultCleaningPolicy(),policy={...old,...settings,version:1,orders:old.orders,pausedReason:null},live=new Set(['common',...club.layout.rooms.map(r=>r.id)]);
 if(typeof policy.enabled!=='boolean'||!Array.isArray(policy.zoneIds)||new Set(policy.zoneIds).size!==policy.zoneIds.length||policy.zoneIds.some(id=>!club.operations.zones[id])||!Number.isFinite(policy.cleanlinessBelow)||policy.cleanlinessBelow<20||policy.cleanlinessBelow>80||!Number.isFinite(policy.maxSpend)||policy.maxSpend<0||policy.maxSpend>2000||!Number.isFinite(policy.windowHours)||policy.windowHours<1||policy.windowHours>24)return fail('Укажите зоны, чистоту 20–80%, лимит 0–2 000 ₽ и период 1–24 ч.');
 if(policy.zoneIds.some(id=>!live.has(id))||policy.enabled&&!policy.zoneIds.length)return fail('Выберите хотя бы одну существующую зону для поручения.');
 club.operations.cleaningPolicy=policy;processCleaningPolicy(club);return{ok:true,policy:cleaningPolicyStatus(club)};
}
export function processCleaningPolicy(club){
 const policy=club.operations?.cleaningPolicy;if(!policy?.enabled||club.finance.cash<0||club.campaign.status==='bankrupt')return false;
 const person=club.serviceStaff?.find(p=>p.onShift);if(!person||club.operations.tasks.some(t=>t.helperId===person.id&&['active','queued'].includes(t.state)))return false;
 const zones=policy.zoneIds.filter(id=>club.operations.zones[id]?.cleanliness<policy.cleanlinessBelow&&!zoneCleaning(club,id)&&!club.rooms.some(r=>r.id===id&&r.status==='running')&&!club.guests.some(g=>(g.roomId??'common')===id&&g.schedule.leaveAt>club.clock)).sort((a,b)=>club.operations.zones[a].cleanliness-club.operations.zones[b].cleanliness||a.localeCompare(b));
 const available=cleaningPolicyStatus(club).remaining;
 for(const zoneId of zones){
  const sections=Math.ceil(zoneCells(club,zoneId)/B.cleanCells),cost=sections*B.cleanMaterials,duration=sections*B.cleanHelperHours,reserved=Math.round((cost+duration*person.hourlyWage)*100)/100;
  if(!sections||reserved>available+1e-7||club.finance.cash-reserveRequired(club)<reserved)continue;
  const result=cleanZone(club,zoneId,{helper:true});if(!result.ok)continue;
  result.task.delegated=true;policy.orders.push({taskId:result.task.id,at:club.clock,reserved});policy.orders=policy.orders.filter(row=>row.at>club.clock-24);return true;
 }
 return false;
}
export function maintainEquipment(club,itemId){
 ensureOperations(club);const item=itemFor(club,itemId),equipment=at(club,itemId);if(!item||!equipment)return fail('Этот предмет не требует такого обслуживания.');
 if(equipment.condition>=100)return fail('Прибор полностью исправен.');if(club.operations.tasks.some(t=>t.itemId===itemId&&t.state==='active'))return fail('Обслуживание уже идёт.');
 const broken=equipment.broken||equipment.condition<=0,cost=Math.max(broken?100:50,Math.round(productFor(item).price*(broken?.2:.1))),duration=broken?2:1;
 if(club.finance.cash<cost)return fail(`На ${broken?'ремонт':'обслуживание'} требуется ${cost} ₽.`);
 const task={id:idFor(club,'task'),type:broken?'repair':'maintenance',itemId,cost,startsAt:club.clock,dueAt:club.clock+duration,state:'active'};
 recordMoney(club,-cost,'repair',`${productFor(item).name}: ${broken?'ремонт':'обслуживание'}`,{id:'task-'+task.id});club.operations.tasks.push(task);return{ok:true,cost,task};
}
export function cancelOperationTask(club,taskId){
 ensureOperations(club);const task=club.operations.tasks.find(t=>t.id===taskId);if(!task||task.type!=='clean')return fail('Отменить можно только уборку.');
 if(task.state==='cancelled')return{ok:true,replayed:true,refund:0};if(task.state==='done')return fail('Уборка уже завершена.');
 const refund=task.state==='queued'&&minute(club.clock)<minute(task.startsAt)?task.cost:0;
 task.state='cancelled';task.cancelledAt=club.clock;if(refund)recordMoney(club,refund,'cleaning-refund','Возврат за ещё не начатую уборку',{id:'cancel-task-'+task.id});
 event(club,'task-cancelled',task.id,{refund});return{ok:true,refund,reason:refund?'Уборка отменена до начала.':'Уборка прервана; материалы уже израсходованы, чистота не восстановлена.'};
}
export function configureAutoPurchase(club,itemId,settings={}){
 ensureOperations(club);const item=itemFor(club,itemId);if(!item||!productFor(item)?.service)return fail('Выберите раздачу.');
 const old=club.operations.servicePolicies[itemId]??{},next={target:old.target??10,threshold:old.threshold??0,maxOrder:old.maxOrder??10,budget:old.budget??200,reserve:old.reserve??0,...settings};
 if(!['target','threshold','maxOrder','budget','reserve'].every(key=>Number.isSafeInteger(next[key]))||next.target<1||next.target>20||next.threshold<0||next.threshold>=next.target||next.maxOrder<1||next.maxOrder>10||next.budget<0||next.budget>B.autoBudgetMax||next.reserve<0||next.reserve>1000000)return fail(`Цель 1–20 порций; порог меньше цели; заказ до 10; порог общего расхода до ${B.autoBudgetMax} ₽ за 8 ч; резерв неотрицателен.`);
 club.operations.servicePolicies[itemId]=next;return{ok:true,policy:next};
}
export function finishOperationTasks(club){
 const events=[];
 for(const task of club.operations.tasks.filter(t=>['active','queued'].includes(t.state)).sort((a,b)=>a.id.localeCompare(b.id))){
  if(task.state==='queued'&&minute(task.startsAt)<=minute(club.clock))task.state='active';
  if(minute(task.dueAt)>minute(club.clock))continue;
  if(task.type==='clean'){const zone=club.operations.zones[task.zoneId];zone.cleanliness=Math.min(100,zone.cleanliness+B.cleanGain);zone.cleanCycle=(zone.cleanCycle??0)+1;zone.warnedTier=null;}
  else{const equipment=at(club,task.itemId);equipment.condition=100;equipment.broken=false;equipment.cycle=(equipment.cycle??0)+1;}
  task.state='done';task.completedAt=club.clock;events.push(event(club,'task-completed',task.id));
 }
 return events;
}
export const zoneCleaning= (club,zoneId)=>Boolean(club.operations?.tasks.some(t=>t.zoneId===zoneId&&t.type==='clean'&&['active','queued'].includes(t.state)));
export function visualObjectState(club,objectId){
 const item=itemFor(club,objectId);if(!item)return null;
 const equipment=club.operations?.equipment[objectId],task=club.operations?.tasks.find(t=>t.itemId===objectId&&t.state==='active'),batches=club.inventory?.batches.filter(b=>b.location===objectId&&b.remaining)??[];
 const flags=[];if(task)flags.push({kind:'repair',label:'Обслуживание',until:task.dueAt});else if(equipment?.broken)flags.push({kind:'broken',label:'Сломан'});else if(item.enabled===false)flags.push({kind:'off',label:'Выключен'});
 if(item.serviceEnabled===false)flags.push({kind:'closed',label:'Раздача закрыта'});
 if(batches.some(b=>b.isolated))flags.push({kind:'isolated',label:'Изолирован запас'});
 if(batches.some(b=>b.state==='unsafe'&&!b.isolated))flags.push({kind:'unsafe',label:'Уберите непригодное'});
 if(batches.some(b=>batchUsable(b,club.clock)&&minute(b.expiresAt-club.clock)<=B.warningHours*60))flags.push({kind:'soon',label:'Срок скоро истечёт'});
 const available=productFor(item)?.service&&club.inventory?availableServiceBatches(club,item):batches.filter(b=>batchUsable(b,club.clock));
 if(productFor(item)?.service&&!available.length)flags.push({kind:'empty',label:'Нет пригодного запаса'});
 const deadlines=batches.filter(b=>b.state==='usable'&&!b.isolated).map(b=>b.expiresAt);
 return{flags,condition:equipment?.condition??null,stock:batches.filter(b=>batchUsable(b,club.clock)).reduce((n,b)=>n+b.remaining,0),availableStock:available.reduce((n,b)=>n+b.remaining,0),nextExpiry:deadlines.length?Math.min(...deadlines):null};
}
export function visualRoomState(club,zoneId){
 const zone=club.operations?.zones[zoneId],task=club.operations?.tasks.find(t=>t.zoneId===zoneId&&t.type==='clean'&&['active','queued'].includes(t.state));
 return{cleanliness:zone?.cleanliness??100,cleaning:task?.state==='active',queued:task?.state==='queued',until:task?.dueAt??null,dirty:(zone?.cleanliness??100)<40,serviceBlocked:(zone?.cleanliness??100)<20};
}
export function operationsView(club){
 const deadlines=[...(club.operations?.tasks??[]).filter(t=>['active','queued'].includes(t.state)).map(t=>t.dueAt),...(club.inventory?.orders??[]).filter(o=>o.state==='ordered').map(o=>o.dueAt)].filter(t=>Number.isFinite(t)&&minute(t)>minute(club.clock));
 return{nextDueAt:deadlines.length?Math.min(...deadlines):null,balanceStatus:'Предложенный баланс N1',clock:club.clock,autoPurchase:{spent:(club.inventory?.autoPurchases??[]).filter(p=>p.clock>club.clock-B.autoWindow).reduce((n,p)=>n+p.cost,0),windowHours:B.autoWindow,defaultBudget:B.autoBudget,maxBudget:B.autoBudgetMax},batches:club.inventory?.batches??[],orders:club.inventory?.orders??[],tasks:club.operations?.tasks??[],incidents:club.operations?.incidents??[],warnings:club.operations?.warnings??[],zones:Object.keys(club.operations?.zones??{}).map(id=>({id,...visualRoomState(club,id)})),equipment:club.layout.objects.filter(i=>productFor(i)?.service||club.operations?.equipment[i.id]||i.kind==='kitchen').map(item=>({id:item.id,name:productFor(item)?.name??'Хранение',...visualObjectState(club,item.id)})),helper:club.serviceStaff?.[0]??null};
}
export function operationsConstructionBlocker(before,after){
 before=structuredClone(before);ensureOperations(before);
 for(const item of before.layout.objects){const next=itemFor(after,item.id);if(!next||next.kind!==item.kind){const stock=inventoryStorageBlocker(before,item.id);if(!stock.ok)return stock;if(before.serviceStaff?.some(p=>p.assignment?.itemId===item.id))return fail('Сначала снимите помощника с этой раздачи.');if(before.operations.tasks.some(t=>t.itemId===item.id&&['active','queued'].includes(t.state)))return fail('Дождитесь окончания обслуживания предмета.');}}
 for(const task of before.operations.tasks.filter(t=>t.type==='clean'&&['active','queued'].includes(t.state))){
  const a=task.zoneId==='common'?commonCleaningFootprint(before):before.layout.rooms.find(r=>r.id===task.zoneId)?.cells;
  const b=task.zoneId==='common'?commonCleaningFootprint(after):after.layout.rooms.find(r=>r.id===task.zoneId)?.cells;
  if(a&&JSON.stringify(a)!==JSON.stringify(b))return fail('Дождитесь окончания оплаченной уборки перед изменением зоны.');
 }
 return{ok:true};
}
export function executeOperationsAction(club,action){
 ensureOperations(club);let result;
 switch(action.type){
  case 'orderStock':case 'restock':result=orderStock(club,action.itemId,action.quantity??action.portions??20,{sku:action.sku});break;
  case 'cancelOrder':result=cancelStockOrder(club,action.orderId);break;
  case 'isolateBatch':result=isolateBatch(club,action.batchId);break;
  case 'writeOffBatch':result=writeOffBatch(club,action.batchId,action.quantity);break;
  case 'moveBatch':result=moveBatch(club,action.batchId,action.itemId);break;
  case 'setServiceOpen':result=setServiceOpen(club,action.itemId,action.open);break;
  case 'cleanZone':result=cleanZone(club,action.zoneId,{helper:action.helper});break;
  case 'setCleaningPolicy':result=setCleaningPolicy(club,action.policy??{});break;
  case 'maintainEquipment':result=maintainEquipment(club,action.itemId);break;
  case 'assignServiceStaff':result=assignServiceStaff(club,action.itemId??null);break;
  case 'cancelOperationTask':result=cancelOperationTask(club,action.taskId);break;
  case 'configureAutoPurchase':result=configureAutoPurchase(club,action.itemId,action.settings);break;
  default:return fail('Хозяйственное действие не найдено.');
 }
 if(result.ok)resolveIncidents(club);return result;
}
export function validateOperations(club,{allowMigration=false}={}){
 if(!club.operations||!club.inventory){if(allowMigration)ensureOperations(club);else throw new Error('В сохранении отсутствуют партии продуктов или хозяйственные события.');}
 const ops=club.operations;
 if(ops.version!==1||!Number.isSafeInteger(ops.nextId)||ops.nextId<1||!['tasks','incidents','warnings','events','processedEventIds'].every(k=>Array.isArray(ops[k]))||!ops.equipment||!ops.zones||!ops.servicePolicies||!Number.isFinite(ops.financeCarry)||Math.abs(ops.financeCarry)>.011||!Number.isFinite(ops.serviceHours)||ops.serviceHours<0||!Number.isFinite(ops.nextInspectionHours)||ops.nextInspectionHours<=0)throw new Error('Повреждены хозяйственные события.');
 if(club.layout.objects.some(item=>maintained(item)&&!ops.equipment[item.id])||['common',...club.layout.rooms.map(r=>r.id)].some(id=>!ops.zones[id]))throw new Error('Отсутствует сохранённое состояние прибора или зоны.');
 if(new Set(ops.processedEventIds).size!==ops.processedEventIds.length||ops.processedEventIds.some(id=>typeof id!=='string'))throw new Error('Повреждена история обработанных событий.');
 validateInventory(club);
 for(const rows of [ops.tasks,ops.incidents,ops.warnings,ops.events])if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Повторяются хозяйственные события.');
 for(const state of Object.values(ops.zones))if(!Number.isFinite(state.cleanliness)||state.cleanliness<0||state.cleanliness>100)throw new Error('Повреждена чистота зоны.');
 for(const state of Object.values(ops.equipment))if(!Number.isFinite(state.condition)||state.condition<0||state.condition>100||typeof state.broken!=='boolean')throw new Error('Повреждена исправность оборудования.');
 for(const t of ops.tasks)if(!['clean','maintenance','repair'].includes(t.type)||!['active','queued','done','cancelled'].includes(t.state)||!Number.isFinite(t.startsAt)||!Number.isFinite(t.dueAt)||t.dueAt<=t.startsAt||!Number.isFinite(t.cost)||t.cost<0||!club.finance.ledger.some(e=>e.id==='task-'+t.id&&e.amount===-t.cost)||['active','queued'].includes(t.state)&&(t.itemId&&!itemFor(club,t.itemId)||t.zoneId&&!ops.zones[t.zoneId]))throw new Error('Повреждена оплаченная хозяйственная задача.');
 const workers=ops.tasks.filter(t=>t.helperId&&['active','queued'].includes(t.state)).map(t=>t.helperId);if(new Set(workers).size!==workers.length||workers.some(id=>!club.serviceStaff?.some(p=>p.id===id&&p.onShift)))throw new Error('Помощнику назначены несовместимые задачи.');
 for(const policy of Object.values(ops.servicePolicies))for(const key of ['target','threshold','maxOrder','budget','reserve'])if(policy[key]!==undefined&&(!Number.isSafeInteger(policy[key])||policy[key]<0||key==='budget'&&policy[key]>B.autoBudgetMax||key==='maxOrder'&&(policy[key]<1||policy[key]>10)||key==='target'&&(policy[key]<1||policy[key]>20)))throw new Error('Повреждены настройки автоматических закупок.');
 const cleaning=ops.cleaningPolicy;
 if(cleaning&&(cleaning.version!==1||typeof cleaning.enabled!=='boolean'||!Array.isArray(cleaning.zoneIds)||new Set(cleaning.zoneIds).size!==cleaning.zoneIds.length||cleaning.zoneIds.some(id=>typeof id!=='string')||!Number.isFinite(cleaning.cleanlinessBelow)||cleaning.cleanlinessBelow<20||cleaning.cleanlinessBelow>80||!Number.isFinite(cleaning.maxSpend)||cleaning.maxSpend<0||cleaning.maxSpend>2000||!Number.isFinite(cleaning.windowHours)||cleaning.windowHours<1||cleaning.windowHours>24||!Array.isArray(cleaning.orders)||cleaning.orders.some(row=>!Number.isFinite(row.at)||row.at>club.clock||!Number.isFinite(row.reserved)||row.reserved<0||!ops.tasks.some(t=>t.id===row.taskId&&t.delegated))))throw Error('Повреждено поручение уборки.');
 for(const i of ops.incidents)if(!club.inventory.batches.some(b=>b.id===i.batchId)||!['open','resolved','fined'].includes(i.state)||!Number.isFinite(i.deadline)||i.deadline<i.openedAt||i.state==='fined'&&!club.finance.ledger.some(e=>e.id==='fine-'+i.id&&e.amount===-i.fine))throw new Error('Повреждена история игровых проверок.');
 return club;
}
