import {financeBreakdown,investmentQuote,emptyRoomSavings} from '../model/finance-breakdown.js';
import {libraryStorageStatus} from '../model/layout-club.js';
import {demandHTML} from './guest-history-ui.js';
import {kitStatus,roomPreparation,kitDeadlines} from '../model/kit-lifecycle.js';
import {operationsHTML,operationRequest} from './operations-ui.js';
import {campaignMarket,campaignStatus,roomAssignment,startQuote,clockText,executeCampaignAction} from '../model/campaign.js';
import {SYSTEMS} from '../data/systems.js';
import {graphicPortrait} from './graphic-portrait.js';
import {layoutObjectSVG} from './layout-map.js';
import {masterExpectationText} from '../model/preferences.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>`${Math.round(Number(value)||0).toLocaleString('ru-RU')} ₽`;
const transactionId=()=>globalThis.crypto?.randomUUID?.()??`campaign-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const titleFor={shop:'Библиотека клуба',team:'Мастера',rooms:'Игры в комнатах',equipment:'Сервис и оборудование',finance:'Касса и развитие'};
const colors=['#788f83','#ab765b','#77788e','#be9c60','#708e9a','#967489','#9a8f66','#a27368','#637a72','#a9a17a'];

function bookArt(game,index){
  const ink=colors[index%colors.length],symbols=['<path d="M35 72l16-28 17 28zM42 60h19"/>','<circle cx="51" cy="57" r="17"/><path d="M51 34v46M28 57h46"/>','<path d="M30 72l10-30 12 18 12-18 9 30M36 72h32"/>','<path d="M31 48l20-12 20 12v22L51 81 31 70zM31 48l20 12 20-12M51 60v21"/>'];
  return `<svg viewBox="0 0 100 130" aria-hidden="true"><path d="M15 12h68v105H15z" fill="#514536" opacity=".2" transform="translate(4 4)"/><path d="M15 12h66v102H15z" fill="${ink}" stroke="#594c41" stroke-width="1.7"/><path d="M15 12h10v102H15z" fill="#302f33" opacity=".22"/><path d="M26 18h49v89H26z" fill="none" stroke="#ead9b2" stroke-width="1.2"/><g fill="none" stroke="#eeddb8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${symbols[index%4]}<path d="M35 91h31M40 97h21"/></g><path d="M16 114h67l-4 6H16z" fill="#eadfc7" stroke="#796b55"/><path d="M24 117h51" stroke="#c5b695"/></svg>`;
}

const portrait=person=>person.identity?.portrait?graphicPortrait(person.identity,{full:true}):`<span class="campaign-portrait-placeholder" aria-hidden="true">${esc(person.name?.slice(0,1)||'М')}</span>`;
const systemsText=ids=>(ids??[]).map(id=>SYSTEMS[id]?.name??id).join(' · ');
const roomName=(club,id)=>club.layout?.rooms.find(room=>room.id===id)?.name||`Комната ${club.rooms.find(room=>room.id===id)?.number??''}`;

