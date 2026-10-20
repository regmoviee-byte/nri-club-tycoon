import {createCampaign,decodeClub,encodeClub,CLUB_KEY,campaignMarket,campaignStatus,executeCampaignAction,startRoom,advanceClub,readyRooms,runningRooms,clockText,updateCampaign,dismissGuest,guestFlowStatus} from '../model/campaign.js';
import {tablePlan,quickInterview,QUICK_INTERVIEW_QUESTIONS} from '../model/table-plan.js';
import {askQuestion as askGuest,assignGuest,swapGuests,unassignGuest,roomOccupants} from '../model/club.js';
import {createSaveStore,claimSaveWriter} from './save-store.js';
import {readSaveFile,saveDownload} from './save-files.js';
import {createConstructionService,normalizeEdit} from '../model/construction.js';
import {constructionBudgetAdapter} from '../model/campaign-construction.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
import {ECONOMY} from '../data/commerce.js';
import {SYSTEMS} from '../data/systems.js';
import {SESSIONS,QUESTIONS} from '../data/club.js';
import {clubPrestige,prestigeNeeded,effectText} from '../model/upgrades.js';
import {roomEdit,rectangle,nearestEdge} from '../model/studio-building.js';
import {objectCells,tileKey} from '../model/layout.js';
import {ownedCells} from '../model/campaign-layout.js';
import {syncGuestWaiting} from '../model/guest-waiting.js';
import {createWorld,itemThumbnail,TABLETOP_HEIGHT} from './world.js';
import {sessionForecast} from '../model/finances.js';
import {cleanZone} from '../model/operations.js';
import {receptionStatus} from '../model/reception-area.js';
import {visibleGuestHistory,visibleDemand} from '../model/guests-history.js';
import {portrait,personArt,escapeHTML as esc} from './people.js';
import {surfaceEditAt,surfacePose,normalizeAngle,parentTable} from '../model/table-surface.js';
import {wallPlacementAt,wallMountHeight} from '../model/wall-placement.js';

