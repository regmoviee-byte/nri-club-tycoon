import {createSaveStore,claimSaveWriter} from './save-store.js';
import {saveDownload,readSaveFile} from './save-files.js';
import {QUESTIONS} from '../data/club.js';
import {SYSTEMS} from '../data/systems.js';
import {actorById,roomById,roomOccupants,greeting,askQuestion,recallAnswer,assignGuest,swapGuests,unassignGuest} from '../model/club.js';
import {CLUB_KEY,createCampaign as createClub,clubReady,waitingGuests,readyRooms,totalGuestSeats,lockedGuest,clubRating,clockText,startRoom,advanceClub,encodeClub,decodeClub,executeCampaignAction,dismissGuest} from '../model/campaign.js';
import {nextWaitingGuest,seatingIntent,finishSeating} from '../model/reception.js';
import {installAvatarDrag} from './avatar-drag.js';
import {paintStation} from './portrait.js';
import {graphicPortrait} from './graphic-portrait.js';
import {escape} from './map.js';
import {layoutMapHTML as mapHTML} from './layout-map.js';
import {installMapNames} from './map-labels.js';
import {installRoomPages} from './map-room-strip.js';
import {installCampaignUI} from './campaign-ui.js';
import {constructionBudgetAdapter} from '../model/campaign-construction.js';
import {installBuildMode} from './build-mode.js';
import {createConstructionService,demoBudgetAdapter,CONSTRUCTION_DEMO_KEY} from '../model/construction.js';
import {guestInformation,masterInformation} from './information.js';
import {roomReviewHTML} from './reviews.js';
const $=s=>document.querySelector(s);
installRoomPages($('#rooms'));
installMapNames($('#rooms'));
let club,page=0,reportIndex=0,confirmAction=null,pendingDepartures=false,storageOK=true,placementMode=false,buildMode=null,campaignUI=null,storageBlocked=false,savePending=false,fileImportBusy=false,importGeneration=0,pendingImport=null;
const layoutDemo=new URLSearchParams(location.search).get('layoutDemo')==='1';
const saveKey=layoutDemo?CONSTRUCTION_DEMO_KEY:CLUB_KEY;
const writer=await claimSaveWriter(saveKey);
let saveStore=null;
function randomSeed(){const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return[...bytes].map(n=>n.toString(36)).join('-');}
try{saveStore=await createSaveStore({key:saveKey,decode:decodeClub,encode:encodeClub});club=saveStore.read();}catch{storageOK=false;storageBlocked=true;}
club??=createClub(randomSeed());
if(layoutDemo)club.constructionDemo??={balance:200000,initialBalance:200000,ledger:[]};
if(layoutDemo){
 const label=$('#layout-scene-label');label.hidden=false;label.textContent='Пробная планировка';
 const back=document.createElement('a');back.id='layout-demo-link';back.href='./';back.textContent='Вернуться в клуб';$('.layout-actions').append(back);
}
$('#game').dataset.constructionMode=layoutDemo?'demo':'campaign';
let durableClub=structuredClone(club);
const selected=()=>actorById(club,club.selectedId);
function setSaving(value){
 savePending=value;$('#game').setAttribute('aria-busy',String(value));
 if(value)$('#save-status').textContent='Сохраняем…';
 else if($('#save-status').textContent==='Сохраняем…')$('#save-status').textContent=storageOK?'Сохранено':'Действие не сохранено';
}
setSaving(false);
const mutationBlocker=()=>!writer.writable?writer.reason:savePending?'Предыдущее изменение ещё сохраняется.':fileImportBusy?'Сначала завершите или отмените загрузку сохранения.':club.drag?'Сначала завершите перемещение гостя.':storageBlocked?'Исходное сохранение повреждено и остаётся нетронутым. Сначала восстановите его или явно начните новую кампанию.':null;
// Capture before individual controls and modal dialogs: no interaction may
// mutate a second draft or drag while a durable transaction is pending.
for(const type of ['click','pointerdown','keydown','submit','change'])document.addEventListener(type,event=>{
 if(savePending||club.drag&&event.key!=='Escape'||fileImportBusy&&!event.target.closest?.('#save-files-dialog,#save-import-dialog')){event.preventDefault();event.stopImmediatePropagation();}
},true);
window.addEventListener('beforeunload',event=>{if(savePending){event.preventDefault();event.returnValue='';}});
async function save(){
 if(mutationBlocker())return false;
 setSaving(true);
 try{const snapshot=structuredClone(club);await saveStore.write(snapshot);durableClub=snapshot;storageOK=true;}
 catch(cause){club=structuredClone(durableClub);storageOK=false;renderGuest();error(storageFailure(cause));}
 finally{setSaving(false);}
 $('#save-status').textContent=storageOK?'Сохранено':'Действие не сохранено';return storageOK;
}
const storageFailure=cause=>cause?.message?.startsWith('Сохранение изменилось')?cause.message:cause?.name==='QuotaExceededError'?'В хранилище браузера закончилось место. Действие отменено; прежнее сохранение не изменено. Освободите место и повторите попытку.':'Не удалось сохранить изменение. Действие отменено; попробуйте ещё раз.';
function error(text=''){$('#action-error').textContent=text;}
let drawnId=null,dragIntent=null;
function draw(){paintStation($('#visitor-canvas'));const g=selected();if(!g){$('#visitor-art').innerHTML='';drawnId=null;return;}if(drawnId!==g.identity.id){$('#visitor-art').innerHTML=graphicPortrait(g.identity);drawnId=g.identity.id;}}
function renderRooms(animate=false){
  const viewport=$('#rooms .layout-viewport'),scroll=viewport?{left:viewport.scrollLeft,top:viewport.scrollTop}:null;
  $('#rooms').innerHTML=mapHTML(club,selected(),animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?club.departures:[]);
  const ready=readyRooms(club),running=club.rooms.some(r=>r.status==='running'),count=club.guests.filter(g=>g.roomId).length;
  $('#placed-count').textContent=`${count}/${totalGuestSeats(club)}`;$('#check').disabled=!!buildMode?.isActive()||!clubReady(club);
  $('#check-hint').textContent=placementMode?'Выберите стул на карте.':running?'Проверить — перейти к ближайшему завершению.':ready.length?'Можно начать игру в готовой комнате.':innerWidth<=850?'Выберите гостя и стул на карте.':'Перетащите гостя на стул.';
  $('#mobile-progress').textContent=count+'/'+totalGuestSeats(club);
  $('#club-clock').textContent=clockText(club.clock);const rating=clubRating(club);
  $('#club-rating').textContent=rating===null?'За всё время: пока нет оценок':`За всё время: ★ ${rating.toLocaleString('ru',{minimumFractionDigits:1,maximumFractionDigits:1})} / 10 · ${club.rating.count} отзывов`;
  $('#last-result').hidden=!club.lastReport;$('#last-result').textContent=club.lastReport?.completed?.length?'Последние отзывы':'Последний интервал';
  buildMode?.refresh();campaignUI?.render();
  if(scroll){const next=$('#rooms .layout-viewport');if(next){next.scrollLeft=scroll.left;next.scrollTop=scroll.top;}}
}
function renderQuestions(){const g=selected(),locked=lockedGuest(club,g);$('#questions').innerHTML=g?QUESTIONS.slice(page*3,page*3+3).map(q=>`<button type="button" data-question="${q.id}" class="${g.asked.includes(q.id)?'asked':''}" ${locked&&!g.asked.includes(q.id)?'disabled':''}>${escape(q.text)}${g.asked.includes(q.id)?' ·':''}</button>`).join(''):'';$('#more-questions').textContent=`Ещё вопросы ${page+1}/${Math.ceil(QUESTIONS.length/3)} →`;$('#more-questions').disabled=!g;}
function renderQueue(){
  const guests=club.guests.filter(g=>!lockedGuest(club,g));
  $('#queue').innerHTML=guests.map(g=>`<button type="button" data-guest="${escape(g.id)}" class="${g.roomId?'assigned ':''}${g.id===club.selectedId?'selected':''}" aria-pressed="${g.id===club.selectedId}">${escape(g.profile.name)}</button>`).join('');
  $('#queue-count').textContent=waitingGuests(club).length+' ожидают';$('#queue .selected')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function renderGuest(){
  error();const g=selected();
  $('#guest-name').disabled=!g;$('#dismiss-guest').disabled=!g||!!g.roomId;$('#next-guest').disabled=!waitingGuests(club).length;
  if(!g){
    $('#guest-name').textContent='У стойки пока тихо';$('#guest-age').textContent='';$('#guest-location').textContent='КЛУБ';$('#guest-number').textContent='';
    $('#ticket-name').textContent='Нет выбранного гостя';$('#assignment-status').textContent='';$('#reply').textContent='Оборудуйте комнату или выберите гостя на карте.';$('#question-caption').textContent='';
    for(const id of ['return-guest','guest-ticket','history-open'])$('#'+id).disabled=true;
    delete $('#visitor-art').dataset.dragGuest;$('#visitor-art').tabIndex=-1;
    renderQuestions();renderQueue();renderRooms();draw();return;
  }
  const locked=lockedGuest(club,g),age=g.identity.age,ageWord=age%10===1&&age%100!==11?'год':age%10>=2&&age%10<=4&&(age%100<12||age%100>14)?'года':'лет';
  $('#guest-name').textContent=g.identity.name;$('#guest-name').setAttribute('aria-label',g.identity.name+' — известные сведения');$('#guest-age').textContent=`${age} ${ageWord}`;$('#guest-location').textContent=locked?'ИГРАЕТ':'У СТОЙКИ';$('#guest-number').textContent=g.roomId?'КОМНАТА '+roomById(club,g.roomId).number:'ГОСТЬ';
  $('#ticket-number').textContent='';$('#ticket-name').textContent=g.identity.name;$('#assignment-status').textContent=g.roomId?`${locked?'ИГРАЕТ · ':''}КОМНАТА ${roomById(club,g.roomId).number}`:'ОЖИДАЕТ';
  $('#reply').textContent=g.lastAnswer?.reply??(locked?'Сейчас идёт игра. К услышанным ответам можно вернуться.':greeting(g));$('#question-caption').textContent=g.lastAnswer?QUESTIONS.find(q=>q.id===g.lastAnswer.questionId)?.text??'':'';
  $('#return-guest').disabled=!g.roomId||locked;$('#guest-ticket').disabled=locked;$('#history-open').disabled=!g.dialogue.length;
  const art=$('#visitor-art');art.dataset.dragGuest=g.id;art.tabIndex=locked?-1:0;art.setAttribute('role','button');art.setAttribute('aria-label',locked?'Гость играет':g.identity.name+' — перетащить на стул или нажать Enter');art.setAttribute('aria-disabled',String(locked));
  renderQuestions();renderQueue();renderRooms();draw();
}
async function choose(id){if(!actorById(club,id))return;const result=await commitModel(draft=>{draft.selectedId=id;return{ok:true};});if(!result.ok){error(result.reason);return;}placementMode=false;page=0;renderGuest();}
function showSwap(roomId){const r=roomById(club,roomId);if(!r||r.status==='running'||lockedGuest(club,selected()))return;$('#swap-copy').textContent=`С кем поменять места для ${selected().profile.name}?`;
  $('#swap-list').innerHTML=roomOccupants(club,roomId).filter(g=>g.id!==club.selectedId).map(g=>`<button type="button" data-swap="${escape(g.id)}">${escape(g.profile.name)} ⇄ ${escape(selected().profile.name)}</button>`).join('');$('#swap-dialog').showModal();}
function finishPlacement(){page=0;placementMode=false;renderGuest();$('#game').classList.remove('show-rooms');}
async function place(roomId,seat=null){const result=await commitModel(draft=>{const intent=seatingIntent(draft),result=assignGuest(draft,draft.selectedId,roomId,seat);if(result.ok)finishSeating(draft,intent);return result;});if(!result.ok){if(result.needsSwap)showSwap(roomId);else error(result.reason);return;}finishPlacement();}
async function exchange(id){const result=await commitModel(draft=>{const intent=seatingIntent(draft),result=swapGuests(draft,draft.selectedId,id);if(result.ok)finishSeating(draft,intent);return result;});if(result.ok)finishPlacement();else error(result.reason);return result;}
function guide(id){const s=SYSTEMS[id];if(!s)return;$('#guide-title').textContent=s.name;$('#guide-content').innerHTML=`<p>${escape(s.about)}</p><h3>Кости</h3><p>${escape(s.dice)}</p><h3>Что делает игрок</h3><p>${escape(s.mechanic)}</p><h3>С чего начать</h3><p>${escape(s.learning)}</p>`;$('#guide-dialog').showModal();}
function inspect(id){const r=roomById(club,id);if(!r?.master||!r?.session){campaignUI?.open('rooms',id);return;}$('#room-title').textContent=r.session.title;$('#room-content').innerHTML=masterInformation(r);$('#room-dialog').showModal();}
function renderReport(){
  const report=club.lastReport;if(!report)return;const completed=report.completed[reportIndex];
  $('#overall-result').textContent=`${clockText(report.clock)} · Завершилось столов: ${report.completed.length}. ${club.rooms.some(room=>room.status==='running')?'Остальные игры продолжаются.':'Можно собирать следующую компанию.'}`;
  const finance=report.finance;$('#report-finances').textContent=Number.isFinite(finance?.beforeCash)?`За этот интервал времени всего клуба: поступления +${Math.round(finance.incoming)} ₽, расходы −${Math.round(finance.outgoing)} ₽. Касса ${Math.round(finance.beforeCash)} → ${Math.round(finance.cash)} ₽ (${finance.cashChange>=0?'+':''}${Math.round(finance.cashChange)} ₽).`:`Содержание за интервал: ${Math.round(report.operations?.total??0)} ₽. В кассе ${Math.round(finance?.cash??club.finance.cash)} ₽.`;
  $('#report-tabs').innerHTML=report.completed.map((r,i)=>`<button type="button" data-report="${i}" class="${i===reportIndex?'active':''}">Комната ${r.number}</button>`).join('');
  $('#report-title').textContent=completed?'Отзывы гостей':'Итог интервала';
  $('#room-report').innerHTML=completed?roomReviewHTML(completed):'<p>За этот интервал игры не завершались. Предыдущие отзывы сохранены в истории гостей.</p>';
}
function openReport(){if(!club.lastReport)return;reportIndex=0;renderReport();$('#report-dialog').showModal();}
async function commitModel(change){
 const blocked=mutationBlocker();if(blocked)return{ok:false,reason:blocked};
 setSaving(true);
 try{
  const draft=structuredClone(club),result=change(draft);if(!result?.ok)return result;
  await saveStore.write(draft);club=draft;durableClub=structuredClone(draft);storageOK=true;$('#save-status').textContent='Сохранено';return result;
 }catch(cause){storageOK=false;$('#save-status').textContent='Не удалось сохранить';return{ok:false,reason:storageFailure(cause)};}
 finally{setSaving(false);if(storageOK)$('#save-status').textContent='Сохранено';}
}
async function fresh(){
 if(!writer.writable)return{ok:false,reason:writer.reason};
 if(savePending)return{ok:false,reason:'Предыдущее изменение ещё сохраняется.'};
 if(fileImportBusy)return{ok:false,reason:'Сначала завершите или отмените загрузку сохранения.'};
 if(!storageBlocked&&club.campaign.status!=='bankrupt')return{ok:false,reason:'Новую кампанию можно начать после завершения текущей.'};
 await avatarDrag.cancel();const next=createClub(randomSeed());setSaving(true);
 try{if(!saveStore)saveStore=await createSaveStore({key:saveKey,decode:decodeClub,encode:encodeClub});await saveStore.write(next,{archive:true});}
 catch{$('#save-status').textContent='Не удалось сохранить';return{ok:false,reason:'Не удалось сохранить предыдущее прохождение. Новая игра не начата. Попробуйте ещё раз.'};}
 finally{setSaving(false);}
 buildMode?.deactivate();club=next;durableClub=structuredClone(club);storageBlocked=false;storageOK=true;page=0;placementMode=false;pendingDepartures=false;
 for(const d of document.querySelectorAll('dialog[open]'))d.close();$('#game').classList.remove('show-rooms');renderGuest();$('#save-status').textContent='Сохранено';return{ok:true};
}
async function campaignAction(action){const result=await(action.type==='newCampaign'?fresh():commitModel(draft=>executeCampaignAction(draft,action)));if(result?.ok){page=0;renderGuest();if(result.report?.completed?.length)queueMicrotask(()=>{campaignUI?.close();openReport();});}return result;}
async function startSelectedRoom(id,acceptRisk=false){
 await avatarDrag.cancel();const result=await commitModel(draft=>startRoom(draft,id,{acceptRisk}));
 if(result.ok){page=0;renderGuest();}
 else if(result.needsRiskConfirmation){$('#confirm-title').textContent='Начать игру с риском убытка?';$('#confirm-copy').textContent=result.reason+' Если возникнет долг, новые партии закроются. Можно отменить запуск, закрыть пустые комнаты или продать свободный комплект в «Дела клуба → Касса». Продолжение не гарантирует оплату гостей.';confirmAction=()=>startSelectedRoom(id,true);$('#confirm-dialog').returnValue='cancel';$('#confirm-dialog').showModal();}
 else error(result.reason);
}
$('#questions').addEventListener('click',async e=>{const b=e.target.closest('[data-question]');if(!b)return;const question=b.dataset.question;const result=await commitModel(draft=>{const g=actorById(draft,draft.selectedId);if(lockedGuest(draft,g)){const index=g.dialogue.findLastIndex(a=>a.questionId===question);if(index>=0)recallAnswer(draft,g.id,index);}else askQuestion(draft,g.id,question);return{ok:true};});if(result.ok)renderGuest();else error(result.reason);});
$('#more-questions').addEventListener('click',()=>{page=(page+1)%Math.ceil(QUESTIONS.length/3);renderQuestions();});
$('#history-open').addEventListener('click',()=>{const g=selected();$('#history-list').innerHTML=g.dialogue.map((a,i)=>`<button type="button" data-answer="${i}">${escape(QUESTIONS.find(q=>q.id===a.questionId).text)}${a.questionId==='stories'?' · '+['книга','фильм','игра'][a.variant]:''}</button>`).join('');$('#history-dialog').showModal();});
$('#history-list').addEventListener('click',async e=>{const b=e.target.closest('[data-answer]');if(!b)return;const index=Number(b.dataset.answer),result=await commitModel(draft=>{recallAnswer(draft,draft.selectedId,index);return{ok:true};});if(result.ok){$('#history-dialog').close();renderGuest();}else error(result.reason);});
$('#queue').addEventListener('click',e=>{const b=e.target.closest('[data-guest]');if(b){choose(b.dataset.guest);$('#game').classList.remove('show-rooms');}});
$('#rooms').addEventListener('click',e=>{if(buildMode?.isActive())return;const b=e.target.closest('button');if(!b)return;if(b.dataset.startRoom){startSelectedRoom(b.dataset.startRoom);}else if(b.dataset.system)guide(b.dataset.system);else if(b.dataset.inspect)inspect(b.dataset.inspect);else if(b.dataset.guest){if(placementMode&&!b.closest('.is-running')&&!b.classList.contains('waiting-seat'))exchange(b.dataset.guest);else{choose(b.dataset.guest);$('#game').classList.remove('show-rooms');}}else if(b.dataset.place&&(placementMode||e.detail===0||innerWidth<=850||matchMedia('(pointer:coarse)').matches))place(b.dataset.place,Number(b.dataset.seat));});
$('#swap-list').addEventListener('click',async e=>{const b=e.target.closest('[data-swap]');if(b&&(await exchange(b.dataset.swap)).ok)$('#swap-dialog').close();});
$('#return-guest').addEventListener('click',async()=>{const result=await commitModel(draft=>({ok:unassignGuest(draft,draft.selectedId)}));if(result.ok)renderGuest();else if(result.reason)error(result.reason);});
$('#dismiss-guest').addEventListener('click',async()=>{const result=await commitModel(draft=>dismissGuest(draft,draft.selectedId));if(result.ok)renderGuest();else error(result.reason);});
$('#next-guest').addEventListener('click',()=>{const next=nextWaitingGuest(club);if(next)choose(next.id);});
$('#mobile-rooms').addEventListener('click',()=>$('#game').classList.add('show-rooms'));$('#close-rooms').addEventListener('click',()=>{buildMode?.deactivate();$('#game').classList.remove('show-rooms');});
$('#continue-club').addEventListener('click',()=>$('#report-dialog').close());
$('#check').addEventListener('click',async()=>{if(buildMode?.isActive())return;const result=await commitModel(advanceClub);if(!result.ok){error(result.reason);return;}pendingDepartures=Boolean(result.report?.completed?.length);renderGuest();if(result.report?.completed?.length)openReport();if(result.stopped){campaignUI?.open('equipment');error(result.reason);}});
$('#last-result').addEventListener('click',openReport);$('#report-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-report]');if(b){reportIndex=Number(b.dataset.report);renderReport();}});
$('#report-dialog').addEventListener('close',()=>{if(pendingDepartures){pendingDepartures=false;renderRooms(true);}});
$('#close-guide').addEventListener('click',()=>$('#guide-dialog').close());
function showInformation(title,html,x,y){const d=$('#info-dialog');$('#info-title').textContent=title;$('#info-content').innerHTML=html;if(!d.open)d.showModal();$('#info-close').focus({preventScroll:true});$('#info-content').scrollTop=0;d.scrollTop=0;const r=d.getBoundingClientRect();d.style.left=Math.max(12,Math.min(x,innerWidth-r.width-12))+'px';d.style.top=Math.max(12,Math.min(y,innerHeight-r.height-12))+'px';}
function contextualInformation(target,x,y){
  const guest=target.closest('[data-guest]'),master=target.closest('.master-seat[data-inspect]');
  if(guest){const g=actorById(club,guest.dataset.guest);if(g)showInformation(g.identity.name,guestInformation(g,club),x,y);}
  else if(master){const room=roomById(club,master.dataset.inspect);showInformation('Мастер '+room.master.name,masterInformation(room),x,y);}
  else if(selected()&&target.closest('#visitor-art,#guest-name'))showInformation(selected().identity.name,guestInformation(selected(),club),x,y);
}
$('#game').addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const rect=e.target.getBoundingClientRect();contextualInformation(e.target,e.clientX||rect.left,e.clientY||rect.bottom);});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('contextmenu',e=>e.preventDefault());
$('#game').addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=e.target.getBoundingClientRect();contextualInformation(e.target,r.left,r.bottom);}});
$('#guest-name').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();showInformation(selected().identity.name,guestInformation(selected(),club),r.left,r.bottom);});
$('#info-close').addEventListener('click',()=>$('#info-dialog').close());
for(const id of ['info-dialog','room-dialog'])$('#'+id).addEventListener('click',e=>{const d=e.currentTarget,r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});
for(const id of ['guide-dialog','room-dialog','history-dialog','swap-dialog','report-dialog','info-dialog']){
  const dialog=$('#'+id);let opener=null;
  const original=dialog.showModal.bind(dialog);dialog.showModal=()=>{opener=document.activeElement;original();};
  dialog.addEventListener('close',()=>{if(opener?.isConnected&&!opener.disabled)opener.focus();else (innerWidth<=850?$('#mobile-rooms'):document.querySelector('.map-chair:not(:disabled)'))?.focus();});
}
$('#rooms').addEventListener('animationend',e=>{if(e.animationName==='leave-room'&&e.target.classList.contains('chair-3'))e.target.closest('[data-room]').querySelector('.departure-group')?.remove();});
document.addEventListener('click',e=>{const b=e.target.closest('[data-close]');if(b)$('#'+b.dataset.close).close();});
$('#help-open').addEventListener('click',()=>$('#help-dialog').showModal());
function fileMessage(message){$('#save-file-message').textContent=message;}
function importBusy(value){
 fileImportBusy=value;$('#save-download').disabled=value||storageBlocked;$('#save-upload').disabled=value||!writer.writable;
}
function cancelFileImport(){
 if(savePending)return;
 importGeneration++;pendingImport=null;importBusy(false);
}
$('#save-menu-open').addEventListener('click',()=>{importBusy(false);fileMessage(storageBlocked?'Текущее сохранение требует восстановления. Можно загрузить исправный файл.':'');$('#save-files-dialog').showModal();});
$('#save-download').addEventListener('click',()=>{
 if(savePending||fileImportBusy||club.drag||storageBlocked)return;
 const {raw,filename}=saveDownload(durableClub),url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');
 link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 fileMessage('Файл сохранения готов. Перенесите его на другое устройство и выберите «Загрузить сохранение».');
});
$('#save-upload').addEventListener('click',()=>{if(!writer.writable||savePending||fileImportBusy||club.drag)return;$('#file-save-input').value='';$('#file-save-input').click();});
$('#file-save-input').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';
 if(!file||!writer.writable||savePending||fileImportBusy||club.drag)return;
 const generation=++importGeneration;importBusy(true);fileMessage('Проверяем файл…');
 try{
  const next=await readSaveFile(file);
  if(generation!==importGeneration)return;
  pendingImport=next;$('#save-import-summary').textContent=`Файл «${file.name}». Формат ${next.version}, ${next.rating.count} отзывов, в кассе ${Math.round(next.finance.cash).toLocaleString('ru')} ₽.`;
  $('#save-import-error').textContent='';fileMessage('Файл проверен. Подтвердите замену текущего прогресса.');$('#save-import-dialog').showModal();
 }catch(cause){if(generation===importGeneration){pendingImport=null;importBusy(false);fileMessage(cause.message);}}
});
$('#save-import-cancel').addEventListener('click',()=>$('#save-import-dialog').close());
$('#save-import-dialog').addEventListener('cancel',event=>{if(savePending)event.preventDefault();});
$('#save-import-dialog').addEventListener('close',()=>{if(!savePending){cancelFileImport();fileMessage('Загрузка отменена. Текущий прогресс не изменён.');}});
$('#save-files-dialog').addEventListener('close',()=>{if(!savePending)cancelFileImport();});
$('#save-import-confirm').addEventListener('click',async()=>{
 if(!pendingImport||!writer.writable||savePending||club.drag)return;
 const next=pendingImport;setSaving(true);$('#save-import-error').textContent='';
 try{
  if(!saveStore)saveStore=await createSaveStore({key:saveKey,decode:decodeClub,encode:encodeClub});
  // Keep the existing writer lock and CAS check. Backup and replacement commit
  // atomically; do not replace the live campaign before this promise resolves.
  await saveStore.write(next,{archive:true});
 }catch(cause){$('#save-import-error').textContent=storageFailure(cause);setSaving(false);return;}
 setSaving(false);
 // Recreate all scene/controllers from the committed record, including cameras,
 // open dialogs and construction drafts. No second draft may autosave meanwhile.
 location.reload();
});
$('#confirm-dialog').addEventListener('close',()=>{const action=confirmAction;confirmAction=null;if($('#confirm-dialog').returnValue==='yes')action?.();});
function chooseChair(){if(buildMode?.isActive()||lockedGuest(club,selected()))return;placementMode=true;$('#game').classList.add('show-rooms');renderRooms();document.querySelector('.map-chair:not(:disabled)')?.focus();}
$('#guest-ticket').addEventListener('click',chooseChair);
$('#visitor-art').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseChair();}});
function selectFromAvatar(id){
  if(club.drag){dragIntent=seatingIntent(club,id);if(dragIntent?.wasWaiting){club.selectedId=id;page=0;renderGuest();}}
  else return choose(id);
}
function avatarChanged(){if(finishSeating(club,dragIntent))page=0;dragIntent=null;renderGuest();return save();}
const avatarDrag=installAvatarDrag({getClub:()=>club,select:selectFromAvatar,changed:avatarChanged,placement:chooseChair,reveal:()=>$('#game').classList.add('show-rooms'),error,enabled:()=>writer.writable&&!storageBlocked&&!savePending&&!fileImportBusy&&!buildMode?.isActive()});
const construction=createConstructionService({getClub:()=>club,replaceClub:next=>{club=next;},persist:async next=>{if(!writer.writable)throw new Error(writer.reason);if(storageBlocked)throw new Error('Сохранение требует восстановления.');try{await saveStore.write(next);durableClub=structuredClone(next);}catch(cause){throw new Error(storageFailure(cause));}},onChange:()=>{storageOK=true;renderGuest();$('#save-status').textContent='Сохранено';},economy:layoutDemo?demoBudgetAdapter():constructionBudgetAdapter()});
async function commitConstruction(...args){
 const blocked=mutationBlocker();if(blocked)return{ok:false,reason:blocked};
 setSaving(true);try{const result=await construction.commit(...args);if(!result.ok)$('#save-status').textContent='Действие не сохранено';return result;}finally{setSaving(false);}
}
buildMode=installBuildMode({getClub:()=>club,root:$('#game'),map:$('#rooms'),button:$('#build-toggle'),quote:construction.quote,commit:commitConstruction,getStatus:construction.getStatus,onMode:active=>{avatarDrag.cancel();placementMode=false;$('#check').disabled=active||!clubReady(club);}});
// The campaign integrator supplies a draft-only budget adapter. This hook does
// not introduce an independent wallet into the normal club save.
window.nriConstruction={quote:construction.quote,commit:commitConstruction,attachEconomy:adapter=>{construction.attachEconomy(adapter);buildMode.refresh();},getStatus:construction.getStatus};
campaignUI=installCampaignUI({getClub:()=>club,onAction:campaignAction,root:$('#game')});
new ResizeObserver(draw).observe($('#visitor-canvas'));renderGuest();await save();
if(!writer.writable){
 $('#game').inert=true;$('#save-status').textContent='Только просмотр';
 const notice=document.createElement('aside');notice.className='save-readonly-notice';notice.setAttribute('role','status');notice.textContent=writer.reason;
 const reload=document.createElement('button');reload.type='button';reload.textContent='Перезагрузить';reload.onclick=()=>location.reload();notice.append(reload);document.body.prepend(notice);
}
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
if(storageBlocked){
 const dialog=document.createElement('dialog');dialog.innerHTML='<div class="small-dialog"><h2>Сохранение требует восстановления</h2><p>Исходная запись осталась нетронутой. Можно сохранить её копию и начать отдельную новую кампанию.</p><button type="button" id="save-corrupt-copy">Скачать исходную запись</button><button type="button" id="replace-corrupt">Новая кампания…</button><button type="button" id="close-corrupt">Закрыть</button></div>';document.body.append(dialog);dialog.showModal();
 dialog.querySelector('#save-corrupt-copy').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([saveStore?.raw()??localStorage.getItem(saveKey)??''],{type:'application/json'}));a.href=url;a.download='club-original-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 dialog.querySelector('#replace-corrupt').onclick=()=>{dialog.close();$('#confirm-title').textContent='Создать новую кампанию?';$('#confirm-copy').textContent='Исходная запись будет сохранена отдельной копией. Новый клуб начнёт собственную историю.';confirmAction=async()=>{const result=await fresh();if(!result.ok)error(result.reason);};$('#confirm-dialog').returnValue='cancel';$('#confirm-dialog').showModal();};
 dialog.querySelector('#close-corrupt').onclick=()=>dialog.close();
}
