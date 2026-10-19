import {QUESTIONS} from '../data/club.js';
import {SYSTEMS} from '../data/systems.js';
import {actorById,roomById,roomOccupants,greeting,askQuestion,recallAnswer,assignGuest,swapGuests,unassignGuest} from '../model/club.js';
import {CLUB_KEY,createClub,clubReady,waitingGuests,readyRooms,totalGuestSeats,lockedGuest,clubRating,clockText,startRoom,advanceClub,encodeClub,decodeClub} from '../model/lifecycle.js';
import {nextWaitingGuest,seatingIntent,finishSeating} from '../model/reception.js';
import {installAvatarDrag} from './avatar-drag.js';
import {paintStation} from './portrait.js';
import {graphicPortrait} from './graphic-portrait.js';
import {mapHTML,escape} from './map.js';
import {guestInformation,masterInformation} from './information.js';
import {roomReviewHTML} from './reviews.js';
const $=s=>document.querySelector(s);
let club,page=0,reportIndex=0,confirmAction=null,pendingDepartures=false,storageOK=true,placementMode=false;
function randomSeed(){const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return[...bytes].map(n=>n.toString(36)).join('-');}
try{localStorage.removeItem('nri-club-tycoon:favorites:v1');club=decodeClub(localStorage.getItem(CLUB_KEY));}catch{storageOK=false;}
club??=createClub(randomSeed());
const selected=()=>actorById(club,club.selectedId);
function save(){try{localStorage.setItem(CLUB_KEY,encodeClub(club));storageOK=true;}catch{storageOK=false;}$('#save-status').textContent=storageOK?'Сохранено':'Без автосохранения';}
function error(text=''){$('#action-error').textContent=text;}
let drawnId=null,dragIntent=null;
function draw(){paintStation($('#visitor-canvas'));const g=selected();if(!g){$('#visitor-art').innerHTML='';drawnId=null;return;}if(drawnId!==g.identity.id){$('#visitor-art').innerHTML=graphicPortrait(g.identity);drawnId=g.identity.id;}}
function renderRooms(animate=false){
  $('#rooms').innerHTML=mapHTML(club,selected(),animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?club.departures:[]);
  const ready=readyRooms(club),running=club.rooms.some(r=>r.status==='running'),count=club.guests.filter(g=>g.roomId).length;
  for(const room of ready){const button=document.createElement('button');button.type='button';button.className='room-start';button.dataset.startRoom=room.id;button.textContent='Начать игру';button.setAttribute('aria-label','Начать игру в комнате '+room.number);$('#rooms').querySelector(`[data-room="${room.id}"] .room-floor`).append(button);}
  $('#placed-count').textContent=`${count}/${totalGuestSeats(club)}`;$('#check').disabled=!clubReady(club);
  $('#check-hint').textContent=placementMode?'Выберите стул на карте.':running?'Проверить — перейти к ближайшему завершению.':ready.length?'Можно начать игру в готовой комнате.':innerWidth<=850?'Выберите гостя и стул на карте.':'Перетащите гостя на стул.';
  $('#mobile-progress').textContent=count+'/'+totalGuestSeats(club);
  $('#club-clock').textContent=clockText(club.clock);const rating=clubRating(club);
  $('#club-rating').textContent=rating===null?'За всё время: пока нет оценок':`За всё время: ★ ${rating.toLocaleString('ru',{minimumFractionDigits:1,maximumFractionDigits:1})} / 10 · ${club.rating.count} отзывов`;
  $('#last-result').hidden=!club.lastReport;
}
function renderQuestions(){const g=selected(),locked=lockedGuest(club,g);$('#questions').innerHTML=QUESTIONS.slice(page*3,page*3+3).map(q=>`<button type="button" data-question="${q.id}" class="${g.asked.includes(q.id)?'asked':''}" ${locked&&!g.asked.includes(q.id)?'disabled':''}>${escape(q.text)}${g.asked.includes(q.id)?' ·':''}</button>`).join('');$('#more-questions').textContent=`Ещё вопросы ${page+1}/${Math.ceil(QUESTIONS.length/3)} →`;}
function renderQueue(){
  const guests=club.guests.filter(g=>!lockedGuest(club,g));
  $('#queue').innerHTML=guests.map(g=>`<button type="button" data-guest="${escape(g.id)}" class="${g.roomId?'assigned ':''}${g.id===club.selectedId?'selected':''}" aria-pressed="${g.id===club.selectedId}">${escape(g.profile.name)}</button>`).join('');
  $('#queue-count').textContent=waitingGuests(club).length+' ожидают';$('#queue .selected')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function renderGuest(){
  error();const g=selected();if(!g){draw();return;}const locked=lockedGuest(club,g),age=g.identity.age,ageWord=age%10===1&&age%100!==11?'год':age%10>=2&&age%10<=4&&(age%100<12||age%100>14)?'года':'лет';
  $('#guest-name').textContent=g.identity.name;$('#guest-name').setAttribute('aria-label',g.identity.name+' — известные сведения');$('#guest-age').textContent=`${age} ${ageWord}`;$('#guest-location').textContent=locked?'ИГРАЕТ':'У СТОЙКИ';$('#guest-number').textContent=g.roomId?'КОМНАТА '+roomById(club,g.roomId).number:'ГОСТЬ';
  $('#ticket-number').textContent='';$('#ticket-name').textContent=g.identity.name;$('#assignment-status').textContent=g.roomId?`${locked?'ИГРАЕТ · ':''}КОМНАТА ${roomById(club,g.roomId).number}`:'ОЖИДАЕТ';
  $('#reply').textContent=g.lastAnswer?.reply??(locked?'Сейчас идёт игра. К услышанным ответам можно вернуться.':greeting(g));$('#question-caption').textContent=g.lastAnswer?QUESTIONS.find(q=>q.id===g.lastAnswer.questionId)?.text??'':'';
  $('#return-guest').disabled=!g.roomId||locked;$('#guest-ticket').disabled=locked;$('#history-open').disabled=!g.dialogue.length;
  const art=$('#visitor-art');art.dataset.dragGuest=g.id;art.tabIndex=locked?-1:0;art.setAttribute('role','button');art.setAttribute('aria-label',locked?'Гость играет':g.identity.name+' — перетащить на стул или нажать Enter');art.setAttribute('aria-disabled',String(locked));
  renderQuestions();renderQueue();renderRooms();draw();
}
function choose(id){if(!actorById(club,id))return;placementMode=false;club.selectedId=id;page=0;renderGuest();save();}
function showSwap(roomId){const r=roomById(club,roomId);if(!r||r.status==='running'||lockedGuest(club,selected()))return;$('#swap-copy').textContent=`С кем поменять места для ${selected().profile.name}?`;
  $('#swap-list').innerHTML=roomOccupants(club,roomId).filter(g=>g.id!==club.selectedId).map(g=>`<button type="button" data-swap="${escape(g.id)}">${escape(g.profile.name)} ⇄ ${escape(selected().profile.name)}</button>`).join('');$('#swap-dialog').showModal();}
function finishPlacement(intent){if(finishSeating(club,intent))page=0;placementMode=false;renderGuest();save();$('#game').classList.remove('show-rooms');}
function place(roomId,seat=null){const intent=seatingIntent(club),result=assignGuest(club,club.selectedId,roomId,seat);if(!result.ok){if(result.needsSwap)showSwap(roomId);else error(result.reason);return;}finishPlacement(intent);}
function exchange(id){const intent=seatingIntent(club),result=swapGuests(club,club.selectedId,id);if(result.ok)finishPlacement(intent);else error(result.reason);return result;}
function guide(id){const s=SYSTEMS[id];if(!s)return;$('#guide-title').textContent=s.name;$('#guide-content').innerHTML=`<p>${escape(s.about)}</p><h3>Кости</h3><p>${escape(s.dice)}</p><h3>Что делает игрок</h3><p>${escape(s.mechanic)}</p><h3>С чего начать</h3><p>${escape(s.learning)}</p>`;$('#guide-dialog').showModal();}
function inspect(id){const r=roomById(club,id);$('#room-title').textContent=r.session.title;$('#room-content').innerHTML=masterInformation(r);$('#room-dialog').showModal();}
function renderReport(){
  const report=club.lastReport;if(!report)return;const completed=report.completed[reportIndex];
  $('#overall-result').textContent=`${clockText(report.clock)} · Завершилось столов: ${report.completed.length}. Остальные игры продолжаются.`;
  $('#report-tabs').innerHTML=report.completed.map((r,i)=>`<button type="button" data-report="${i}" class="${i===reportIndex?'active':''}">Комната ${r.number}</button>`).join('');
  $('#room-report').innerHTML=roomReviewHTML(completed);
}
function openReport(){if(!club.lastReport)return;reportIndex=0;renderReport();$('#report-dialog').showModal();}
function fresh(){avatarDrag.cancel();const history={clock:club.clock,rating:club.rating,reviewIds:club.reviewIds};club=createClub(randomSeed(),history);page=0;placementMode=false;pendingDepartures=false;for(const d of document.querySelectorAll('dialog[open]'))d.close();$('#game').classList.remove('show-rooms');renderGuest();save();}
$('#questions').addEventListener('click',e=>{const b=e.target.closest('[data-question]');if(!b)return;const g=selected();if(lockedGuest(club,g)){const index=g.dialogue.findLastIndex(a=>a.questionId===b.dataset.question);if(index>=0)recallAnswer(club,g.id,index);}else askQuestion(club,g.id,b.dataset.question);renderGuest();save();});
$('#more-questions').addEventListener('click',()=>{page=(page+1)%Math.ceil(QUESTIONS.length/3);renderQuestions();});
$('#history-open').addEventListener('click',()=>{const g=selected();$('#history-list').innerHTML=g.dialogue.map((a,i)=>`<button type="button" data-answer="${i}">${escape(QUESTIONS.find(q=>q.id===a.questionId).text)}${a.questionId==='stories'?' · '+['книга','фильм','игра'][a.variant]:''}</button>`).join('');$('#history-dialog').showModal();});
$('#history-list').addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(!b)return;recallAnswer(club,club.selectedId,Number(b.dataset.answer));$('#history-dialog').close();renderGuest();save();});
$('#queue').addEventListener('click',e=>{const b=e.target.closest('[data-guest]');if(b){choose(b.dataset.guest);$('#game').classList.remove('show-rooms');}});
$('#rooms').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.startRoom){avatarDrag.cancel();const result=startRoom(club,b.dataset.startRoom);if(result.ok){page=0;renderGuest();save();}else error(result.reason);}else if(b.dataset.system)guide(b.dataset.system);else if(b.dataset.inspect)inspect(b.dataset.inspect);else if(b.dataset.guest){if(placementMode&&!b.closest('.is-running'))exchange(b.dataset.guest);else{choose(b.dataset.guest);$('#game').classList.remove('show-rooms');}}else if(b.dataset.place&&(placementMode||e.detail===0||innerWidth<=850||matchMedia('(pointer:coarse)').matches))place(b.dataset.place,Number(b.dataset.seat));});
$('#swap-list').addEventListener('click',e=>{const b=e.target.closest('[data-swap]');if(b&&exchange(b.dataset.swap).ok)$('#swap-dialog').close();});
$('#return-guest').addEventListener('click',()=>{if(unassignGuest(club,club.selectedId)){renderGuest();save();}});
$('#next-guest').addEventListener('click',()=>{const next=nextWaitingGuest(club);if(next)choose(next.id);});
$('#mobile-rooms').addEventListener('click',()=>$('#game').classList.add('show-rooms'));$('#close-rooms').addEventListener('click',()=>$('#game').classList.remove('show-rooms'));
$('#continue-club').addEventListener('click',()=>$('#report-dialog').close());
$('#check').addEventListener('click',()=>{const result=advanceClub(club);if(!result.ok){error(result.reason);return;}pendingDepartures=true;renderGuest();save();openReport();});
$('#last-result').addEventListener('click',openReport);$('#report-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-report]');if(b){reportIndex=Number(b.dataset.report);renderReport();}});
$('#report-dialog').addEventListener('close',()=>{if(pendingDepartures){pendingDepartures=false;renderRooms(true);}});
$('#close-guide').addEventListener('click',()=>$('#guide-dialog').close());
function showInformation(title,html,x,y){const d=$('#info-dialog');$('#info-title').textContent=title;$('#info-content').innerHTML=html;if(!d.open)d.showModal();const r=d.getBoundingClientRect();d.style.left=Math.max(12,Math.min(x,innerWidth-r.width-12))+'px';d.style.top=Math.max(12,Math.min(y,innerHeight-r.height-12))+'px';}
function contextualInformation(target,x,y){
  const guest=target.closest('[data-guest]'),master=target.closest('.master-seat[data-inspect]');
  if(guest){const g=actorById(club,guest.dataset.guest);if(g)showInformation(g.identity.name,guestInformation(g),x,y);}
  else if(master){const room=roomById(club,master.dataset.inspect);showInformation('Мастер '+room.master.name,masterInformation(room),x,y);}
  else if(target.closest('#visitor-art,#guest-name'))showInformation(selected().identity.name,guestInformation(selected()),x,y);
}
$('#game').addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const rect=e.target.getBoundingClientRect();contextualInformation(e.target,e.clientX||rect.left,e.clientY||rect.bottom);});
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('contextmenu',e=>e.preventDefault());
$('#game').addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=e.target.getBoundingClientRect();contextualInformation(e.target,r.left,r.bottom);}});
$('#guest-name').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();showInformation(selected().identity.name,guestInformation(selected()),r.left,r.bottom);});
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
$('#reset-all').addEventListener('click',()=>{$('#help-dialog').close();$('#confirm-title').textContent='Начать клуб заново?';$('#confirm-copy').textContent='Все текущие игры закончатся без отзывов, рассадка и разговоры сбросятся. Общий рейтинг клуба сохранится.';confirmAction=fresh;$('#confirm-dialog').returnValue='cancel';$('#confirm-dialog').showModal();});
$('#confirm-dialog').addEventListener('close',()=>{const action=confirmAction;confirmAction=null;if($('#confirm-dialog').returnValue==='yes')action?.();});
function chooseChair(){if(lockedGuest(club,selected()))return;placementMode=true;$('#game').classList.add('show-rooms');renderRooms();document.querySelector('.map-chair:not(:disabled)')?.focus();}
$('#guest-ticket').addEventListener('click',chooseChair);
$('#visitor-art').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseChair();}});
function selectFromAvatar(id){
  if(club.drag){dragIntent=seatingIntent(club,id);if(dragIntent?.wasWaiting)choose(id);}
  else choose(id);
}
function avatarChanged(){if(finishSeating(club,dragIntent))page=0;dragIntent=null;renderGuest();save();}
const avatarDrag=installAvatarDrag({getClub:()=>club,select:selectFromAvatar,changed:avatarChanged,placement:chooseChair,reveal:()=>$('#game').classList.add('show-rooms'),error});
new ResizeObserver(draw).observe($('#visitor-canvas'));renderGuest();save();
