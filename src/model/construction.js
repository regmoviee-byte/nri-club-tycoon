import {quoteEdit,tileKey,objectCells,roomPurpose} from './layout.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
import {syncLayoutRooms,validateClubLayout,validateOccupiedLayout,constructionLockedRoomIds} from './layout-club.js';
import {replenish} from './lifecycle.js';
import {syncRooms as syncCampaignRooms,replenish as replenishCampaign,updateCampaign} from './campaign.js';
import {operationsConstructionBlocker,ensureOperations} from './operations.js';
import {retireStaffRoomLegacyCredit} from './staff-room.js';
import {investmentQuote} from './finance-breakdown.js';

export const CONSTRUCTION_DEMO_KEY='nri-club-tycoon:layout-demo:v1';
const clone=value=>structuredClone(value);
const failure=reason=>({ok:false,reason});
const money=n=>Number.isSafeInteger(n)&&n>=0;
const fingerprint=edit=>JSON.stringify(edit);

// IDs and automatic seat binding are resolved before the preview is shown.
// The revision check makes the same resolution reproducible at confirmation.
export function normalizeEdit(club,input) {
  const edit=clone(input),layout=club.layout;
  function bindChair(object,previous=null) {
    if(BUILD_CATALOG[object.kind]?.family!=='chair')return object;
    const cells=objectCells(object);
    const zone=layout.rooms.find(r=>cells.length&&cells.every(cell=>r.cells.some(c=>tileKey(c.x,c.y)===tileKey(cell.x,cell.y))));
    if(!zone){delete object.roomId;delete object.role;delete object.seat;return object;}
    object.roomId=zone.id;
    if(roomPurpose(zone)!=='game'){delete object.role;delete object.seat;return object;}
    const chairs=layout.objects.filter(o=>o.id!==object.id&&o.roomId===zone.id&&BUILD_CATALOG[o.kind]?.family==='chair');
    const freeSeat=[0,1,2,3].find(n=>!chairs.some(o=>o.role==='guest'&&o.seat===n));
    if(object.role===undefined)object.role=freeSeat===undefined?'master':'guest';
    if(object.role==='guest'&&(object.seat===undefined||previous&&previous.roomId!==zone.id))object.seat=freeSeat;
    if(object.role==='master')delete object.seat;
    return object;
  }
  if(edit.type==='place') {
    const object=edit.object??Object.fromEntries(Object.entries(edit).filter(([key])=>key!=='type'));
    object.id??=`object-${layout.revision+1}`;
    object.rotation??=0;
    const zone=layout.rooms.find(r=>r.cells.some(c=>tileKey(c.x,c.y)===tileKey(object.x,object.y)));
    if(zone&&object.roomId===undefined)object.roomId=zone.id;
    bindChair(object);
    return {type:'place',object};
  }
  if(edit.type==='move') {
    const previous=layout.objects.find(o=>o.id===edit.id);
    if(BUILD_CATALOG[previous?.kind]?.family==='chair') {
      const object=bindChair({...previous,...edit},previous);
      for(const key of ['roomId','role','seat'])edit[key]=object[key]??null;
    }
  }
  if(edit.type==='room') {
    const previous=layout.rooms.find(r=>r.id===edit.id),purpose=edit.purpose??previous?.purpose??'game';
    edit.number??=previous&&roomPurpose(previous)===purpose?previous.number:Math.max(0,...layout.rooms.filter(r=>roomPurpose(r)===purpose).map(r=>r.number))+1;
    if(!edit.id){const prefix=purpose==='staff'?'staff-room':'room',ids=new Set([...layout.rooms,...layout.objects,...layout.walls,...layout.plots].map(o=>o.id));let suffix=0;edit.id=`${prefix}-${edit.number}`;while(ids.has(edit.id))edit.id=`${prefix}-${edit.number}-${++suffix}`;}
    edit.name??=previous?.name??(purpose==='staff'?`Отдых мастеров ${edit.number}`:`Комната ${edit.number}`);
  }
  return edit;
}

// A budget adapter edits only this draft. No remote debit or separate storage is
// allowed here: the caller saves layout, receipt and budget as one club envelope.
export function demoBudgetAdapter() {
  return {name:'Пробная планировка',apply(transaction,draft) {
    const ledger=draft.constructionDemo;
    if(!ledger||!money(ledger.balance))return failure('Повреждён пробный бюджет.');
    const next=ledger.balance-transaction.cost+transaction.refund;
    if(next<0)return failure('В пробном бюджете недостаточно средств.');
    if(!Number.isSafeInteger(next))return failure('Сумма операции слишком велика.');
    ledger.balance=next;
    ledger.ledger.push({id:transaction.id,cost:transaction.cost,refund:transaction.refund,balance:next});
    return {ok:true};
  }};
}

