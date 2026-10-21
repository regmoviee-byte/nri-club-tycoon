import {createFreshCampaign,normalizeAdministrator,DEFAULT_ADMINISTRATOR} from '../model/new-club.js';
import {reviewFeedback} from '../model/review-feedback.js';
import {createCampaign,decodeClub,encodeClub,CLUB_KEY,campaignMarket,campaignStatus,executeCampaignAction,startRoom,advanceClub,readyRooms,runningRooms,clockText,updateCampaign,dismissGuest,guestFlowStatus} from '../model/campaign.js';
import {tablePlan,quickInterview,QUICK_INTERVIEW_QUESTIONS} from '../model/table-plan.js';
import {planningGuest} from '../model/guest-knowledge.js';
import {groupLimits,guestSeatNumbers} from '../model/group-size.js';
import {askQuestion as askGuest,assignGuest,swapGuests,unassignGuest,roomOccupants} from '../model/club.js';
import {createSaveStore,claimSaveWriter} from './save-store.js';
import {readSaveFile,saveDownload} from './save-files.js';
import {createConstructionService,normalizeEdit} from '../model/construction.js';
import {constructionBudgetAdapter} from '../model/campaign-construction.js';
import {BUILD_CATALOG,WALL_PRICES} from '../data/build-catalog.js';
import {ECONOMY} from '../data/commerce.js';
import {SYSTEMS} from '../data/systems.js';
import {motifs} from '../data/catalog.js';
import {SESSIONS,QUESTIONS} from '../data/club.js';
import {clubPrestige,prestigeNeeded,effectText,ITEM_EFFECTS} from '../model/upgrades.js';
import {roomEdit,rectangle,nearestEdge,replanRoomEdit,demolishRoomEdit} from '../model/studio-building.js';
import {objectCells,tileKey} from '../model/layout.js';
import {ownedCells} from '../model/campaign-layout.js';
import {syncGuestWaiting} from '../model/guest-waiting.js';
import {createWorld,itemThumbnail,TABLETOP_HEIGHT} from './world.js';
import {sessionForecast} from '../model/finances.js';
import {investmentQuote,financeBreakdown,emptyRoomSavings} from '../model/finance-breakdown.js';
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
const ui={tab:'club',guest:null,room:null,object:null,tool:'select',kind:'plant',rotation:0,category:'furniture',purpose:'game',furnished:true,cells:new Map(),edges:new Map(),preview:null,hover:null,pending:null,walls:'cut',message:'',error:false,candidates:false,ledgerLimit:40,seatArmed:false,catalogSearch:'',libraryTab:'adventures',librarySearch:'',guestTab:'talk',seatRoom:null,roomSearch:'',roomFilter:'all',wall:null,buildRoom:null,floorFinish:'wood',reportId:null,reportRoom:'all'};
let sessionResults=[],sessionResultIndex=0;
const panels={creator:['НОВЫЙ КЛУБ','Ваш администратор'],club:['СВОДКА КЛУБА','Сегодня в клубе'],guests:['РАЗГОВОР У РЕСЕПШНА','Знакомство'],rooms:['НАСТРОЙКИ И СОСТАВ СТОЛОВ','Игровые комнаты'],build:['РЕДАКТОР ПЛАНИРОВКИ','Строительство'],team:['ШТАТ, ОТДЫХ И НАЙМ','Мастера'],library:['ИГРЫ И ИСТОРИИ','Библиотека'],service:['ЗАБОТА О КЛУБЕ','Сервис'],finance:['ДЕНЬГИ И РЕЗУЛЬТАТЫ ПАРТИЙ','Касса и отзывы'],goals:['ОТ ПЕРВОГО СТОЛА К КЛУБУ','Развитие'],settings:['ВАША КАМПАНИЯ','Сохранение']};

