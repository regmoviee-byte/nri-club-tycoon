import {productFor} from '../data/commerce.js';
import {STOCK_PRODUCTS,OPERATIONS_BALANCE as B,minute} from '../data/operations-catalog.js';
import {recordMoney,reserveRequired} from './finances.js';
import {physicalServiceAccess} from './staff-room.js';

const fail=reason=>({ok:false,reason});
const itemFor=(club,id)=>club.layout.objects.find(item=>item.id===id);
const idFor=(club,prefix)=>`${prefix}-${club.inventory.nextId++}`;
export const storageCapacity=item=>item?.kind==='kitchen'?40:productFor(item??{})?.service?20:0;
export const storageClass=item=>productFor(item??{})?.service==='cold'?'cold':'dry';
export const storageAccepts=(item,sku)=>Boolean(item&&STOCK_PRODUCTS[sku]&&storageCapacity(item)>0&&storageClass(item)===STOCK_PRODUCTS[sku].storage&&(item.kind==='kitchen'||productFor(item)?.service===sku));
export const storageCold=(club,item)=>Boolean(item&&item.enabled!==false&&(club.operations?.equipment[item.id]?.condition??100)>0&&!club.operations?.tasks.some(t=>t.itemId===item.id&&t.state==='active'));
export const batchUsable=(batch,time)=>batch.remaining>0&&batch.state==='usable'&&!batch.safetyBlock&&!batch.isolated&&minute(time)>=minute(batch.arrivedAt)&&minute(time)<minute(batch.expiresAt)&&(batch.sku!=='cold'||batch.warmMinutes<STOCK_PRODUCTS.cold.warmLimit*60-1e-7);
export const storageUsed=(club,itemId)=>club.inventory.batches.filter(b=>b.location===itemId).reduce((n,b)=>n+b.remaining,0)+club.inventory.orders.filter(o=>o.location===itemId&&o.state==='ordered').reduce((n,o)=>n+o.quantity,0);

