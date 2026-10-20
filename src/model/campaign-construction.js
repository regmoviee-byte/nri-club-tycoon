import {recordMoney} from './finances.js';
import {syncRooms,replenish,updateCampaign} from './campaign.js';
import {normalizeEdit} from './construction.js';
import {quoteEdit} from './layout.js';
import {buildRoomTemplate,edgeKey} from './campaign-layout.js';
import {canonicalKind} from '../data/commerce.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
import {validateOccupiedLayout,validateClubLayout,constructionLockedRoomIds} from './layout-club.js';
import {operationsConstructionBlocker,ensureOperations} from './operations.js';
import {retireStaffRoomLegacyCredit} from './staff-room.js';
const fail=reason=>({ok:false,reason});
export function constructionBudgetAdapter(){return {name:'Касса клуба',apply(transaction,draft){
 const f=draft.finance;if(!f)return fail('Не найдена касса клуба.');
 if(draft.campaign.status==='bankrupt')return fail('Это прохождение завершено.');
 if(!Number.isSafeInteger(transaction.cost)||transaction.cost<0||!Number.isSafeInteger(transaction.refund)||transaction.refund<0)return fail('Некорректная стоимость строительства.');
 const net=transaction.cost-transaction.refund;
 if(f.cash<0&&transaction.cost>0)return fail('При долге сначала продайте лишнее имущество или примите план сокращения.');
 if(net>0&&f.cash<net)return fail(f.cash<0?'Сначала погасите долг.':'На эту покупку не хватает денег.');
 const id=`construction-${transaction.id}`;
 if(f.ledger.some(e=>e.id===id))return fail('Эта операция уже есть в кассе. Проверьте сохранение перед повтором.');
 recordMoney(draft,-net,net<0?'sale':'construction',net<0?'Продажа и снос':'Обустройство клуба',{id,details:{cost:transaction.cost,refund:transaction.refund}});
 return {ok:true};
}};}
export function syncConstructionCampaign(draft,{previousLayout=null}={}){syncRooms(draft);retireStaffRoomLegacyCredit(draft);validateClubLayout(draft,{previousLayout});ensureOperations(draft);replenish(draft,{removeExpired:false});updateCampaign(draft);return draft;}
export function build(club,action,args={}){
 const draft=retireStaffRoomLegacyCredit(structuredClone(club)),lockedRoomIds=constructionLockedRoomIds(club);let result,edit;
 if(action==='template')result=buildRoomTemplate(draft.layout,args.x,args.y,{lockedRoomIds});
 else {
  if(action==='item'){
   const kind=canonicalKind(args.type);if(!BUILD_CATALOG[kind])return fail('Предмет не найден в строительном каталоге.');
   edit={type:'place',object:{kind,x:args.x,y:args.y,rotation:args.rotation??0,...(args.role?{role:args.role}:{})}};
  }else if(action==='move')edit={type:'move',id:args.id,x:args.x,y:args.y,rotation:args.rotation};
  else if(action==='plot')edit={type:'expand',plotId:args.plotId,direction:{N:'north',S:'south',E:'east',W:'west'}[args.side]};
  else if(action==='wall'){const [axis,key]=edgeKey(args.x,args.y,args.side).split(':'),[x,y]=key.split(',').map(Number);edit={type:'wall',edge:{axis,x,y},kind:args.type??'wall'};}
  else if(action==='floor')edit={type:'floor',cells:[{x:args.x,y:args.y}],finish:'wood'};
  else if(action==='remove'){
   if(args.id)edit={type:'remove',id:args.id};
   else if(args.edge){const wall=draft.layout.walls.find(w=>`${w.axis}:${w.x},${w.y}`===args.edge);if(!wall)return fail('Стена не найдена.');edit={type:'removeWall',id:wall.id};}
   else edit={type:'floor',cells:[{x:args.x,y:args.y}],finish:null};
  }else return fail('Выберите действие строительства.');
  edit=normalizeEdit(draft,edit);result=quoteEdit(draft.layout,edit,{lockedRoomIds});if(result.ok)draft.layout=result.next;
 }
 if(!result?.ok)return result;
 const operations=operationsConstructionBlocker(structuredClone(club),draft);if(!operations.ok)return operations;
 try{validateOccupiedLayout(club,draft.layout);syncRooms(draft);retireStaffRoomLegacyCredit(draft);validateClubLayout(draft,{previousLayout:club.layout});}catch(error){return fail(error.message);}
 const paid=constructionBudgetAdapter().apply({id:`direct-${draft.layout.revision}-${draft.finance.nextId}`,cost:result.cost,refund:result.refund},draft);if(!paid.ok)return paid;
 syncConstructionCampaign(draft,{previousLayout:club.layout});Object.assign(club,draft);
 return {ok:true,cost:result.cost,refund:result.refund,...(result.plot?{plot:result.plot}:{}),...(action==='plot'?{plot:club.layout.plots.at(-1)}:{}),...(result.room?{room:result.room}:{}),...(action==='item'?{item:club.layout.objects.at(-1)}:{})};
}