const root=document.querySelector('#game');
const money=n=>(Number(n)||0).toLocaleString('ru-RU',{maximumFractionDigits:2})+' ₽';
const uid=()=>crypto.randomUUID();
const icons={club:'M4 11L12 4l8 7v9H4ZM9 20v-7h6v7',guests:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 7m2 3q3 2 3 7',rooms:'M3 3h18v18H3ZM3 12h8V3m0 9h10m-10 0v9',build:'M4 20l7-7M8 5l3-3 11 11-3 3ZM3 21l-1-4 4-4 4 4-4 4Z',team:'M8 3h8l4 6-8 13L4 9ZM4 9h16M8 3l4 19 4-19',library:'M4 3h5v18H4Zm7 2h4v16h-4Zm6-1l4-1 3 17-4 1Z',service:'M4 7h13v7a6 6 0 0 1-12 0V7Zm13 1h2a3 3 0 0 1 0 6h-2M3 22h17M8 2v2m5-2v2',finance:'M3 5h18v15H3Zm0 4h18m-7 4h7v4h-7Z',goals:'M5 3v19M5 3h14l-4 5 4 5H5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',save:'M4 3h14l3 3v15H3V3ZM7 3v6h9V3M7 21v-7h10v7',plus:'M12 4v16M4 12h16'};
const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(icons[name]??icons.club)+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const button=(label,action,attrs='',className='')=>'<button type="button" data-action="'+action+'" class="'+className+'" '+attrs+'>'+label+'</button>';
const options=(list,value)=>list.map(([id,name])=>'<option value="'+esc(id)+'" '+(id===value?'selected':'')+'>'+esc(name)+'</option>').join('');
const nameOf=g=>g?.profile?.name??g?.name??'Гость';
function fitItemIcons(container){for(const svg of container.querySelectorAll('svg.item-art')){const b=svg.getBBox();if(b.width&&b.height)svg.setAttribute('viewBox',[b.x-4,b.y-4,b.width+8,b.height+8].join(' '));}}
let club,store,writer,busy=false,readOnly=false,world,buildService,undo=null;
const ui={tab:'club',guest:null,room:null,object:null,tool:'select',kind:'plant',rotation:0,category:'furniture',purpose:'game',furnished:true,cells:new Map(),edges:new Map(),preview:null,hover:null,pending:null,walls:'cut',message:'',error:false,candidates:false,ledgerLimit:40,seatArmed:false,catalogSearch:'',libraryTab:'adventures',librarySearch:''};
const panels={club:['СВОДКА КЛУБА','Сегодня в клубе'],guests:['РАЗГОВОР У РЕСЕПШНА','Знакомство'],rooms:['НАСТРОЙКИ И СОСТАВ СТОЛОВ','Игровые комнаты'],build:['РЕДАКТОР ПЛАНИРОВКИ','Строительство'],team:['ШТАТ, ОТДЫХ И НАЙМ','Мастера'],library:['ИГРЫ И ИСТОРИИ','Библиотека'],service:['ЗАБОТА О КЛУБЕ','Сервис'],finance:['ДЕНЬГИ И РЕЗУЛЬТАТЫ ПАРТИЙ','Касса и отзывы'],goals:['ОТ ПЕРВОГО СТОЛА К КЛУБУ','Развитие'],settings:['ВАША КАМПАНИЯ','Сохранение']};

function layout(){
 root.innerHTML='<header class="game-header"><a class="brand" href="#" data-action="nav" data-tab="club">'+icon('team')+'<span>НРИ<span class="brand-thin"> / КЛУБ</span><small>МЕСТО ДЛЯ ВАШИХ ИСТОРИЙ</small></span></a><div id="resources" class="resources"></div><button type="button" data-action="nav" data-tab="settings" class="save-button">'+icon('save')+'<span id="save-state">Сохранено</span></button></header><main class="workbench"><nav class="game-rail" aria-label="Управление клубом">'+Object.entries({club:'Клуб',guests:'Гости',rooms:'Партии',build:'Строить',team:'Мастера',library:'Игры',service:'Сервис',finance:'Касса',goals:'Развитие'}).map(([tab,title])=>'<button type="button" data-action="nav" data-tab="'+tab+'" title="'+title+'">'+icon(tab)+'<span>'+title+'</span></button>').join('')+'<div class="rail-spacer"></div>'+button(icon('plus')+'<span>Новая игра</span>','new-game','','new-game-rail')+'</nav><aside class="side-panel"><div class="panel-heading"><small id="panel-eyebrow"></small><h1 id="panel-title"></h1></div><div id="panel-content" class="panel-content" tabindex="-1"></div></aside><div class="panel-resizer" role="separator" aria-label="Размер панели" aria-orientation="vertical" tabindex="0"></div><section class="map-pane" aria-label="Клуб"><div class="map-heading"><div><small>ВАШ КЛУБ</small><strong id="map-summary"></strong></div><div class="camera-controls">'+button('−','zoom-out','aria-label="Уменьшить карту"')+button('Весь клуб','fit')+button('+','zoom-in','aria-label="Увеличить карту"')+button('Стены','walls','aria-label="Изменить видимость стен"')+'</div></div><div id="world-host"></div><div id="build-preview" class="build-preview" aria-live="polite"></div><div class="map-help" id="map-help">Колесо — масштаб · потяните карту — камера · ПКМ — сведения · Home — весь клуб</div><div class="guest-queue"><div class="queue-label"><b id="queue-count"></b><span>ожидают</span></div><div id="guest-queue" class="queue-list"></div></div></section></main><footer class="timebar"><div class="clock"><small>ВРЕМЯ КЛУБА</small><strong id="clock"></strong></div><div class="time-status" id="time-status"></div><div class="time-actions">'+button('Подождать час','wait')+button('До ближайшего окончания →','advance','','primary')+'</div></footer><div id="message" class="game-message" role="status" aria-live="polite"></div><div id="drag-person" class="drag-person" hidden></div>';
 const handle=root.querySelector('.panel-resizer');let resizeStart=null;
 handle.addEventListener('pointerdown',e=>{resizeStart={x:e.clientX,width:root.querySelector('.side-panel').getBoundingClientRect().width};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(resizeStart)setPanelWidth(resizeStart.width+e.clientX-resizeStart.x);});
 handle.addEventListener('pointerup',()=>{resizeStart=null;});
 handle.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setPanelWidth(root.querySelector('.side-panel').getBoundingClientRect().width+(e.key==='ArrowLeft'?-20:20));}});
 try{const width=Number(localStorage.getItem('nri-studio-panel'));if(width)setPanelWidth(width);}catch{}
 world=createWorld(root.querySelector('#world-host'),{onSelect:selectWorld,onInspect:inspectWorld,onHover:hover,onPaintStart:paintStart,onPaintMove:paintMove,onPaintEnd:paintEnd,onCancel:cancelBuild,onGuestDrag:dragPerson,onObjectDrag:dragObject,onGuestDrop:dropGuest,onDragEnd:hideDrag});
}
function setPanelWidth(value){const width=Math.max(280,Math.min(580,innerWidth*.5,value));root.style.setProperty('--panel-width',width+'px');try{localStorage.setItem('nri-studio-panel',String(width));}catch{}}
function note(message,error=false){ui.message=message;ui.error=error;const n=root.querySelector('#message');if(n){n.textContent=message;n.classList.toggle('is-error',error);} }
function nav(tab){ui.tab=tab;ui.pending=null;if(tab!=='build'){ui.tool='select';ui.preview=null;ui.cells.clear();}render(true);}
function stateView(){return {tool:ui.tab==='build'?ui.tool:null,kind:ui.kind,walls:ui.walls,objectId:ui.object,selectedGuest:ui.guest,cells:[...ui.cells.values()]};}
function render(resetScroll=false){
 if(!club)return;root.dataset.buildTool=ui.tab==='build'?ui.tool:'';root.setAttribute('aria-busy',String(busy));root.classList.toggle('busy',busy);root.classList.toggle('mode-build',ui.tab==='build');
 const status=campaignStatus(club),prestige=clubPrestige(club),rating=club.rating.count?(club.rating.sum/club.rating.count).toFixed(1):'—';
 root.querySelector('#resources').innerHTML=[['В КАССЕ',money(status.balance),'wallet'],['СВОБОДНО',money(status.balance-status.reserve),'free'],['РЕЙТИНГ',rating+' / 10','rating'],['ПРЕСТИЖ',prestige.value,'prestige']].map(([a,b,c])=>'<div class="resource '+c+'"><small>'+a+'</small><strong>'+b+'</strong></div>').join('');
 root.querySelectorAll('[data-action="nav"]').forEach(n=>n.classList.toggle('active',n.dataset.tab===ui.tab));
 root.querySelector('#panel-eyebrow').textContent=panels[ui.tab][0];root.querySelector('#panel-title').textContent=panels[ui.tab][1];
 const panel=root.querySelector('#panel-content'),scroll=resetScroll?0:panel.scrollTop;panel.innerHTML=panelHTML();fitItemIcons(panel);panel.scrollTop=scroll;
 const active=runningRooms(club),waiting=club.guests.filter(g=>!g.roomId);
 root.querySelector('#map-summary').textContent=club.rooms.length+' '+(club.rooms.length===1?'игровая':'игровых')+' · '+club.guests.length+' гостей';
 root.querySelector('#queue-count').textContent=waiting.length;
 root.querySelector('#guest-queue').innerHTML=waiting.map(g=>'<button type="button" class="queue-person '+(g.id===ui.guest?'active':'')+'" data-action="guest" data-id="'+esc(g.id)+'"><span data-drag-guest="'+esc(g.id)+'">'+portrait(g)+'</span><b>'+esc(nameOf(g))+'</b><small>'+guestTime(g)+'</small></button>').join('')||'<span class="empty-queue">'+(active.length?'Все гости за столами.':'У стойки пока никого.')+' Следующий приход: '+(guestFlowStatus(club).nextAt?clockText(guestFlowStatus(club).nextAt):'нужна открытая комната и ресепшн')+'.</span>';
 root.querySelector('#clock').textContent='День '+(Math.floor(club.clock/24)+1)+' · '+clockText(club.clock);
 root.querySelector('#time-status').innerHTML=active.length?'<b>'+active.length+' '+(active.length===1?'партия идёт':'партии идут')+'</b><span>Ближайшее окончание в '+clockText(Math.min(...active.map(r=>r.run.endsAt)))+'</span>':'<b>Время на паузе</b><span>Разговоры, рассадка и строительство не тратят часы.</span>';
 root.querySelector('[data-action="advance"]').disabled=busy||readOnly||!active.length;root.querySelector('[data-action="wait"]').disabled=busy||readOnly;
 root.querySelector('#save-state').textContent=readOnly?'Только просмотр':busy?'Сохраняю…':'Сохранено';
 root.querySelector('#map-help').textContent=ui.tab==='build'&&BUILD_CATALOG[ui.kind]?.layer==='tabletop'&&ui.tool!=='select'?'Свободная установка · R / Shift+R — ±15° · Esc — отмена':ui.tab==='build'&&ui.tool==='select'?'Потяните предмет — перенос · Пробел + перетаскивание — камера · ПКМ — сведения':ui.tab==='build'&&ui.tool!=='select'?'Пробел + перетаскивание — камера · R — поворот · Esc — отмена': 'Колесо — масштаб · потяните карту — камера · ПКМ — сведения · Home — весь клуб';
 world.render(club,stateView());renderPreview();note(ui.message,ui.error);
}
function guestTime(g){if(g.schedule.leaveAt<=club.clock)return 'Пора уходить';return g.asked.includes('time')?'до '+clockText(g.schedule.leaveAt):'Время не уточнено';}
const intro=text=>'<p class="intro">'+text+'</p>';
const section=(title,content)=>'<section class="panel-section"><h2>'+title+'</h2>'+content+'</section>';
const badge=(text,kind='')=>'<span class="badge '+kind+'">'+text+'</span>';
const empty=text=>'<p class="empty-state">'+text+'</p>';
const metric=(name,value)=>'<div class="metric"><span>'+name+'</span><b>'+value+'</b></div>';
function pendingHTML(){
 if(!ui.pending)return '';const p=ui.pending;
 return '<section class="inline-confirm"><small>ПОДТВЕРДИТЕ РЕШЕНИЕ</small><h2>'+esc(p.title)+'</h2><p>'+esc(p.text)+'</p><div class="button-row">'+button('Подтвердить','confirm','','primary')+button('Отмена','cancel-confirm')+'</div></section>';
}
function panelHTML(){
 const pending=pendingHTML();if(ui.tab==='club')return pending+homeHTML();
 if(ui.tab==='guests')return pending+guestHTML();if(ui.tab==='rooms')return pending+roomsHTML();
 if(ui.tab==='build')return pending+buildingHTML();if(ui.tab==='team')return pending+teamHTML();
 if(ui.tab==='library')return pending+libraryHTML();if(ui.tab==='service')return pending+serviceHTML();
 if(ui.tab==='finance')return pending+financeHTML();if(ui.tab==='goals')return pending+goalsHTML();
 return pending+settingsHTML();
}
function arrivalsHTML(){
 const flow=guestFlowStatus(club);return section('Приход посетителей','<div class="arrival-plan" data-arrival-plan="true">'+(flow.enabled?'<p>Ближайший приход в <b>'+clockText(flow.nextAt)+'</b> · до '+flow.expectedArrivals+' новых гостей при свободных местах.</p><p class="small-copy">Ожидание до '+Math.round((flow.waitingUntil-club.clock)*60)+' мин · содержание до '+money(flow.waitingCost)+'. Разговоры и рассадка время не тратят. Отказ не приводит нового гостя мгновенно.</p>'+button('Дождаться следующих гостей','wait-guests','','full'):'<p>'+esc(flow.reason)+'</p>')+'</div>');
}
function tablePlanHTML(roomId){
 const plan=tablePlan(club,roomId),labels={good:'Подходит',warning:'Обсудить',unknown:'Не уточнено'};
 return section('Состав и договорённости','<div class="table-plan" data-table-plan="true">'+plan.summary.map(n=>'<p class="plan-note '+n.tone+'">'+esc(n.text)+'</p>').join('')+plan.rows.map(row=>'<details class="plan-guest '+row.tone+'"><summary>'+esc(row.name)+' <small>'+labels[row.tone]+'</small></summary>'+row.notes.map(n=>'<p class="plan-note '+n.tone+'">'+esc(n.text)+'</p>').join('')+button('Поговорить с гостем','guest','data-id="'+esc(row.guestId)+'"','quiet')+'</details>').join('')+'<p class="small-copy">Это сводка услышанных условий, а не обещание оценки. Вы сами выбираете историю, мастера и соседей.</p></div>');
}
function intakeHTML(g,playing){
 const missing=QUICK_INTERVIEW_QUESTIONS.filter(id=>!g.asked.includes(id));
 const replies=QUICK_INTERVIEW_QUESTIONS.map(id=>g.dialogue.find(a=>a.questionId===id)).filter(Boolean);
 return '<div class="quick-interview">'+(!playing&&missing.length?button('Короткое знакомство','quick-interview','','full primary')+intro('За один разговор: интересы, время, границы, формат и помощь с правилами. Место выбираете вы.'):'')+(replies.length?'<details class="interview-notes"><summary>Главное из разговора · '+replies.length+'</summary>'+replies.map(a=>'<p><b>'+esc(QUESTIONS.find(q=>q.id===a.questionId)?.text??'')+'</b><span>'+esc(a.reply)+'</span></p>').join('')+'</details>':'')+'</div>';
}
function homeHTML(){
 const waiting=club.guests.filter(g=>!g.roomId),running=runningRooms(club),status=campaignStatus(club),guest=waiting.find(g=>g.id===ui.guest)??waiting[0],recent=club.operations.warnings.filter(w=>w.clock>=club.clock-4).slice(-3);
 return (!receptionStatus(club).ready?'<p class="notice error">'+esc(receptionStatus(club).reason)+'</p>':'')+'<div class="shift-heading"><span class="open-dot"></span><b>Клуб открыт</b><span>'+clockText(club.clock)+'</span></div>'+metric('За столами',club.guests.filter(g=>g.roomId).length+' / '+club.rooms.filter(r=>r.operational).length*4)+metric('Ожидают рассадки',waiting.length)+metric('Идёт партий',running.length)+metric('Содержание открытого клуба',money(status.hourlyCosts)+'/ч')+
 (guest?section('У ресепшна','<div class="guest-intro"><div class="staff-portrait">'+portrait(guest)+'</div><div><h2>'+esc(nameOf(guest))+'</h2><p>'+guest.identity.age+' лет · '+guestTime(guest)+'</p>'+button('Поговорить →','guest','data-id="'+esc(guest.id)+'"','primary')+'</div></div>'):'')+
 section('Игровые комнаты',club.rooms.map(roomListRow).join(''))+arrivalsHTML()+
 (recent.length?section('Нужно внимание',recent.map(w=>'<div class="notice">'+esc(w.text)+'</div>').join('')):'')+
 '<div class="onboarding"><small>СЛЕДУЮЩИЙ ШАГ</small><h3>'+(readyRooms(club).length?'Компания собралась':waiting.length?'Соберите подходящий стол':'Партии продолжаются')+'</h3><p>'+(readyRooms(club).length?'Проверьте время, состав и договор. Каждую комнату можно запустить отдельно.':waiting.length?'Уточните интересы и время гостей. Перенесите фигурки на четыре игровых стула.':'Кнопка внизу переведёт часы к ближайшему окончанию.')+'</p>'+button(readyRooms(club).length?'К партиям →':'К гостям →','nav','data-tab="'+(readyRooms(club).length?'rooms':'guests')+'"','full')+'</div>'+
 section('Развитие клуба',metric('Рабочие комнаты',status.development.current.rooms)+metric('Отзывы',club.rating.count)+button('Развитие и достижения','nav','data-tab="goals"'));
}
function roomListRow(r){
 const count=roomOccupants(club,r.id).length,zone=club.layout.rooms.find(z=>z.id===r.id);
 return '<button type="button" class="list-row room-row" data-action="room" data-id="'+esc(r.id)+'"><span class="room-number">'+r.number+'</span><span><b>'+esc(zone?.name??'Комната')+'</b><small>'+esc(r.session?.game??r.session?.title??'Нужны игра и мастер')+'</small></span>'+badge(r.status==='running'?'до '+clockText(r.run.endsAt):r.operational?count+'/4':'Не готова',r.status==='running'?'running':'')+'</button>';
}
function guestHTML(){
 const g=club.guests.find(g=>g.id===ui.guest)??club.guests.find(g=>!g.roomId)??club.guests[0];if(!g)return empty('Сейчас гостей нет.')+arrivalsHTML();ui.guest=g.id;
 const playing=club.rooms.some(r=>r.id===g.roomId&&r.status==='running'),history=visibleGuestHistory(club,g);
 return '<div class="guest-intro"><div class="guest-portrait" data-drag-guest="'+esc(g.id)+'">'+portrait(g)+'</div><div><small>'+(playing?'ИГРАЕТ':g.roomId?'МЕСТО ВЫБРАНО':'У СТОЙКИ')+'</small><h2>'+esc(nameOf(g))+'</h2><p>'+g.identity.age+' лет · '+guestTime(g)+'</p>'+badge(g.roomId?club.layout.rooms.find(r=>r.id===g.roomId)?.name??'За столом':'Ожидает')+'</div></div>'+
 '<div class="guest-quote">'+esc(g.lastAnswer?.reply??'Привет! Хочу найти интересную игру и подходящую компанию.')+'</div>'+
 intakeHTML(g,playing)+guestMemoryHTML(history)+section('Спросить гостя','<div class="questions">'+QUESTIONS.slice(0,9).map(q=>button(esc(q.text)+(g.asked.includes(q.id)?'<span>✓</span>':''),'ask','data-question="'+q.id+'" '+(playing?'disabled':''),g.asked.includes(q.id)?'heard':'')).join('')+'</div><details><summary>Ещё о привычках и предпочтениях</summary><div class="questions">'+QUESTIONS.slice(9).map(q=>button(esc(q.text),'ask','data-question="'+q.id+'" '+(playing?'disabled':''))).join('')+'</div></details>')+
 section('Посадить за стол',playing?intro('Партия уже идёт. Состав сохранится до её окончания.'):intro('Перетащите фигурку на стул или выберите место здесь. Занятый стул до запуска позволяет поменять гостей местами.')+club.rooms.filter(r=>r.operational&&r.status!=='running').map(r=>'<div class="seat-group"><b>'+esc(club.layout.rooms.find(z=>z.id===r.id)?.name??'Комната')+'</b><div class="seat-buttons">'+[0,1,2,3].map(seat=>{const other=club.guests.find(v=>v.roomId===r.id&&v.seat===seat);return button(other?esc(nameOf(other)):String(seat+1),'seat','data-room="'+esc(r.id)+'" data-seat="'+seat+'" '+(other?.id===g.id?'disabled':''),other?'occupied':'');}).join('')+'</div></div>').join('')+'<div class="button-row">'+(g.roomId?button('Вернуть к стойке','unseat'):'')+(!g.roomId?button('Проводить гостя','dismiss-guest','','quiet'):'')+'</div>')+
 (g.dialogue.length?section('Что уже услышали',g.dialogue.map(a=>'<div class="heard-answer"><small>'+esc(QUESTIONS.find(q=>q.id===a.questionId)?.text??'')+'</small><p>'+esc(a.reply)+'</p></div>').join('')):'')+arrivalsHTML();
}
function guestMemoryHTML(history){
 if(!history?.returning)return '';
 const previous=history.knownAnswers.filter(a=>a.questionId!=='time');
 return section('Постоянный гость',metric('Визитов в клуб',history.visits)+(history.favorite?intro('Понравилось раньше: '+esc(history.favorite.title)):'')+
 history.recent.slice(-3).reverse().map(r=>'<div class="review"><b>'+esc(r.title)+'<span>'+r.score+'/10</span></b><p>'+esc(r.text)+'</p></div>').join('')+
 (previous.length?'<details open><summary>Что рассказывал в прошлые визиты</summary>'+previous.map(a=>'<div class="heard-answer"><small>'+esc(QUESTIONS.find(q=>q.id===a.questionId)?.text??'Из прошлого разговора')+'</small><p>'+esc(a.reply)+'</p></div>').join('')+'</details>':'')+intro('Время ухода уточните для сегодняшнего визита.'));
}
function demandHTML(){
 const demand=visibleDemand(club);
 return section('Интересы из разговоров',demand.genres.length?demand.genres.slice(0,8).map(r=>metric(esc(r.name),r.count+' ответов')).join(''):intro('Спросите гостей об историях: здесь появится сводка услышанных интересов.'))+
 (demand.played.length?section('Опыт клуба',demand.played.map(r=>metric(esc(r.name),r.paid+' оплат / '+r.count+' гостей')).join('')):'');
}
function roomsHTML(){
 const r=club.rooms.find(r=>r.id===ui.room)??club.rooms[0];if(!r)return intro('Разметьте игровую комнату и поставьте мебель.')+button('Строить','nav','data-tab="build"');
 ui.room=r.id;const guests=roomOccupants(club,r.id),zone=club.layout.rooms.find(z=>z.id===r.id),running=r.status==='running',plan=sessionForecast(club,r.id),system=club.library.copies.find(k=>k.id===r.kitId)?.systemId;
 const adventures=SESSIONS.filter(s=>club.library.adventures.includes(s.id)&&s.systemId===system),free=(field,id)=>!club.rooms.some(other=>other.id!==r.id&&other.enabled!==false&&other[field]===id);
 const kits=club.library.copies.filter(k=>k.id===r.kitId||free('kitId',k.id)),masters=club.staff.filter(m=>(m.id===r.masterId||free('masterId',m.id))&&m.known.includes(system)&&!m.training);
 const late=guests.filter(g=>g.asked.includes('time')&&g.schedule.leaveAt<(r.run?.endsAt??club.clock+r.hours));
 return '<div class="room-tabs">'+club.rooms.map(room=>button('Комната '+room.number+' <small>'+roomOccupants(club,room.id).length+'/4</small>','room','data-id="'+esc(room.id)+'"',room.id===r.id?'active':'')).join('')+'</div>'+
 '<div class="party-heading"><span>'+badge(running?'Идёт партия':'Подготовка',running?'running':'')+'</span><h2>'+esc(r.session?.title??zone?.name??'Комната')+'</h2><p>'+r.hours+' ч · '+clockText(r.run?.startedAt??club.clock)+' — '+clockText(r.run?.endsAt??club.clock+r.hours)+'</p></div>'+
 (r.layoutErrors.length?'<div class="notice error">'+r.layoutErrors.map(e=>esc(e.text)).join('<br>')+'</div>':'')+
 (plan?'<div class="party-plan" data-guest-price="'+plan.guestPrice+'"><div><small>БИЛЕТ С ГОСТЯ</small><strong>'+money(plan.guestPrice)+'</strong><span>'+money(plan.guestHourlyRate)+'/ч × '+r.hours+' ч</span></div><div><small>ПРИ ПОЛНОЙ ОПЛАТЕ</small><strong class="'+(plan.profitIfAllPay<0?'negative':'positive')+'">'+(plan.profitIfAllPay>=0?'+':'')+money(plan.profitIfAllPay)+'</strong><span>после расходов стола</span></div></div>'+
 '<details class="party-costs"><summary>Доходы и расходы партии</summary>'+metric('Четыре билета',money(plan.income))+metric('Зарплата мастера','−'+money(plan.masterCost))+metric('Доля содержания и расходники','−'+money(plan.operatingCost))+metric('Для окупаемости',plan.income>=plan.totalCost?Math.ceil(plan.totalCost/plan.income*100)+'% полной стоимости билетов':'Не окупается даже с полной оплатой')+'<p>Содержание делится между работающими столами с учётом их окончания. Чаевые и кафе в план не включены. Полный билет оплачивается при удовольствии от 7/10. Ниже сумма снижается плавно; нарушение явных границ, срока или формата означает возврат.</p></details>':'')+
 tablePlanHTML(r.id)+(!running?button('Начать партию · '+guests.length+'/4','start-room','data-id="'+esc(r.id)+'" '+(!readyRooms(club).includes(r)?'disabled':''),'primary full start-party'):metric('Партия закончится',clockText(r.run.endsAt)))+
 (late.length?'<p class="notice error">Не успеют до конца: '+late.map(g=>esc(nameOf(g))).join(', ')+'.</p>':'')+
 '<form id="room-form" class="room-settings"><label>Игра<select name="game" '+(running?'disabled':'')+'>'+options(kits.map(k=>[k.id,SYSTEMS[k.systemId]?.name??k.systemId]),r.kitId)+'</select></label><label>Приключение<select name="adventure" '+(running?'disabled':'')+'>'+options(adventures.map(a=>[a.id,a.title+' · '+a.minutes/60+' ч']),r.adventureId)+'</select></label><label>Мастер<select name="master" '+(running?'disabled':'')+'>'+(masters.length?options(masters.map(m=>[m.id,m.name+' · '+money(m.hourlyWage)+'/ч']),r.masterId):'<option value="">Нет знающего эту игру мастера</option>')+'</select></label><p class="small-copy">Длительность задаётся приключением. Назначения сохраняются сразу.</p></form>'+
 button('Купить другие приключения','stories-for-system','data-system="'+esc(system??'')+'"','quiet full')+
 section('Места за столом',guests.length?'<div class="party-guests">'+guests.map(g=>'<button type="button" data-action="guest" data-id="'+esc(g.id)+'"><span class="mini-portrait">'+portrait(g)+'</span><span><b>'+esc(nameOf(g))+'</b><small>'+guestTime(g)+'</small></span></button>').join('')+'</div>':intro('Выберите гостя у ресепшна или перетащите фигурку на свободный стул.'))+
 (!running?button('Выбрать гостей','nav','data-tab="guests"','full')+button(r.enabled?'Закрыть пустую комнату':'Открыть комнату','toggle-room','data-id="'+esc(r.id)+'"','quiet full'):'');
}
const tools=[['select','Выбор'],['land','Участок'],['room','Комната'],['wall','Стена'],['door','Дверь'],['window','Окно'],['floor','Пол']];
function catalogItems(){
 const query=ui.catalogSearch.trim().toLocaleLowerCase('ru-RU');return Object.values(BUILD_CATALOG).filter(item=>(query||item.category===ui.category)&&(!query||item.name.toLocaleLowerCase('ru-RU').includes(query)));
}
function catalogCards(){return catalogItems().map(item=>'<button type="button" class="catalog-item '+(ui.tool==='item'&&ui.kind===item.kind?'active':'')+'" data-action="build-item" data-kind="'+item.kind+'" title="'+esc(item.name)+'"><span class="item-thumbnail">'+itemThumbnail(item.kind)+'</span><b>'+esc(item.name)+'</b><strong>'+money(item.price)+'</strong></button>').join('')||empty('Таких предметов нет. Попробуйте другое название.');}
function buildingHTML(){
 const categories={furniture:'Мебель',equipment:'Оснащение столов и стен',staff:'Отдых мастеров',waiting:'Вход и ожидание',service:'Сервис',decoration:'Декор'},selected=club.layout.objects.find(o=>o.id===ui.object),item=ui.tool==='item'?BUILD_CATALOG[ui.kind]:null;
 return '<div class="build-tools">'+tools.map(([id,title])=>button(title,'tool','data-tool="'+id+'"',ui.tool===id?'active':'')).join('')+'</div>'+
 (ui.tool==='land'?intro('Отмечайте клетки рядом с участком. 125 ₽ за клетку.'):ui.tool==='room'?'<label>Назначение<select id="room-purpose">'+options([['game','Игровая комната'],['staff','Отдых мастеров']],ui.purpose)+'</select></label><label class="check"><input type="checkbox" id="room-furnished" '+(ui.furnished?'checked':'')+'> С готовой мебелью</label>'+intro('Потяните от одного угла к другому. Вход появится у нижнего угла левой стены.'):['wall','door','window'].includes(ui.tool)?intro('Ведите вдоль границ клеток.'):ui.tool==='floor'?intro('Проведите кистью по клеткам пола.'):'')+
 (selected?'<div class="selected-object">'+objectHTML(selected)+'</div>':'')+
 '<div class="catalog-header"><div class="catalog-filters"><input id="catalog-search" type="search" placeholder="Найти предмет…" aria-label="Найти предмет" value="'+esc(ui.catalogSearch)+'"><select id="catalog-category" aria-label="Категория предметов">'+options(Object.entries(categories),ui.category)+'</select></div>'+
 (item?'<div class="selected-product"><span>'+itemThumbnail(item.kind)+'</span><div><b>'+esc(item.name)+'</b><small>'+(item.layer==='tabletop'?'':item.width+'×'+item.height+' · ')+({floor:'на пол',wall:'на стену',tabletop:'на стол',ceiling:'на потолок'}[item.layer])+' · '+money(item.price)+(item.layer==='tabletop'?' · свободная расстановка':'')+(item.hourlyCost?' · '+money(item.hourlyCost)+'/ч':'')+'</small><p>'+esc(effectText(item.kind))+'</p></div></div>':'<p class="catalog-tip">Выберите вещь → нажмите на карту → подтвердите покупку. R — поворот.</p>')+'</div><div class="catalog-grid" id="catalog-grid">'+catalogCards()+'</div>'+
 '<div class="build-bottom">'+button('↶ Отменить стройку','undo-build',!undo?'disabled':'')+button('Снять инструмент','cancel-build')+'</div>';
}
function objectHTML(o){
 const spec=BUILD_CATALOG[o.kind];
 return '<h3>'+esc(spec.name)+'</h3><p>'+esc(effectText(o.kind))+'</p>'+metric(spec.layer==='tabletop'?'Установка':'Занимает',spec.layer==='tabletop'?'Свободно на столе':spec.width+'×'+spec.height+' клеток')+(spec.family==='table'?'<details class="table-items" open><summary>На столе</summary>'+club.layout.objects.filter(item=>BUILD_CATALOG[item.kind]?.layer==='tabletop'&&parentTable(item,club.layout)?.id===o.id).map(item=>'<div class="table-item-row"><span>'+esc(BUILD_CATALOG[item.kind].name)+'</span>'+button('Выбрать','inspect-object','data-id="'+esc(item.id)+'"')+'</div>').join('')+'</details>':'')+metric('Обслуживание',spec.hourlyCost?money(spec.hourlyCost)+'/ч':'Нет почасовой платы')+'<div class="button-row">'+button('Переместить','move-object','data-id="'+esc(o.id)+'"')+button(spec.layer==='tabletop'?'Повернуть 15°':'Повернуть R','rotate-object','data-id="'+esc(o.id)+'"')+button('Продать · '+money(Math.floor((o.price??spec.price)*.6)),'sell-object','data-id="'+esc(o.id)+'"','danger')+'</div>';
}
function teamHTML(){
 const data=campaignMarket(club),prestige=clubPrestige(club);
 return metric('Места отдыха',data.staffRoom.hired+' / '+data.staffRoom.physicalCapacity)+metric('Престиж клуба',prestige.value)+
 (data.staffRoom.reason?'<p class="notice">'+esc(data.staffRoom.reason)+'</p>':'')+
 '<div class="segmented">'+button('В штате · '+data.staff.length,'team-tab','data-candidates="false"',!ui.candidates?'active':'')+button('Пригласить · '+data.candidates.length,'team-tab','data-candidates="true"',ui.candidates?'active':'')+'</div>'+
 (ui.candidates?data.candidates.map(m=>{const required=prestigeNeeded(m),reason=prestige.value<required?'Нужен престиж '+required:data.staffRoom.free<1?'Нужно место отдыха':club.finance.cash<m.hireCost?'Не хватает денег':'';return '<article class="staff-row"><div class="staff-heading"><div class="staff-portrait">'+portrait(m)+'</div><div><h2>'+esc(m.name)+'</h2><span>'+esc(m.temperament)+'</span><b>'+money(m.wage)+'/ч</b></div></div><p>'+esc(m.detail)+'</p><p class="small-copy">'+esc(m.systems.map(s=>SYSTEMS[s]?.name??s).join(' · '))+'</p>'+button('Пригласить · '+money(m.hireCost),'hire','data-id="'+esc(m.id)+'" '+(reason?'disabled':''),'full')+(reason?'<small class="blocked-reason">'+reason+'</small>':'')+'</article>';}).join(''):
 data.staff.map(m=>'<article class="staff-row"><div class="staff-heading"><div class="staff-portrait">'+portrait(m)+'</div><div><h2>'+esc(m.name)+'</h2><span>'+esc(m.training?'Учится: '+m.training.label:m.canRest?'Отдыхает':'Ведёт партию')+'</span><b>'+money(m.wage)+'/ч</b></div></div><div class="fatigue-heading"><span>Усталость</span><b>'+m.fatigueValue.toFixed(1)+' / 12</b></div><meter min="0" max="12" low="4" high="8" optimum="0" value="'+m.fatigueValue+'">'+m.fatigueValue+'</meter><small class="small-copy">'+esc(m.fatigue)+(m.canRest?' · восстановление '+(m.restSeat?.restRate??.65)+'/ч':'')+'</small><p>'+esc(m.detail)+'</p><p class="small-copy">'+esc(m.systems.map(s=>SYSTEMS[s]?.name??s).join(' · '))+'</p>'+(!m.training&&!m.dismissal.busy?'<form class="training-form" data-id="'+esc(m.id)+'"><label>Обучение<select name="course">'+options(m.trainingOptions.map(o=>[o.systemId,o.name+' · '+money(o.price)+' · '+o.hours+' ч']),'')+'</select></label><button type="submit" '+(!m.trainingOptions.length?'disabled':'')+'>Начать обучение</button></form>'+button('Уволить мастера','dismiss-master','data-id="'+esc(m.id)+'"','quiet'):'')+'</article>').join(''));
}
function libraryCards(){
 const data=campaignMarket(club),query=ui.librarySearch.trim().toLocaleLowerCase('ru-RU'),match=name=>!query||name.toLocaleLowerCase('ru-RU').includes(query);
 if(ui.libraryTab==='adventures')return data.adventures.filter(a=>match(a.title+' '+SYSTEMS[a.systemId]?.name)).map((a,i)=>'<article class="story-card"><div class="story-cover book-'+i%4+'">'+icon('library')+'<span>'+a.minutes/60+' ч</span></div><div><small>'+esc(SYSTEMS[a.systemId]?.name)+'</small><h3>'+esc(a.title)+'</h3><b class="story-duration">'+a.minutes/60+' ч · билет '+money(a.minutes/60*ECONOMY.guestHour)+'</b><details><summary>О чём история</summary><p>'+esc(a.description)+'</p></details>'+(a.owned?badge('В библиотеке'):button('Купить · '+money(a.price),'buy-adventure','data-id="'+esc(a.id)+'" '+(club.finance.cash<a.price?'disabled':'')))+'</div></article>').join('')||empty('Нет подходящих историй. Приключения доступны для купленных игр.');
 if(ui.libraryTab==='games')return data.games.filter(g=>match(g.name)).map((g,i)=>{const copies=data.ownedGames.filter(k=>k.systemId===g.systemId).length;return '<article class="book-row"><div class="story-cover book-'+i%4+'">'+icon('library')+'<span>'+esc(g.name.slice(0,3))+'</span></div><div><h3>'+esc(g.name)+'</h3><small>'+copies+' экземпляров</small><details><summary>Об игре</summary><p>'+esc(g.description)+'</p></details>'+button((copies?'Ещё экземпляр':'Купить')+' · '+money(g.price),'buy-game','data-id="'+g.systemId+'" '+(club.finance.cash<g.price||data.libraryStorage.free<=0?'disabled':''))+'</div></article>';}).join('');
 return data.ownedGames.filter(k=>match(k.name)).map(k=>'<div class="owned-kit"><b>'+esc(k.name)+'</b>'+metric('Состояние',Math.round(k.state.condition)+'%')+button('Обслужить · '+money(k.state.repairQuote.cost),'repair-kit','data-id="'+esc(k.id)+'" '+(!k.state.repairQuote.available?'disabled':''))+button('Продать · '+money(k.state.saleValue),'sell-kit','data-id="'+esc(k.id)+'" '+(k.state.running?'disabled':''),'quiet')+'</div>').join('');
}
function libraryHTML(){
 const data=campaignMarket(club);
 return '<div class="library-header"><div class="segmented">'+[['adventures','Приключения'],['games','Игры'],['copies','Комплекты']].map(([id,name])=>button(name,'library-tab','data-id="'+id+'"',ui.libraryTab===id?'active':'')).join('')+'</div><input id="library-search" type="search" placeholder="Поиск по названию…" aria-label="Поиск в библиотеке" value="'+esc(ui.librarySearch)+'"></div>'+
 (ui.libraryTab==='adventures'?intro('Каждая история задаёт свою длительность. Покупка разовая; проводить её можно снова.'):metric('Хранение игр',data.libraryStorage.used+' / '+data.libraryStorage.capacity))+
 '<div id="library-cards">'+libraryCards()+'</div><details class="demand-details"><summary>Спрос и опыт клуба</summary>'+demandHTML()+'</details>';
}
function cleaningHTML(zone){
 const external=cleanZone(structuredClone(club),zone.id),own=club.serviceStaff?.some(p=>p.onShift)?cleanZone(structuredClone(club),zone.id,{helper:true}):null;
 const quote=result=>money(result.estimate.costThroughFinish)+' · '+Math.round((result.estimate.queueHours+result.estimate.workHours)*60)+' мин';
 return '<div class="service-zone"><b>'+esc(zone.name)+'</b>'+metric('Загрязнение',Math.round(100-(club.operations?.zones?.[zone.id]?.cleanliness??100))+' / 100')+'<div class="button-row">'+button(external.ok?'Внешняя уборка · '+quote(external):'Внешняя уборка','clean','data-id="'+esc(zone.id)+'" '+(external.ok?'':'disabled'))+(own?button(own.ok?'Помощником · '+quote(own):'Помощник недоступен','clean','data-id="'+esc(zone.id)+'" data-helper="true" '+(own.ok?'':'disabled'),'primary'):'')+'</div>'+(!external.ok?intro(esc(external.reason)):'')+'</div>';
}
function serviceHTML(){
 const data=campaignMarket(club),batches=club.inventory?.batches??[],tasks=club.operations?.tasks?.filter(t=>['active','queued'].includes(t.state))??[],orders=(club.inventory?.orders??[]).filter(o=>o.state==='ordered');
 return intro('Приборы требуют оплаченных порций. Запасы, годность и состояние оборудования влияют на обслуживание гостей.')+
 (club.operations.warnings.length?section('События клуба',club.operations.warnings.slice(-5).reverse().map(w=>'<div class="notice">'+esc(w.text)+'</div>').join('')):'')+section('Помощник клуба',intro('Убирает быстрее и увеличивает выдачу выбранного прибора на 50%. Смена стоит '+money(data.serviceStaff.hourlyWage)+'/ч, в том числе в простое.')+(data.serviceStaff.hired?button(data.serviceStaff.active?'Закончить смену':'Начать смену · '+money(data.serviceStaff.hourlyWage)+'/ч','service-shift','data-active="'+!data.serviceStaff.active+'"'):button('Пригласить помощника · '+money(data.serviceStaff.hireCost),'hire-service'))+(club.serviceStaff?.[0]?.assignment?button('Снять с раздачи','assign-helper','data-id=""','quiet'):'') )+
 (tasks.length||orders.length?section('Работы и поставки',orders.map(o=>'<div class="metric"><span>Поставка: '+o.quantity+' порций</span><b>к '+clockText(o.dueAt)+'</b></div>').join('')+tasks.map(t=>'<div class="metric"><span>'+esc(t.label??t.type??'Работа')+'</span><b>до '+clockText(t.dueAt)+'</b></div>').join('')+button('До окончания работы или поставки','wait-operation','','full')):'')+
 section('Уборка',[{id:'common',name:'Ресепшн и общая зона'},...club.layout.rooms].map(cleaningHTML).join(''))+
 section('Приборы и запас',data.equipment.filter(e=>e.service).map(e=>'<article class="service-row"><h3>'+esc(e.name)+'</h3><p>'+esc(effectText(e.kind))+'</p>'+metric('Содержание',money(e.hourlyCost)+'/ч')+(data.serviceStaff.hired?button(club.serviceStaff[0].assignment?.itemId===e.id?'Помощник на этой раздаче':'Назначить помощника','assign-helper','data-id="'+esc(e.id)+'" '+(club.serviceStaff[0].assignment?.itemId===e.id?'disabled':''),'quiet'):'')+'<div class="button-row">'+button('Заказать 20 порций','restock','data-id="'+esc(e.id)+'"')+(club.operations.equipment[e.id]?button('Обслужить','maintain','data-id="'+esc(e.id)+'" '+(club.operations.equipment[e.id].condition>=100?'disabled':'')):'')+button(e.enabled?'Выключить':'Включить','power','data-id="'+esc(e.id)+'" data-enabled="'+!e.enabled+'"')+button('Автозаказ: '+(e.autoRefill?'вкл':'выкл'),'auto-stock','data-id="'+esc(e.id)+'" data-active="'+!e.autoRefill+'"')+'</div><details><summary>Лимит автозаказа</summary><form class="service-policy" data-id="'+esc(e.id)+'"><label>Целевой запас, порций<input type="number" min="1" max="20" name="target" value="'+(club.operations.servicePolicies[e.id]?.target??10)+'" required></label><label>Лимит расходов за 8 часов, ₽<input type="number" min="0" max="2000" name="budget" value="'+(club.operations.servicePolicies[e.id]?.budget??200)+'" required></label><button type="submit">Сохранить лимит</button></form></details>'+batches.filter(b=>b.location===e.id&&b.state!=='written-off').map(b=>'<div class="stock-batch"><span>Партия: '+esc(b.sku??'продукты')+' · '+(b.remaining??b.quantity??0)+' шт.<br>Годность до '+clockText(b.expiresAt??0)+'</span>'+button('Списать','writeoff','data-id="'+esc(b.id)+'"','quiet')+'</div>').join('')+'</article>').join('')||empty('Поставьте сервисное оборудование в строительстве.'))+
 button('Выбрать оборудование','service-build','','primary full');
}
function financeHTML(){
 const s=campaignStatus(club),report=club.lastReport;
 return section('Деньги клуба',metric('В кассе',money(s.balance))+metric('Обязательный резерв',money(s.reserve))+metric('Доступно для покупок',money(s.balance-s.reserve))+metric('Расходы клуба',money(s.hourlyCosts)+'/ч'))+
 (s.debt?'<div class="notice error">Долг '+money(s.debt)+'. Новые партии и покупки приостановлены.</div>':'')+
 (s.recoveryPlan?button('Рассмотреть план спасения','recovery','','danger full'):'')+
 (report?section(report.completed?.length?'Последнее завершение':'Изменения за прошедшее время',metric('Изменение кассы',money(report.finance.cashChange))+(report.completed??[]).map(r=>'<article class="report-room"><h3>'+esc(r.title)+'</h3>'+metric('Гости и чаевые',money((r.payments??0)+(r.tips??0)))+(r.reviews??[]).map(review=>'<div class="review"><b>'+esc(review.name)+' <span>'+review.score+'/10</span></b><p>'+esc(review.text)+'</p><small>Оплата '+money(review.financial?.payment??0)+(review.financial?.paymentCurve===3?' · '+Math.round(review.financial.coefficient*100)+'% билета · удовольствие '+review.financial.satisfaction.toFixed(2)+'/10'+(review.financial.refund?' · скидка '+money(review.financial.refund):''):'')+'</small>'+(review.upgradeBenefit?.bonus>0?'<p class="benefit">Без бонусов оснащения и сервиса '+review.baseSatisfaction.toFixed(2)+'/10 · с ними '+review.satisfactionValue.toFixed(2)+'/10.</p>':'')+(review.comfort?.helped?.length?'<p class="benefit">'+review.comfort.helped.map(esc).join(' ')+'</p>':'')+'</div>').join('')+'</article>').join('')):'')+
 section('Движение денег',club.finance.ledger.slice(-ui.ledgerLimit).reverse().map(e=>'<div class="ledger-row"><span><b>'+esc(e.text)+'</b><small>День '+(Math.floor(e.clock/24)+1)+' · '+clockText(e.clock)+'</small></span><strong class="'+(e.amount>=0?'income':'outgoing')+'">'+(e.amount>0?'+':'')+money(e.amount)+'</strong></div>').join('')+(club.finance.ledger.length>ui.ledgerLimit?button('Показать ещё','more-ledger'):''));
}
function goalsHTML(){
 const s=campaignStatus(club),d=s.development,current=d.current,prestige=clubPrestige(club),value=(id,n)=>id==='reserve'?money(n):n;
 return '<div class="goal-banner" data-endless-development="true"><small>КЛУБ РАСТЁТ ПО ВАШЕМУ ПЛАНУ</small><h2>Ваш клуб. Ваш масштаб.</h2><p>Выбирайте, сколько комнат открыть и какие игры проводить. Развитие продолжается после каждой вехи.</p></div>'+
 section('Клуб сегодня',metric('Рабочие комнаты',current.rooms)+metric('Отзывов за всё время',current.participations)+metric('Средний рейтинг',club.rating.count?current.rating.toFixed(2)+' / 10':'Пока нет отзывов')+metric('Доступные системы',current.systems)+metric('Свободные деньги',money(current.reserve)))+
 section('Следующие вехи',intro('Это ориентиры и личные рекорды. Каждая достигнутая веха остаётся в истории; размер клуба выбираете вы.')+d.tracks.map(t=>'<div class="goal-row" data-development-track="'+t.id+'"><div><b>'+esc(t.title)+'</b><span>'+value(t.id,t.current)+(t.next?' / '+value(t.id,t.next):'')+'</span></div>'+(t.next?'<progress max="'+t.next+'" value="'+Math.max(0,t.current)+'"></progress>':'')+'<small>Лучший результат: '+value(t.id,t.record)+'</small></div>').join(''))+
 (d.earned.length?section('Достигнуто',d.earned.slice(-12).reverse().map(a=>'<div class="metric"><span>'+esc(a.title)+'</span><b>'+value(a.metric,a.value)+' ✓</b></div>').join('')):'')+
 section('Престиж — '+prestige.value,intro('Качественное оснащение открывает доступ к более дорогим мастерам. Первый предмет даёт полный вклад, второй — четверть. Репутация растёт по серии отзывов.')+metric('Репутация по отзывам',prestige.reputation)+prestige.sources.map(s=>metric(esc(s.name),'+'+s.points)).join(''))+
 section('Следующее расширение',intro('Открывайте комнаты по мере спроса и дохода. Подготовьте площадь, мебель, игру, мастера и место его отдыха.')+button('Расширить клуб','nav','data-tab="build"'));
}
function settingsHTML(){
 return intro('Клуб автоматически сохраняется в этом браузере после каждого действия. Файл позволяет перенести всю кампанию на другое устройство.')+
 section('Сохранение','<div class="button-column">'+button('Скачать сохранение','export','','primary')+'<label class="file-button">Загрузить сохранение<input type="file" id="import-save" accept=".json,application/json"></label></div>')+
 section('Начать заново',intro('Создаётся новый клуб с одной игровой комнатой. Прежняя кампания останется в местном архиве сохранений.')+button('Новая игра','new-game','','danger full'))+
 section('Управление','<dl class="controls-help"><dt>Камера</dt><dd>ЛКМ на свободном месте, средняя кнопка или пробел + перетаскивание. Стрелки и WASD.</dd><dt>Масштаб</dt><dd>Колесо к курсору; на сенсорном экране — двумя пальцами.</dd><dt>Весь клуб</dt><dd>Home или кнопка над картой.</dd><dt>Сведения</dt><dd>ПКМ по персонажу или предмету открывает его панель.</dd><dt>Строительство</dt><dd>R — поворот; Esc — отмена; ↶ — отмена последнего строительства.</dd></dl>');
}