function movement(club,type,batch,quantity,extra={}){
 const row={id:idFor(club,'stock-move'),clock:club.clock,type,batchId:batch.id,quantity,unitCost:batch.unitCost,...extra};club.inventory.movements.push(row);return row;
}
export function syncStockMirrors(club){
 if(!club.inventory)return;
 for(const item of club.layout.objects)if(productFor(item)?.service)item.stock=club.inventory.batches.filter(b=>b.location===item.id&&batchUsable(b,club.clock)).reduce((n,b)=>n+b.remaining,0);
}
export function ensureInventory(club){
 if(club.inventory){syncStockMirrors(club);return club.inventory;}
 club.inventory={version:1,nextId:1,migratedAt:club.clock,batches:[],orders:[],movements:[],autoPurchases:[],receipts:[]};
 for(const item of club.layout.objects){
  const sku=productFor(item)?.service,quantity=item.stock??0;if(!sku||!quantity)continue;
  if(!Number.isSafeInteger(quantity)||quantity<0)throw new Error('Повреждён старый запас продуктов.');
  const batch={id:idFor(club,'batch'),sku,purchased:quantity,remaining:quantity,unitCost:productFor(item).unitCost??STOCK_PRODUCTS[sku].unitCost,costEstimated:true,boughtAt:null,arrivedAt:club.clock,expiresAt:club.clock+STOCK_PRODUCTS[sku].life,openedAt:null,location:item.id,storage:STOCK_PRODUCTS[sku].storage,state:'usable',isolated:false,safetyBlock:false,warmMinutes:0,legacy:true,legacyOverflow:Math.max(0,quantity-storageCapacity(item))};
  club.inventory.batches.push(batch);movement(club,'migration',batch,quantity,{estimated:true});
 }
 syncStockMirrors(club);return club.inventory;
}
export function orderStock(club,itemId,quantity=20,{sku,automatic=false}={}){
 ensureInventory(club);const item=itemFor(club,itemId);sku??=productFor(item??{})?.service;
 if(!storageAccepts(item,sku)||!Number.isSafeInteger(quantity)||quantity<1||quantity>100)return fail('Выберите подходящее хранение и от 1 до 100 порций.');
 if(club.finance.cash<0)return fail('При долге новые закупки недоступны.');
 if(sku==='cold'&&!storageCold(club,item))return fail('Для холодной поставки нужен работающий холодильник.');
 if(club.inventory.orders.some(o=>o.location===itemId&&o.sku===sku&&o.state==='ordered'))return fail('Поставка этого товара уже в пути.');
 const free=storageCapacity(item)-storageUsed(club,itemId);if(quantity>free)return fail(`На хранении свободно ${Math.max(0,free)} порций; заказ не помещается.`);
 const unitCost=productFor(item)?.service===sku?productFor(item).unitCost:STOCK_PRODUCTS[sku].unitCost,cost=quantity*unitCost;
 if(club.finance.cash<cost)return fail('На закупку не хватает денег.');
 if(automatic){
  const config=club.operations?.servicePolicies?.[item.id]??{},budget=config.budget??B.autoBudget,spent=club.inventory.autoPurchases.filter(p=>p.clock>club.clock-B.autoWindow).reduce((n,p)=>n+p.cost,0);
  if(quantity>(config.maxOrder??B.autoQuantity)||spent+cost>budget)return fail('Достигнут общий лимит автозакупок за 8 часов.');
  if(club.finance.cash-cost<reserveRequired(club,{through:club.clock+B.deliveryHours})+(config.reserve??0))return fail('Автозакупка оставила бы недостаточно денег на обязательства клуба.');
 }
 const order={id:idFor(club,'order'),sku,quantity,unitCost,cost,location:itemId,orderedAt:club.clock,dispatchAt:club.clock+B.dispatchHours,dueAt:club.clock+B.deliveryHours,state:'ordered',automatic};
 recordMoney(club,-cost,'stock',`${STOCK_PRODUCTS[sku].name}: заказ ${quantity} порций, доставка через час`,{id:'purchase-'+order.id,details:{orderId:order.id,sku,quantity,unitCost}});club.inventory.orders.push(order);
 if(automatic)club.inventory.autoPurchases.push({orderId:order.id,clock:club.clock,cost});
 return{ok:true,cost,order};
}
export function cancelStockOrder(club,id){
 ensureInventory(club);const order=club.inventory.orders.find(o=>o.id===id);if(!order)return fail('Заказ не найден.');
 if(order.state==='cancelled')return{ok:true,replayed:true};if(order.state!=='ordered'||minute(club.clock)>=minute(order.dispatchAt))return fail('Заказ уже отправлен; дождитесь доставки.');
 order.state='cancelled';order.cancelledAt=club.clock;recordMoney(club,order.cost,'stock-refund','Возврат за отменённую поставку',{id:'cancel-'+id});return{ok:true,refund:order.cost};
}
export function receiveOrders(club){
 const received=[];
 for(const order of club.inventory.orders.filter(o=>o.state==='ordered'&&minute(o.dueAt)<=minute(club.clock)).sort((a,b)=>a.id.localeCompare(b.id))){
  const item=itemFor(club,order.location);
  if(!storageAccepts(item,order.sku)){order.state='returned';recordMoney(club,order.cost,'stock-refund','Поставка возвращена: место хранения утрачено',{id:'return-'+order.id});received.push({type:'order-returned',orderId:order.id});continue;}
  const batch={id:'batch-'+order.id,orderId:order.id,sku:order.sku,purchased:order.quantity,remaining:order.quantity,unitCost:order.unitCost,costEstimated:false,boughtAt:order.orderedAt,arrivedAt:order.dueAt,expiresAt:order.dueAt+STOCK_PRODUCTS[order.sku].life,openedAt:null,location:order.location,storage:STOCK_PRODUCTS[order.sku].storage,state:'usable',isolated:false,safetyBlock:false,warmMinutes:0};
  club.inventory.batches.push(batch);movement(club,'arrival',batch,batch.remaining,{clock:order.dueAt});order.state='received';order.receivedAt=order.dueAt;received.push({type:'order-received',orderId:order.id,batchId:batch.id});
 }
 syncStockMirrors(club);return received;
}
export function isolateBatch(club,id){
 ensureInventory(club);const batch=club.inventory.batches.find(b=>b.id===id);if(!batch)return fail('Партия не найдена.');if(batch.isolated||!batch.remaining)return{ok:true,replayed:true};
 batch.isolated=true;batch.isolatedAt=club.clock;movement(club,'isolate',batch,batch.remaining);syncStockMirrors(club);return{ok:true,batch};
}
export function writeOffBatch(club,id,quantity){
 ensureInventory(club);const batch=club.inventory.batches.find(b=>b.id===id);if(!batch)return fail('Партия не найдена.');if(!batch.remaining)return{ok:true,replayed:true,loss:0};quantity??=batch.remaining;
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>batch.remaining)return fail('Укажите количество не больше остатка.');
 batch.remaining-=quantity;const loss=quantity*batch.unitCost;movement(club,'write-off',batch,quantity,{loss});if(!batch.remaining){batch.state='writtenOff';batch.writtenOffAt=club.clock;}syncStockMirrors(club);return{ok:true,loss,quantity};
}
export function moveBatch(club,id,itemId){
 ensureInventory(club);const batch=club.inventory.batches.find(b=>b.id===id),item=itemFor(club,itemId);if(!batch?.remaining)return fail('Партия пуста или не найдена.');
 if(batch.location===itemId)return{ok:true,replayed:true};if(!storageAccepts(item,batch.sku))return fail('Это место не подходит для данного продукта.');
 if(storageUsed(club,itemId)+batch.remaining>storageCapacity(item))return fail('В новом месте недостаточно свободного хранения.');
 if(batch.sku==='cold'&&!storageCold(club,item))return fail('Перенос холодных напитков требует работающего холодильника.');
 const from=batch.location;batch.location=itemId;movement(club,'move',batch,batch.remaining,{from,to:itemId});syncStockMirrors(club);return{ok:true,batch};
}
export function takePortion(club,item,time=club.clock){
 const sku=productFor(item)?.service,batch=availableServiceBatches(club,item,time)[0];
 if(!batch)return null;
 if(batch.openedAt===null){batch.openedAt=time;if(STOCK_PRODUCTS[sku].openedLife)batch.expiresAt=Math.min(batch.expiresAt,time+STOCK_PRODUCTS[sku].openedLife);}
 batch.remaining--;movement(club,'serve',batch,1,{service:sku});syncStockMirrors(club);return{batchId:batch.id,unitCost:batch.unitCost,expiresAt:batch.expiresAt};
}
export function availableServiceBatches(club,item,time=club.clock){
 const sku=productFor(item)?.service;
 return club.inventory.batches.filter(b=>{
  if(b.sku!==sku||!batchUsable(b,time))return false;if(b.location===item.id)return true;
  const storage=itemFor(club,b.location);return storage?.kind==='kitchen'&&storage.enabled!==false&&physicalServiceAccess(club,storage.id).ok;
 }).sort((a,b)=>a.expiresAt-b.expiresAt||a.arrivedAt-b.arrivedAt||a.id.localeCompare(b.id));
}
export function maybeAutoOrder(club,item,forecastPortions=0){
 if(!item.autoRefill||item.enabled===false||item.serviceEnabled===false)return null;
 const sku=productFor(item)?.service;if(!sku)return null;const config=club.operations?.servicePolicies?.[item.id]??{},available=availableServiceBatches(club,item).reduce((n,b)=>n+b.remaining,0);
 if(available>(config.threshold??0))return null;
 const existing=club.inventory.batches.filter(b=>b.sku===sku&&batchUsable(b,club.clock)).reduce((n,b)=>n+b.remaining,0)+club.inventory.orders.filter(o=>o.sku===sku&&o.state==='ordered').reduce((n,o)=>n+o.quantity,0);
 const forecast=Math.max(0,Math.ceil(forecastPortions)-existing),quantity=Math.min(config.maxOrder??B.autoQuantity,(config.target??B.autoQuantity)-available,storageCapacity(item)-storageUsed(club,item.id),forecast);
 if(quantity<=0)return null;const result=orderStock(club,item.id,quantity,{automatic:true});if(club.operations)(club.operations.servicePolicies[item.id]??={}).reason=result.ok?null:result.reason;return result;
}
export function inventoryStorageBlocker(club,itemId){
 ensureInventory(club);return club.inventory.batches.some(b=>b.location===itemId&&b.remaining)||club.inventory.orders.some(o=>o.location===itemId&&o.state==='ordered')?fail('Сначала перенесите или спишите продукты и дождитесь либо отмените поставку.'): {ok:true};
}
export function validateInventory(club){
 ensureInventory(club);const inv=club.inventory;
 if(inv.version!==1||!Number.isSafeInteger(inv.nextId)||inv.nextId<1||!['batches','orders','movements','autoPurchases','receipts'].every(k=>Array.isArray(inv[k])))throw new Error('Повреждён склад продуктов.');
 const unique=rows=>rows.every(r=>typeof r.id==='string'&&r.id.length>0)&&new Set(rows.map(r=>r.id)).size===rows.length;
 if(!unique(inv.batches)||!unique(inv.orders)||!unique(inv.movements))throw new Error('Повторяются события склада.');
 for(const b of inv.batches){
  if(!STOCK_PRODUCTS[b.sku]||!Number.isSafeInteger(b.purchased)||b.purchased<1||!Number.isSafeInteger(b.remaining)||b.remaining<0||b.remaining>b.purchased||!Number.isFinite(b.unitCost)||b.unitCost<0||!Number.isFinite(b.expiresAt)||!Number.isFinite(b.arrivedAt)||b.expiresAt<b.arrivedAt||!Number.isFinite(b.warmMinutes)||b.warmMinutes<0||!['usable','unsafe','writtenOff'].includes(b.state)||typeof b.isolated!=='boolean'||typeof b.safetyBlock!=='boolean'||typeof b.costEstimated!=='boolean'||b.storage!==STOCK_PRODUCTS[b.sku].storage||b.openedAt!==null&&(!Number.isFinite(b.openedAt)||b.openedAt<b.arrivedAt||b.openedAt>=b.expiresAt)||b.state==='writtenOff'&&b.remaining!==0||b.state==='unsafe'&&!b.safetyBlock||b.remaining&&!storageAccepts(itemFor(club,b.location),b.sku))throw new Error('Повреждена партия продуктов.');
  const issued=inv.movements.filter(m=>m.batchId===b.id&&['serve','write-off'].includes(m.type)).reduce((n,m)=>n+m.quantity,0);if(b.remaining+issued!==b.purchased)throw new Error('Не сходится количество продуктов в партии.');
  if(!b.legacy&&!inv.orders.some(o=>o.id===b.orderId&&o.state==='received'&&o.quantity===b.purchased&&o.unitCost===b.unitCost&&o.sku===b.sku))throw new Error('Не найдено происхождение продуктовой партии.');
 }
 for(const o of inv.orders)if(!STOCK_PRODUCTS[o.sku]||!Number.isSafeInteger(o.quantity)||o.quantity<1||!Number.isFinite(o.unitCost)||o.unitCost<0||o.cost!==o.unitCost*o.quantity||!Number.isFinite(o.dueAt)||!Number.isFinite(o.orderedAt)||!Number.isFinite(o.dispatchAt)||o.dueAt<o.dispatchAt||o.dispatchAt<o.orderedAt||!['ordered','received','cancelled','returned'].includes(o.state)||!club.finance.ledger.some(e=>e.id==='purchase-'+o.id&&e.amount===-o.cost)||o.state==='ordered'&&!storageAccepts(itemFor(club,o.location),o.sku))throw new Error('Повреждена оплаченная поставка.');
 for(const m of inv.movements){const batch=inv.batches.find(b=>b.id===m.batchId);if(!batch||!['migration','arrival','serve','move','isolate','write-off'].includes(m.type)||!Number.isSafeInteger(m.quantity)||m.quantity<1||!Number.isFinite(m.clock)||m.unitCost!==batch.unitCost||m.type==='serve'&&(minute(m.clock)<minute(batch.arrivedAt)||minute(m.clock)>=minute(batch.expiresAt)||batch.unsafeAt!==undefined&&minute(m.clock)>=minute(batch.unsafeAt)))throw new Error('Повреждена история движения продуктов.');}
 for(const item of club.layout.objects){const overflow=inv.batches.filter(b=>b.location===item.id&&b.legacy).reduce((n,b)=>n+(b.legacyOverflow??0),0);if(storageUsed(club,item.id)>storageCapacity(item)+overflow)throw new Error('Продукты превышают сохранённую вместимость.');}
 syncStockMirrors(club);return club;
}