export function installCampaignUI({getClub,onAction,refresh=()=>{},root=document.querySelector('#game')}){
  root=typeof root==='string'?document.querySelector(root):root;
  if(!root||typeof getClub!=='function'||typeof onAction!=='function')throw new Error('Делам клуба нужны состояние и действия кампании.');
  const toggle=root.querySelector('#campaign-toggle'),statusNode=root.querySelector('#campaign-status');
  const headerWallet=document.createElement('span');headerWallet.className='campaign-header-wallet';headerWallet.setAttribute('aria-label','Касса клуба');root.querySelector('.header-actions')?.prepend(headerWallet);
  const dialog=document.createElement('dialog');dialog.className='campaign-dialog';dialog.setAttribute('aria-labelledby','campaign-title');document.body.append(dialog);
  let tab='shop',busy=false,message='',pending=null,selectedRoom=null,draft=null,announcedState=null,selectedEquipment=null,lastPointerPurchase=null;
  const listeners=[],listen=(node,event,handler,options)=>{node?.addEventListener(event,handler,options);listeners.push(()=>node?.removeEventListener(event,handler,options));};
  const status=()=>campaignStatus(getClub()),market=()=>campaignMarket(getClub());
  const assignments=()=>getClub().rooms.map(room=>({room,...roomAssignment(getClub(),room.id)}));

  function nextSessionEstimate(club){
    // A named existing assignment, not a recommendation based on hidden guest
    // preferences and not a claim to find the cheapest possible game.
    for(const room of club.rooms.filter(r=>r.status!=='running'&&r.kitId&&r.masterId&&r.adventureId)){
      const quote=startQuote(club,room.id,room.enabled?{}:{gameId:room.kitId,masterId:room.masterId,adventureId:room.adventureId,hours:room.hours});
      if(quote.ok)return {...quote,roomId:room.id,name:roomName(club,room.id)};
    }
    return null;
  }

  function nextSessionHTML(next,balance){
    return next?`<p class="campaign-next-budget">Пример следующей партии по назначению «${esc(next.name)}», ${next.hours} ч: <b>резерв ${money(next.reserve)}</b> на весь клуб до окончания и подготовки.${balance<next.reserve?` Не хватает ${money(next.reserve-balance)} при кассе ${money(balance)}.`:` После такого резерва останется ${money(balance-next.reserve)}.`} Это смета при нынешних открытых комнатах, без будущей оплаты гостей; подходящую компанию ещё нужно собрать.</p>`:'<p class="campaign-next-budget">Новая партия в резерв ещё не включена. Её смета появится после выбора доступного комплекта, мастера и длительности в разделе «Комнаты».</p>';
  }

  function investmentHTML(quote,next){
    return `<section class="campaign-investment" aria-label="Смета изменения"><dl class="campaign-ledger">${[['Сейчас в кассе',money(quote.balanceBefore)],['Разовая оплата',money(quote.cost)],...(quote.refund?[['Возврат от продажи',money(quote.refund)]]:[]),['После изменения в кассе',money(quote.balanceAfter)],['Содержание всего клуба после изменения',money(quote.hourlyAfter)+'/ч'],['Известный резерв после изменения',money(quote.reserveAfter)],['После вычета известного резерва',money(quote.freeAfter)]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p>Резерв — верхняя оценка оставшихся расходов${quote.reserveHours?` до ${esc(clockText(quote.reserveThrough))}`:''} при текущих открытых комнатах и смене. Уже оплаченные покупки не списываются повторно; доход гостей не предполагается. ${quote.reserveHours?'':'Сейчас известных длительных обязательств нет. '}Новые партии сюда не входят.</p>${quote.shortfall?`<p class="campaign-caution">После изменения не хватит ${money(quote.shortfall)} на известные расходы. Можно отменить покупку, закрыть пустые комнаты или продать свободное имущество. Это предупреждение не блокирует разрешённое действие.</p>`:''}${nextSessionHTML(next,quote.balanceAfter)}</section>`;
  }

  function confirmInvestment(action,detail,label,{cost=0,refund=0}={}){
    // Run the exact command on an isolated draft only when the player asks for
    // a quote. Never persist this preview or touch the real ledger/history.
    action={...action,transactionId:action.transactionId??transactionId()};
    const club=getClub(),after=structuredClone(club),result=executeCampaignAction(after,action);
    if(result.ok){const change=after.finance.cash-club.finance.cash;cost=Math.max(0,-change);refund=Math.max(0,change);}
    const quote=investmentQuote(club,{cost,refund,afterClub:result.ok?after:null});
    pending={action,detail,label,quote,next:nextSessionEstimate(result.ok?after:club),previewError:result.ok?'':result.reason};
    renderDialog({resetScroll:true});
  }

  function financialChoicesHTML(club){
    const rooms=emptyRoomSavings(club),spare=club.library.copies.filter(kit=>!club.rooms.some(room=>room.kitId===kit.id)).map(kit=>({...kit,state:kitStatus(club,kit.id)})).filter(kit=>!kit.state.running&&!kit.state.preparing&&!kit.state.repairing);
    return `<section class="campaign-financial-choices"><h3>Деньги на следующую игру</h3>${nextSessionHTML(nextSessionEstimate(club),club.finance.cash)}<p>Если резерва мало, можно уменьшить расходы или вернуть часть денег за имущество. Кнопки ниже сначала показывают смету; решение остаётся за вами.</p>${spare.length?`<h4>Свободные комплекты</h4><p>Эти экземпляры не назначены на комнаты. Продажа не удаляет купленные истории.</p><div class="campaign-finance-actions">${spare.map(kit=>`<button type="button" data-campaign-sell-kit="${esc(kit.id)}" ${busy?'disabled':''}>Продать ${esc(SYSTEMS[kit.systemId]?.name??kit.systemId)} · +${money(kit.state.saleValue)}…</button>`).join('')}</div>`:'<p>Неназначенных свободных комплектов сейчас нет. Другие экземпляры можно рассмотреть в библиотеке.</p>'}${rooms.length?`<h4>Пустые открытые комнаты</h4><div class="campaign-finance-actions">${rooms.map(room=>`<button type="button" data-campaign-disable-room="${esc(room.roomId)}" ${busy?'disabled':''}>Отключить ${esc(roomName(club,room.roomId))} · экономия ${money(room.hourlySaving)}/ч…</button>`).join('')}</div><p>Экономия показана для каждого отдельного отключения при нынешнем составе клуба; суммы нельзя складывать из-за общих расходов.</p>`:'<p>Пустых открытых комнат нет. Отключённые комнаты не оплачивают содержание зала; включённые приборы и смена помощника оплачиваются отдельно.</p>'}<p>Запуск с недостаточным резервом требует отдельного подтверждения на карте. Гости могут отказаться платить: зарплата и содержание останутся обязательными, а долг может привести к закрытию клуба.</p><div class="campaign-finance-actions"><button type="button" data-campaign-tab="rooms">Смета партии и назначения</button><button type="button" data-campaign-tab="shop">Все экземпляры и продажа</button></div></section>`;
  }

  function hiringFacts(person){
    const facts=[...(Array.isArray(person.skills)?person.skills:[])];
    const labels={willing:'Готов объяснять правила',independent:'Рассчитывает на самостоятельное изучение правил'};
    for(const key of ['teachingWillingness','temperament','expectations'])if(typeof person[key]==='string'&&person[key]){const label=labels[person[key]]??person[key];if(!facts.includes(label))facts.push(label);}
    return facts.map(fact=>`<li>${esc(fact)}</li>`).join('');
  }

  function libraryHTML(data){
    const storage=libraryStorageStatus(getClub());
    return `<div class="campaign-tab-intro"><h3>Игры на вашей полке</h3><p>Один комплект — один стол одновременно. Покупка остаётся в клубе для следующих компаний.</p><p>Доступные полки: ${storage.used} / ${storage.capacity} экземпляров.${storage.overCapacity?` ${esc(storage.reason)}`:''}</p></div>${demandHTML(getClub())}${kitsHTML(data)}<div class="campaign-bookshelf">${data.games.map((game,index)=>{
      const copies=data.ownedGames.filter(copy=>copy.systemId===game.systemId).length;
      return `<article class="campaign-book"><div class="campaign-book-cover">${bookArt(game,index)}<span>${copies?`${copies} в клубе`:'Новый комплект'}</span></div><div class="campaign-book-copy"><h4>${esc(game.name)}</h4><p>${esc(game.description||SYSTEMS[game.systemId]?.about)}</p><small>${esc(SYSTEMS[game.systemId]?.learning||'')}</small><button type="button" data-campaign-buy="${esc(game.systemId)}" ${busy?'disabled':''}>${copies?'Ещё комплект':'Купить'} · ${money(game.price)}</button></div></article>`;
    }).join('')}</div>${adventuresHTML(data)}`;
  }

  function kitsHTML(data){
    return `<section class="campaign-owned-kits"><h3>Ваши экземпляры</h3>${data.ownedGames.map(kit=>{const state=kitStatus(getClub(),kit.id),room=assignments().find(a=>a.game?.id===kit.id);return `<article><div><h4>${esc(kit.name)}</h4><p>Состояние ${Math.round(state.condition)}% · игр ${state.useCount}${room?' · '+esc(roomName(getClub(),room.room.id)):' · свободный, не назначен'}.</p>${state.reason?`<p>${esc(state.reason)}</p>`:''}${state.readyAt>getClub().clock?`<p>До готовности этого экземпляра ${Math.ceil((state.readyAt-getClub().clock)*60)} мин.</p>`:''}</div><div>${state.readyAt>getClub().clock?`<button type="button" data-campaign-wait-preparation ${busy?'disabled':''}>Ближайшая готовность · ${Math.ceil((Math.min(...kitDeadlines(getClub()))-getClub().clock)*60)} мин</button>`:''}<button type="button" data-campaign-repair-kit="${esc(kit.id)}" ${busy||!state.repairQuote.available?'disabled':''}>Обслужить · ${money(state.repairQuote.cost)} / 30 мин…</button><button type="button" data-campaign-sell-kit="${esc(kit.id)}" ${busy||state.running||state.preparing||state.repairing||room&&getClub().guests.some(g=>g.roomId===room.room.id)?'disabled':''}>Продать · ${money(state.saleValue)}…</button></div></article>`;}).join('')}</section>`;
  }

  function adventuresHTML(data){
    if(!data.adventures?.length)return '';
    return `<section class="campaign-adventures"><div class="campaign-section-heading"><h3>Истории для следующей компании</h3><p>Приключение остаётся в библиотеке и назначается вместе с подходящей системой.</p></div>${data.adventures.map(adventure=>`<article class="campaign-adventure"><div><span class="campaign-eyebrow">${esc(SYSTEMS[adventure.systemId]?.name??adventure.systemId)}</span><h4>${esc(adventure.title)}</h4><p>${esc(adventure.description||adventure.premise||'')}</p><small>${adventure.durationRange?.join('–')??'2–6'} ч · одна законченная история.</small>${adventure.sceneOutline?.length?`<details><summary>Сцены и важные темы</summary><ol>${adventure.sceneOutline.map(scene=>`<li>${esc(scene)}</li>`).join('')}</ol><p>${esc(adventure.topicText)}</p></details>`:''}</div>${adventure.owned?'<span class="campaign-owned">В библиотеке</span>':`<button type="button" data-campaign-buy-adventure="${esc(adventure.adventureId)}" ${busy?'disabled':''}>Купить · ${money(adventure.price)}</button>`}</article>`).join('')}</section>`;
  }

  function trainingOptions(data,person){
    return (person.trainingOptions??data.trainingOptions??[]).filter(option=>['teaching','turns'].includes(option.systemId)||!(person.systems??[]).includes(option.systemId));
  }

  function teamHTML(data){
    const rooms=assignments(),lounge=data.staffRoom;
    const staff=data.staff.map(person=>{
      const assignment=rooms.find(value=>value.room.enabled!==false&&value.staff?.id===person.id),working=assignment?.room.status==='running';
      const fatigue=typeof person.fatigue==='string'?person.fatigue:person.fatigue>8?'Очень устал; нужен отдых':person.fatigue>4?'Устал после проведённых игр':'Свеж и готов к игре';
      const options=trainingOptions(data,person),training=person.training;
      const trainingHTML=training?`<p class="campaign-training-active">Учится: ${esc(training.label||'новые навыки')}${Number.isFinite(training.remainingHours)?` · осталось ${training.remainingHours} ч`:''}</p>`:options.length?`<div class="campaign-training"><label>Обучение<select data-campaign-training-for="${esc(person.id)}">${options.map(option=>`<option value="${esc(option.systemId)}">${esc(option.name)} · ${money(option.price)} · ${option.hours} ч</option>`).join('')}</select></label><button type="button" data-campaign-train="${esc(person.id)}" ${busy||working?'disabled':''}>Отправить учиться…</button></div>`:'';
      return `<article class="campaign-staff-note"><div class="campaign-staff-portrait">${portrait(person)}</div><div><h4>${esc(person.name)} <small>${money(person.wage)}/ч игры</small></h4><p>При знакомстве: ${esc(person.style||'Мастер клуба')}</p><details class="campaign-master-expectations"><summary>Текущий подход</summary><p>${esc(masterExpectationText({...person,fatigue:person.fatigueValue??0}))}</p></details><p class="campaign-faint">${esc(fatigue)} · ${assignment?esc(roomName(getClub(),assignment.room.id)):'Не назначен'}</p><small>${esc(systemsText(person.systems))}</small><p class="campaign-rest-place">${person.canRest?`Отдыхает: ${esc(roomName(getClub(),person.restSeat.roomId))}`:person.restSeat?training?'Во время обучения не отдыхает':working?'Сейчас ведёт игру':'Место отдыха закреплено':'Физическое место отдыха пока не оборудовано'}</p>${trainingHTML}<button type="button" class="campaign-text-action" data-campaign-dismiss="${esc(person.id)}" ${busy||working?'disabled':''}>Завершить договор</button></div></article>`;
    }).join('');
    return `<div class="campaign-tab-intro"><h3>Ваша команда</h3><p>Мастер получает оплату за всю проведённую партию, даже если гости не заплатят. Между партиями почасовой зарплаты нет.</p>${lounge?`<p class="campaign-capacity">Физические места отдыха: <b>${lounge.physicalCapacity}</b> · нанято <b>${lounge.hired}</b> · свободно <b>${lounge.free}</b>.</p>${lounge.reason?`<p class="campaign-caution">${esc(lounge.reason)}</p>`:''}`:''}</div><div class="campaign-staff-list">${staff||'<p class="campaign-empty">В клубе пока нет нанятых мастеров.</p>'}</div><div class="campaign-section-heading"><h3>Знакомство с кандидатами</h3><p>Смотрите на манеру ведения и знакомые игры. Более высокая ставка не обещает подходящую компанию.</p></div><div class="campaign-dossiers">${data.candidates.map(person=>`<article class="campaign-dossier"><div class="campaign-dossier-portrait">${portrait(person)}</div><div class="campaign-dossier-copy"><span class="campaign-eyebrow">${person.returning?'Работал в клубе':'Мастер игр'}</span><h4>${esc(person.name)}</h4><b>${esc(person.style)}</b><p>При знакомстве: ${esc(person.detail)}</p><ul>${hiringFacts(person)}</ul><details class="campaign-master-expectations"><summary>Как я веду игру</summary><p>${esc(masterExpectationText({...person,fatigue:person.fatigueValue??0}))}</p></details><p class="campaign-known-games"><span>Знакомые игры</span>${esc(systemsText(person.systems))}</p><div class="campaign-hire-terms"><span>${money(person.wage)}<small>за час игры</small></span><button type="button" data-campaign-hire="${esc(person.candidateId)}" ${busy||!lounge?.free?'disabled':''}>Пригласить · ${money(person.hireCost)}</button></div></div></article>`).join('')}</div><div class="campaign-rest-note"><p>Свободные мастера отдыхают только на доступных местах в комнате отдыха. Обучение не восстанавливает силы. Час ожидания продвинет клубное время. Содержание клуба за этот час — ${money(status().hourlyCosts)}.</p><button type="button" data-campaign-wait ${busy?'disabled':''}>Подождать 1 час</button></div>`;
  }

  function resetDraft(){
    const club=getClub();selectedRoom=club.rooms.some(room=>room.id===selectedRoom)?selectedRoom:club.rooms[0]?.id??null;
    const assignment=selectedRoom?roomAssignment(club,selectedRoom):{};
    draft={gameId:assignment.game?.id??'',masterId:assignment.staff?.id??'',adventureId:assignment.adventureId??assignment.session?.id??'',hours:assignment.hours??2};
  }

  function assignmentCosts(data){
    const person=data.staff.find(value=>value.id===draft?.masterId),hours=Number(draft?.hours)||2,s=status();
    const assignment=selectedRoom?roomAssignment(getClub(),selectedRoom):{};
    const quotation=selectedRoom?startQuote(getClub(),selectedRoom,draft):null;
    return `<div class="campaign-assignment-costs"><p><span>Цена для одного гостя</span><b>${money(s.guestPricePerHour*hours)} за ${hours} ч</b></p><p><span>Обязательная зарплата мастера</span><b>${person?money(person.wage*hours):'Выберите мастера'}</b></p><p><span>Текущее содержание всего клуба</span><b>${money(s.hourlyCosts)}/ч</b></p>${quotation?.projectedExpense!==undefined?`<p><span>Расходы этой партии по текущему плану</span><b>${money(quotation.projectedExpense)}</b></p>`:''}<small>Назначение бесплатно. Зарплата фиксируется при запуске партии; оплата гостей поступит после её завершения.</small>${quotation&&!quotation.ok?`<p class="campaign-caution">${esc(quotation.reason)}</p>`:''}${quotation?.ok?`<p><span>Касса / резерв всего клуба с этой партией</span><b>${money(quotation.cash)} / ${money(quotation.reserve)}</b></p>${quotation.risky?`<p class="campaign-caution">Не хватает ${money(quotation.reserve-quotation.cash)} на случай отказа гостей от оплаты. Закройте другие пустые комнаты, рассмотрите продажу свободного комплекта или подтвердите риск при запуске на карте. Долг может привести к закрытию клуба.</p>`:''}`:''}</div>`;
  }

  function roomsHTML(data){
    if(!draft)resetDraft();
    const club=getClub(),room=club.rooms.find(value=>value.id===selectedRoom),bound=assignments(),running=room?.status==='running';
    if(!room)return '<div class="campaign-empty"><h3>Пока нет размеченной комнаты</h3><p>Нарисуйте её в режиме строительства, добавьте мебель и проход от входа. Затем здесь можно назначить игру и мастера.</p></div>';
    const assignment=roomAssignment(club,selectedRoom),system=data.ownedGames.find(game=>game.id===draft.gameId)?.systemId,adventures=(data.adventures??[]).filter(adventure=>adventure.owned&&adventure.systemId===system);
    if(adventures.length&&!adventures.some(adventure=>adventure.adventureId===draft.adventureId))draft.adventureId=adventures[0].adventureId;
    const preparation=roomPreparation(club,room.id);
    const selectedAdventure=adventures.find(a=>a.adventureId===draft.adventureId),range=selectedAdventure?.durationRange??[2,6],allowedHours=[2,3,4,5,6].filter(h=>h>=range[0]&&h<=range[1]);
    if(!running&&!allowedHours.includes(Number(draft.hours)))draft.hours=allowedHours[0]??2;
    return `<div class="campaign-tab-intro"><h3>Подготовить следующий стол</h3><p>Игра, мастер и длительность задаются для конкретной комнаты. Сначала поговорите с гостями, затем соберите компанию на карте.</p></div>${!preparation.ready?`<section class="campaign-caution"><p>${esc(preparation.reason)} До готовности этого стола ${Math.ceil((preparation.endsAt-club.clock)*60)} мин.</p><button type="button" data-campaign-wait-preparation ${busy?'disabled':''}>Ближайшая готовность · ${Math.ceil((Math.min(...kitDeadlines(club))-club.clock)*60)} мин</button></section>`:''}<form class="campaign-assignment" data-campaign-assignment><label class="campaign-room-choice">Комната<select name="roomId" data-campaign-room>${club.rooms.map(value=>`<option value="${esc(value.id)}" ${value.id===selectedRoom?'selected':''}>${esc(roomName(club,value.id))}${value.status==='running'?' · идёт игра':''}</option>`).join('')}</select><small class="campaign-selected-name" data-selected-room-name>${esc(roomName(club,selectedRoom))}</small></label><div class="campaign-assignment-fields"><label>Игровой комплект<select name="gameId" required ${running?'disabled':''}><option value="">Выберите купленную игру</option>${data.ownedGames.map(game=>{const elsewhere=bound.find(value=>value.room.id!==selectedRoom&&value.room.enabled!==false&&value.game?.id===game.id);return `<option value="${esc(game.id)}" ${game.id===draft.gameId?'selected':''} ${elsewhere?'disabled':''}>${esc(game.name)}${elsewhere?' · '+esc(roomName(club,elsewhere.room.id)):''}</option>`;}).join('')}</select></label><label>Мастер<select name="masterId" required ${running?'disabled':''}><option value="">Выберите нанятого мастера</option>${data.staff.map(person=>{const elsewhere=bound.find(value=>value.room.id!==selectedRoom&&value.room.enabled!==false&&value.staff?.id===person.id);return `<option value="${esc(person.id)}" ${person.id===draft.masterId?'selected':''} ${elsewhere||person.training?'disabled':''}>${esc(person.name)} · ${money(person.wage)}/ч${elsewhere?' · '+esc(roomName(club,elsewhere.room.id)):person.training?' · на обучении':''}</option>`;}).join('')}</select><small class="campaign-selected-name" data-selected-master-name>${esc(data.staff.find(person=>person.id===draft.masterId)?.name??'')}</small></label>${data.adventures?.length?`<label>Приключение<select name="adventureId" required ${running?'disabled':''}><option value="">Выберите историю для этой системы</option>${adventures.map(adventure=>`<option value="${esc(adventure.adventureId)}" ${adventure.adventureId===draft.adventureId?'selected':''}>${esc(adventure.title)}</option>`).join('')}</select></label>`:''}<label>Длительность<select name="hours" ${running?'disabled':''}>${(running?[Number(draft.hours)]:allowedHours).map(hours=>`<option value="${hours}" ${Number(draft.hours)===hours?'selected':''}>${hours} ч · ${money(status().guestPricePerHour*hours)} с гостя</option>`).join('')}</select></label></div>${selectedAdventure?`<p class="campaign-room-note">${esc(selectedAdventure.description)}${selectedAdventure.sceneOutline?.length?` ${esc(selectedAdventure.sceneOutline.join(' → '))}`:''}</p>`:''}<div data-campaign-assignment-costs>${assignmentCosts(data)}</div>${!assignment.ok?`<p class="campaign-room-note">${esc(assignment.reason)}</p>`:''}<div class="campaign-room-actions"><button type="submit" class="campaign-primary" ${busy||running||!data.ownedGames.length||!data.staff.length?'disabled':''}>${running?'Игра уже идёт':'Назначить на комнату'}</button><button type="button" data-campaign-disable-room="${esc(selectedRoom)}" ${busy||running?'disabled':''}>Отключить комнату</button></div></form><div class="campaign-note-links"><button type="button" data-campaign-tab="shop">Выбрать новую игру →</button><button type="button" data-campaign-tab="team">Познакомиться с мастерами →</button></div>`;
  }

  function equipmentHTML(){return operationsHTML(getClub(),{busy,selectedEquipment,art:layoutObjectSVG});}

  function financeHTML(s){
    const g=s.goal,current=g?.current??{},labels={rooms:'Действующие комнаты',participations:'Посещений игр',rating:'Общий рейтинг',reserve:'Свободный резерв',directions:s.goal?.directionLabel??'Одновременно доступные системы'};
    const goalItems=Object.entries(labels).map(([key,label])=>{
      const value=Number(current[key]??0),target=Number(g?.[key]),met=Number.isFinite(target)&&value>=target;
      const display=key==='reserve'?money(value):key==='rating'?value.toFixed(2):value;
      return `<li><span>${label}<small class="campaign-goal-state">${met?'Выполнено':'Ещё не достигнуто'}</small></span><b>${display} <small>/ ${key==='reserve'?money(target):g?.[key]??'—'}</small></b></li>`;
    }).join('');
    const statement=financeBreakdown(getClub()),signed=value=>(value>0?'+':value<0?'−':'')+money(Math.abs(value));
    const cashHistory=`<details class="campaign-cash-statement"><summary>Куда уходят деньги за всё время</summary><p>Все денежные записи, включая покупки между партиями. Возвраты уменьшают соответствующий расход.</p><dl class="campaign-ledger">${[['Исходная касса до обустройства',statement.initial],['Оплата гостей, чаевые и продажи кафе',statement.receipts],['Зарплаты, содержание, уборка, ремонт и штрафы',statement.running],['Закупки продуктов с учётом возвратов',statement.stock],['Обустройство, библиотека, штат и обучение за вычетом продаж',statement.development],...(statement.other?[['Прочие записи кассы',statement.other]]:[]),['Общее изменение кассы',statement.change]].map(([label,value])=>`<div><dt>${label}</dt><dd>${signed(value)}</dd></div>`).join('')}</dl><p>Закупочная стоимость выданных порций: ${money(statement.issuedCost)}; списанных остатков: ${money(statement.writtenOffCost)}. Эти продукты уже оплачены при закупке и повторно из кассы не списываются.${statement.estimatedInventory?' Стоимость перенесённого старого запаса оценочная.':''}</p><small>Это движение денег. Оно не обещает будущую прибыль; обязательства по текущим работам показаны выше.</small></details>`;
    const plan=s.recoveryPlan;
    const ledger=s.ledger?.length?`<section class="campaign-history"><h3>Последние операции</h3><ol>${s.ledger.slice(-16).reverse().map(entry=>`<li><span>${esc(entry.text||entry.label||'Операция кассы')}</span><b class="${entry.amount<0?'is-expense':''}">${entry.amount>0?'+':''}${money(entry.amount)}</b></li>`).join('')}</ol></section>`:'';
    const recovery=plan?`<section class="campaign-recovery"><h3>${esc(plan.label||'Сократить расходы и сохранить клуб')}</h3><p>Этот план продаёт или переставляет имущество и сохраняет возможность вести хотя бы одну игру. Изменения произойдут только после подтверждения.</p><ul>${(plan.items??[]).map(item=>`<li><span>${esc(item.name)}</span><b>${item.refund?'+'+money(item.refund):item.cost?'−'+money(item.cost):'Перестановка'}</b></li>`).join('')}</ul><p class="campaign-plan-total"><span>Возврат ${money(plan.refund)} · покупки ${money(plan.cost)}</span><b>После плана: ${money(plan.balanceAfter)}</b></p><button type="button" data-campaign-liquidate="${esc(plan.id)}" ${busy?'disabled':''}>Рассмотреть и подтвердить план</button></section>`:'';
    const reserveNote=s.reserveDetails?.hours>0?`<p class="campaign-caution">Верхняя оценка расходов до ${esc(clockText(s.reserveDetails.through))}: зарплаты ${money(s.reserveDetails.wages)}, содержание и расходники ${money(s.reserveDetails.operating)}. Учтены текущие комнаты, смена и оставшиеся оплаченные работы; будущие продажи не предполагаются. Уже оплаченные покупки повторно не включаются.</p>`:'';
    const recoveryChoice=s.state==='recovery'&&!plan?`<section class="campaign-caution"><h3>Нужно выбрать, как сократить расходы</h3>${s.reserveDetails?.hours>0?'<p>Сначала завершите уже начатые работы или поставки: после них план имущества будет пересчитан. Содержание и включённая смена продолжают оплачиваться.</p><button type="button" data-campaign-tab="equipment">Оплаченные работы</button> <button type="button" data-campaign-tab="shop">Готовность комплектов</button>':'<p>План с сохранением всего текущего штата пока не найден. Можно отдельно завершить договор со свободным мастером: это освободит его место отдыха для продажи. Плата за найм не вернётся; долг и история клуба сохранятся. После изменения штата или имущества план будет пересчитан.</p><button type="button" data-campaign-tab="team">Рассмотреть состав команды</button>'}</section>`:'';
    const ending=s.state==='bankrupt'?`<section class="campaign-ending"><span class="campaign-eyebrow">История клуба завершена</span><h3>Клуб больше не может продолжать работу</h3><p>После расчётов не осталось допустимого плана погашения долга с сохранением действующей комнаты. История, отзывы и причины потерь остаются в этом сохранении.</p><button type="button" data-campaign-new ${busy?'disabled':''}>Начать новую кампанию…</button></section>`:s.state==='goal'?`<section class="campaign-ending campaign-success"><span class="campaign-eyebrow">Цель кампании достигнута</span><h3>Клуб нашёл свою компанию</h3><p>Можно продолжать обустраивать клуб, знакомиться с гостями и открывать новые комнаты.</p><button type="button" class="campaign-primary" data-campaign-continue ${busy?'disabled':''}>Продолжить свободную игру</button></section>`:'';
    return `<div class="campaign-tab-intro"><h3>Касса клуба</h3><p>Оплата за игру поступает после партии. Зарплата мастера и содержание остаются расходом независимо от отзыва.</p></div><dl class="campaign-ledger"><div><dt>В кассе</dt><dd>${money(s.cash)}</dd></div><div${s.debt?' class="campaign-negative"':''}><dt>Просроченный долг</dt><dd>${money(s.debt)}</dd></div><div><dt>Обязательства по начатым партиям</dt><dd>${money(s.obligations)}</dd></div><div><dt>Содержание клуба</dt><dd>${money(s.hourlyCosts)}/ч</dd></div><div><dt>Резерв на оставшиеся расходы без оплаты гостей</dt><dd>${money(s.reserve)}</dd></div></dl>${s.state==='debt'?'<p class="campaign-caution">Есть долг. Новые покупки и партии закрыты; дайте завершиться уже идущим играм, чтобы учесть возможную оплату гостей.</p>':''}${reserveNote}${s.state!=='bankrupt'?financialChoicesHTML(getClub()):''}${recovery}${recoveryChoice}${ending}<section class="campaign-goal"><h3>${g?.continued?'Свободное развитие':'К чему растёт клуб'}</h3><ul>${goalItems}</ul><p class="campaign-goal-note">Рейтинг учитывает все отзывы за всю историю клуба. Условия проверяются по точным значениям до округления. Системы считаются по действующим комнатам с назначенными отдельными комплектами и мастерами.</p></section>${cashHistory}${ledger}`;
  }

  function renderDialog({resetScroll=false}={}){
    const scroll=resetScroll?0:dialog.querySelector('.campaign-dialog-body')?.scrollTop??0;
    const wasReview=Boolean(dialog.querySelector('[data-campaign-review]'));
    const s=status(),data=market(),content=pending?`<section class="campaign-review" data-campaign-review tabindex="-1"><h3>Проверить перед подтверждением</h3><p>${esc(pending.detail)}</p>${pending.previewError?`<p class="campaign-caution">${esc(pending.previewError)} Смета ниже использует нынешний состав клуба.</p>`:''}${pending.quote?investmentHTML(pending.quote,pending.next):''}</section>`:tab==='shop'?libraryHTML(data):tab==='team'?teamHTML(data):tab==='rooms'?roomsHTML(data):tab==='equipment'?equipmentHTML(data):financeHTML(s);
    dialog.innerHTML=`<div class="campaign-paper"><header class="campaign-dialog-heading"><div><span class="campaign-eyebrow">Дела клуба</span><h2 id="campaign-title">${titleFor[tab]}</h2></div><div class="campaign-dialog-cash"><small>В кассе</small><b>${money(s.cash)}</b></div><button type="button" class="campaign-close" data-campaign-close aria-label="Закрыть дела клуба">×</button></header><nav class="campaign-tabs" aria-label="Разделы дел клуба">${Object.entries({shop:'Игры',team:'Мастера',rooms:'Комнаты',equipment:'Сервис',finance:'Касса'}).map(([key,title])=>`<button type="button" data-campaign-tab="${key}" aria-current="${tab===key?'page':'false'}">${title}</button>`).join('')}</nav><div class="campaign-dialog-body">${content}</div><footer class="campaign-dialog-footer"><p role="status" aria-live="polite">${esc(message||'')}</p>${pending?`<div class="campaign-confirmation"><div><button type="button" data-campaign-confirm-cancel ${busy?'disabled':''}>Отмена</button><button type="button" data-campaign-confirm class="campaign-primary" ${busy?'disabled':''}>${busy?'Сохраняем…':esc(pending.label||'Подтвердить')}</button></div></div>`:''}</footer></div>`;
    dialog.querySelector('.campaign-dialog-body').scrollTop=pending&&!wasReview?0:scroll;
    if(pending&&!wasReview)dialog.querySelector('[data-campaign-review]')?.focus({preventScroll:true});
  }

  function render(){
    const s=status();
    headerWallet.classList.toggle('is-debt',s.debt>0);headerWallet.innerHTML=`<small>${s.debt?'Долг':'Касса'}</small><b>${money(s.debt||s.cash)}</b>`;headerWallet.setAttribute('aria-label',`${s.debt?'Долг':'Касса'}: ${money(s.debt||s.cash)}`);
    if(toggle)toggle.hidden=false;
    if(statusNode){statusNode.hidden=false;statusNode.innerHTML=`<span class="campaign-wallet"><small>Касса</small><b>${money(s.cash)}</b></span>${s.debt?`<span class="campaign-debt"><small>Долг</small><b>${money(s.debt)}</b></span>`:''}<span class="campaign-costs"><small>Расходы</small><b>${money(s.hourlyCosts)}/ч</b></span>`;}
    if(dialog.open)renderDialog();
    if(['recovery','bankrupt','goal'].includes(s.state)&&announcedState!==s.state){announcedState=s.state;open('finance');}
    else if(!['recovery','bankrupt','goal'].includes(s.state))announcedState=null;
  }

  function open(next='shop',roomId=null){tab=titleFor[next]?next:'shop';pending=null;message='';if(roomId)selectedRoom=roomId;if(tab==='rooms')resetDraft();renderDialog({resetScroll:true});if(!dialog.open)dialog.showModal();dialog.querySelector('[data-campaign-close]')?.focus();}
  function close(){dialog.close();pending=null;message='';}

  async function act(action){
    if(busy)return;busy=true;message='Сохраняем…';renderDialog();
    try{const result=await onAction(action);if(result?.ok){pending=null;message=result.reason||result.message||'Готово. Изменение сохранено.';draft=null;await refresh(result);render();}else message=result?.reason||'Не удалось выполнить действие.';}
    catch{message='Не удалось выполнить действие. Попробуйте ещё раз.';}
    finally{busy=false;if(dialog.open)renderDialog();}
  }

  listen(toggle,'click',()=>open());
  listen(root,'click',event=>{
    const manage=event.target.closest('[data-manage-room]');if(manage){event.preventDefault();event.stopPropagation();open('rooms',manage.dataset.manageRoom);}
    else if(!root.classList.contains('is-building')&&!event.target.closest('.map-chair,.master-seat,.layout-room-plaque')){const object=event.target.closest('[data-object]');if(object&&(market().equipment??[]).some(item=>item.id===object.dataset.object)){selectedEquipment=object.dataset.object;open('equipment');dialog.querySelector(`[data-campaign-equipment-row="${CSS.escape(selectedEquipment)}"]`)?.scrollIntoView({block:'nearest'});}}
  });
  listen(dialog,'click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-campaign-close')){close();return;}
    if(busy)return;
    const purchases=button.matches('[data-campaign-buy],[data-campaign-buy-adventure],[data-campaign-hire],[data-campaign-restock],[data-campaign-hire-service]');
    if(purchases){const click={time:event.timeStamp,x:event.clientX,y:event.clientY};if(lastPointerPurchase&&click.time-lastPointerPurchase.time<500&&Math.hypot(click.x-lastPointerPurchase.x,click.y-lastPointerPurchase.y)<4)return;lastPointerPurchase=click;}
    if(button.dataset.ops){const request=operationRequest(button,dialog,getClub());if(request.error){message=request.error;renderDialog();}else if(request.confirmation){confirmInvestment(request.action,request.confirmation,request.label);}else act({...request.action,transactionId:transactionId()});return;}
    if(button.dataset.campaignTab){tab=button.dataset.campaignTab;pending=null;message='';if(tab==='rooms')resetDraft();renderDialog({resetScroll:true});}
    else if(button.hasAttribute('data-campaign-hire-service'))confirmInvestment({type:'hireServiceStaff'},`Пригласить помощника за ${money(market().serviceStaff.hireCost)}? После включения смены зарплата ${money(market().serviceStaff.hourlyWage)}/ч начисляется и в простой.`, 'Пригласить помощника',{cost:market().serviceStaff.hireCost});
    else if(button.hasAttribute('data-campaign-wait-preparation'))act({type:'waitForPreparation',transactionId:transactionId()});
    else if(button.hasAttribute('data-campaign-wait-operation')){const club=getClub(),times=[...(club.operations?.tasks??[]).filter(t=>['active','queued'].includes(t.state)).map(t=>t.dueAt),...(club.inventory?.orders??[]).filter(o=>o.state==='ordered').map(o=>o.dueAt)].filter(t=>Number.isFinite(t)&&t>club.clock),dueAt=Math.min(...times);if(Number.isFinite(dueAt)){pending={action:{type:'waitForOperation',transactionId:transactionId()},detail:`Дождаться ближайшей оплаченной работы или поставки к ${clockText(dueAt)}? Осталось ${Math.ceil((dueAt-club.clock)*60)} мин. Текущий расход всего клуба — ${money(status().hourlyCosts)}/ч; завершения игр и важные предупреждения будут обработаны общими часами.`,label:'Дождаться готовности'};renderDialog();}}

    else if(button.dataset.campaignRepairKit){const state=kitStatus(getClub(),button.dataset.campaignRepairKit);confirmInvestment({type:'repairKit',kitId:state.id},`Обслужить экземпляр за ${money(state.repairQuote.cost)}? Он будет недоступен 30 игровых минут; состояние восстановится до 100%.`, 'Оплатить обслуживание',{cost:state.repairQuote.cost});}
    else if(button.dataset.campaignSellKit){const state=kitStatus(getClub(),button.dataset.campaignSellKit);confirmInvestment({type:'sellGame',kitId:state.id,acceptUnassign:true},`Продать этот экземпляр за ${money(state.saleValue)}? ${assignments().some(a=>a.game?.id===state.id)?'Пустая комната с этим назначением отключится до выбора другого комплекта. ':''}Купленные сценарии останутся в библиотеке. Цена учитывает износ и составляет 60% оставшейся стоимости.`, 'Продать экземпляр',{refund:state.saleValue});}
    else if(button.dataset.campaignBuyAdventure){const item=market().adventures.find(a=>a.adventureId===button.dataset.campaignBuyAdventure);confirmInvestment({type:'buyAdventure',adventureId:item.adventureId},`Купить приключение «${item.title}» за ${money(item.price)}? Покупка не запускает игру и не гарантирует оплату гостей.`, 'Купить приключение',{cost:item.price});}
    else if(button.dataset.campaignBuy){const item=market().games.find(g=>g.systemId===button.dataset.campaignBuy);confirmInvestment({type:'purchaseGame',systemId:item.systemId},`Купить комплект «${item.name}» за ${money(item.price)}? Для игры понадобится знающий систему мастер и подходящая компания.`, 'Купить комплект',{cost:item.price});}
    else if(button.dataset.campaignHire){const person=market().candidates.find(p=>p.candidateId===button.dataset.campaignHire);confirmInvestment({type:'hireMaster',candidateId:person.candidateId},`${person.returning?'Вернуть':'Пригласить'} мастера ${person.name}: разово ${money(person.hireCost)}, затем ${money(person.wage)} за каждый час проведённой партии, даже при отказе гостей платить. Простой мастера не оплачивается. При увольнении плата за приглашение не возвращается.`, 'Подтвердить приглашение',{cost:person.hireCost});}
    else if(button.dataset.campaignTrain){const person=market().staff.find(value=>value.id===button.dataset.campaignTrain),select=dialog.querySelector(`[data-campaign-training-for="${CSS.escape(person.id)}"]`),option=trainingOptions(market(),person).find(value=>value.systemId===select?.value);if(option){confirmInvestment({type:'trainMaster',masterId:person.id,systemId:option.systemId},`${person.name}: ${option.name}. Стоимость ${money(option.price)}, обучение займёт ${option.hours} игровых часов. В это время мастер недоступен для партий и не отдыхает.`, 'Оплатить обучение',{cost:option.price});}}
    else if(button.dataset.campaignRestock)act({type:'restock',itemId:button.dataset.campaignRestock,portions:20,transactionId:transactionId()});
    else if(button.dataset.campaignDismiss){const person=market().staff.find(value=>value.id===button.dataset.campaignDismiss);pending={action:{type:'dismissMaster',masterId:person.id,acceptTrainingLoss:Boolean(person.training)},detail:`Завершить договор с мастером ${person.name}? ${person.dismissal?.warning??'Плата за приглашение не возвращается.'}`,label:'Завершить договор'};renderDialog();}
    else if(button.dataset.campaignDisableRoom){const roomId=button.dataset.campaignDisableRoom,seated=getClub().guests.some(g=>g.roomId===roomId);confirmInvestment({type:'disableRoom',roomId},`Отключить «${roomName(getClub(),roomId)}»? Она перестанет принимать гостей и оплачивать содержание зала. Мебель остаётся; открыть зал снова можно через назначение. ${seated?'Сидящие гости вернутся к стойке. ':''}Приборы и включённая смена помощника оплачиваются отдельно.`, 'Отключить комнату');}
    else if(button.dataset.campaignLiquidate){pending={action:{type:'liquidate',planId:button.dataset.campaignLiquidate,transactionId:transactionId()},detail:'Применить показанный план продажи и восстановления? Состав имущества изменится, возврат пойдёт на погашение долга.',label:'Применить план'};renderDialog();}
    else if(button.hasAttribute('data-campaign-new')){pending={action:{type:'newCampaign'},detail:'Начать отдельную новую кампанию? Текущее прохождение завершено; это не погашает его долг.',label:'Начать новую кампанию'};renderDialog();}
    else if(button.hasAttribute('data-campaign-continue'))act({type:'continueSandbox'});
    else if(button.hasAttribute('data-campaign-wait')){pending={action:{type:'advanceIdle',hours:1},detail:`Подождать один игровой час? Содержание всего клуба сейчас составляет ${money(status().hourlyCosts)} за час.`,label:'Подождать 1 час'};renderDialog();}
    else if(button.hasAttribute('data-campaign-confirm-cancel')){pending=null;renderDialog();}
    else if(button.hasAttribute('data-campaign-confirm')&&pending)act(pending.action);
  });
  listen(dialog,'change',event=>{
    if(event.target.hasAttribute('data-ops-helper')){act({type:'assignServiceStaff',itemId:event.target.value||null,transactionId:transactionId()});return;}
    if(event.target.hasAttribute('data-ops-open')){act({type:'setServiceOpen',itemId:event.target.dataset.opsOpen,open:event.target.checked,transactionId:transactionId()});return;}
    if(event.target.hasAttribute('data-campaign-service-shift')){act({type:'setServiceShift',active:event.target.checked});return;}
    if(event.target.hasAttribute('data-campaign-equipment-enabled')){act({type:'setEquipment',itemId:event.target.dataset.campaignEquipmentEnabled,enabled:event.target.checked});return;}
    if(event.target.hasAttribute('data-campaign-equipment-auto')){const enabled=event.target.checked,itemId=event.target.dataset.campaignEquipmentAuto;if(enabled){pending={action:{type:'setEquipment',itemId,autoRefill:true},detail:`Разрешить автозаказы до ${getClub().operations?.servicePolicies?.[itemId]?.maxOrder??10} порций? Этот прибор сможет заказывать, пока общий расход автозакупок клуба за 8 часов не превышает ${money(getClub().operations?.servicePolicies?.[itemId]?.budget??200)}. Защищённый резерв и свободное хранение проверяются отдельно; доставка занимает час.`,label:'Включить пополнение'};renderDialog();}else act({type:'setEquipment',itemId,autoRefill:false});return;}
    if(event.target.hasAttribute('data-campaign-room')){selectedRoom=event.target.value;resetDraft();message='';renderDialog();return;}
    if(event.target.name==='masterId'){const name=dialog.querySelector('[data-selected-master-name]');if(name)name.textContent=market().staff.find(person=>person.id===event.target.value)?.name??'';}
    if(event.target.closest('[data-campaign-assignment]')){draft[event.target.name]=event.target.name==='hours'?Number(event.target.value):event.target.value;if(['gameId','adventureId'].includes(event.target.name)){if(event.target.name==='gameId')draft.adventureId='';renderDialog();return;}dialog.querySelector('[data-campaign-assignment-costs]').innerHTML=assignmentCosts(market());}
  });
  listen(dialog,'submit',event=>{if(!event.target.matches('[data-campaign-assignment]'))return;event.preventDefault();act({type:'assignRoom',roomId:selectedRoom,...draft});});
  listen(dialog,'cancel',event=>{event.preventDefault();if(pending){pending=null;renderDialog();}else close();});
  render();
  return{render,tick:render,open,close,destroy(){listeners.forEach(remove=>remove());dialog.remove();headerWallet.remove();}};
}