async function perform(fn,{archive=false,keepUndo=false,message='Сохранено'}={}){
 if(busy)return {ok:false};if(readOnly){note(writer?.reason??'Клуб открыт для просмотра.',true);return {ok:false};}
 busy=true;root.setAttribute('aria-busy','true');root.classList.add('busy');
 try{const draft=structuredClone(club),result=fn(draft);if(!result?.ok){note(result?.reason??'Действие недоступно.',true);return result;}
  syncGuestWaiting(draft);updateCampaign(draft);await store.write(draft,{archive});club=draft;if(!keepUndo)undo=null;note(result.report?(result.report.completed?.length?'Партия завершилась. Отзывы и полный расчёт — в кассе.':result.report.reason??'Прошло игровое время. Проверьте события клуба.'):message);return result;
 }catch(e){note(e.message,true);return {ok:false,reason:e.message};}finally{busy=false;render();}
}
const command=(action,message)=>perform(draft=>executeCampaignAction(draft,{...action,transactionId:uid()}),{message});
function selectWorld(data,p){
 if(data.guestId){const g=club.guests.find(g=>g.id===data.guestId);if(ui.seatArmed&&ui.guest&&g?.roomId&&g.id!==ui.guest){seatGuest(ui.guest,g.roomId,g.seat);return;}ui.guest=data.guestId;ui.seatArmed=false;nav('guests');return;}
 if(data.masterId){ui.candidates=false;nav('team');return;}
 const o=club.layout.objects.find(o=>o.id===(data.seat??data.object));if(o?.role==='guest'&&ui.guest){seatGuest(ui.guest,o.roomId,o.seat);return;}
 if(o?.kind==='reception'){ui.guest=club.guests.find(g=>!g.roomId)?.id;nav('guests');return;}
 if(o){ui.object=o.id;ui.tool='select';nav('build');return;}
 if(data.room){const zone=club.layout.rooms.find(z=>z.id===data.room);if(zone?.purpose==='staff'){nav('team');return;}ui.room=data.room;nav('rooms');}
}
function inspectWorld(data){if(data.guestId){ui.guest=data.guestId;nav('guests');}else if(data.masterId)nav('team');else if(data.object){ui.object=data.object;nav('build');}else if(data.room){ui.room=data.room;nav('rooms');}}
async function seatGuest(id,roomId,seat){
 const result=await perform(draft=>{const other=draft.guests.find(g=>g.roomId===roomId&&g.seat===seat);return other?swapGuests(draft,id,other.id):assignGuest(draft,id,roomId,seat);},{message:'Место назначено. До запуска можно пересадить гостя.'});
 if(result?.ok){ui.guest=club.guests.find(g=>!g.roomId)?.id??id;ui.seatArmed=false;render();}
}
function dragPerson(id,x,y,moved){
 const g=club.guests.find(g=>g.id===id);if(!g||club.rooms.some(r=>r.id===g.roomId&&r.status==='running'))return;
 const n=root.querySelector('#drag-person');if(!moved)return;n.hidden=false;n.innerHTML='<svg viewBox="-35 -125 70 135">'+personArt(g,{drag:true})+'</svg>';n.style.transform='translate('+(x-35)+'px,'+(y-44)+'px) rotate('+Math.sin(x*.03)*9+'deg)';
}
function hideDrag(){root.querySelector('#drag-person').hidden=true;}
function dropGuest(id,seatId){hideDrag();const o=club.layout.objects.find(o=>o.id===seatId);if(o?.role==='guest')seatGuest(id,o.roomId,o.seat);else note('Перетащите гостя на конкретный игровой стул. Место сохранено.');}
function clearSelection(){ui.cells.clear();ui.edges.clear();ui.preview=null;ui.hover=null;}
let objectGesture=null;
function cancelBuild(){objectGesture=null;clearSelection();if(world)world.drawPreview([]);renderPreview();}
function dragObject(id,p,start,finished){
 if(busy||readOnly)return;
 if(!objectGesture||objectGesture.id!==id){const object=club.layout.objects.find(o=>o.id===id);if(!object)return;objectGesture={id,object:structuredClone(object),pose:surfacePose(object,club.layout)};clearSelection();ui.object=id;ui.kind=object.kind;ui.rotation=object.rotation;ui.surfaceAngle=objectGesture.pose?.angle??0;ui.tool='move';}
 const {object,pose}=objectGesture,dx=p.x-start.x,dy=p.y-start.y;const wall=BUILD_CATALOG[object.kind]?.layer==='wall',wallCenter=[{x:object.x+.5,y:object.y},{x:object.x+1,y:object.y+.5},{x:object.x+.5,y:object.y+1},{x:object.x,y:object.y+.5}][object.rotation],lift=wallMountHeight(object.kind)/36;ui.hover=wall?itemEdit({x:wallCenter.x-lift+dx,y:wallCenter.y-lift+dy}):pose?{type:'move',id,...surfaceEditAt(club.layout,object.kind,{x:pose.x+dx,y:pose.y+dy},ui.surfaceAngle)}:{type:'move',id,x:Math.round(object.x+dx),y:Math.round(object.y+dy),rotation:ui.rotation};drawItemPreview(ui.hover);renderPreview(null,false);
 if(finished){ui.preview=ui.hover;ui.hover=null;objectGesture=null;render();drawItemPreview(ui.preview);renderPreview();}
}
function currentPoint(p){const lift=BUILD_CATALOG[ui.kind]?.layer==='tabletop'?TABLETOP_HEIGHT/36:0;return {x:p.x+lift,y:p.y+lift};}
function itemEdit(p){const q=currentPoint(p);if(BUILD_CATALOG[ui.kind]?.layer==='wall'){const lift=wallMountHeight(ui.kind)/36,object={kind:ui.kind,...wallPlacementAt(club.layout,{x:p.x+lift,y:p.y+lift},ui.rotation)};return ui.tool==='move'?{type:'move',id:ui.object,...object}:{type:'place',object};}if(BUILD_CATALOG[ui.kind]?.layer==='tabletop'){const object=surfaceEditAt(club.layout,ui.kind,q,ui.surfaceAngle??0);return ui.tool==='move'?{type:'move',id:ui.object,...object}:{type:'place',object};}return ui.tool==='move'?{type:'move',id:ui.object,x:Math.floor(q.x),y:Math.floor(q.y),rotation:ui.rotation}:{type:'place',object:{kind:ui.kind,x:Math.floor(q.x),y:Math.floor(q.y),rotation:ui.rotation}};}
function drawItemPreview(edit,quote=buildService.quote(edit)){const normalized=quote.edit??normalizeEdit(club,edit),object=normalized.object??{...club.layout.objects.find(o=>o.id===normalized.id),...normalized};world.drawPreview(objectCells(object),object,quote.ok);return quote;}
function hover(p){if(ui.tab!=='build'||!['item','move'].includes(ui.tool)||ui.preview)return;ui.hover=itemEdit(p);const q=drawItemPreview(ui.hover);renderPreview(q,false);}
function paintStart(p){
 if(busy||readOnly)return;ui.hover=null;
 if(!['land','floor'].includes(ui.tool))ui.cells.clear();ui.edges.clear();ui.preview=null;paintMove(p,p);
}
function paintMove(p,start){
 if(busy||readOnly)return;
 if(ui.tool==='item'||ui.tool==='move'){ui.hover=itemEdit(p);drawItemPreview(ui.hover);return;}
 if(ui.tool==='room'){ui.cells=new Map(rectangle(start,p).map(c=>[tileKey(c.x,c.y),c]));}
 else if(['land','floor'].includes(ui.tool)){const c={x:Math.floor(p.x),y:Math.floor(p.y)};if(ui.tool!=='land'||!ownedCells(club.layout).has(tileKey(c.x,c.y)))ui.cells.set(tileKey(c.x,c.y),c);}
 else if(['wall','door','window'].includes(ui.tool)){const edge=nearestEdge(p);ui.edges.set(edge.axis+':'+edge.x+','+edge.y,edge);}
 world.drawPreview([...ui.cells.values()]);if(ui.edges.size)world.drawPreview([...ui.edges.values()]);
}
function makeEdit(){
 const cells=[...ui.cells.values()];
 if(ui.tool==='land')return {type:'buyCells',cells};
 if(ui.tool==='room')return roomEdit(club.layout,cells,{purpose:ui.purpose,furnished:ui.furnished});
 if(ui.tool==='floor')return {type:'floor',cells,finish:'wood'};
 if(['wall','door','window'].includes(ui.tool))return {type:'batch',edits:[...ui.edges.values()].map(edge=>({type:'wall',edge,kind:ui.tool}))};
 return ui.hover;
}
function paintEnd(p,start){if(busy||readOnly)return;try{ui.preview=makeEdit();if(!ui.preview)return;ui.hover=null;const q=buildService.quote(ui.preview);if(ui.preview.type==='place'||ui.preview.type==='move')drawItemPreview(ui.preview,q);renderPreview(q,true);}catch(e){note(e.message,true);}}
function renderPreview(quote=null,locked=Boolean(ui.preview)){
 const n=root.querySelector('#build-preview');if(ui.tab!=='build'||(!ui.preview&&!ui.hover&&!quote)){n.innerHTML='';n.hidden=true;return;}n.hidden=false;
 const q=quote??buildService.quote(ui.preview??ui.hover),net=(q.cost??0)-(q.refund??0),canPay=club.finance.cash>=net,valid=q.ok&&canPay;
 n.classList.toggle('invalid',!valid);n.innerHTML='<div><small>'+(locked?'СМЕТА ИЗМЕНЕНИЯ':'ПРЕДПРОСМОТР')+'</small><b>'+(q.ok?(net<0?'Возврат '+money(-net):money(net)):esc(q.reason))+'</b><span>'+(q.ok?(canPay?'В кассе останется '+money(club.finance.cash-net):'Не хватает '+money(net-club.finance.cash)):'Изменение не применено')+'</span></div><div class="button-row">'+(locked?button('Применить','apply-build',!valid||busy?'disabled':'','primary'):'')+button(BUILD_CATALOG[ui.kind]?.layer==='tabletop'?'R · '+(ui.surfaceAngle??0)+'°':'Поворот R','rotate')+button('Отмена','cancel-build')+'</div>';
}
async function applyBuild(){
 if(!ui.preview||busy||readOnly)return;const before=structuredClone(club),q=buildService.quote(ui.preview);if(!q.ok){note(q.reason,true);return;}
 busy=true;root.classList.add('busy');root.setAttribute('aria-busy','true');
 const result=await buildService.commit(q.edit,{baseRevision:q.baseRevision,transactionId:uid()});busy=false;
 if(result.ok){undo=before;clearSelection();note('Построено. '+(result.cost?'Расход '+money(result.cost)+'. ':'')+(result.refund?'Возврат '+money(result.refund)+'.':''));}else note(result.reason,true);render();
}
function requestStart(id){
 const room=club.rooms.find(r=>r.id===id),guests=roomOccupants(club,id),end=club.clock+room.hours,late=guests.filter(g=>g.asked.includes('time')&&g.schedule.leaveAt<end),unknown=guests.filter(g=>!g.asked.includes('time')),status=campaignStatus(club),wages=room.master.hourlyWage*room.hours;
 const hard=tablePlan(club,id).rows.flatMap(row=>row.notes.filter(n=>['boundaries','avoid-genre','format'].includes(n.code)&&n.tone==='warning').map(n=>row.name+': '+n.text));
 if(late.length||unknown.length||hard.length||club.finance.cash<status.reserve+wages){
  ui.pending={title:'Начать партию до '+clockText(end)+'?',text:(hard.length?hard.join(' ')+' ':'')+(late.length?'Не успеют до конца: '+late.map(nameOf).join(', ')+'. ':'')+(unknown.length?'Время не уточнено у '+unknown.length+' гостей. ':'')+'Зарплата мастера '+money(wages)+', содержание оплачивается отдельно. Сумма оплаты зависит от удовольствия. Нарушение явных условий приведёт к возврату билета.',run:()=>perform(draft=>startRoom(draft,id,{acceptRisk:true}),{message:'Партия началась. Время остаётся на паузе до вашего решения.'})};render(true);
 }else perform(draft=>startRoom(draft,id),{message:'Партия началась.'});
}
function download(){
 const data=saveDownload(club),url=URL.createObjectURL(new Blob([data.raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=data.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);note('Полная кампания скачана.');
}
async function handle(action,d){
 if(action==='inspect-object'){ui.object=d.id;ui.tool='select';clearSelection();render();return;}
 if(action==='nav'){nav(d.tab);return;}if(action==='guest'){ui.guest=d.id;ui.seatArmed=true;nav('guests');return;}if(action==='room'){ui.room=d.id;nav('rooms');return;}
 if(action==='fit'){world.fit();return;}if(action==='zoom-in'){world.zoom(1.2);return;}if(action==='zoom-out'){world.zoom(1/1.2);return;}if(action==='walls'){ui.walls=ui.walls==='cut'?'hidden':ui.walls==='hidden'?'full':'cut';render();return;}
 if(action==='library-tab'){ui.libraryTab=d.id;ui.librarySearch='';render(true);return;}if(action==='stories-for-system'){ui.libraryTab='adventures';ui.librarySearch=SYSTEMS[d.system]?.name??'';ui.tab='library';render(true);return;}if(action==='category'){ui.category=d.category;ui.catalogSearch='';render(true);return;}if(action==='team-tab'){ui.candidates=d.candidates==='true';render(true);return;}
 if(action==='tool'){clearSelection();ui.tool=d.tool;render();return;}if(action==='build-item'){clearSelection();ui.kind=d.kind;ui.tool='item';ui.rotation=0;ui.surfaceAngle=0;render();return;}
 if(action==='cancel-build'){clearSelection();ui.tool='select';render();return;}
 if(action==='rotate'&&BUILD_CATALOG[ui.kind]?.layer==='tabletop'){ui.surfaceAngle=normalizeAngle((ui.surfaceAngle??0)+(d.reverse?-15:15));const edit=ui.preview??ui.hover;if(edit){const object=edit.object??{...club.layout.objects.find(o=>o.id===edit.id),...edit},pose=surfacePose(object,club.layout),next=surfaceEditAt(club.layout,object.kind,pose,ui.surfaceAngle);if(edit.object)Object.assign(edit.object,next);else Object.assign(edit,next);drawItemPreview(edit);}renderPreview();return;}
 if(action==='rotate'){ui.rotation=(ui.rotation+1)%4;if(ui.preview&&(ui.preview.type==='place'||ui.preview.type==='move')){if(ui.preview.object)ui.preview.object.rotation=ui.rotation;else ui.preview.rotation=ui.rotation;drawItemPreview(ui.preview);}else if(ui.hover){if(ui.hover.object)ui.hover.object.rotation=ui.rotation;else ui.hover.rotation=ui.rotation;drawItemPreview(ui.hover);}renderPreview();return;}
 if(action==='apply-build'){await applyBuild();return;}
 if(action==='export'){download();return;}if(action==='more-ledger'){ui.ledgerLimit+=40;render();return;}
 if(action==='cancel-confirm'){ui.pending=null;render();return;}if(action==='confirm'){const pending=ui.pending;ui.pending=null;if(pending)await pending.run();render();return;}
 if(action==='service-build'){ui.category='service';nav('build');return;}
 if(busy||readOnly){note(readOnly?writer.reason:'Дождитесь сохранения.',true);return;}
 if(action==='quick-interview'){await perform(draft=>quickInterview(draft,ui.guest),{message:'Главные условия записаны. Выберите подходящий стол.'});return;}
 if(action==='wait-guests'){await command({type:'waitForGuests'},'Время переведено к ближайшему приходу или окончанию партии.');return;}
 if(action==='ask'){await perform(draft=>{const answer=askGuest(draft,ui.guest,d.question);return answer?{ok:true}:{ok:false,reason:'Вопрос недоступен.'};});return;}
 if(action==='seat'){await seatGuest(ui.guest,d.room,Number(d.seat));return;}
 if(action==='unseat'){await perform(draft=>({ok:unassignGuest(draft,ui.guest)}));return;}
 if(action==='dismiss-guest'){await perform(draft=>dismissGuest(draft,ui.guest));ui.guest=club.guests.find(g=>!g.roomId)?.id;render();return;}
 if(action==='start-room'){requestStart(d.id);return;}
 if(action==='advance'){const r=await perform(advanceClub);if(r.ok)nav('finance');return;}
 if(action==='wait'){await command({type:'advanceIdle'},'Прошёл один игровой час.');return;}
 if(action==='move-object'){const o=club.layout.objects.find(o=>o.id===d.id);ui.object=o.id;ui.kind=o.kind;ui.rotation=o.rotation;ui.surfaceAngle=surfacePose(o,club.layout)?.angle??0;ui.tool='move';clearSelection();render();return;}
 if(action==='rotate-object'){const o=club.layout.objects.find(o=>o.id===d.id);if(BUILD_CATALOG[o.kind]?.layer==='tabletop'){ui.object=o.id;ui.kind=o.kind;ui.tool='move';ui.surfaceAngle=normalizeAngle((surfacePose(o,club.layout)?.angle??0)+15);ui.preview={type:'move',id:o.id,...surfaceEditAt(club.layout,o.kind,surfacePose(o,club.layout),ui.surfaceAngle)};drawItemPreview(ui.preview);renderPreview();return;}ui.preview={type:'move',id:o.id,x:o.x,y:o.y,rotation:(o.rotation+1)%4};renderPreview();return;}
 if(action==='sell-object'){ui.preview={type:'remove',id:d.id};renderPreview();return;}
 if(action==='undo-build'&&undo){const before=undo;await perform(draft=>{Object.keys(draft).forEach(k=>delete draft[k]);Object.assign(draft,structuredClone(before));return {ok:true};},{message:'Последнее строительство отменено.'});return;}
 if(action==='new-game'){ui.tab='settings';ui.pending={title:'Начать новую игру?',text:'Текущий клуб будет сохранён в местном архиве. Вы начнёте с одной оборудованной комнаты и первого мастера.',run:async()=>{const result=await perform(draft=>{Object.keys(draft).forEach(k=>delete draft[k]);Object.assign(draft,createCampaign(uid()));return {ok:true};},{archive:true,message:'Новый клуб открыт.'});if(result.ok){ui.guest=club.guests[0]?.id;ui.room=club.rooms[0]?.id;ui.object=null;ui.tab='club';render();world.fit();}}};render(true);return;}
 const actions={
  'wait-operation':{type:'waitForOperation'},'hire':{type:'hireMaster',candidateId:d.id},'buy-game':{type:'purchaseGame',systemId:d.id},'buy-adventure':{type:'buyAdventure',adventureId:d.id},'repair-kit':{type:'repairKit',kitId:d.id},
  'restock':{type:'restock',itemId:d.id,portions:20},'power':{type:'setEquipment',itemId:d.id,enabled:d.enabled==='true'},'clean':{type:'cleanZone',zoneId:d.id,helper:d.helper==='true'},'assign-helper':{type:'assignServiceStaff',itemId:d.id||null},'maintain':{type:'maintainEquipment',itemId:d.id},'writeoff':{type:'writeOffBatch',batchId:d.id},
  'auto-stock':{type:'setEquipment',itemId:d.id,autoRefill:d.active==='true'},'hire-service':{type:'hireServiceStaff'},'service-shift':{type:'setServiceShift',active:d.active==='true'},
 };
 if(action==='dismiss-master'){ui.pending={title:'Уволить мастера?',text:'Мастер освободит место в штате. Деньги за найм и начатое обучение не возвращаются.',run:()=>command({type:'dismissMaster',masterId:d.id,acceptTrainingLoss:true})};render();return;}
 if(action==='sell-kit'){ui.pending={title:'Продать экземпляр игры?',text:'Назначение пустой комнаты будет снято. Купленные приключения сохранятся.',run:()=>command({type:'sellGame',kitId:d.id,acceptUnassign:true})};render();return;}
 if(action==='toggle-room'){const r=club.rooms.find(r=>r.id===d.id);await command(r.enabled?{type:'disableRoom',roomId:d.id}:{type:'assignRoom',roomId:d.id});return;}
 if(action==='recovery'){const plan=campaignStatus(club).recoveryPlan;ui.pending={title:'Принять план спасения?',text:'Будет продано указанное в плане свободное имущество. В кассе после плана: '+money(plan.balanceAfter)+'. '+plan.items.map(i=>({sell:'Продать',buy:'Купить',move:'Перенести',demolish:'Перестроить','write-off':'Списать'}[i.action]??'Сохранить')+' '+i.name+(i.refund?' · возврат '+money(i.refund):i.cost?' · расход '+money(i.cost):'')).join('; '),run:()=>command({type:'liquidate',planId:plan.id})};render();return;}
 if(actions[action])await command(actions[action],action==='restock'?'Заказ оплачен. Поставка прибудет через один игровой час.':undefined);
}
root.addEventListener('click',e=>{const n=e.target.closest('[data-action]');if(n){e.preventDefault();handle(n.dataset.action,n.dataset).catch(error=>note(error.message,true));}});
root.addEventListener('submit',e=>{
 e.preventDefault();const data=new FormData(e.target);
 if(e.target.id==='room-form')command({type:'assignRoom',roomId:ui.room,gameId:data.get('game'),masterId:data.get('master'),adventureId:data.get('adventure')});
 if(e.target.classList.contains('service-policy'))command({type:'configureAutoPurchase',itemId:e.target.dataset.id,settings:{target:Number(data.get('target')),budget:Number(data.get('budget')),threshold:0,maxOrder:Math.min(10,Number(data.get('target')))}});
 if(e.target.classList.contains('training-form'))command({type:'trainMaster',masterId:e.target.dataset.id,systemId:data.get('course')});
});
root.addEventListener('input',e=>{
 if(e.target.id==='catalog-search'){ui.catalogSearch=e.target.value;const grid=root.querySelector('#catalog-grid');grid.innerHTML=catalogCards();fitItemIcons(grid);}
 if(e.target.id==='library-search'){ui.librarySearch=e.target.value;root.querySelector('#library-cards').innerHTML=libraryCards();}
});
root.addEventListener('change',async e=>{
 if(e.target.id==='room-purpose'){ui.purpose=e.target.value;cancelBuild();return;}if(e.target.id==='room-furnished'){ui.furnished=e.target.checked;cancelBuild();return;}
 if(e.target.closest('#room-form')){
  const r=club.rooms.find(r=>r.id===ui.room),data=new FormData(e.target.form),gameId=data.get('game'),system=club.library.copies.find(k=>k.id===gameId)?.systemId;
  const free=(field,id)=>!club.rooms.some(other=>other.id!==r.id&&other.enabled!==false&&other[field]===id);
  const adventureId=e.target.name==='game'?SESSIONS.find(a=>a.systemId===system&&club.library.adventures.includes(a.id))?.id:data.get('adventure');
  let masterId=data.get('master');if(!club.staff.find(m=>m.id===masterId)?.known.includes(system))masterId=club.staff.find(m=>m.known.includes(system)&&!m.training&&free('masterId',m.id))?.id??'';
  await command({type:'assignRoom',roomId:r.id,gameId,masterId,adventureId});return;
 }
 if(e.target.id==='catalog-category'){ui.category=e.target.value;ui.catalogSearch='';render(true);return;}
 if(e.target.id==='import-save'){
  if(busy||readOnly)return;busy=true;root.classList.add('busy');root.setAttribute('aria-busy','true');
  try{const next=await readSaveFile(e.target.files[0]);ui.pending={title:'Заменить клуб из файла?',text:'В загружаемой кампании '+next.rating.count+' отзывов, в кассе '+money(next.finance.cash)+'. Текущий клуб сохранится в местном архиве.',run:()=>perform(draft=>{Object.keys(draft).forEach(k=>delete draft[k]);Object.assign(draft,next);return {ok:true};},{archive:true,message:'Кампания восстановлена из файла.'})};}catch(error){note(error.message,true);}finally{busy=false;render(true);}
 }
});
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;if(e.code==='KeyR'&&ui.tab==='build'){e.preventDefault();handle('rotate',{reverse:e.shiftKey});}if(e.code==='Escape'){ui.pending=null;objectGesture=null;clearSelection();ui.tool='select';hideDrag();render();}});
let externalDrag=null,ignoreClickUntil=0;
root.addEventListener('pointerdown',e=>{const n=e.target.closest('[data-drag-guest]');if(n&&e.button===0){externalDrag={id:n.dataset.dragGuest,x:e.clientX,y:e.clientY,moved:false};n.setPointerCapture(e.pointerId);}});
root.addEventListener('pointermove',e=>{if(!externalDrag)return;externalDrag.moved||=Math.hypot(e.clientX-externalDrag.x,e.clientY-externalDrag.y)>6;if(externalDrag.moved){e.preventDefault();dragPerson(externalDrag.id,e.clientX,e.clientY,true);}});
root.addEventListener('pointerup',e=>{if(!externalDrag)return;const drag=externalDrag;externalDrag=null;hideDrag();if(drag.moved){ignoreClickUntil=performance.now()+100;e.preventDefault();dropGuest(drag.id,world.seatAtClient(e.clientX,e.clientY)?.id);}});
root.addEventListener('click',e=>{if(performance.now()<ignoreClickUntil&&e.target.closest('[data-drag-guest]')){ignoreClickUntil=0;e.stopImmediatePropagation();e.preventDefault();}},{capture:true});
root.addEventListener('pointercancel',()=>{externalDrag=null;hideDrag();});