function layout(){
 root.innerHTML='<header class="game-header"><a class="brand" href="#" data-action="nav" data-tab="club">'+icon('team')+'<span>НРИ<span class="brand-thin"> / КЛУБ</span><small>МЕСТО ДЛЯ ВАШИХ ИСТОРИЙ</small></span></a><div id="resources" class="resources"></div><button type="button" data-action="nav" data-tab="settings" class="save-button">'+icon('save')+'<span id="save-state">Сохранено</span></button></header><main class="workbench"><nav class="game-rail" aria-label="Управление клубом">'+Object.entries({club:'Клуб',guests:'Гости',rooms:'Партии',build:'Строить',team:'Мастера',library:'Игры',service:'Сервис',finance:'Касса',goals:'Развитие'}).map(([tab,title])=>'<button type="button" data-action="nav" data-tab="'+tab+'" title="'+title+'">'+icon(tab)+'<span>'+title+'</span></button>').join('')+'<div class="rail-spacer"></div>'+button(icon('plus')+'<span>Новая игра</span>','new-game','','new-game-rail')+'</nav><aside class="side-panel"><div class="panel-heading"><small id="panel-eyebrow"></small><h1 id="panel-title" tabindex="-1"></h1></div><div id="panel-content" class="panel-content" tabindex="-1"></div></aside><div class="panel-resizer" role="separator" aria-label="Размер панели" aria-orientation="vertical" tabindex="0"></div><section class="map-pane" aria-label="Клуб"><div class="map-heading"><div><small>ВАШ КЛУБ</small><strong id="map-summary"></strong></div><div class="camera-controls">'+button('−','zoom-out','aria-label="Уменьшить карту"')+button('Постройки','fit-buildings','aria-label="Показать все постройки"')+button('Участок','fit','aria-label="Показать весь участок"')+button('+','zoom-in','aria-label="Увеличить карту"')+button('Стены','walls','aria-label="Изменить видимость стен"')+button('Больше карты','workspace-view','','workspace-view')+'</div></div><div id="world-host"></div><div id="build-preview" class="build-preview" aria-live="polite"></div><div class="map-help" id="map-help">Колесо — масштаб · потяните карту — камера · ПКМ — сведения · Home — весь клуб</div><div class="guest-queue"><div class="queue-label"><b id="queue-count"></b><span>ожидают</span></div><div id="guest-queue" class="queue-list"></div></div></section></main><footer class="timebar"><div class="clock"><small>ВРЕМЯ КЛУБА</small><strong id="clock"></strong></div><div class="time-status" id="time-status"></div><div class="time-actions">'+button('Подождать час','wait')+button('До ближайшего окончания →','advance','','primary')+'</div></footer><div id="message" class="game-message" role="status" aria-live="polite"></div><div id="drag-person" class="drag-person" hidden></div><dialog id="session-results" aria-labelledby="session-result-title"></dialog>';
 root.querySelector('#session-results').addEventListener('cancel',e=>{e.preventDefault();nextSessionResult();});
 const handle=root.querySelector('.panel-resizer');let resizeStart=null;
 handle.addEventListener('pointerdown',e=>{resizeStart={x:e.clientX,width:root.querySelector('.side-panel').getBoundingClientRect().width};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(resizeStart)setPanelWidth(resizeStart.width+e.clientX-resizeStart.x);});
 handle.addEventListener('pointerup',()=>{resizeStart=null;});
 handle.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();setPanelWidth(root.querySelector('.side-panel').getBoundingClientRect().width+(e.key==='ArrowLeft'?-20:20));}});
 try{const width=Number(localStorage.getItem('nri-studio-panel'));if(width)setPanelWidth(width);}catch{}
 world=createWorld(root.querySelector('#world-host'),{onSelect:selectWorld,onInspect:inspectWorld,onHover:hover,onPaintStart:paintStart,onPaintMove:paintMove,onPaintEnd:paintEnd,onCancel:cancelBuild,onGuestDrag:dragPerson,onObjectDrag:dragObject,onGuestDrop:dropGuest,onDragEnd:hideDrag});
}
function setPanelWidth(value){const width=Math.max(280,Math.min(580,innerWidth*.5,value));root.style.setProperty('--panel-width',width+'px');try{localStorage.setItem('nri-studio-panel',String(width));}catch{}}
function note(message,error=false){ui.message=message??'';ui.error=error;const n=root.querySelector('#message');if(n){n.textContent=message??'';n.title=message??'';n.classList.toggle('is-error',error);}const panel=root.querySelector('#panel-content');let detail=root.querySelector('#panel-error');if(error&&ui.message&&panel){if(!detail){detail=document.createElement('div');detail.id='panel-error';detail.className='notice error';detail.setAttribute('role','alert');panel.prepend(detail);}detail.textContent=ui.message;}else detail?.remove(); }
function nav(tab){if(ui.creating&&tab!=='creator')return;if(tab!=='build')clearInspection();ui.tab=tab;ui.pending=null;if(tab==='guests'||tab==='rooms')ui.expandedMap=false;if(tab!=='guests')ui.seatArmed=false;if(tab!=='build'){ui.tool='select';ui.preview=null;ui.cells.clear();}render(true);}
function stateView(){return {tool:ui.tab==='build'?(ui.tool==='erase'?'select':ui.tool):null,kind:ui.kind,walls:ui.walls,objectId:ui.object,roomId:ui.tab==='rooms'?ui.room:ui.tab==='build'?ui.buildRoom:null,selectedGuest:ui.guest,placingGuest:ui.seatArmed?ui.guest:null,cells:[...ui.cells.values()]};}
const panelMemory=new Map();let renderedPanelKey=null;
const conversationScroll=new Map();
const formDrafts=new Map();
function draftKey(form){return form&&(form.id==='cleaning-policy-form'||form.id==='room-inspector-form'||form.id==='demolish-room-form'||form.classList.contains('service-policy'))?[renderedPanelKey,form.id||'service-policy',form.dataset.id??''].join('|'):null;}
function rememberFormDraft(target){
 const form=target.closest('form'),key=draftKey(form);if(!key)return;
 formDrafts.set(key,[...form.elements].filter(n=>n.name&&n.type!=='file').map(n=>({name:n.name,type:n.type,value:n.value,checked:n.checked})));
}
function restoreFormDrafts(panel){
 for(const form of panel.querySelectorAll('form')){const rows=formDrafts.get(draftKey(form));if(!rows)continue;
  for(const node of form.elements){if(!node.name||node.type==='file')continue;const row=rows.find(r=>r.name===node.name&&r.type===node.type&&(!['checkbox','radio'].includes(node.type)||r.value===node.value));if(!row)continue;
   if(['checkbox','radio'].includes(node.type))node.checked=row.checked;else if(node.tagName!=='SELECT'||[...node.options].some(o=>o.value===row.value))node.value=row.value;
  }
 }
}
function panelKey(){return [ui.tab,ui.tab==='guests'?[ui.guest,ui.guestTab].join(':'):ui.tab==='rooms'?ui.room:ui.tab==='build'?[ui.object,ui.wall,ui.buildRoom].join(':'):''].join('|');}
function focusToken(node){if(!node||node===document.body)return null;return {id:node.id,action:node.dataset?.action,data:node.dataset?JSON.stringify({...node.dataset}):'',name:node.name,tag:node.tagName,text:node.textContent?.trim().slice(0,80),start:node.selectionStart,end:node.selectionEnd};}
function matchingFocus(token){if(!token)return null;if(token.id)return document.getElementById(token.id);return [...root.querySelectorAll('button,select,input,summary,a')].find(n=>n.tagName===token.tag&&(token.name?n.name===token.name:token.action?n.dataset.action===token.action&&JSON.stringify({...n.dataset})===token.data:n.textContent.trim().slice(0,80)===token.text));}
function render(resetScroll=false){
 root.classList.toggle('mode-talk',ui.tab==='guests'&&ui.guestTab==='talk');
 if(!club)return;root.dataset.buildTool=ui.tab==='build'?ui.tool:'';root.setAttribute('aria-busy',String(busy));root.classList.toggle('busy',busy);root.classList.toggle('mode-creator',Boolean(ui.creating));root.classList.toggle('mode-build',ui.tab==='build');root.classList.toggle('map-expanded',Boolean(ui.expandedMap));const workspace=root.querySelector('[data-action="workspace-view"]');if(workspace){workspace.textContent=ui.expandedMap?'Вернуть панель':'Больше карты';workspace.setAttribute('aria-expanded',String(Boolean(ui.expandedMap)));}
 const status=campaignStatus(club),prestige=clubPrestige(club),rating=club.rating.count?(club.rating.sum/club.rating.count).toFixed(1):'—';
 root.querySelector('#resources').innerHTML=[['В КАССЕ',money(status.balance),'wallet'],['СВОБОДНО',money(status.balance-status.reserve),'free'],['РЕЙТИНГ',rating+' / 10','rating'],['ПРЕСТИЖ',prestige.value,'prestige']].map(([a,b,c])=>'<div class="resource '+c+'"><small>'+a+'</small><strong>'+b+'</strong></div>').join('');
 root.querySelectorAll('[data-action="nav"]').forEach(n=>{n.classList.toggle('active',n.dataset.tab===ui.tab);if(n.dataset.tab===ui.tab)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
 root.querySelector('#panel-eyebrow').textContent=panels[ui.tab][0];root.querySelector('#panel-title').textContent=panels[ui.tab][1];
 const panel=root.querySelector('#panel-content'),focus=focusToken(document.activeElement),wasPanel=panel.contains(document.activeElement),nextKey=panelKey();
 for(const area of panel.querySelectorAll('[data-scroll-key]'))conversationScroll.set(area.dataset.scrollKey,area.scrollTop);
 if(renderedPanelKey)panelMemory.set(renderedPanelKey,{scroll:panel.scrollTop,details:[...panel.querySelectorAll('details')].map(n=>[n.dataset.detailKey??n.querySelector('summary')?.textContent.trim(),n.open])});
 const remembered=panelMemory.get(nextKey),scroll=resetScroll?(remembered?.scroll??0):nextKey===renderedPanelKey?panel.scrollTop:remembered?.scroll??0;
 panel.innerHTML=panelHTML();renderedPanelKey=nextKey;restoreFormDrafts(panel);fitItemIcons(panel);
 for(const detail of panel.querySelectorAll('details')){const key=detail.dataset.detailKey??detail.querySelector('summary')?.textContent.trim(),old=remembered?.details.find(([id])=>id===key);if(old)detail.open=old[1];}
 panel.scrollTop=scroll;renderedPanelKey=nextKey;
 for(const area of panel.querySelectorAll('[data-scroll-key]'))area.scrollTop=conversationScroll.get(area.dataset.scrollKey)??0;
 for(const n of root.querySelectorAll('[data-action="tool"],[data-action="build-item"],[data-action="library-tab"],[data-action="guest-tab"],[data-action="room-filter"]'))n.setAttribute('aria-pressed',String(n.classList.contains('active')));
 const wallButton=root.querySelector('[data-action="walls"]');wallButton.setAttribute('aria-label','Стены: '+({cut:'срез',hidden:'скрыты',full:'полная высота'}[ui.walls]));wallButton.textContent='Стены · '+({cut:'срез',hidden:'нет',full:'все'}[ui.walls]);
 if(wasPanel){const target=matchingFocus(focus);(target??root.querySelector('#panel-title')).focus({preventScroll:true});if(target&&typeof target.setSelectionRange==='function'&&Number.isInteger(focus.start))try{target.setSelectionRange(focus.start,focus.end);}catch{}}
 else if(resetScroll)root.querySelector('#panel-title').focus({preventScroll:true});
 const active=runningRooms(club),waiting=club.guests.filter(g=>!g.roomId);
 root.querySelector('#map-summary').textContent=club.rooms.length+' '+(club.rooms.length===1?'игровая':'игровых')+' · '+club.guests.length+' гостей';
 root.querySelector('#queue-count').textContent=waiting.length;
 root.querySelector('#guest-queue').innerHTML=waiting.map(g=>'<button type="button" class="queue-person '+(g.id===ui.guest?'active':'')+'" data-action="guest" data-id="'+esc(g.id)+'"><span data-drag-guest="'+esc(g.id)+'">'+portrait(g)+'</span><b>'+esc(nameOf(g))+'</b><small>'+guestTime(g)+'</small></button>').join('')||'<span class="empty-queue">'+(active.length?'Все гости за столами.':'У стойки пока никого.')+' Следующий приход: '+(guestFlowStatus(club).nextAt?clockText(guestFlowStatus(club).nextAt):'нужна открытая комната и ресепшн')+'.</span>';
 root.querySelector('#clock').textContent='День '+(Math.floor(club.clock/24)+1)+' · '+clockText(club.clock);
 root.querySelector('#time-status').innerHTML=active.length?'<b>'+active.length+' '+(active.length===1?'партия идёт':'партии идут')+'</b><span>Ближайшее окончание в '+clockText(Math.min(...active.map(r=>r.run.endsAt)))+'</span>':'<b>Время на паузе</b><span>Разговоры, рассадка и строительство не тратят часы.</span>';
 root.querySelector('[data-action="advance"]').disabled=busy||readOnly||!active.length;root.querySelector('[data-action="wait"]').disabled=busy||readOnly||ui.creating;
 root.querySelector('#save-state').textContent=readOnly?'Только просмотр':busy?'Сохраняю…':'Сохранено';
 root.querySelector('#map-help').textContent=ui.tab==='build'&&BUILD_CATALOG[ui.kind]?.layer==='tabletop'&&ui.tool!=='select'?'Свободная установка · R / Shift+R — ±15° · Esc — отмена':ui.tab==='build'&&ui.tool==='select'?'Потяните предмет — перенос · Пробел + перетаскивание — камера · ПКМ — сведения':ui.tab==='build'&&ui.tool!=='select'?'Пробел + перетаскивание — камера · R — поворот · Esc — отмена': 'Колесо — масштаб · потяните карту — камера · ПКМ — сведения · Home — весь клуб';
 world.render(club,stateView());renderPreview();note(ui.message,ui.error);renderSessionResults();
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
 if(ui.creating)return creatorHTML();
 const pending=pendingHTML();if(ui.tab==='club')return pending+homeHTML();
 if(ui.tab==='guests')return pending+guestHTML();if(ui.tab==='rooms')return pending+roomsHTML();
 if(ui.tab==='build')return pending+buildingHTML();if(ui.tab==='team')return pending+teamHTML();
 if(ui.tab==='library')return pending+libraryHTML();if(ui.tab==='service')return pending+serviceHTML();
 if(ui.tab==='finance')return pending+financeHTML();if(ui.tab==='goals')return pending+goalsHTML();
 return pending+settingsHTML();
}
function arrivalsHTML(){
 const flow=guestFlowStatus(club);return section('Приход посетителей','<div class="arrival-plan" data-arrival-plan="true">'+(flow.enabled?'<p>Ближайший приход в <b>'+clockText(flow.nextAt)+'</b> · до '+flow.expectedArrivals+' новых гостей при свободных местах.</p>'+(flow.demand?'<p class="small-copy">'+esc(flow.demand.description??'')+' Поток: '+Number(flow.demand.rate).toLocaleString('ru-RU',{maximumFractionDigits:2})+' гостя/ч. Открытие комнаты добавляет места, а не посетителей.</p>':'')+'<p class="small-copy">Ожидание до '+Math.round((flow.waitingUntil-club.clock)*60)+' мин · содержание до '+money(flow.waitingCost)+'. Разговоры и рассадка время не тратят. Отказ не приводит нового гостя мгновенно.</p>'+button('Дождаться следующих гостей','wait-guests','','full'):'<p>'+esc(flow.reason)+'</p>')+'</div>');
}
function tablePlanHTML(roomId){
 const plan=tablePlan(club,roomId),labels={good:'Подходит',warning:'Обсудить',unknown:'Не уточнено'};
 return section('Состав и договорённости','<div class="table-plan" data-table-plan="true">'+plan.summary.map(n=>'<p class="plan-note '+n.tone+'">'+esc(n.text)+'</p>').join('')+plan.rows.map(row=>'<details class="plan-guest '+row.tone+'"><summary>'+esc(row.name)+' <small>'+labels[row.tone]+'</small></summary>'+row.notes.map(n=>'<p class="plan-note '+n.tone+'">'+esc(n.text)+'</p>').join('')+button('Поговорить с гостем','guest','data-id="'+esc(row.guestId)+'"','quiet')+'</details>').join('')+'<p class="small-copy">Это сводка услышанных условий, а не обещание оценки. Вы сами выбираете историю, мастера и соседей.</p></div>');
}
function unheardInterview(g){const asked=new Set(planningGuest(club,g).asked);return QUICK_INTERVIEW_QUESTIONS.filter(id=>!asked.has(id));}
function intakeHTML(g,playing){
 const missing=unheardInterview(g);
 const replies=QUICK_INTERVIEW_QUESTIONS.map(id=>g.dialogue.find(a=>a.questionId===id)).filter(Boolean);
 return '<div class="quick-interview">'+(!playing&&missing.length?button('Короткое знакомство','quick-interview','','full primary')+intro('За один разговор: интересы, время, границы, формат и помощь с правилами. Место выбираете вы.'):'')+(replies.length?'<details class="interview-notes"><summary>Главное из разговора · '+replies.length+'</summary>'+replies.map(a=>'<p><b>'+esc(QUESTIONS.find(q=>q.id===a.questionId)?.text??'')+'</b><span>'+esc(a.reply)+'</span></p>').join('')+'</details>':'')+'</div>';
}
function firstClubSteps(){
 if(club.campaign.startingSetup!=='reception'||club.rating.count>0)return '';
 const steps=[['Игровая комната',club.layout.rooms.some(r=>r.purpose==='game'),'expand-room'],['Комната отдыха',club.layout.rooms.some(r=>r.purpose==='staff'),'expand-staff'],['Полка для игр',club.layout.objects.some(o=>['shelf','shelfLarge'].includes(o.kind)),'first-shelf'],['Первый мастер',club.staff.length>0,'first-master'],['Игра и приключение',club.library.copies.length>0,'first-game']];
 return '<section class="first-club-steps"><h2>Откройте первую игру</h2><p>Участок уже ваш. На нём нужно подготовить клуб; строительство и разговоры не тратят время.</p>'+steps.map(([label,done,action])=>button((done?'✓ ':'○ ')+label,action,done?'disabled':'','full '+(done?'quiet':''))).join('')+(steps.every(s=>s[1])?button('Дождаться гостей','wait-guests','','primary full'):'')+'</section>';
}
function homeHTML(){
 const waiting=club.guests.filter(g=>!g.roomId),running=runningRooms(club),status=campaignStatus(club),guest=waiting.find(g=>g.id===ui.guest)??waiting[0],recent=club.operations.warnings.filter(w=>w.clock>=club.clock-4).slice(-3);
 return firstClubSteps()+(!receptionStatus(club).ready?'<p class="notice error">'+esc(receptionStatus(club).reason)+'</p>':'')+'<div class="shift-heading"><span class="open-dot"></span><b>Клуб открыт</b><span>'+clockText(club.clock)+'</span></div>'+metric('За столами',club.guests.filter(g=>g.roomId).length+' / '+club.rooms.filter(r=>r.operational).reduce((n,r)=>n+roomCapacity(r),0))+metric('Ожидают рассадки',waiting.length)+metric('Идёт партий',running.length)+metric('Содержание открытого клуба',money(status.hourlyCosts)+'/ч')+
 (guest?section('У ресепшна','<div class="guest-intro"><div class="staff-portrait">'+portrait(guest)+'</div><div><h2>'+esc(nameOf(guest))+'</h2><p>'+guest.identity.age+' лет · '+guestTime(guest)+'</p>'+button('Поговорить →','guest','data-id="'+esc(guest.id)+'"','primary')+'</div></div>'):'')+
 section('Игровые комнаты',club.rooms.map(roomListRow).join(''))+arrivalsHTML()+
 (recent.length?section('Нужно внимание',recent.map(w=>'<div class="notice">'+esc(w.text)+'</div>').join('')):'')+
 '<div class="onboarding"><small>СЛЕДУЮЩИЙ ШАГ</small><h3>'+(!club.rooms.length?'Постройте первую игровую':readyRooms(club).length?'Компания собралась':waiting.length?'Соберите подходящий стол':running.length?'Партии продолжаются':'Подготовьте стол и дождитесь гостей')+'</h3><p>'+(readyRooms(club).length?'Проверьте время, состав и договор. Каждую комнату можно запустить отдельно.':waiting.length?'Уточните интересы и время гостей. Выберите компанию от трёх гостей и посадите её за подходящий стол.':running.length?'Кнопка внизу переведёт часы к ближайшему окончанию.':'Используйте шаги подготовки выше. Посетители придут после открытия готового стола.')+'</p>'+button(readyRooms(club).length?'К партиям →':'К гостям →','nav','data-tab="'+(readyRooms(club).length?'rooms':'guests')+'"','full')+'</div>'+
 section('Развитие клуба',metric('Рабочие комнаты',status.development.current.rooms)+metric('Отзывы',club.rating.count)+button('Развитие и достижения','nav','data-tab="goals"'));
}
function roomListRow(r){
 const count=roomOccupants(club,r.id).length,zone=club.layout.rooms.find(z=>z.id===r.id);
 return '<button type="button" class="list-row room-row" data-action="room" data-id="'+esc(r.id)+'"><span class="room-number">'+r.number+'</span><span><b>'+esc(zone?.name??'Комната')+'</b><small>'+esc(r.session?.game??r.session?.title??'Нужны игра и мастер')+'</small></span>'+badge(r.status==='running'?'до '+clockText(r.run.endsAt):r.operational?count+'/'+roomCapacity(r):'Не готова',r.status==='running'?'running':'')+'</button>';
}
function guestFacts(g,history){
 const planned=planningGuest(club,g),known=new Map((history?.knownAnswers??[]).filter(a=>!['time','boundaries','avoidGenres','knowledge'].includes(a.questionId)).map(a=>[a.questionId,{...a,old:true}]));for(const answer of g.dialogue)known.set(answer.questionId,answer);
 const compact=id=>{
  if(!planned.asked.includes(id))return known.get(id)?.reply??null;
  if(id==='stories')return planned.profile.genres.map(genre=>genre.short??genre.label).join(' · ');
  if(id==='time')return 'До '+clockText(g.schedule.leaveAt)+' · удобно '+g.schedule.preferred.join('–')+' ч';
  if(id==='boundaries'){const topics=(planned.profile.boundaries??[]).map(boundary=>boundary.label??boundary.id),refused=planned.asked.includes('avoidGenres')?(g.avoidGenres??planned.preferences.avoidGenres??[]).map(id=>motifs.find(m=>m.id===id)?.short??id):null;return (topics.length?topics.join('; '):'Запретные темы не названы')+(refused===null?' · отказ от жанров не уточнён':refused.length?' · не предлагать: '+refused.join(', '):' · отказа от жанров нет');}
  if(id==='knowledge'){const room=club.rooms.find(r=>r.id===(ui.seatRoom??ui.room))??club.rooms[0],system=room?.session?.systemId,level=planned.preferences.knowledge[system]??0;return (SYSTEMS[system]?.name??'Выбранная игра')+': '+['нужна помощь с правилами','знакомы основы','хорошо знакомые правила','уверенно ориентируется в правилах'][Math.min(3,level)]+(planned.asked.includes('learning')?' · '+({ahead:'хочет памятку заранее',table:'просит объяснить первый ход',describe:'описывает действия, с правилами нужна помощь'}[planned.preferences.learning]??''):'');}
  if(id==='commitment')return ({'one-shot':'Законченная история за встречу',campaign:'Продолжение на нескольких встречах',either:'Одна встреча или продолжение'}[planned.preferences.format]??'Формат согласован')+(planned.preferences.breaks==='regular'?' · нужны перерывы':'');
  return known.get(id)?.reply??null;
 };
 return '<dl class="guest-facts">'+[['stories','Интерес'],['time','Время'],['knowledge','Правила выбранного стола'],['boundaries','Границы'],['commitment','Формат']].map(([id,title])=>{const value=compact(id),answer=known.get(id);return '<div><dt>'+title+'</dt><dd>'+(value?esc(value)+(answer?.old?' <small>Из прошлого разговора'+(Number.isFinite(answer.at)?' · день '+(Math.floor(answer.at/24)+1):'')+'</small>':''):'<span class="unknown-fact">Нужно уточнить</span>')+'</dd></div>';}).join('')+'</dl>';
}
function seatingHTML(g,playing){
 if(playing)return '<p class="notice">Партия идёт. Состав сохранится до окончания.</p>';
 const rooms=club.rooms.filter(r=>r.operational&&r.status!=='running'),chosen=rooms.find(r=>r.id===(ui.seatRoom??ui.room))??rooms[0];if(chosen)ui.seatRoom=chosen.id;
 return '<section class="seating-controls" aria-label="Ручная рассадка">'+button(ui.seatArmed?'Отменить выбор места':'Выбрать место на карте','arm-seat','','full '+(ui.seatArmed?'active':'quiet'))+(ui.seatArmed?'<p class="notice">Выберите стул для <b>'+esc(nameOf(g))+'</b>. Занятый стул меняет гостей местами. Esc — отмена.</p>':'')+(rooms.length?'<label>Комната для гостя<select id="seat-room">'+options(rooms.map(r=>[r.id,(club.layout.rooms.find(z=>z.id===r.id)?.name??'Комната '+r.number)+' · '+roomOccupants(club,r.id).length+'/'+roomCapacity(r)]),chosen?.id)+'</select></label><div class="seat-buttons">'+guestSeatNumbers(chosen).map(seat=>{const other=club.guests.find(v=>v.roomId===chosen.id&&v.seat===seat);return button(other?esc(nameOf(other)):String(seat+1),'seat','data-room="'+esc(chosen.id)+'" data-seat="'+seat+'" aria-label="'+esc(other?'Поменять местами с '+nameOf(other):'Посадить на место '+(seat+1))+'" '+(other?.id===g.id?'disabled':''),other?'occupied':'');}).join('')+'</div>'+button('Показать комнату','focus-room','data-id="'+esc(chosen.id)+'"','quiet full'):intro('Нет свободной готовой комнаты. Проверьте мебель, игру и мастера.'))+'<div class="button-row">'+(g.roomId?button('Вернуть к стойке','unseat'):button('Проводить гостя','dismiss-guest','','quiet'))+'</div></section>';
}
function guestConversationHTML(g,playing){
 const selected=ui.replayAnswer&&g.dialogue.findLast(a=>a.questionId===ui.replayAnswer),answer=selected??g.lastAnswer,all=ui.questionSet==='all',questions=all?QUESTIONS:QUESTIONS.filter(q=>QUICK_INTERVIEW_QUESTIONS.includes(q.id)),missing=unheardInterview(g);
 return '<section class="guest-conversation" aria-label="Разговор с гостем"><div id="guest-answer" class="conversation-answer" role="region" aria-label="Ответ гостя" aria-live="polite" aria-atomic="true" tabindex="0"><small>'+esc(nameOf(g))+(selected?' · ПЕРЕЧИТЫВАЕМ ОТВЕТ':'')+'</small>'+(answer?'<div class="asked-question">Вы: '+esc(QUESTIONS.find(q=>q.id===answer.questionId)?.text??'')+'</div>':'')+'<p>'+esc(answer?.reply??'Привет! Хочу найти интересную игру и подходящую компанию. Давайте познакомимся.')+'</p>'+(answer?.questionId==='stories'&&!playing?button('Ещё об интересах →','ask-more','data-question="stories"','quiet'):'')+'</div><div class="conversation-topics"><div class="topic-heading"><b>О чём спросить?</b><div class="segmented">'+button('Главное','question-set','data-id="main"',all?'':'active')+button('Все темы','question-set','data-id="all"',all?'active':'')+'</div></div><div class="conversation-questions questions" data-scroll-key="questions:'+esc(g.id)+':'+(all?'all':'main')+'" aria-label="Вопросы гостю">'+questions.map(q=>button('<span>'+esc(q.text)+'</span>'+(g.asked.includes(q.id)?'<small>✓ Перечитать</small>':'<small>Спросить →</small>'),'ask','data-question="'+q.id+'" '+(playing&&!g.asked.includes(q.id)?'disabled':''),g.asked.includes(q.id)?'heard':'')).join('')+'</div></div><div class="conversation-actions">'+(!playing&&missing.length?button('Короткое знакомство','quick-interview','','quiet'):'<small>Ответы сохранены в карточке гостя.</small>')+button('К рассадке →','guest-tab','data-id="brief"','primary')+'</div></section>';
}
function guestHTML(){
 const g=club.guests.find(g=>g.id===ui.guest)??club.guests.find(g=>!g.roomId)??club.guests[0];if(!g)return empty('Сейчас гостей нет.')+arrivalsHTML();ui.guest=g.id;
 const playing=club.rooms.some(r=>r.id===g.roomId&&r.status==='running'),history=visibleGuestHistory(club,g),missing=unheardInterview(g);
 return '<div class="guest-intro compact"><div class="guest-portrait" data-drag-guest="'+esc(g.id)+'">'+portrait(g)+'</div><div><small>'+(playing?'ИГРАЕТ':g.roomId?'МЕСТО ВЫБРАНО':'У СТОЙКИ')+'</small><h2>'+esc(nameOf(g))+'</h2><p>'+g.identity.age+' лет · '+guestTime(g)+'</p>'+badge(g.roomId?club.layout.rooms.find(r=>r.id===g.roomId)?.name??'За столом':'Ожидает')+'</div></div>'+
 '<div class="segmented guest-views">'+[['brief','Рассадка'],['talk','Разговор'],['history','История']].map(([id,label])=>button(label,'guest-tab','data-id="'+id+'"',ui.guestTab===id?'active':'')).join('')+'</div>'+
 (ui.guestTab==='brief'?(!playing&&missing.length?'<div class="quick-interview">'+button('Короткое знакомство','quick-interview','','full primary')+intro(history?.returning?'Уточним время, границы и помощь для сегодняшнего визита. Известные устойчивые условия сохранены.':'Уточним условия одним разговором; состав и места выбираете вы.')+'</div>':'')+guestFacts(g,history)+seatingHTML(g,playing)+'<details class="interview-notes" data-detail-key="interview"><summary>Полные ответы · '+g.dialogue.length+'</summary>'+g.dialogue.map(a=>'<div class="heard-answer"><small>'+esc(QUESTIONS.find(q=>q.id===a.questionId)?.text??'')+'</small><p>'+esc(a.reply)+'</p></div>').join('')+'</details>':ui.guestTab==='talk'?guestConversationHTML(g,playing):guestMemoryHTML(history)||empty('Это первый визит. После партии здесь появится история гостя.'))+
 (ui.guestTab==='talk'?'':'<details data-detail-key="arrivals"><summary>Следующие посетители</summary>'+arrivalsHTML()+'</details>');
}

function guestMemoryHTML(history){
 if(!history?.returning)return '';
 const previous=history.knownAnswers.filter(a=>a.questionId!=='time');
 return section('Постоянный гость',metric('Визитов в клуб',history.visits)+(history.favorite?intro('Понравилось раньше: '+esc(history.favorite.title)):'')+
 history.recent.slice(-3).reverse().map(r=>'<div class="review"><b>'+esc(r.title)+'<span>'+r.score+'/10</span></b><p>'+esc(reviewFeedback(r).text)+'</p></div>').join('')+
 (previous.length?'<details open><summary>Что рассказывал в прошлые визиты</summary>'+previous.map(a=>'<div class="heard-answer"><small>'+esc(QUESTIONS.find(q=>q.id===a.questionId)?.text??'Из прошлого разговора')+'</small><p>'+esc(a.reply)+'</p></div>').join('')+'</details>':'')+intro('Время ухода уточните для сегодняшнего визита.'));
}
function demandHTML(){
 const demand=visibleDemand(club);
 return section('Интересы из разговоров',demand.genres.length?demand.genres.slice(0,8).map(r=>metric(esc(r.name),r.count+' ответов')).join(''):intro('Спросите гостей об историях: здесь появится сводка услышанных интересов.'))+
 (demand.played.length?section('Опыт клуба',demand.played.map(r=>metric(esc(r.name),(r.paid??0)+' оплат / '+r.count+' гостей · '+money(r.revenue??0)+(r.unknownPayments?' · '+r.unknownPayments+' старых оплат не записаны':''))).join('')):'');
}
const roomCapacity=room=>room?groupLimits(room).maximum:4;
const roomMinimum=room=>room?groupLimits(room).minimum:3;
function roomBrowserHTML(){
 const query=ui.roomSearch.trim().toLocaleLowerCase('ru-RU'),ready=readyRooms(club),matches=club.rooms.filter(r=>{const zone=club.layout.rooms.find(z=>z.id===r.id),state=r.status==='running'?'running':ready.includes(r)?'ready':!r.operational?'attention':'seating';return (!query||((zone?.name??'')+' '+r.number+' '+(r.session?.title??'')).toLocaleLowerCase('ru-RU').includes(query))&&(ui.roomFilter==='all'||ui.roomFilter===state);});
 return '<div class="room-browser"><input id="room-search" type="search" aria-label="Найти комнату" placeholder="Комната, номер или история…" value="'+esc(ui.roomSearch)+'"><div class="room-filter">'+[['all','Все'],['ready','Готовы'],['seating','Собираются'],['running','Играют'],['attention','Внимание']].map(([id,title])=>button(title,'room-filter','data-id="'+id+'"',ui.roomFilter===id?'active':'')).join('')+'</div><div class="room-tabs">'+matches.map(room=>button(esc(club.layout.rooms.find(z=>z.id===room.id)?.name??'Комната '+room.number)+' <small>'+roomOccupants(club,room.id).length+'/'+roomCapacity(room)+'</small>','room','data-id="'+esc(room.id)+'"',room.id===ui.room?'active':'')).join('')+'</div>'+(!matches.length?empty('Нет комнат по этому фильтру.'):'')+'</div>';
}
function roomsHTML(){
 const r=club.rooms.find(r=>r.id===ui.room)??club.rooms[0];if(!r)return intro('Разметьте игровую комнату и поставьте мебель.')+button('Строить','nav','data-tab="build"');
 ui.room=r.id;const guests=roomOccupants(club,r.id),zone=club.layout.rooms.find(z=>z.id===r.id),running=r.status==='running',plan=sessionForecast(club,r.id),system=club.library.copies.find(k=>k.id===r.kitId)?.systemId;
 const adventures=SESSIONS.filter(s=>club.library.adventures.includes(s.id)&&s.systemId===system),free=(field,id)=>!club.rooms.some(other=>other.id!==r.id&&other.enabled!==false&&other[field]===id);
 const kits=club.library.copies.filter(k=>k.id===r.kitId||free('kitId',k.id)),masters=club.staff.filter(m=>(m.id===r.masterId||free('masterId',m.id))&&m.known.includes(system)&&!m.training);
 const late=guests.filter(g=>g.asked.includes('time')&&g.schedule.leaveAt<(r.run?.endsAt??club.clock+r.hours));
 return roomBrowserHTML()+button('Показать на карте','focus-room','data-id="'+esc(r.id)+'"','quiet full')+
 '<div class="party-heading"><span>'+badge(running?'Идёт партия':'Подготовка',running?'running':'')+'</span><h2>'+esc(r.session?.title??zone?.name??'Комната')+'</h2><p>'+r.hours+' ч · '+clockText(r.run?.startedAt??club.clock)+' — '+clockText(r.run?.endsAt??club.clock+r.hours)+'</p></div>'+
 '<form id="room-form" class="room-settings"><label>Игра<select name="game" '+(running?'disabled':'')+'>'+options(kits.map(k=>[k.id,SYSTEMS[k.systemId]?.name??k.systemId]),r.kitId)+'</select></label><label>Приключение<select name="adventure" '+(running?'disabled':'')+'>'+options(adventures.map(a=>[a.id,a.title+' · '+a.minutes/60+' ч']),r.adventureId)+'</select></label><label>Мастер<select name="master" '+(running?'disabled':'')+'>'+(masters.length?options(masters.map(m=>[m.id,m.name+' · до '+m.maxPlayers+' игроков · '+money(m.hourlyWage)+'/ч']),r.masterId):'<option value="">Нет знающего эту игру мастера</option>')+'</select></label><p class="small-copy">Длительность задаётся приключением. Компания '+roomMinimum(r)+'–'+roomCapacity(r)+' гостя. Назначения сохраняются сразу.</p></form>'+
 (!running?startActionHTML(r,guests):metric('Партия закончится',clockText(r.run.endsAt)))+
 (r.layoutErrors.length?'<div class="notice error">'+r.layoutErrors.map(e=>esc(e.text)).join('<br>')+'</div>':'')+
 (plan?'<div class="party-plan" data-guest-price="'+plan.guestPrice+'"><div><small>БИЛЕТ С ГОСТЯ</small><strong>'+money(plan.guestPrice)+'</strong><span>'+money(plan.guestHourlyRate)+'/ч × '+r.hours+' ч</span></div><div><small>ПРИ ПОЛНОЙ ОПЛАТЕ</small><strong class="'+(plan.profitIfAllPay<0?'negative':'positive')+'">'+(plan.profitIfAllPay>=0?'+':'')+money(plan.profitIfAllPay)+'</strong><span>после расходов стола'+(!guests.length?' · план на '+(plan.guestCount??roomCapacity(r))+' гостей':'')+'</span></div></div>'+
 '<details class="party-costs"><summary>Доходы и расходы партии</summary>'+metric('Билеты компании · '+(plan.guestCount??guests.length),money(plan.income))+metric('Зарплата мастера','−'+money(plan.masterCost))+metric('Доля содержания и расходники','−'+money(plan.operatingCost))+metric('Для окупаемости',plan.income>=plan.totalCost?Math.ceil(plan.totalCost/plan.income*100)+'% полной стоимости билетов':'Не окупается даже с полной оплатой')+'<p>Содержание делится между работающими столами с учётом их окончания. Чаевые и кафе в план не включены. Полный билет оплачивается при удовольствии от 7/10. Ниже сумма снижается плавно; нарушение явных границ, срока или формата означает возврат.</p></details>':'')+
 tablePlanHTML(r.id)+
 (late.length?'<p class="notice error">Не успеют до конца: '+late.map(g=>esc(nameOf(g))).join(', ')+'.</p>':'')+
 button('Купить другие приключения','stories-for-system','data-system="'+esc(system??'')+'"','quiet full')+
 button('Планировка комнаты','inspect-room','data-id="'+esc(r.id)+'"','quiet full')+section('Места за столом',guests.length?'<div class="party-guests">'+guests.map(g=>'<button type="button" data-action="guest" data-id="'+esc(g.id)+'"><span class="mini-portrait">'+portrait(g)+'</span><span><b>'+esc(nameOf(g))+'</b><small>'+guestTime(g)+'</small></span></button>').join('')+'</div>':intro('Выберите гостя у ресепшна или перетащите фигурку на свободный стул.'))+
 (!running?button('Выбрать гостей','nav','data-tab="guests"','full')+button(r.enabled?'Закрыть пустую комнату':'Открыть комнату','toggle-room','data-id="'+esc(r.id)+'"','quiet full'):'');
}
const tools=[['select','Выбор'],['erase','Снос'],['land','Купить площадь'],['room','Комната'],['wall','Стена'],['door','Дверь'],['window','Окно'],['floor','Пол']];
function catalogItems(){
 const query=ui.catalogSearch.trim().toLocaleLowerCase('ru-RU');return Object.values(BUILD_CATALOG).filter(item=>(query||item.category===ui.category)&&(!query||item.name.toLocaleLowerCase('ru-RU').includes(query)));
}
function catalogCards(){return catalogItems().map(item=>'<button type="button" class="catalog-item '+(ui.tool==='item'&&ui.kind===item.kind?'active':'')+'" data-action="build-item" data-kind="'+item.kind+'" title="'+esc(item.name)+'"><span class="item-thumbnail">'+itemThumbnail(item.kind)+'</span><b>'+esc(item.name)+'</b><strong>'+money(item.price)+'</strong></button>').join('')||empty('Таких предметов нет. Попробуйте другое название.');}
function structureChoices(){
 const kinds=ui.tool==='door'?['door','wideDoor']:ui.tool==='window'?['window']:['wall'],names={wall:'Глухая стена',door:'Дверь',wideDoor:'Широкая дверь',window:'Окно'};
 return '<div class="structure-choices">'+kinds.map(kind=>button('<svg viewBox="0 0 120 88" aria-hidden="true"><path d="M15 73V15h90v58Z" fill="#ded3b4" stroke="#a59b83"/>'+(kind==='window'?'<rect x="30" y="27" width="60" height="31" fill="#a8c9c5" stroke="#7b9890" stroke-width="4"/><path d="M60 27v31M30 42h60" stroke="#e8e3ca" stroke-width="3"/>':kind==='wall'?'': '<rect x="'+(kind==='wideDoor'?31:40)+'" y="26" width="'+(kind==='wideDoor'?58:40)+'" height="47" fill="#a8825a" stroke="#766346" stroke-width="3"/><circle cx="72" cy="50" r="3" fill="#edd19b"/>')+'</svg><b>'+names[kind]+'</b><strong>'+money(WALL_PRICES[kind])+'</strong>','structure-kind','data-kind="'+kind+'"',kind===(ui.wallKind??ui.tool)?'active':'')).join('')+'</div>'+intro('Проведите по границам клеток. Окончательная стоимость и место установки появятся в смете.');
}
function expansionGuide(){return '<section class="expansion-guide"><b>Сделать клуб больше</b><ol><li>Купите клетки снаружи участка —125 ₽ за клетку.</li><li>На свободной площади выделите комнату. Для готовой игровой нужно5×5 клеток.</li><li>Подготовьте отдых, наймите мастера и купите игру.</li></ol>'+button('1. Купить площадь','expand-club','','primary full')+button('2. Разметить игровую','expand-room','','full')+button('3. Сделать комнату отдыха','expand-staff','','quiet full')+'</section>';}
function buildingHTML(){
 const categories={furniture:'Мебель',equipment:'Оснащение столов и стен',staff:'Отдых мастеров',waiting:'Вход и ожидание',service:'Сервис',decoration:'Декор'},selected=club.layout.objects.find(o=>o.id===ui.object),item=ui.tool==='item'?BUILD_CATALOG[ui.kind]:null,zone=club.layout.rooms.find(r=>r.id===ui.buildRoom),wall=club.layout.walls.find(w=>w.id===ui.wall),furniture=['select','item','move'].includes(ui.tool);
 return (ui.tool==='select'&&!selected&&!zone&&!wall?expansionGuide():'')+'<div class="build-tools">'+tools.map(([id,title])=>button(title,'tool','data-tool="'+id+'"',ui.tool===id?'active':'')).join('')+'</div>'+
 (ui.tool==='land'?intro('Потяните по клеткам СНАРУЖИ границы участка и отпустите — площадь купится сразу. 125 ₽ за клетку; после покупки можно строить.'):ui.tool==='room'?'<label>Назначение<select id="room-purpose">'+options([['game','Игровая комната'],['staff','Отдых мастеров']],ui.purpose)+'</select></label><label class="check"><input type="checkbox" id="room-furnished" '+(ui.furnished?'checked':'')+'> С готовой мебелью</label>'+intro('Потяните от одного угла к другому. Вход появится у нижнего угла левой стены.'):['wall','door','window'].includes(ui.tool)?structureChoices():ui.tool==='floor'?intro('Проведите кистью по клеткам пола.'):'')+
 ((zone||wall||selected)?button('× Снять выбор','clear-inspection','','quiet full'):'')+(zone?roomInspectorHTML(zone):wall?wallInspectorHTML(wall):selected?'<div class="selected-object">'+objectHTML(selected)+'</div>':'')+
 (ui.tool==='resize-room'?intro('Обведите новые границы выбранной комнаты. Имущество за ними сначала перенесите.'):ui.tool==='erase'?intro('Нажмите на стену для сноса или на клетку, чтобы снять покрытие. Комнату удаляйте через её инспектор.'):'')+
 (ui.tool==='floor'?'<label>Покрытие<select id="floor-finish">'+options([['wood','Дерево · 30 ₽/клетка'],['tile','Плитка · 30 ₽/клетка'],['none','Снять покрытие']],ui.floorFinish??'none')+'</select></label>':'')+
 (furniture?'<div class="catalog-header"><div class="catalog-filters"><input id="catalog-search" type="search" placeholder="Найти предмет…" aria-label="Найти предмет" value="'+esc(ui.catalogSearch)+'"><select id="catalog-category" aria-label="Категория предметов">'+options(Object.entries(categories),ui.category)+'</select></div>'+
 (item?'<div class="selected-product"><span>'+itemThumbnail(item.kind)+'</span><div><b>'+esc(item.name)+'</b><small>'+(item.layer==='tabletop'?'':item.width+'×'+item.height+' · ')+({floor:'на пол',wall:'на стену',tabletop:'на стол',ceiling:'на потолок'}[item.layer])+' · '+money(item.price)+(item.layer==='tabletop'?' · свободная расстановка':'')+(item.hourlyCost?' · '+money(item.hourlyCost)+'/ч':'')+'</small><p>'+esc(effectText(item.kind))+'</p>'+purchaseContextHTML(item.kind)+'</div></div>':'<p class="catalog-tip">Выберите вещь → кликайте на карту, чтобы ставить копии. R — поворот, Esc — закончить.</p>')+'</div><div class="catalog-grid" id="catalog-grid">'+catalogCards()+'</div>':'')+
 '<div class="build-bottom">'+button('↶ Отменить стройку','undo-build',!undo?'disabled':'')+button('Снять инструмент','cancel-build')+'</div>';
}
function purchaseContextHTML(kind){
 const points=ITEM_EFFECTS[kind]?.[1]??0,prestige=clubPrestige(club),count=prestige.sources.filter(source=>club.layout.objects.find(o=>o.id===source.id)?.kind===kind).length,decorative=['poster','plant','decor','hanger'].includes(kind);
 const added=Math.max(0,Math.min(count>=2?0:points*(count===1?.25:1),25-prestige.physical,decorative?8-prestige.decorative:Infinity));
 return '<p class="purchase-context">'+(points?'Дополнительный престиж: до <b>+'+money(added).replace(' ₽','')+'</b>'+(added===0?' · предел достигнут, покупка для оформления':' · зависит от доступного подхода')+'. ':'')+(['equipment','service','furniture'].includes(BUILD_CATALOG[kind]?.category)?'Оснащение до +0,80; сервис до +0,35; вместе до +1,00. Условия гостя и истории проверяются отдельно.':'')+'</p>';
}
function roomInspectorHTML(zone){
 const room=club.rooms.find(r=>r.id===zone.id),occupied=club.guests.some(g=>g.roomId===zone.id),running=room?.status==='running',locked=running||occupied;
 return '<section class="selected-object room-inspector" data-room-inspector="'+esc(zone.id)+'"><h3>'+esc(zone.name)+'</h3>'+metric('Площадь',zone.cells.length+' клеток')+button('Приблизить','focus-room','data-id="'+esc(zone.id)+'"','quiet')+(locked?intro('Сначала дождитесь окончания партии и освободите места. Занятые помещения защищены от перестройки.'):'')+'<form id="room-inspector-form"><label>Название<input name="name" type="text" maxlength="80" value="'+esc(zone.name)+'" required '+(locked?'disabled':'')+'></label><label>Назначение<select name="purpose" '+(locked?'disabled':'')+'>'+options([['game','Игровая'],['staff','Отдых мастеров']],zone.purpose??'game')+'</select></label><button type="submit" '+(locked?'disabled':'')+'>Проверить изменение</button></form>'+button('Изменить границы','resize-room','data-id="'+esc(zone.id)+'" '+(locked?'disabled':''),'full')+'<details data-detail-key="demolish-room"><summary>Освободить площадь</summary><form id="demolish-room-form"><label class="check"><input type="checkbox" name="sellContents"> Продать всё имущество комнаты</label><label class="check"><input type="checkbox" name="removeFinishes"> Снять покрытия</label><label class="check"><input type="checkbox" name="removeBoundary"> Убрать внешние стены</label><p class="small-copy">Общие стены соседних комнат сохранятся. Состав и возврат покажет смета.</p><button type="submit" class="danger" '+(locked?'disabled':'')+'>Рассчитать снос комнаты</button></form></details></section>';
}
function wallInspectorHTML(wall){
 return '<section class="selected-object" data-wall-inspector="'+esc(wall.id)+'"><h3>'+({wall:'Стена',door:'Дверь',wideDoor:'Широкая дверь',window:'Окно'}[wall.kind]??'Стена')+'</h3><label>Заменить на<select id="wall-kind">'+options([['wall','Стена'],['door','Дверь'],['wideDoor','Широкая дверь'],['window','Окно']],wall.kind)+'</select></label>'+button('Убрать стену','remove-wall','data-id="'+esc(wall.id)+'"','danger full')+'<p class="small-copy">Сначала проверьте смету. Занятые комнаты и проходы защищены.</p></section>';
}
function objectHTML(o){
 const spec=BUILD_CATALOG[o.kind];
 const replacements=Object.values(BUILD_CATALOG).filter(item=>item.family&&item.family===spec.family&&item.kind!==o.kind);
 return '<h3>'+esc(spec.name)+'</h3>'+(o.role?metric('Место',o.role==='master'?'Мастер':'Гость '+(o.seat+1)):'')+'<p>'+esc(effectText(o.kind))+'</p>'+metric(spec.layer==='tabletop'?'Установка':'Занимает',spec.layer==='tabletop'?'Свободно на столе':spec.width+'×'+spec.height+' клеток')+(spec.family==='table'?'<details class="table-items" open><summary>На столе</summary>'+club.layout.objects.filter(item=>BUILD_CATALOG[item.kind]?.layer==='tabletop'&&parentTable(item,club.layout)?.id===o.id).map(item=>'<div class="table-item-row"><span>'+esc(BUILD_CATALOG[item.kind].name)+'</span>'+button('Выбрать','inspect-object','data-id="'+esc(item.id)+'"')+'</div>').join('')+'</details>':'')+(replacements.length?'<label>Заменить предмет<select id="replace-object"><option value="">Выберите модель…</option>'+options(replacements.map(item=>[item.kind,item.name+' · '+money(item.price)]),'')+'</select></label>'+purchaseContextHTML(o.kind):'')+metric('Обслуживание',spec.hourlyCost?money(spec.hourlyCost)+'/ч':'Нет почасовой платы')+'<div class="button-row">'+button('Переместить','move-object','data-id="'+esc(o.id)+'"')+button(spec.layer==='tabletop'?'Повернуть 15°':'Повернуть R','rotate-object','data-id="'+esc(o.id)+'"')+button('Продать · '+money(Math.floor((o.price??spec.price)*.6)),'sell-object','data-id="'+esc(o.id)+'"','danger')+'</div>';
}
function teamHTML(){
 const data=campaignMarket(club),prestige=clubPrestige(club);
 return metric('Места отдыха',data.staffRoom.hired+' / '+data.staffRoom.physicalCapacity)+metric('Престиж клуба',prestige.value)+
 (data.staffRoom.reason?'<p class="notice">'+esc(data.staffRoom.reason)+'</p>':'')+
 '<div class="segmented">'+button('В штате · '+data.staff.length,'team-tab','data-candidates="false"',!ui.candidates?'active':'')+button('Пригласить · '+data.candidates.length,'team-tab','data-candidates="true"',ui.candidates?'active':'')+'</div>'+
 (ui.candidates?data.candidates.map(m=>{const required=prestigeNeeded(m),reason=prestige.value<required?'Нужен престиж '+required:data.staffRoom.free<1?'Нужно место отдыха':club.finance.cash<m.hireCost?'Не хватает денег':'';return '<article class="staff-row"><div class="staff-heading"><div class="staff-portrait">'+portrait(m)+'</div><div><h2>'+esc(m.name)+'</h2><span>'+esc(m.temperament)+'</span><b>'+money(m.wage)+'/ч</b></div></div>'+metric('Комфортная группа','до '+m.maxPlayers+' игроков')+'<p>'+esc(m.detail)+'</p><p class="small-copy">'+esc(m.systems.map(s=>SYSTEMS[s]?.name??s).join(' · '))+'</p>'+button('Пригласить · '+money(m.hireCost),'hire','data-id="'+esc(m.id)+'" '+(reason?'disabled':''),'full')+(reason?'<small class="blocked-reason">'+reason+'</small>':'')+'</article>';}).join(''):
 data.staff.map(m=>'<article class="staff-row"><div class="staff-heading"><div class="staff-portrait">'+portrait(m)+'</div><div><h2>'+esc(m.name)+'</h2><span>'+esc(m.training?'Учится: '+m.training.label:m.canRest?'Отдыхает':'Ведёт партию')+'</span><b>'+money(m.wage)+'/ч</b></div></div><div class="fatigue-heading"><span>Усталость</span><b>'+m.fatigueValue.toFixed(1)+' / 12</b></div><meter min="0" max="12" low="4" high="8" optimum="0" value="'+m.fatigueValue+'">'+m.fatigueValue+'</meter><small class="small-copy">'+esc(m.fatigue)+(m.canRest?' · восстановление '+(m.restSeat?.restRate??.65)+'/ч':'')+'</small>'+metric('Комфортная группа','до '+m.maxPlayers+' игроков')+'<p>'+esc(m.detail)+'</p><p class="small-copy">'+esc(m.systems.map(s=>SYSTEMS[s]?.name??s).join(' · '))+'</p>'+(!m.training&&!m.dismissal.busy?'<form class="training-form" data-id="'+esc(m.id)+'"><label>Обучение<select name="course">'+options(m.trainingOptions.map(o=>[o.systemId,o.name+' · '+money(o.price)+' · '+o.hours+' ч']),'')+'</select></label><button type="submit" '+(!m.trainingOptions.length?'disabled':'')+'>Начать обучение</button></form>'+button('Уволить мастера','dismiss-master','data-id="'+esc(m.id)+'"','quiet'):'')+'</article>').join(''));
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
function cleaningPolicyHTML(data){
 const policy=data.cleaningPolicy??club.cleaningPolicy??{enabled:false,zoneIds:[],cleanlinessBelow:50,maxSpend:200,windowHours:8},zones=[{id:'common',name:'Ресепшн и общая зона'},...club.layout.rooms];
 return section('Поручение по уборке','<form id="cleaning-policy-form" data-cleaning-policy="true"><label class="check"><input type="checkbox" name="enabled" '+(policy.enabled?'checked':'')+'> Поручить помощнику выбранные зоны</label><p class="small-copy">Помощник действует только на включённой вами смене. Он не рассаживает гостей и не запускает партии.</p><fieldset><legend>Где убирать</legend>'+zones.map(z=>'<label class="check"><input type="checkbox" name="zoneIds" value="'+esc(z.id)+'" '+(policy.zoneIds?.includes(z.id)?'checked':'')+'> '+esc(z.name)+'</label>').join('')+'</fieldset><div class="form-pair"><label>Чистота ниже, %<input type="number" name="cleanlinessBelow" min="20" max="80" value="'+(policy.cleanlinessBelow??50)+'" required></label><label>Бюджет, ₽<input type="number" name="maxSpend" min="0" max="2000" value="'+(policy.maxSpend??200)+'" required></label></div><label>За сколько часов<input type="number" name="windowHours" min="1" max="24" value="'+(policy.windowHours??8)+'" required></label>'+metric('Потрачено в текущем окне',money(policy.spent??0))+metric('Осталось лимита',money(policy.remaining??policy.maxSpend??200))+(policy.reason?intro(esc(policy.reason)):'')+(policy.budgetNote?intro(esc(policy.budgetNote)):'')+'<button type="submit">Сохранить поручение</button></form>');
}
function serviceHTML(){
 const data=campaignMarket(club),batches=club.inventory?.batches??[],tasks=club.operations?.tasks?.filter(t=>['active','queued'].includes(t.state))??[],orders=(club.inventory?.orders??[]).filter(o=>o.state==='ordered');
 return intro('Приборы требуют оплаченных порций. Запасы, годность и состояние оборудования влияют на обслуживание гостей.')+
 (club.operations.warnings.length?section('События клуба',club.operations.warnings.slice(-5).reverse().map(w=>'<div class="notice">'+esc(w.text)+'</div>').join('')):'')+section('Помощник клуба',intro('Убирает быстрее и увеличивает выдачу выбранного прибора на 50%. Смена стоит '+money(data.serviceStaff.hourlyWage)+'/ч, в том числе в простое.')+(data.serviceStaff.hired?button(data.serviceStaff.active?'Закончить смену':'Начать смену · '+money(data.serviceStaff.hourlyWage)+'/ч','service-shift','data-active="'+!data.serviceStaff.active+'"'):button('Пригласить помощника · '+money(data.serviceStaff.hireCost),'hire-service'))+(club.serviceStaff?.[0]?.assignment?button('Снять с раздачи','assign-helper','data-id=""','quiet'):'') )+
 (tasks.length||orders.length?section('Работы и поставки',orders.map(o=>'<div class="metric"><span>Поставка: '+o.quantity+' порций</span><b>к '+clockText(o.dueAt)+'</b></div>').join('')+tasks.map(t=>'<div class="metric"><span>'+esc(t.label??t.type??'Работа')+'</span><b>до '+clockText(t.dueAt)+'</b></div>').join('')+button('До окончания работы или поставки','wait-operation','','full')):'')+
 cleaningPolicyHTML(data)+section('Уборка',[{id:'common',name:'Ресепшн и общая зона'},...club.layout.rooms].map(cleaningHTML).join(''))+
 section('Приборы и запас',data.equipment.filter(e=>e.service).map(e=>'<article class="service-row"><h3>'+esc(e.name)+'</h3><p>'+esc(effectText(e.kind))+'</p>'+metric('Содержание',money(e.hourlyCost)+'/ч')+(data.serviceStaff.hired?button(club.serviceStaff[0].assignment?.itemId===e.id?'Помощник на этой раздаче':'Назначить помощника','assign-helper','data-id="'+esc(e.id)+'" '+(club.serviceStaff[0].assignment?.itemId===e.id?'disabled':''),'quiet'):'')+'<div class="button-row">'+button('Заказать 20 порций','restock','data-id="'+esc(e.id)+'"')+(club.operations.equipment[e.id]?button('Обслужить','maintain','data-id="'+esc(e.id)+'" '+(club.operations.equipment[e.id].condition>=100?'disabled':'')):'')+button(e.enabled?'Выключить':'Включить','power','data-id="'+esc(e.id)+'" data-enabled="'+!e.enabled+'"')+button('Автозаказ: '+(e.autoRefill?'вкл':'выкл'),'auto-stock','data-id="'+esc(e.id)+'" data-active="'+!e.autoRefill+'"')+'</div><details><summary>Лимит автозаказа</summary><form class="service-policy" data-id="'+esc(e.id)+'"><label>Целевой запас, порций<input type="number" min="1" max="20" name="target" value="'+(club.operations.servicePolicies[e.id]?.target??10)+'" required></label><label>Лимит расходов за 8 часов, ₽<input type="number" min="0" max="2000" name="budget" value="'+(club.operations.servicePolicies[e.id]?.budget??200)+'" required></label><button type="submit">Сохранить лимит</button></form></details>'+batches.filter(b=>b.location===e.id&&b.state!=='written-off').map(b=>'<div class="stock-batch"><span>Партия: '+esc(b.sku??'продукты')+' · '+(b.remaining??b.quantity??0)+' шт.<br>Годность до '+clockText(b.expiresAt??0)+'</span>'+button('Списать','writeoff','data-id="'+esc(b.id)+'"','quiet')+'</div>').join('')+'</article>').join('')||empty('Поставьте сервисное оборудование в строительстве.'))+
 button('Выбрать оборудование','service-build','','primary full');
}
function reviewHTML(review){
 const financial=review.financial,feedback=reviewFeedback(review);return '<div class="review"><b>'+esc(review.name)+' <span>'+review.score+'/10</span></b><p>'+esc(feedback.text)+'</p>'+(feedback.advice?'<p class="review-advice"><b>Что изменить:</b> '+esc(feedback.advice)+'</p>':'')+'<small>Оплата '+money(financial?.payment??0)+(financial?.paymentCurve===3?' · '+Math.round(financial.coefficient*100)+'% билета'+(financial.refund?' · скидка '+money(financial.refund):''):'')+'</small>'+(review.comfort?.helped?.length?'<p class="benefit">'+review.comfort.helped.map(esc).join(' ')+'</p>':'')+'</div>';
}
function resultArticle(entry){
 return '<article class="report-room"><h2 id="session-result-title">'+esc(entry.title)+'</h2><p class="small-copy">'+esc(entry.game??'')+' · '+esc(entry.master??'')+' · '+clockText(entry.startedAt)+' — '+clockText(entry.endsAt)+'</p><div class="result-totals">'+metric('Билеты',money(entry.payments))+metric('Чаевые',money(entry.tips))+metric('Зарплата мастера','−'+money(entry.wages))+metric('Скидки',money(entry.refunds??entry.reviews.reduce((n,r)=>n+(r.financial?.refund??0),0)))+'</div><p class="small-copy">Содержание клуба и закупки учтены отдельно в кассе.</p>'+entry.reviews.map(reviewHTML).join('')+'</article>';
}
function renderSessionResults(){
 const dialog=root.querySelector('#session-results'),entry=sessionResults[sessionResultIndex];if(!dialog)return;
 if(!entry){if(dialog.open)dialog.close();dialog.dataset.sessionId='';return;}
 if(dialog.dataset.sessionId!==entry.sessionId){dialog.dataset.sessionId=entry.sessionId;dialog.innerHTML='<div class="result-heading"><span>ПАРТИЯ ЗАВЕРШЕНА</span><b>'+(sessionResultIndex+1)+' / '+sessionResults.length+'</b></div><div class="result-scroll">'+resultArticle(entry)+'</div><div class="result-actions">'+button(sessionResultIndex+1<sessionResults.length?'Следующая партия →':'Вернуться в клуб','result-next','','primary')+'<small>Отчёт сохранён в кассе</small></div>';if(!dialog.open)dialog.showModal();dialog.querySelector('[data-action="result-next"]').focus({preventScroll:true});}
}
function nextSessionResult(){sessionResultIndex++;if(sessionResultIndex>=sessionResults.length){sessionResults=[];sessionResultIndex=0;}renderSessionResults();}

function journalHTML(){
 const journal=club.sessionJournal?.entries??club.lastReport?.completed??[],entries=journal.filter(r=>ui.reportRoom==='all'||r.roomId===ui.reportRoom).toReversed(),selected=entries.find(r=>r.sessionId===ui.reportId)??entries[0];if(selected)ui.reportId=selected.sessionId;
 const rooms=[...new Map(journal.map(r=>[r.roomId,r.number??r.roomId])).entries()];
 return section('Архив партий','<div data-session-journal="true"><label>Комната<select id="journal-room">'+options([['all','Все комнаты'],...rooms.map(([id,n])=>[id,club.layout.rooms.find(z=>z.id===id)?.name??'Комната '+n])],ui.reportRoom)+'</select></label>'+(entries.length?'<label>Партия<select id="journal-session">'+options(entries.map(r=>[r.sessionId,'День '+(Math.floor(r.endsAt/24)+1)+' · '+clockText(r.endsAt)+' · '+r.title+' · '+r.reviews.length+' гостей']),selected.sessionId)+'</select></label><article class="report-room"><h3>'+esc(selected.title)+'</h3><p class="small-copy">'+esc(selected.game??'')+' · '+esc(selected.master??'')+' · '+clockText(selected.startedAt)+' — '+clockText(selected.endsAt)+'</p>'+metric('Билеты',money(selected.payments))+metric('Чаевые',money(selected.tips))+metric('Зарплата мастера','−'+money(selected.wages))+metric('Скидки от полной цены',money(selected.refunds??selected.reviews.reduce((n,r)=>n+(r.financial?.refund??0),0)))+'<p class="small-copy">Содержание клуба, закупки и строительство показаны в движении денег. Разность билетов и зарплаты не является чистой прибылью.</p>'+selected.reviews.map(reviewHTML).join('')+'</article>':empty('В этом фильтре пока нет завершённых партий.'))+'<p class="small-copy">Хранятся последние 100 партий. Старые подробности, которых нет в сохранении, не восстанавливаются из оценок.</p></div>');
}
function financeHTML(){
 const status=campaignStatus(club),report=club.lastReport,summary=financeBreakdown(club),savings=emptyRoomSavings(club);
 return section('Деньги клуба',metric('В кассе',money(status.balance))+metric('Обязательный резерв',money(status.reserve))+metric('Доступно для покупок',money(status.balance-status.reserve))+metric('Расходы клуба',money(status.hourlyCosts)+'/ч'))+
 (status.debt?'<div class="notice error">Долг '+money(status.debt)+'. Новые партии и покупки приостановлены.</div>':'')+(status.recoveryPlan?button('Рассмотреть план спасения','recovery','','danger full'):'')+
 (report?'<details data-detail-key="last-cash"><summary>Последний перевод времени · касса '+money(report.finance.cashChange)+'</summary>'+metric('Поступило',money(report.finance.incoming))+metric('Выплачено',money(report.finance.outgoing))+'</details>':'')+
 journalHTML()+'<details data-detail-key="cash-breakdown"><summary>Деньги с открытия клуба</summary>'+metric('Билеты, чаевые, кафе',money(summary.receipts))+metric('Работа и обслуживание',money(summary.running))+metric('Оплаченные запасы',money(summary.stock))+metric('Оснащение и развитие',money(summary.development))+metric('Выдано продуктов по себестоимости',money(summary.issuedCost))+'<p class="small-copy">Себестоимость выдачи справочная: закупка уже списана с кассы, повторно она не вычитается.</p></details>'+
 (savings.length?'<details data-detail-key="idle-cost"><summary>Пустые комнаты и расходы</summary>'+savings.map(r=>'<div class="metric"><span>'+esc(club.layout.rooms.find(z=>z.id===r.roomId)?.name??'Комната')+' · экономия '+money(r.hourlySaving)+'/ч</span>'+button('Закрыть','toggle-room','data-id="'+esc(r.roomId)+'"','quiet')+'</div>').join('')+'</details>':'')+
 '<details data-detail-key="ledger"><summary>Движение денег · '+club.finance.ledger.length+' записей</summary>'+club.finance.ledger.slice(-ui.ledgerLimit).reverse().map(e=>'<div class="ledger-row"><span><b>'+esc(e.text)+'</b><small>День '+(Math.floor(e.clock/24)+1)+' · '+clockText(e.clock)+'</small></span><strong class="'+(e.amount>=0?'income':'outgoing')+'">'+(e.amount>0?'+':'')+money(e.amount)+'</strong></div>').join('')+(club.finance.ledger.length>ui.ledgerLimit?button('Показать ещё','more-ledger'):'')+'</details>';
}
function goalsHTML(){
 const s=campaignStatus(club),d=s.development,current=d.current,prestige=clubPrestige(club),value=(id,n)=>id==='reserve'?money(n):n;
 return '<div class="goal-banner" data-endless-development="true"><small>КЛУБ РАСТЁТ ПО ВАШЕМУ ПЛАНУ</small><h2>Ваш клуб. Ваш масштаб.</h2><p>Выбирайте, сколько комнат открыть и какие игры проводить. Развитие продолжается после каждой вехи.</p></div>'+
 section('Клуб сегодня',metric('Рабочие комнаты',current.rooms)+metric('Отзывов за всё время',current.participations)+metric('Средний рейтинг',club.rating.count?current.rating.toFixed(2)+' / 10':'Пока нет отзывов')+metric('Доступные системы',current.systems)+metric('Свободные деньги',money(current.reserve)))+
 directionHTML()+section('Следующие вехи',intro('Это ориентиры и личные рекорды. Каждая достигнутая веха остаётся в истории; размер клуба выбираете вы.')+d.tracks.map(t=>'<div class="goal-row" data-development-track="'+t.id+'"><div><b>'+esc(t.title)+'</b><span>'+value(t.id,t.current)+(t.next?' / '+value(t.id,t.next):'')+'</span></div>'+(t.next?'<progress max="'+t.next+'" value="'+Math.max(0,t.current)+'"></progress>':'')+'<small>Лучший результат: '+value(t.id,t.record)+'</small></div>').join(''))+
 (d.earned.length?section('Достигнуто',d.earned.slice(-12).reverse().map(a=>'<div class="metric"><span>'+esc(a.title)+'</span><b>'+value(a.metric,a.value)+' ✓</b></div>').join('')):'')+
 section('Престиж — '+prestige.value,intro('Качественное оснащение открывает доступ к более дорогим мастерам. Первый предмет даёт полный вклад, второй — четверть. Репутация растёт по серии отзывов.')+metric('Репутация по отзывам',prestige.reputation)+prestige.sources.map(s=>metric(esc(s.name),'+'+s.points)).join(''))+
 section('Следующее расширение',intro('Открывайте комнаты по мере спроса и дохода. Подготовьте площадь, мебель, игру, мастера и место его отдыха.')+button('Расширить клуб','nav','data-tab="build"'));
}
function directionHTML(){
 const direction=campaignMarket(club).clubDirection,isBeginners=direction.id==='beginners';
 return section('Направление клуба','<div data-club-direction="true"><h3>'+esc(direction.name)+'</h3><p>'+esc(direction.description)+'</p>'+metric('Доплата за направление',money(direction.hourlyCost)+'/ч')+'<div class="button-column">'+button('Открытый клуб · без доплаты','set-direction','data-id="general" aria-pressed="'+!isBeginners+'" '+(!isBeginners?'disabled':''),!isBeginners?'active':'')+button('Школа новичков · '+money(direction.activationCost)+' + '+money(direction.beginnersHourlyCost)+'/ч','set-direction','data-id="beginners" aria-pressed="'+isBeginners+'" '+(isBeginners?'disabled':''),isBeginners?'active':'')+'</div><p class="small-copy">Плата берётся при каждом включении школы. Вернуться к общему потоку можно бесплатно. Объявление не гарантирует доход и не заменяет подготовку гостей.</p>'+Object.entries(direction.progress??{}).map(([key,value])=>metric(esc(direction.progressLabels?.[key]??'Результат обучения'),value)).join('')+'</div>');
}
function settingsHTML(){
 return intro('Клуб автоматически сохраняется в этом браузере после каждого действия. Файл позволяет перенести всю кампанию на другое устройство.')+
 section('Сохранение','<div class="button-column">'+button('Скачать сохранение','export','','primary')+'<label class="file-button">Загрузить сохранение<input type="file" id="import-save" accept=".json,application/json"></label></div>')+
 section('Начать заново',intro('Сначала вы создадите администратора. Новый клуб начинается с входа и ресепшна. Прежняя кампания останется в местном архиве сохранений.')+button('Новая игра','new-game','','danger full'))+
 section('Управление','<dl class="controls-help"><dt>Камера</dt><dd>ЛКМ на свободном месте, средняя кнопка или пробел + перетаскивание. Стрелки и WASD.</dd><dt>Масштаб</dt><dd>Колесо к курсору; на сенсорном экране — двумя пальцами.</dd><dt>Весь клуб</dt><dd>Home или кнопка над картой.</dd><dt>Сведения</dt><dd>ПКМ по персонажу или предмету открывает его панель.</dd><dt>Строительство</dt><dd>R — поворот; Esc — отмена; ↶ — отмена последнего строительства.</dd></dl>');
}

async function perform(fn,{archive=false,keepUndo=false,message='Сохранено'}={}){
 if(busy)return {ok:false};if(readOnly){note(writer?.reason??'Клуб открыт для просмотра.',true);return {ok:false};}
 busy=true;root.setAttribute('aria-busy','true');root.classList.add('busy');
 try{const oldEntries=new Set((club.sessionJournal?.entries??[]).map(e=>e.sessionId)),draft=structuredClone(club),result=fn(draft);if(!result?.ok){note(result?.reason??'Действие недоступно.',true);return result;}
  syncGuestWaiting(draft);updateCampaign(draft);await store.write(draft,{archive});club=draft;if(archive){formDrafts.clear();sessionResults=[];sessionResultIndex=0;}else sessionResults.push(...(club.sessionJournal?.entries??[]).filter(e=>!oldEntries.has(e.sessionId)).map(e=>structuredClone(e)));if(!keepUndo)undo=null;note(result.report?(result.report.completed?.length?'Партия завершилась. Отзывы и полный расчёт — в кассе.':result.report.reason??'Прошло игровое время. Проверьте события клуба.'):message);return result;
 }catch(e){note(e.message,true);return {ok:false,reason:e.message};}finally{busy=false;render();}
}
async function command(action,message,{formKey=null}={}){
 const transactionId=uid(),run=async()=>{const result=await perform(draft=>executeCampaignAction(draft,{...action,transactionId}),{message});if(result?.ok&&formKey){formDrafts.delete(formKey);render();}return result;};
 if(['hireMaster','purchaseGame','buyAdventure','repairKit','restock','maintainEquipment','hireServiceStaff','trainMaster','cleanZone','setClubDirection'].includes(action.type)){
  try{const after=structuredClone(club),result=executeCampaignAction(after,{...action,transactionId});if(result?.ok){const cost=Math.max(0,club.finance.cash-after.finance.cash),quote=investmentQuote(club,{cost,afterClub:after});if(cost>0&&quote.shortfall>0){ui.pending={title:'Покупка затронет обязательный резерв',text:'Расход '+money(cost)+'. В кассе после: '+money(quote.balanceAfter)+', обязательства '+money(quote.reserveAfter)+', свободно '+money(quote.freeAfter)+'. Не хватает резерва '+money(quote.shortfall)+'. Содержание после '+money(quote.hourlyAfter)+'/ч. Продолжить с этим риском?',run};render(true);return{ok:false,pending:true};}}}catch{}
 }
 return run();
}
function selectWorld(data,p){
 if(ui.tab==='build'){
  if(ui.tool==='erase'){if(data.wall){ui.preview={type:'removeWall',id:data.wall};applyBuild();return;}const objectId=data.object??data.seat;if(objectId){ui.preview={type:'remove',id:objectId};applyBuild();return;}if(p&&!data.room){ui.preview={type:'floor',cells:[{x:Math.floor(p.x),y:Math.floor(p.y)}],finish:null};applyBuild();return;}}
  if(data.wall){ui.wall=data.wall;ui.object=null;ui.buildRoom=null;ui.tool='select';render();return;}
  const objectId=data.seat??data.object??(data.guestId?club.layout.objects.find(o=>o.roomId===club.guests.find(g=>g.id===data.guestId)?.roomId&&o.seat===club.guests.find(g=>g.id===data.guestId)?.seat)?.id:null);
  if(objectId){ui.object=objectId;ui.wall=null;ui.buildRoom=null;ui.tool='select';render();return;}
  const zone=data.room?club.layout.rooms.find(z=>z.id===data.room):p?club.layout.rooms.find(z=>z.cells.some(c=>c.x===Math.floor(p.x)&&c.y===Math.floor(p.y))):null;
  if(zone){ui.buildRoom=zone.id;ui.wall=null;ui.object=null;ui.tool='select';render();return;}
  if(ui.tool==='select'){clearInspection();clearSelection();render();return;}
 }
 if(data.guestId){ui.guestTab='talk';ui.replayAnswer=null;const g=club.guests.find(g=>g.id===data.guestId);if(ui.seatArmed&&ui.guest&&g?.roomId&&g.id!==ui.guest){seatGuest(ui.guest,g.roomId,g.seat);return;}ui.guest=data.guestId;ui.seatArmed=false;nav('guests');return;}
 if(data.masterId){ui.candidates=false;nav('team');return;}
 const o=club.layout.objects.find(o=>o.id===(data.seat??data.object));
 if(o?.role==='guest'){if(ui.seatArmed&&ui.guest){seatGuest(ui.guest,o.roomId,o.seat);return;}ui.room=o.roomId;nav('rooms');return;}
 if(o?.kind==='reception'){ui.guest=club.guests.find(g=>!g.roomId)?.id;nav('guests');return;}
 if(o){ui.object=o.id;ui.wall=null;ui.buildRoom=null;ui.tool='select';nav('build');return;}
 if(data.wall){ui.wall=data.wall;ui.object=null;ui.buildRoom=null;nav('build');return;}
 if(data.room){const zone=club.layout.rooms.find(z=>z.id===data.room);if(zone?.purpose==='staff'){nav('team');return;}ui.room=data.room;nav('rooms');}
}
function inspectWorld(data){ui.seatArmed=false;if(data.guestId){ui.guest=data.guestId;nav('guests');}else if(data.masterId)nav('team');else if(data.wall){ui.wall=data.wall;ui.object=null;ui.buildRoom=null;nav('build');}else if(data.object||data.seat){ui.object=data.object??data.seat;ui.wall=null;ui.buildRoom=null;nav('build');}else if(data.room){ui.buildRoom=data.room;ui.object=null;ui.wall=null;nav('build');}}
async function seatGuest(id,roomId,seat){
 const result=await perform(draft=>{const other=draft.guests.find(g=>g.roomId===roomId&&g.seat===seat);return other?swapGuests(draft,id,other.id):assignGuest(draft,id,roomId,seat);},{message:'Место назначено. До запуска можно пересадить гостя.'});
 if(result?.ok){ui.guest=club.guests.find(g=>!g.roomId)?.id??id;ui.seatArmed=false;ui.guestTab='brief';note('Место назначено.'+(ui.guest!==id?' Следующий гость: '+nameOf(club.guests.find(g=>g.id===ui.guest))+'.':''));render(true);}
}
function dragPerson(id,x,y,moved){
 const g=club.guests.find(g=>g.id===id);if(!g||club.rooms.some(r=>r.id===g.roomId&&r.status==='running'))return;
 const n=root.querySelector('#drag-person');if(!moved)return;if(n.hidden||n.dataset.guestId!==id){n.innerHTML='<svg viewBox="-35 -125 70 135">'+personArt(g,{drag:true})+'</svg>';n.dataset.guestId=id;}n.hidden=false;n.style.transform='translate('+(x-35)+'px,'+(y-44)+'px) rotate('+Math.sin(x*.03)*9+'deg)';
}
function hideDrag(){root.querySelector('#drag-person').hidden=true;}
function dropGuest(id,seatId){hideDrag();const o=club.layout.objects.find(o=>o.id===seatId);if(o?.role==='guest')seatGuest(id,o.roomId,o.seat);else note('Перетащите гостя на конкретный игровой стул. Место сохранено.');}
function clearInspection(){ui.object=null;ui.wall=null;ui.buildRoom=null;}
function clearBuildConfirmation(){if(ui.pending?.kind==='build'){ui.pending=null;root.querySelector('.inline-confirm')?.remove();}}
function clearSelection(){clearBuildConfirmation();ui.cells.clear();ui.edges.clear();ui.preview=null;ui.hover=null;}
let objectGesture=null;
function cancelBuild(){objectGesture=null;clearSelection();if(world)world.drawPreview([]);renderPreview();}
function dragObject(id,p,start,finished){
 if(busy||readOnly||ui.tool==='erase')return;
 if(!objectGesture||objectGesture.id!==id){const object=club.layout.objects.find(o=>o.id===id);if(!object)return;objectGesture={id,object:structuredClone(object),pose:surfacePose(object,club.layout)};clearSelection();ui.object=id;ui.kind=object.kind;ui.rotation=object.rotation;ui.surfaceAngle=objectGesture.pose?.angle??0;ui.tool='move';}
 const {object,pose}=objectGesture,dx=p.x-start.x,dy=p.y-start.y;const wall=BUILD_CATALOG[object.kind]?.layer==='wall',wallCenter=[{x:object.x+.5,y:object.y},{x:object.x+1,y:object.y+.5},{x:object.x+.5,y:object.y+1},{x:object.x,y:object.y+.5}][object.rotation],lift=wallMountHeight(object.kind)/36;ui.hover=wall?itemEdit({x:wallCenter.x-lift+dx,y:wallCenter.y-lift+dy}):pose?{type:'move',id,...surfaceEditAt(club.layout,object.kind,{x:pose.x+dx,y:pose.y+dy},ui.surfaceAngle)}:{type:'move',id,x:Math.round(object.x+dx),y:Math.round(object.y+dy),rotation:ui.rotation};drawItemPreview(ui.hover);renderPreview(null,false);
 if(finished){ui.preview=ui.hover;ui.hover=null;objectGesture=null;applyBuild();}
}
function currentPoint(p){const lift=BUILD_CATALOG[ui.kind]?.layer==='tabletop'?TABLETOP_HEIGHT/36:0;return {x:p.x+lift,y:p.y+lift};}
function itemEdit(p){const q=currentPoint(p);if(BUILD_CATALOG[ui.kind]?.layer==='wall'){const lift=wallMountHeight(ui.kind)/36,object={kind:ui.kind,...wallPlacementAt(club.layout,{x:p.x+lift,y:p.y+lift},ui.rotation)};return ui.tool==='move'?{type:'move',id:ui.object,...object}:{type:'place',object};}if(BUILD_CATALOG[ui.kind]?.layer==='tabletop'){const object=surfaceEditAt(club.layout,ui.kind,q,ui.surfaceAngle??0);return ui.tool==='move'?{type:'move',id:ui.object,...object}:{type:'place',object};}return ui.tool==='move'?{type:'move',id:ui.object,x:Math.floor(q.x),y:Math.floor(q.y),rotation:ui.rotation}:{type:'place',object:{kind:ui.kind,x:Math.floor(q.x),y:Math.floor(q.y),rotation:ui.rotation}};}
function drawItemPreview(edit,quote=buildService.quote(edit)){const normalized=quote.edit??normalizeEdit(club,edit),object=normalized.object??{...club.layout.objects.find(o=>o.id===normalized.id),...normalized};world.drawPreview(objectCells(object),object,quote.ok);return quote;}
function hover(p){if(ui.tab!=='build'||!['item','move'].includes(ui.tool)||ui.preview)return;ui.hover=itemEdit(p);const q=drawItemPreview(ui.hover);renderPreview(q,false);}
function paintStart(p){ui.paintPoint=p;
 if(busy||readOnly)return;ui.hover=null;
 if(!['land','floor','erase'].includes(ui.tool))ui.cells.clear();ui.edges.clear();ui.preview=null;paintMove(p,p);
}
function paintMove(p,start){
 if(busy||readOnly)return;
 if(ui.tool==='item'||ui.tool==='move'){ui.hover=itemEdit(p);drawItemPreview(ui.hover);return;}
 if(['room','resize-room'].includes(ui.tool)){ui.cells=new Map(rectangle(start,p).map(c=>[tileKey(c.x,c.y),c]));}
 else if(['land','floor','erase'].includes(ui.tool)){const c={x:Math.floor(p.x),y:Math.floor(p.y)};if(ui.tool!=='land'||!ownedCells(club.layout).has(tileKey(c.x,c.y)))ui.cells.set(tileKey(c.x,c.y),c);}
 else if(['wall','door','window'].includes(ui.tool)){const edge=nearestEdge(p);ui.edges.set(edge.axis+':'+edge.x+','+edge.y,edge);}
 world.drawPreview([...ui.cells.values()]);if(ui.edges.size)world.drawPreview([...ui.edges.values()]);
}
function makeEdit(){
 const cells=[...ui.cells.values()];
 if(ui.tool==='land')return {type:'buyCells',cells};
 if(ui.tool==='resize-room')return replanRoomEdit(club.layout,ui.buildRoom,cells);
 if(ui.tool==='erase'){const edge=nearestEdge(ui.paintPoint??{x:0,y:0}),wall=club.layout.walls.find(w=>w.axis===edge.axis&&w.x===edge.x&&w.y===edge.y);return wall?{type:'removeWall',id:wall.id}:{type:'floor',cells,finish:null};}
 if(ui.tool==='room')return roomEdit(club.layout,cells,{purpose:ui.purpose,furnished:ui.furnished});
 if(ui.tool==='floor')return {type:'floor',cells,finish:ui.floorFinish};
 if(['wall','door','window'].includes(ui.tool))return {type:'batch',edits:[...ui.edges.values()].map(edge=>({type:'wall',edge,kind:ui.wallKind??ui.tool}))};
 return ui.hover;
}
async function paintEnd(p,start){if(busy||readOnly)return;try{ui.preview=makeEdit();if(!ui.preview)return;ui.hover=null;const q=buildService.quote(ui.preview);if(ui.preview.type==='place'||ui.preview.type==='move')drawItemPreview(ui.preview,q);if(q.ok)await applyBuild();else{ui.hover=ui.preview;ui.preview=null;renderPreview(q,false);note(q.reason,true);};}catch(e){note(e.message,true);}}
function investmentHTML(quote){
 return '<div class="investment-summary" data-investment-summary="true">'+metric('Касса после',money(quote.balanceAfter))+metric('Обязательный резерв',money(quote.reserveAfter))+metric('Свободно после',money(quote.freeAfter))+metric('Содержание после',money(quote.hourlyAfter)+'/ч')+(quote.shortfall?'<p class="notice error">Резерву не хватает '+money(quote.shortfall)+'. Этот расход уменьшит запас денег на обязательства.</p>':'')+'</div>';
}
function duplicateBenefitHTML(quote){
 if(!quote.ok||!['place','upgrade'].includes(quote.edit?.type))return '';
 const edit=quote.edit,object=quote.next.objects.find(item=>item.id===(edit.object?.id??edit.id));
 if(!object||!['dice','mat','miniatures','screen','tablet','whiteboard'].includes(object.kind))return '';
 const roomId=object.roomId??parentTable(object,quote.next)?.roomId;if(!roomId)return '';
 const previous=club.layout.objects.find(item=>item.id!==object.id&&item.enabled!==false&&item.kind===object.kind&&(item.roomId??parentTable(item,club.layout)?.roomId)===roomId);
 if(!previous)return '';
 return '<p class="purchase-context" data-purchase-effect="duplicate">Уже есть «'+esc(BUILD_CATALOG[object.kind].name)+'» в этой комнате. Повторный экземпляр не увеличивает тот же бонус оснащения. Покупка — для оформления или другого использования; места на столе и обслуживание учитываются отдельно.</p>';
}
function renderPreview(quote=null,locked=Boolean(ui.preview)){
 const n=root.querySelector('#build-preview');if(ui.tab!=='build'||(!ui.preview&&!ui.hover&&!quote)){n.innerHTML='';n.hidden=true;return;}n.hidden=false;
 const q=quote??buildService.quote(ui.preview??ui.hover),net=(q.cost??0)-(q.refund??0),canPay=club.finance.cash>=net,valid=q.ok&&canPay,investment=q.ok?(q.investment??investmentQuote(club,{cost:q.cost,refund:q.refund,afterClub:{...club,layout:q.next}})):null;
 if(ui.pending?.kind==='build'&&(!q.ok||ui.pending.approval!==buildApproval(q)))clearBuildConfirmation();
 const delta=q.ok?Math.round((clubPrestige({...club,layout:q.next}).value-clubPrestige(club).value)*100)/100:0,removed=q.ok?club.layout.objects.filter(o=>!q.next.objects.some(next=>next.id===o.id)).length:0,rotatable=['item','move'].includes(ui.tool)&&(ui.preview??ui.hover)?.type!=='upgrade';
 n.classList.toggle('invalid',!valid);n.innerHTML='<div class="preview-main"><small>'+(locked?'СМЕТА ИЗМЕНЕНИЯ':'ПРЕДПРОСМОТР')+'</small><b>'+(q.ok?(net<0?'Возврат '+money(-net):money(net)):esc(q.reason))+'</b><span>'+(q.ok?(canPay?(removed?'Продаётся предметов '+removed:'Клик — установить · Esc — закончить'):'Не хватает '+money(net-club.finance.cash)):'Изменение не применено')+'</span>'+(q.ok?'<p class="purchase-context" data-prestige-delta="'+delta+'">Изменение престижа: '+(delta>0?'+':'')+delta.toLocaleString('ru-RU',{maximumFractionDigits:2})+'. Это фактический вклад этой установки с учётом доступности и пределов.</p>'+duplicateBenefitHTML(q):'')+(investment?'<details data-detail-key="investment"><summary>Касса '+money(investment.balanceAfter)+' · свободно '+money(investment.freeAfter)+'</summary>'+investmentHTML(investment)+'</details>':'')+(investment?.shortfall?'<p class="reserve-alert">Затрагивает резерв: не хватает '+money(investment.shortfall)+'</p>':'')+'</div><div class="button-row">'+(rotatable?button(BUILD_CATALOG[ui.kind]?.layer==='tabletop'?'R · '+(ui.surfaceAngle??0)+'°':'Поворот R','rotate'):'')+button('Отмена','cancel-build')+'</div>';
}
function buildApproval(q){return JSON.stringify({edit:q.edit,revision:q.baseRevision,cost:q.cost,refund:q.refund,investment:q.investment??investmentQuote(club,{cost:q.cost,refund:q.refund}),clock:club.clock});}
async function applyBuild(){
 if(!ui.preview||busy||readOnly)return;const before=structuredClone(club),q=buildService.quote(ui.preview);if(!q.ok){ui.hover=ui.preview;ui.preview=null;note(q.reason,true);renderPreview(q,false);return;}

 busy=true;root.classList.add('busy');root.setAttribute('aria-busy','true');let result;
 try{result=await buildService.commit(q.edit,{baseRevision:q.baseRevision,transactionId:uid()});}catch(error){result={ok:false,reason:error.message};}finally{busy=false;}
 if(result.ok){if(ui.expanding&&q.edit.type==='buyCells'){ui.tool='room';ui.purpose='game';ui.furnished=true;ui.expanding=false;ui.expansionPurchased=true;}undo=before;for(const key of formDrafts.keys())if(key.startsWith(renderedPanelKey+'|'))formDrafts.delete(key);clearSelection();ui.tool=ui.expansionPurchased?'room':['item','wall','door','window','floor','land','room','erase'].includes(ui.tool)?ui.tool:'select';ui.expansionPurchased=false;if(!club.layout.rooms.some(z=>z.id===ui.buildRoom))ui.buildRoom=null;if(!club.layout.walls.some(w=>w.id===ui.wall))ui.wall=null;if(!club.layout.objects.some(o=>o.id===ui.object))ui.object=null;note('Построено. '+(result.cost?'Расход '+money(result.cost)+'. ':'')+(result.refund?'Возврат '+money(result.refund)+'.':''));}else{ui.hover=ui.preview;ui.preview=null;note(result.reason,true);}render();
}
function startWarnings(id){
 const room=club.rooms.find(r=>r.id===id);if(!room?.master)return [];
 const guests=roomOccupants(club,id),end=club.clock+room.hours,status=campaignStatus(club),messages=[];
 if(guests.length>room.master.maxPlayers)messages.push('Мастеру комфортно до '+room.master.maxPlayers+' игроков; за столом '+guests.length+'. Внимания на каждого будет меньше.');
 const late=guests.filter(g=>g.asked.includes('time')&&g.schedule.leaveAt<end),unknown=guests.filter(g=>!g.asked.includes('time'));
 if(unknown.length)messages.push('Время ухода не уточнено у '+unknown.length+' гостей. Они могут уйти раньше конца.');
 if(late.length)messages.push('Не успеют до '+clockText(end)+': '+late.map(nameOf).join(', ')+'. За нарушенный срок билет возвращается.');
 messages.push(...tablePlan(club,id).rows.flatMap(row=>row.notes.filter(n=>['boundaries','avoid-genre','format'].includes(n.code)&&n.tone==='warning').map(n=>row.name+': '+n.text)));
 if(club.finance.cash<status.reserve+room.master.hourlyWage*room.hours)messages.push('Касса затрагивает резерв обязательств. Зарплата мастера: '+money(room.master.hourlyWage*room.hours)+'.');
 return messages;
}
function startActionHTML(room,guests){
 const warnings=startWarnings(room.id),ready=readyRooms(club).includes(room);
 return '<section class="party-start" data-party-start="'+esc(room.id)+'">'+(warnings.length?'<div class="start-warnings" id="start-warnings"><b>Перед запуском</b><ul>'+warnings.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></div>':'')+button((warnings.length?'Начать с учётом рисков':'Начать партию')+' · '+guests.length+'/'+roomCapacity(room),'start-room','data-id="'+esc(room.id)+'" '+(!ready?'disabled':'')+(warnings.length?' aria-describedby="start-warnings"':''),'primary full start-party')+'</section>';
}
async function requestStart(id){
 ui.pending=null;return perform(draft=>startRoom(draft,id,{acceptRisk:true}),{message:'Партия началась. Время продвигается по вашему решению.'});
}

function beginNewClub(){
 if(busy||readOnly)return;ui.previousClub=club;club=createFreshCampaign(uid());ui.creating=true;ui.tab='creator';clearInspection();clearSelection();ui.pending=null;render(true);world.fit();
}
function creatorHTML(){
 const a=club.administrator??DEFAULT_ADMINISTRATOR,p=a.portrait;
 const select=(name,label,values,value)=>'<label>'+label+'<select name="'+name+'">'+options(values,value)+'</select></label>';
 const colors=[['skin','Кожа'],['hairColor','Волосы'],['coat','Одежда'],['trousers','Брюки'],['accent','Отделка'],['iris','Глаза']];
 return '<p class="intro">Соберите администратора. В новом клубе будет только вход и ресепшн; комнаты, игры и персонал вы выбираете сами.</p><div class="admin-preview"><svg viewBox="-42 -130 84 142">'+personArt(a)+'</svg></div><form id="administrator-form"><label>Имя<input name="name" type="text" maxlength="40" value="'+esc(a.name)+'" required></label><div class="form-pair">'+select('grammar','Персонаж',[['masculine','Мужской'],['feminine','Женский']],a.grammar)+select('bodyShape','Телосложение',[['regular','Обычное'],['lean','Стройное'],['broad','Широкое'],['soft','Мягкое'],['compact','Компактное']],p.bodyShape)+'</div>'+select('hair','Причёска',[['short','Короткая'],['bob','Каре'],['curly','Кудри'],['long','Длинные волосы'],['tied','Собранные'],['ponytail','Хвост'],['braid','Коса'],['pixie','Пикси'],['shaved','Очень короткая']],p.hair)+select('outfit','Одежда',[['shirt','Рубашка'],['hoodie','Худи'],['cardigan','Кардиган'],['sweater','Свитер'],['vest','Жилет']],p.outfit)+'<div class="admin-colors">'+colors.map(([name,label])=>'<label>'+label+'<input type="color" name="'+name+'" value="'+p[name]+'"></label>').join('')+'</div><fieldset><legend>Аксессуары</legend>'+[['glasses','Очки'],['earrings','Серьги'],['necklace','Цепочка'],['hairClip','Заколка'],['beard','Борода']].map(([key,label])=>'<label class="check"><input type="checkbox" name="'+key+'" '+(p[key]?'checked':'')+'> '+label+'</label>').join('')+'</fieldset><p>Стартовый бюджет после ресепшна: <b>'+money(club.finance.cash)+'</b>. За готовые комнаты и мастера ничего не списывается.</p><button type="submit" class="primary full">Открыть свой клуб</button></form>'+(ui.previousClub?button('Вернуться в прежний клуб','cancel-new-game','','quiet full'):'');
}
function updateAdministrator(form){
 const data=new FormData(form),portrait={};for(const key of ['bodyShape','hair','outfit','skin','hairColor','coat','trousers','accent','iris'])portrait[key]=data.get(key);for(const key of ['glasses','earrings','necklace','hairClip','beard'])portrait[key]=data.has(key);
 club.administrator=normalizeAdministrator({name:data.get('name'),grammar:data.get('grammar'),portrait});const preview=root.querySelector('.admin-preview svg');if(preview)preview.innerHTML=personArt(club.administrator);world.render(club,stateView());
}
async function openCreatedClub(form){
 if(busy||readOnly)return;updateAdministrator(form);const archive=Boolean(ui.previousClub),result=await perform(()=>({ok:true}),{archive,message:'Ваш клуб открыт. Начните со строительства игровой и комнаты отдыха.'});if(result.ok){ui.creating=false;ui.previousClub=null;ui.tab='club';ui.guest=null;ui.room=null;render(true);world.fit();}
}
function download(){
 const data=saveDownload(club),url=URL.createObjectURL(new Blob([data.raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=data.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);note('Полная кампания скачана.');
}
async function handle(action,d){
 if(action==='cancel-new-game'&&ui.previousClub){club=ui.previousClub;ui.previousClub=null;ui.creating=false;ui.tab='settings';render(true);world.fit();return;}
 if(ui.creating&&!['zoom-in','zoom-out','fit','fit-buildings','walls','workspace-view'].includes(action))return;
 if(action==='first-shelf'){ui.tab='build';clearSelection();clearInspection();ui.kind='shelf';ui.tool='item';ui.category='furniture';render(true);return;}
 if(action==='first-master'){ui.candidates=true;nav('team');return;}if(action==='first-game'){ui.libraryTab='games';nav('library');return;}
 if(action==='result-next'){nextSessionResult();return;}
 if(action==='structure-kind'){ui.wallKind=d.kind;clearSelection();render();return;}
 if(['expand-club','expand-room','expand-staff'].includes(action)){clearSelection();clearInspection();ui.tab='build';ui.tool=action==='expand-club'?'land':'room';ui.expanding=true;ui.purpose=action==='expand-staff'?'staff':'game';ui.furnished=true;render();world.fit();return;}
 if(action==='inspect-object'){ui.object=d.id;ui.wall=null;ui.buildRoom=null;ui.tool='select';clearSelection();render();return;}
 if(action==='nav'){nav(d.tab);return;}if(action==='guest'){ui.guest=d.id;ui.replayAnswer=null;ui.guestTab='talk';ui.seatArmed=false;nav('guests');return;}if(action==='room'){ui.room=d.id;nav('rooms');return;}
 if(action==='workspace-view'){ui.expandedMap=!ui.expandedMap;render();return;}
 if(action==='fit-buildings'){world.fitBuildings();return;}if(action==='focus-room'){world.focusRoom(d.id);return;}
 if(action==='question-set'){ui.questionSet=d.id;render();return;}
 if(action==='guest-tab'){ui.guestTab=d.id;render(true);return;}if(action==='room-filter'){ui.roomFilter=d.id;render();return;}
 if(action==='set-direction'){await command({type:'setClubDirection',direction:d.id},'Направление клуба обновлено.');return;}
 if(action==='arm-seat'){ui.seatArmed=!ui.seatArmed;render();return;}
 if(action==='inspect-room'){ui.buildRoom=d.id;ui.object=null;ui.wall=null;ui.tool='select';nav('build');return;}
 if(action==='fit'){world.fit();return;}if(action==='zoom-in'){world.zoom(1.2);return;}if(action==='zoom-out'){world.zoom(1/1.2);return;}if(action==='walls'){ui.walls=ui.walls==='cut'?'hidden':ui.walls==='hidden'?'full':'cut';render();return;}
 if(action==='library-tab'){ui.libraryTab=d.id;ui.librarySearch='';render(true);return;}if(action==='stories-for-system'){ui.libraryTab='adventures';ui.librarySearch=SYSTEMS[d.system]?.name??'';ui.tab='library';render(true);return;}if(action==='category'){ui.category=d.category;ui.catalogSearch='';render(true);return;}if(action==='team-tab'){ui.candidates=d.candidates==='true';render(true);return;}
 if(action==='tool'){clearSelection();clearInspection();ui.wallKind=d.tool;ui.tool=d.tool;ui.seatArmed=false;render();return;}if(action==='build-item'){clearSelection();ui.object=null;ui.wall=null;ui.buildRoom=null;ui.kind=d.kind;ui.tool='item';ui.rotation=0;ui.surfaceAngle=0;render();return;}
 if(action==='cancel-build'||action==='clear-inspection'){clearSelection();clearInspection();ui.tool='select';render();return;}
 if(action==='rotate'&&BUILD_CATALOG[ui.kind]?.layer==='tabletop'){ui.surfaceAngle=normalizeAngle((ui.surfaceAngle??0)+(d.reverse?-15:15));const edit=ui.preview??ui.hover;if(edit){const object=edit.object??{...club.layout.objects.find(o=>o.id===edit.id),...edit},pose=surfacePose(object,club.layout),next=surfaceEditAt(club.layout,object.kind,pose,ui.surfaceAngle);if(edit.object)Object.assign(edit.object,next);else Object.assign(edit,next);drawItemPreview(edit);}renderPreview();return;}
 if(action==='rotate'){ui.rotation=(ui.rotation+1)%4;if(ui.preview&&(ui.preview.type==='place'||ui.preview.type==='move')){if(ui.preview.object)ui.preview.object.rotation=ui.rotation;else ui.preview.rotation=ui.rotation;drawItemPreview(ui.preview);}else if(ui.hover){if(ui.hover.object)ui.hover.object.rotation=ui.rotation;else ui.hover.rotation=ui.rotation;drawItemPreview(ui.hover);}renderPreview();return;}
 if(action==='resize-room'){ui.buildRoom=d.id;ui.tool='resize-room';clearSelection();render();return;}
 if(action==='remove-wall'){ui.preview={type:'removeWall',id:d.id};await applyBuild();return;}
 if(action==='apply-build'){await applyBuild();return;}
 if(action==='export'){download();return;}if(action==='more-ledger'){ui.ledgerLimit+=40;render();return;}
 if(action==='cancel-confirm'){ui.pending=null;render();return;}if(action==='confirm'){const pending=ui.pending;ui.pending=null;if(pending)await pending.run();render();return;}
 if(action==='service-build'){ui.category='service';nav('build');return;}
 if(busy||readOnly){note(readOnly?writer.reason:'Дождитесь сохранения.',true);return;}
 if(action==='quick-interview'){ui.replayAnswer=null;await perform(draft=>quickInterview(draft,ui.guest),{message:'Главные условия записаны. Выберите подходящий стол.'});return;}
 if(action==='wait-guests'){await command({type:'waitForGuests'},'Время переведено к ближайшему приходу или окончанию партии.');return;}
 if(action==='ask'||action==='ask-more'){const g=club.guests.find(g=>g.id===ui.guest);ui.replayAnswer=d.question;if(action==='ask'&&g?.dialogue.some(a=>a.questionId===d.question)){render();return;}await perform(draft=>{const answer=askGuest(draft,ui.guest,d.question);return answer?{ok:true}:{ok:false,reason:'Вопрос недоступен.'};});return;}
 if(action==='seat'){await seatGuest(ui.guest,d.room,Number(d.seat));return;}
 if(action==='unseat'){await perform(draft=>({ok:unassignGuest(draft,ui.guest)}));return;}
 if(action==='dismiss-guest'){await perform(draft=>dismissGuest(draft,ui.guest));ui.guest=club.guests.find(g=>!g.roomId)?.id;render();return;}
 if(action==='start-room'){requestStart(d.id);return;}
 if(action==='advance'){const r=await perform(advanceClub);if(r.ok){ui.reportId=null;ui.reportRoom='all';nav('finance');}return;}
 if(action==='wait'){await command({type:'advanceIdle'},'Прошёл один игровой час.');return;}
 if(action==='move-object'){const o=club.layout.objects.find(o=>o.id===d.id);ui.object=o.id;ui.kind=o.kind;ui.rotation=o.rotation;ui.surfaceAngle=surfacePose(o,club.layout)?.angle??0;ui.tool='move';clearSelection();render();return;}
 if(action==='rotate-object'){const o=club.layout.objects.find(o=>o.id===d.id);if(BUILD_CATALOG[o.kind]?.layer==='tabletop'){ui.object=o.id;ui.kind=o.kind;ui.tool='move';ui.surfaceAngle=normalizeAngle((surfacePose(o,club.layout)?.angle??0)+15);ui.preview={type:'move',id:o.id,...surfaceEditAt(club.layout,o.kind,surfacePose(o,club.layout),ui.surfaceAngle)};await applyBuild();return;}ui.preview={type:'move',id:o.id,x:o.x,y:o.y,rotation:(o.rotation+1)%4};await applyBuild();return;}
 if(action==='sell-object'){ui.preview={type:'remove',id:d.id};await applyBuild();return;}
 if(action==='undo-build'&&undo){const before=undo;await perform(draft=>{Object.keys(draft).forEach(k=>delete draft[k]);Object.assign(draft,structuredClone(before));return {ok:true};},{message:'Последнее строительство отменено.'});return;}
 if(action==='new-game'){beginNewClub();return;}
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
root.addEventListener('input',e=>rememberFormDraft(e.target),true);
root.addEventListener('change',e=>rememberFormDraft(e.target),true);
root.addEventListener('submit',async e=>{
 e.preventDefault();if(e.target.id==='administrator-form'){openCreatedClub(e.target);return;}const data=new FormData(e.target);
 if(e.target.id==='cleaning-policy-form'){command({type:'setCleaningPolicy',policy:{enabled:data.has('enabled'),zoneIds:data.getAll('zoneIds'),cleanlinessBelow:Number(data.get('cleanlinessBelow')),maxSpend:Number(data.get('maxSpend')),windowHours:Number(data.get('windowHours'))}},'Поручение сохранено.',{formKey:draftKey(e.target)});return;}
 if(e.target.id==='room-inspector-form'){const zone=club.layout.rooms.find(z=>z.id===ui.buildRoom);ui.preview={type:'room',id:zone.id,cells:zone.cells,name:String(data.get('name')).trim(),purpose:data.get('purpose')};await applyBuild();return;}
 if(e.target.id==='demolish-room-form'){try{ui.preview=demolishRoomEdit(club.layout,ui.buildRoom,{sellContents:data.has('sellContents'),removeFinishes:data.has('removeFinishes'),removeBoundary:data.has('removeBoundary')});await applyBuild();}catch(error){note(error.message,true);render();}return;}
 if(e.target.id==='room-form')command({type:'assignRoom',roomId:ui.room,gameId:data.get('game'),masterId:data.get('master'),adventureId:data.get('adventure')});
 if(e.target.classList.contains('service-policy'))command({type:'configureAutoPurchase',itemId:e.target.dataset.id,settings:{target:Number(data.get('target')),budget:Number(data.get('budget')),threshold:0,maxOrder:Math.min(10,Number(data.get('target')))}},'Поручение сохранено.',{formKey:draftKey(e.target)});
 if(e.target.classList.contains('training-form'))command({type:'trainMaster',masterId:e.target.dataset.id,systemId:data.get('course')});
});
root.addEventListener('input',e=>{
 if(e.target.form?.id==='administrator-form'){updateAdministrator(e.target.form);return;}
 if(e.target.id==='room-search'){ui.roomSearch=e.target.value;render();return;}
 if(e.target.id==='catalog-search'){ui.catalogSearch=e.target.value;const grid=root.querySelector('#catalog-grid');grid.innerHTML=catalogCards();fitItemIcons(grid);}
 if(e.target.id==='library-search'){ui.librarySearch=e.target.value;root.querySelector('#library-cards').innerHTML=libraryCards();}
});
root.addEventListener('change',async e=>{
 if(e.target.form?.id==='administrator-form'){updateAdministrator(e.target.form);return;}
 if(e.target.id==='journal-room'){ui.reportRoom=e.target.value;ui.reportId=null;render();return;}if(e.target.id==='journal-session'){ui.reportId=e.target.value;render();return;}
 if(e.target.id==='seat-room'){ui.seatRoom=e.target.value;ui.room=e.target.value;render();return;}
 if(e.target.id==='floor-finish'){ui.floorFinish=e.target.value==='none'?null:e.target.value;cancelBuild();return;}
 if(e.target.id==='wall-kind'){const wall=club.layout.walls.find(w=>w.id===ui.wall);ui.preview={type:'wall',edge:{axis:wall.axis,x:wall.x,y:wall.y},kind:e.target.value};await applyBuild();return;}
 if(e.target.id==='replace-object'&&e.target.value){ui.preview={type:'upgrade',id:ui.object,kind:e.target.value};await applyBuild();return;}
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
window.addEventListener('keydown',e=>{if(ui.creating){if(e.code==='Escape'&&ui.previousClub)handle('cancel-new-game',{});return;}if(root.querySelector('#session-results')?.open)return;if(e.code!=='Escape'&&(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable))return;if(e.code==='KeyR'&&ui.tab==='build'){e.preventDefault();handle('rotate',{reverse:e.shiftKey});}if(e.code==='Escape'){ui.seatArmed=false;ui.pending=null;objectGesture=null;clearSelection();ui.tool='select';clearInspection();hideDrag();render();}});
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
  if(!club){if(readOnly)throw new Error(writer.reason);club=createFreshCampaign(uid());ui.creating=true;ui.tab='creator';}
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
  root.querySelector('#recover-new').addEventListener('click',async e=>{e.target.disabled=true;try{await store.write(createFreshCampaign(uid()),{archive:true});location.reload();}catch(failure){root.querySelector('#recover-status').textContent=failure.message;e.target.disabled=false;}});
 }

}
boot();