export function createConstructionService({getClub,replaceClub,persist,onChange=()=>{},economy=null}) {
  const isAsync=fn=>fn?.constructor?.name==='AsyncFunction';
  if(typeof persist!=='function')throw new TypeError('Нужно атомарное сохранение планировки.');
  if(economy&&(typeof economy.apply!=='function'||isAsync(economy.apply)))throw new TypeError('Нужен синхронный адаптер бюджета для черновика клуба.');
  let busy=false,adapter=economy;
  function quote(input) {
    const club=getClub();
    try {
      const edit=normalizeEdit(club,input);
      const result=quoteEdit(club.layout,edit,{lockedRoomIds:constructionLockedRoomIds(club)});
      if(!result.ok)return result;
      validateOccupiedLayout(club,result.next);
      const draft=retireStaffRoomLegacyCredit(clone(club));draft.layout=result.next;
      const operations=operationsConstructionBlocker(clone(club),draft);if(!operations.ok)return operations;
      if(draft.finance)syncCampaignRooms(draft);else syncLayoutRooms(draft);
      retireStaffRoomLegacyCredit(draft);validateClubLayout(draft,{previousLayout:club.layout});
      return {...result,edit,baseRevision:club.layout.revision,...(club.finance?{investment:investmentQuote(club,{cost:result.cost,refund:result.refund,afterClub:draft})}:{})};
    }catch(error){return failure(error.message||'Не удалось проверить планировку.');}
  }
  async function commit(input,{transactionId,baseRevision}={}) {
    if(busy)return failure('Предыдущая операция ещё сохраняется.');
    if(typeof transactionId!=='string'||!transactionId.length||transactionId.length>160)return failure('У операции нет корректного номера.');
    const club=getClub(),key=fingerprint(input);
    const previous=club.construction?.transactions?.find(t=>t.id===transactionId);
    if(previous)return previous.fingerprint===key?{...previous.result,replayed:true}:failure('Этот номер операции уже использован.');
    if(baseRevision!==club.layout.revision)return failure('Планировка изменилась. Проверьте новую стоимость перед подтверждением.');
    if(!adapter)return failure('Покупки в клубе ещё не подключены. Откройте «Пробную планировку» для отдельной проверки строительства.');
    busy=true;
    try {
      const preview=quote(input);
      if(!preview.ok)return preview;
      if(!money(preview.cost)||!money(preview.refund))return failure('Некорректная стоимость операции.');
      const draft=retireStaffRoomLegacyCredit(clone(club));draft.layout=preview.next;
      if(draft.finance)syncCampaignRooms(draft);else syncLayoutRooms(draft);
      const transaction={id:transactionId,cost:preview.cost,refund:preview.refund,edit:clone(preview.edit),baseRevision};
      const paid=adapter.apply(Object.freeze(transaction),draft);
      if(paid&&typeof paid.then==='function')throw new Error('Адаптер бюджета должен изменять только черновик, без внешних операций.');
      if(!paid?.ok)return failure(paid?.reason||'Покупка отклонена.');
      // Only purchased games and actually hired masters can open new capacity.
      if(draft.finance){syncCampaignRooms(draft);ensureOperations(draft);replenishCampaign(draft,{removeExpired:false});updateCampaign(draft);}else replenish(draft,{removeExpired:false});
      retireStaffRoomLegacyCredit(draft);validateClubLayout(draft,{previousLayout:club.layout});
      const result={ok:true,transactionId,cost:preview.cost,refund:preview.refund,revision:draft.layout.revision};
      draft.construction??={version:1,transactions:[]};
      draft.construction.transactions.push({id:transactionId,fingerprint:key,result});
      // persist must throw on failure; the live club is replaced only afterwards.
      const saved=persist(draft);
      if(saved&&typeof saved.then==='function')await saved;
      replaceClub(draft);
      // A repaint failure cannot turn an already saved purchase into a failed
      // purchase, which would encourage a second payment on retry.
      try{onChange(result);}catch(error){return {...result,notificationError:error.message||'Не удалось обновить экран.'};}
      return result;
    }catch(error){return failure(error.message||'Не удалось сохранить покупку.');}
    finally{busy=false;}
  }
  return {
    quote,commit,
    attachEconomy(next){if(!next||typeof next.apply!=='function'||isAsync(next.apply))throw new TypeError('Нужен синхронный адаптер apply(transaction, draftClub).');adapter=next;},
    getStatus(){const club=getClub();return {label:club.constructionDemo?'Пробная планировка · отдельное сохранение':adapter?.name||'Предпросмотр планировки',balance:club.constructionDemo?.balance??club.finance?.cash,demo:!!club.constructionDemo,canPurchase:!!adapter,busy};},
  };
}