async function boot(){
 try{
  writer=await claimSaveWriter(CLUB_KEY);readOnly=!writer.writable;
  store=await createSaveStore({key:CLUB_KEY,decode:decodeClub,encode:encodeClub});club=store.read();
  if(!club){if(readOnly)throw new Error(writer.reason);club=createCampaign(uid());await store.write(club);}
  // Old unpaid 15-minute setup was explicitly rejected; paid repairs remain.
  if(!readOnly&&(club.rooms.some(r=>r.tablePreparation)||club.library.copies.some(k=>k.preparingUntil))){const draft=structuredClone(club);draft.rooms.forEach(r=>r.tablePreparation=null);draft.library.copies.forEach(k=>k.preparingUntil=null);await store.write(draft);club=draft;}
  ui.guest=club.guests.find(g=>!g.roomId)?.id;ui.room=club.rooms[0]?.id;layout();
  buildService=createConstructionService({getClub:()=>club,replaceClub:next=>club=next,persist:next=>store.write(next),budgetAdapter:constructionBudgetAdapter()});
  buildService.attachEconomy(constructionBudgetAdapter());render();if(readOnly)note(writer.reason,true);
  // Read-only inspection hook; actions still use the same durable UI paths.
  globalThis.clubStudio=Object.freeze({snapshot:()=>structuredClone(club),camera:()=>({...world.camera}),point:(x,y)=>world.worldPoint(x,y)});
 }catch(error){
  root.innerHTML='<main class="boot-error"><h1>Клуб не удалось открыть</h1><p>'+esc(error.message)+'</p><p>Исходная запись сохранена. Её можно скачать перед восстановлением.</p><button type="button" id="recover-original">Скачать исходную запись</button><details><summary>Начать новый клуб с архивом прежней записи</summary><p>Исходная запись будет сохранена в местном архиве одновременно с новой кампанией.</p><button type="button" id="recover-new" '+(readOnly||!store?'disabled':'')+'>Сохранить оригинал в архиве и начать заново</button></details><p id="recover-status"></p></main>';
  root.querySelector('#recover-original').addEventListener('click',()=>{const raw=store?.raw();if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='nri-club-original.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);});
  root.querySelector('#recover-new').addEventListener('click',async e=>{e.target.disabled=true;try{await store.write(createCampaign(uid()),{archive:true});location.reload();}catch(failure){root.querySelector('#recover-status').textContent=failure.message;e.target.disabled=false;}});
 }

}
boot();
