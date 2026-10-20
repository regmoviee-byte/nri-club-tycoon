import {GAME_SHOP,ECONOMY,gameProduct,availableMasterCandidates,commerceItems,PRODUCTS} from '../data/commerce.js';
import {SESSIONS} from '../data/club.js';
import {SYSTEMS} from '../data/systems.js';
import {campaignProgress,readyRooms,masterTrainingOffer,configureRoom} from './campaign.js';
import {staffRoomStatus,staffSeatForMaster,staffCanRest} from './staff-room.js';
import {zoneCleaning} from './operations.js';
import {hourlyCosts,obligations,reserveRequired,reserveEstimate,sessionForecast} from './finances.js';
import {masterPreferences,sessionDurationRange} from './preferences.js';
import {kitStatus,roomPreparation} from './kit-lifecycle.js';
import {libraryStorageStatus} from './layout-club.js';
import {SERVICE_STAFF} from './service-staff.js';

const normalizeStaff=master=>{
 const fatigue=master.fatigue??0;
 const p=masterPreferences(master);
 const trainingOptions=[...GAME_SHOP.filter(g=>!master.known.includes(g.id)).map(g=>({systemId:g.id,name:g.name,price:[600,1000,1600][g.complexity-1],hours:[8,12,16][g.complexity-1]})),{systemId:'teaching',name:'Объяснять правила новичкам',price:1200,hours:12},{systemId:'turns',name:'Помогать каждому участвовать',price:1200,hours:12}].filter(option=>masterTrainingOffer(master,option.systemId).ok);
 return {...master,fatigueValue:fatigue,systems:master.known,wage:master.hourlyWage,hireCost:master.fee,fatigue:fatigue<=4?'Отдохнул перед игрой':fatigue<=8?'Устал после игр; пауза поможет':'Сильно устал; стоит передать стол коллеге',teachingWillingness:p.wantsTeaching?'Готов объяснять правила':'Предпочитает подготовленных игроков',expectations:p.teachingCapacity?`Может одновременно вводить в игру ${p.teachingCapacity} новичков`:'Рассчитывает на знакомую с правилами компанию',trainingOptions};
};
export function campaignMarket(club){
 const candidates=availableMasterCandidates(club).map(m=>({...normalizeStaff(m),candidateId:m.id,returning:(club.personnelArchive??[]).some(person=>person.id===m.id)}));
 return {
 staffRoom:staffRoomStatus(club),
 libraryStorage:libraryStorageStatus(club),
 serviceStaff:{hired:!!club.serviceStaff?.length,active:club.serviceStaff?.some(s=>s.onShift)??false,hireCost:SERVICE_STAFF.fee,hourlyWage:club.serviceStaff?.[0]?.hourlyWage??SERVICE_STAFF.hourlyWage},
 games:GAME_SHOP.map(g=>({...g,systemId:g.id,description:SYSTEMS[g.id]?.about,price:club.library.copies.some(k=>k.systemId===g.id)?Math.round(g.price*.6):g.price})),
 ownedGames:club.library.copies.map(k=>({...k,name:gameProduct(k.systemId).name,state:kitStatus(club,k.id),assignedRoomIds:club.rooms.filter(r=>r.kitId===k.id).map(r=>r.id)})),
 staff:club.staff.map(m=>({...normalizeStaff(m),restSeat:staffSeatForMaster(club,m.id),canRest:staffCanRest(club,m.id),dismissal:{busy:club.rooms.some(r=>r.status==='running'&&r.masterId===m.id),losesTraining:Boolean(m.training),trainingCost:m.training?.cost??null,warning:m.training?'Обучение будет прервано без возврата оплаты. Полученные ранее навыки сохранятся.':'Плата за приглашение не возвращается. Долги клуба сохраняются.'},training:m.training?{...m.training,label:m.training.systemId==='teaching'?'Объяснение правил':m.training.systemId==='turns'?'Работа с группой':SYSTEMS[m.training.systemId]?.name,remainingHours:Math.max(0,m.training.endsAt-club.clock)}:null})),candidates,
 adventures:SESSIONS.filter(s=>club.library.copies.some(k=>k.systemId===s.systemId)).map(s=>({...structuredClone(s),adventureId:s.id,systemId:s.systemId,title:s.title,description:s.premise,durationRange:sessionDurationRange(s),price:s.minutes<=180?300:s.minutes<=240?500:700,owned:club.library.adventures.includes(s.id)})),
 equipment:commerceItems(club.layout).map(item=>{const product=PRODUCTS[item.type],original=club.layout.objects.find(o=>o.id===item.id);return {...item,kind:original.kind,name:product.name,hourlyCost:product.hourly??0,service:product.service,unitCost:product.unitCost??0,salePrice:product.salePrice??0,locked:club.rooms.some(r=>r.status==='running'&&r.layout.items.includes(item.id))};}),
 };
}
export function campaignStatus(club){
 const costs=hourlyCosts(club),progress=campaignProgress(club),plan=club.campaign.recoveryPlan,estimate=reserveEstimate(club);
 return {balance:club.finance.cash,cash:Math.max(0,club.finance.cash),debt:Math.max(0,-club.finance.cash),obligations:obligations(club),reserve:estimate.total,reserveDetails:{total:estimate.total,through:estimate.through,hours:estimate.hours,wages:estimate.wages,operating:estimate.operating,upperBound:true},hourlyCosts:Object.values(costs).reduce((sum,cost)=>sum+cost,0),guestPricePerHour:ECONOMY.guestHour,
 state:club.campaign.status==='restructure'?'recovery':club.campaign.status==='bankrupt'?'bankrupt':club.campaign.status==='debt'?'debt':club.campaign.won&&!club.campaign.continued?'goal':'active',
 goal:{...club.campaign.goal,directions:club.campaign.goal.systems??club.campaign.goal.genres,current:{...progress,directions:progress.systems},directionLabel:'Одновременно доступные системы',continued:club.campaign.continued},
 recoveryPlan:plan?{...plan,id:plan.id??'recovery',balanceAfter:plan.balanceAfter??plan.cashAfter??plan.cash,items:plan.items??plan.actions??[]}:null,ledger:club.finance.ledger};
}
export function roomAssignment(club,id){
 const room=club.rooms.find(r=>r.id===id);if(!room)return{ok:false,reason:'Комната не найдена.'};
 const game=club.library.copies.find(k=>k.id===room.kitId),staff=club.staff.find(m=>m.id===room.masterId),preparation=roomPreparation(club,id),state=kitStatus(club,room.kitId),running=room.status==='running';
 const unavailable=!running&&(!preparation.ready||!state.ok);
 return {ok:room.operational&&!zoneCleaning(club,id)&&!unavailable,game:game?{...game,name:gameProduct(game.systemId).name,state}:null,preparation,staff:staff?normalizeStaff(staff):null,master:room.master,session:room.session,hours:room.hours??2,durationRange:sessionDurationRange(room.run?.room?.session??room.session??{}),adventureId:room.adventureId,reason:(zoneCleaning(club,id)?'В комнате идёт уборка. Дождитесь её окончания.':'')||room.layoutErrors?.map(e=>e.text).join(' ')||(!room.enabled?'Комната отключена. Назначьте игру и мастера, чтобы снова открыть её.':'')||(unavailable?(preparation.reason||state.reason):'')};
}
export function startQuote(club,id,settings={}){
 if(club.finance.cash<0||club.campaign.status==='bankrupt')return{ok:false,reason:'При долге нельзя начинать новые игры.'};
 const room=club.rooms.find(r=>r.id===id);if(!room)return{ok:false,reason:'Комната не найдена.'};
 if(zoneCleaning(club,id))return{ok:false,reason:'В комнате идёт уборка. Дождитесь её окончания.'};
 const hasSettings=Object.keys(settings).length>0;
 // An unchanged-room preview only replaces that room's status/run below. Keep
 // the immutable history shared rather than copying it once per rendered room.
 // Reconfiguration still needs an isolated full draft because it synchronizes
 // assignments, equipment and the waiting queue.
 const draft=hasSettings?structuredClone(club):{...club,rooms:club.rooms.map(r=>({...r}))};
 if(hasSettings){const configured=configureRoom(draft,id,{kitId:settings.gameId??settings.kitId,masterId:settings.masterId,adventureId:settings.adventureId,hours:settings.hours,enabled:true});if(!configured.ok)return configured;}
 const candidate=draft.rooms.find(r=>r.id===id);if(!candidate?.operational)return{ok:false,reason:candidate?.layoutErrors?.map(e=>e.text).join(' ')||'Сначала подготовьте комнату.'};
 const preparation=roomPreparation(draft,id),kit=kitStatus(draft,candidate.kitId);
 if(candidate.status!=='running'&&!preparation.ready)return{ok:false,reason:preparation.reason};
 if(candidate.status!=='running'&&!kit.ok)return{ok:false,reason:kit.reason};
 const ready=readyRooms(draft).some(r=>r.id===id);
 const hours=candidate.hours,forecast=sessionForecast(draft,id);
 if(candidate.status!=='running'){candidate.status='running';candidate.run={endsAt:club.clock+hours,guests:Array.from({length:4},()=>({})),contract:{wageTotal:hours*candidate.master.hourlyWage}};}
 const reserve=reserveRequired(draft);return {ok:true,reserve,cash:club.finance.cash,risky:club.finance.cash<reserve,projectedExpense:reserve-reserveRequired(club),...forecast,wages:forecast.masterCost,hours,adventureId:candidate.adventureId,ready};
}
