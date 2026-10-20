import {clubPrestige,prestigeNeeded} from './upgrades.js';
import {receptionStatus} from './reception-area.js';
import {createClub as createPrototype,decodeClub as decodePrototype,rateGuest as rateLegacyGuest,freeze,clockText,clubRating,lockedGuest} from './lifecycle.js';
import {actorById,roomById,roomOccupants,answerText} from './club.js';
import {hash,generateVisitor} from './generator.js';
import {SESSIONS,HABITS,QUESTIONS} from '../data/club.js';
import {IDENTITIES} from '../data/identities.js';
import {visualFor} from '../data/visuals.js';
import {PRODUCTS,ECONOMY,gameProduct,masterCandidate,availableMasterCandidates,commerceItems} from '../data/commerce.js';
import {starterLayout,inspectRooms,ownedCells,footprint,physical,edgeKey,adjacentCells,canPlace,addItem,moveItem,setWall,addPlot,buildRoomTemplate,validateLayout,cellKey,convertRecoveryLayout} from './campaign-layout.js';
import {makePreferences,makeLegacyPreferences,sessionProgram,sessionDurationRange,sessionHours,masterPreferences} from './preferences.js';
import {CAMPAIGN_RATING_VERSION,rateCampaignGuest} from './campaign-rating.js';
import {recordMoney,restock,reserveRequired,obligations,hourlyCosts,serviceInterval,chargeInterval,settleRun,sessionForecast} from './finances.js';
import {findRecoveryPlan,applyRecoveryPlan,canProveInsolvent} from './solvency.js';
import {hireServiceStaff,setServiceShift,validateServiceStaff} from './service-staff.js';
import {layoutForRooms,validateOccupiedLayout,libraryStorageStatus} from './layout-club.js';
import {build as buildPhysical} from './campaign-construction.js';
import {staffRoomStatus,staffSeatForMaster,staffCanRest,canHireStaff,validateStaffCapacity,retireStaffRoomLegacyCredit} from './staff-room.js';
import {ensureOperations,validateOperations,executeOperationsAction,zoneCleaning,equipmentRunning} from './operations.js';
import {advanceEventClock} from './event-clock.js';
import {adoptGuestWaiting,syncGuestWaiting,trackGuestWaiting,guestWaitingSummary,validateGuestWaiting} from './guest-waiting.js';
import {ensureKits,validateKits,kitStatus,kitSalvage,roomPreparation,prepareAfterRun,kitDeadlines,repairKit} from './kit-lifecycle.js';
import {ensureGuestRegistry,hasGuestIdentity,returningGuest,registerGuestVisit,recordGuestOutcome,recordGuestDeparture,validateGuestRegistry} from './guests-history.js';
import {ensureGuestFlow,validateGuestFlow,accrueGuestFlow,guestFlowRelease,issueGuestCredit,guestFlowStatus} from './guest-flow.js';
export {clockText,clubRating,lockedGuest,reserveRequired,obligations,hourlyCosts,restock};
export {guestFlowStatus};
export const CLUB_KEY='nri-club-tycoon:club:v4';
export const runningRooms=club=>club.rooms.filter(r=>r.status==='running');
export const openRooms=club=>club.rooms.filter(r=>r.operational&&r.status==='seating');
export const totalGuestSeats=club=>club.rooms.filter(r=>r.operational||r.status==='running').length*4;
export const targetGuestCount=club=>Math.ceil(totalGuestSeats(club)*1.5);
export const waitingGuests=club=>club.guests.filter(g=>!g.roomId);
export const readyRooms=club=>openRooms(club).filter(r=>!zoneCleaning(club,r.id)&&roomPreparation(club,r.id).ready&&kitStatus(club,r.kitId).ok&&roomOccupants(club,r.id).length===4);
export const clubReady=club=>runningRooms(club).length>0;
const money=club=>club.finance.cash;
const fail=reason=>({ok:false,reason});
const resourceFree=(club,key,id,except)=>!club.rooms.some(r=>r.id!==except&&r.enabled!==false&&r[key]===id);
const equipRoom=(club,region)=>commerceItems(club.layout).filter(i=>region.items.includes(i.id));
const getMaster=(club,id)=>club.staff.find(m=>m.id===id);
const getKit=(club,id)=>club.library.copies.find(k=>k.id===id);
const adventureFor=(club,system,id)=>SESSIONS.find(s=>s.id===id&&s.systemId===system&&club.library.adventures.includes(s.id))??SESSIONS.find(s=>s.systemId===system&&club.library.adventures.includes(s.id));

export function syncRooms(club){
 const regions=inspectRooms(club.layout),next=[];
 for(const region of regions){
  let room=club.rooms.find(r=>r.id===region.id)??(region.tableId?club.rooms.find(r=>r.tableId===region.tableId):null);
  if(room)room.tableId=region.tableId;
  if(!room)room={id:region.id,tableId:region.tableId,number:club.layout.rooms.find(z=>z.id===region.id)?.number??club.nextRoomNumber++,capacity:4,turn:0,status:'closed',run:null,enabled:true,masterId:null,kitId:null,adventureId:null,hours:2};
  room.layout=region;room.chairIds=region.chairIds;room.masterChairId=region.masterChairId;room.layoutErrors=[...region.errors];
  if(room.status==='running'){room.operational=true;next.push(room);continue;}
  if(!getKit(club,room.kitId))room.kitId=null;if(!getMaster(club,room.masterId))room.masterId=null;
  if(region.valid&&room.enabled){
   if(!room.masterId){const master=club.staff.find(m=>!m.training&&resourceFree({...club,rooms:[...club.rooms,...next]},'masterId',m.id,room.id));if(master)room.masterId=master.id;}
   if(!room.kitId){const master=getMaster(club,room.masterId),kit=club.library.copies.find(k=>master?.known.includes(k.systemId)&&resourceFree({...club,rooms:[...club.rooms,...next]},'kitId',k.id,room.id));if(kit)room.kitId=kit.id;}
  }
  const kit=getKit(club,room.kitId),master=getMaster(club,room.masterId),adventure=kit?adventureFor(club,kit.systemId,room.adventureId):null;
  if(!master)room.layoutErrors.push({text:'Назначьте нанятого мастера.',x:region.cells[0].split(',').map(Number)[0],y:region.cells[0].split(',').map(Number)[1]});
  if(!kit||!adventure)room.layoutErrors.push({text:'Купите и назначьте игру.',x:0,y:0});
  if(master?.training)room.layoutErrors.push({text:'Мастер ещё учится.',x:0,y:0});
  if(master&&kit&&!master.known.includes(kit.systemId))room.layoutErrors.push({text:'Мастер пока не знает эту игру.',x:0,y:0});
  room.master=master?masterPreferences(structuredClone(master)):null;room.adventureId=adventure?.id??null;
  room.hours=adventure?sessionHours(adventure):2;
  room.session=adventure?structuredClone(adventure):null;
  room.program=adventure?sessionProgram(adventure):null;
  room.operational=room.enabled&&room.layoutErrors.length===0;room.status=room.operational?'seating':'closed';room.reviewAt=club.clock;
  if(!room.operational)for(const g of roomOccupants(club,room.id)){g.roomId=null;g.seat=null;}
  next.push(room);
 }
 for(const g of club.guests)if(g.roomId&&!next.some(r=>r.id===g.roomId)){g.roomId=null;g.seat=null;}
 club.rooms=next;return next;
}
export function makeGuest(club,{opening=false}={}){
 const arrival=club.arrivals++,systems=new Set(club.library.copies.map(k=>k.systemId)),genres=new Set(SESSIONS.filter(s=>systems.has(s.systemId)&&club.library.adventures.includes(s.id)).flatMap(s=>s.genres));
 let profile,index=0;const advertised=opening&&arrival<4;
 do{profile=generateVisitor(club.seed+'|campaign-arrivals|'+arrival,index++);}while(index<200&&(profile.format.id==='solo'||advertised&&!genres.has(profile.genres[0].id)));
 const offset=hash(club.seed+'|cast')%IDENTITIES.length,target=targetGuestCount(club),older=club.guests.filter(g=>g.identity.age>40).length,middle=club.guests.filter(g=>g.identity.age>40&&g.identity.age<60).length,senior=club.guests.filter(g=>g.identity.age>=60).length;let identity;
 const ageAllowed=i=>i.age<=40||older<Math.max(1,Math.floor(target*.2))&&(i.age<60?middle<Math.max(1,Math.floor(target/10)):senior<Math.max(1,Math.floor(target/30)));
 const returned=returningGuest(club,arrival,{opening,identityAllowed:ageAllowed});if(returned)return registerGuestVisit(club,returned);
 for(let i=0;i<IDENTITIES.length;i++){const candidate=IDENTITIES[(offset+arrival+i)%IDENTITIES.length];if(ageAllowed(candidate)&&!hasGuestIdentity(club,candidate.id)&&!club.guests.some(g=>g.identity.id===candidate.id)){identity=structuredClone(candidate);break;}}
 if(!identity){const pool=IDENTITIES.filter(ageAllowed);identity=structuredClone(pool[arrival%pool.length]);identity.id='arrival-identity-'+arrival;identity.name=identity.name+' '+String.fromCharCode(1040+arrival%32)+'.';identity.portrait=visualFor(identity.id,identity.age,identity.grammar,arrival);}
 profile.name=identity.name;profile.age=identity.age;const guest={id:profile.id+'-'+arrival,profile,identity,habit:structuredClone(HABITS[hash(profile.id)%4]),roomId:null,seat:null,asked:[],storyIndex:0,dialogue:[],dialogueVersion:2,lastAnswer:null};
 const low=2+hash(guest.id+'|length')%4,budget=opening?4+arrival%3:2+hash(guest.id+'|availability')%9;
 guest.schedule={arrivalAt:club.clock,leaveAt:club.clock+budget,preferred:opening&&arrival<4?[2,3]:[low,Math.min(6,low+hash(guest.id+'|range')%2)]};
 const categories=['game','master','company','duration'].toSorted((a,b)=>hash(guest.id+'|weight|'+b)-hash(guest.id+'|weight|'+a));guest.weights=Object.fromEntries(categories.map((k,i)=>[k,4-i]));
 const names={game:'сама история',master:'как мастер ведёт игру',company:'люди за столом',duration:'чтобы хватило времени'};guest.ratingPriority=`Главное для меня — ${names[categories[0]]}. Ещё важно: ${names[categories[1]]}.`;
 guest.preferences=makePreferences(club.seed,guest);guest.avoidGenres=guest.preferences.avoidGenres??[];
 if(opening&&arrival<4){guest.preferences.rulesPolicy='announced';guest.preferences.learning='table';guest.preferences.knowledge.fate=arrival;guest.preferences.tone='mixed';guest.preferences.stakes='safe';if(arrival===3)guest.preferences.giveHelp='asked';}
 return registerGuestVisit(club,guest);
}
export function replenish(club,{removeExpired=false,opening=false,arrivals=false,completed=false}={}){
 const flow=ensureGuestFlow(club);
 club.receptionAway??=[];
 if(removeExpired){
  for(const guest of club.guests)if(!lockedGuest(club,guest)&&guest.schedule.leaveAt<=club.clock)recordGuestDeparture(club,guest,'expired');
  club.guests=club.guests.filter(g=>lockedGuest(club,g)||g.schedule.leaveAt>club.clock);
 }
 const target=targetGuestCount(club);
 for(const guest of club.receptionAway)if(guest.schedule.leaveAt<=club.clock)recordGuestDeparture(club,guest,'expired');
 club.receptionAway=club.receptionAway.filter(g=>g.schedule.leaveAt>club.clock);
 const receptionReady=receptionStatus(club).ready;
 // Previously admitted people remain finite people, not new generated visits.
 while(receptionReady&&club.guests.length<target&&club.receptionAway.length)club.guests.push(club.receptionAway.shift());
 if(opening&&!flow.openingIssued){
  while(receptionReady&&club.guests.length<target)club.guests.push(makeGuest(club,{opening:true}));
  flow.openingIssued=true;
 }
 let available=arrivals?guestFlowRelease(club,{completed}):0;
 while(receptionReady&&club.guests.length<target&&available>0){
  if(!issueGuestCredit(club))break;club.guests.push(makeGuest(club));available--;
 }
 // Capacity changes never silently discard a waiting person or their conversation.
 if(!actorById(club,club.selectedId))club.selectedId=waitingGuests(club)[0]?.id??club.guests[0]?.id??null;
 syncGuestWaiting(club);return club.guests;
}
export function createCampaign(seed){
 const club={version:7,seed:String(seed),clock:12,phase:'placing',drag:null,rooms:[],guests:[],selectedId:null,arrivals:0,step:0,nextRoomNumber:1,layout:starterLayout(),library:{copies:[{id:'kit-1',systemId:'fate',price:900}],adventures:['dark'],nextId:2},staff:[masterCandidate(0)],personnelArchive:[],staffRoomLegacyIds:[],serviceStaff:[],finance:{cash:ECONOMY.initialBudget,ledger:[],nextId:1,settledRuns:[],serviceIds:[]},activity:{},rating:{sum:0,count:0},reviewIds:[],departures:[],lastReport:null,campaign:{won:false,wonAt:null,status:'playing',goal:{rooms:5,participations:100,rating:8,reserve:8000,systems:4},openingHelp:true},construction:{version:1,transactions:[]},campaignActions:[]};
 club.waitingArea={version:1,adoptedAt:club.clock,stats:{}};
 recordMoney(club,-ECONOMY.openingSpent,'opening','Игровая комната, отдых мастеров, игра и первый мастер');ensureKits(club);ensureOperations(club);ensureGuestRegistry(club);syncRooms(club);ensureGuestFlow(club,{newCampaign:true});replenish(club,{opening:true});return club;
}
export const build=(club,action,args={})=>buildPhysical(club,action,args);
export function buyGame(club,systemId){
 const product=gameProduct(systemId);if(!product)return fail('Игра не найдена.');const copies=club.library.copies.filter(k=>k.systemId===systemId).length,price=copies?Math.round(product.price*.6):product.price;
 const storage=libraryStorageStatus(club);if(storage.free<=0)return fail(storage.reason||'Для новой игры нужна свободная доступная полка.');
 if(money(club)<price)return fail(money(club)<0?'Сначала погасите долг.':'На игру не хватает денег.');const kit={id:'kit-'+club.library.nextId++,systemId,price};club.library.copies.push(kit);ensureKits(club);
 if(!club.library.adventures.includes(product.baseAdventure))club.library.adventures.push(product.baseAdventure);recordMoney(club,-price,'game','Куплена игра '+product.name);syncRooms(club);replenish(club,{removeExpired:false});return{ok:true,kit,price};
}
export function buyAdventure(club,id){const adventure=SESSIONS.find(s=>s.id===id);if(!adventure||!club.library.copies.some(k=>k.systemId===adventure.systemId))return fail('Сначала купите эту игру.');if(club.library.adventures.includes(id))return fail('Это приключение уже куплено.');const price=adventure.minutes<=180?300:adventure.minutes<=240?500:700;if(money(club)<price)return fail('На приключение не хватает денег.');club.library.adventures.push(id);recordMoney(club,-price,'adventure','Куплено приключение «'+adventure.title+'»');return{ok:true};}
export function sellGame(club,kitId,{acceptUnassign=false}={}){
 const kit=getKit(club,kitId),state=kitStatus(club,kitId);if(!kit)return fail(state.reason);
 if(state.running||state.preparing||state.repairing)return fail(state.reason);
 const assigned=club.rooms.filter(r=>r.kitId===kitId);
 if(assigned.some(r=>roomOccupants(club,r.id).length))return fail('Сначала верните гостей этой комнаты к стойке: продажа снимет назначение игры и отключит комнату.');
 if(assigned.length&&!acceptUnassign)return{ok:false,needsUnassignConfirmation:true,roomIds:assigned.map(r=>r.id),reason:'Продажа снимет назначение игры и отключит пустую комнату. Подтвердите это изменение.'};
 const refund=kitSalvage(kit);club.library.copies=club.library.copies.filter(k=>k.id!==kitId);
 for(const room of assigned)Object.assign(room,{kitId:null,adventureId:null,enabled:false});
 recordMoney(club,refund,'sale','Продан игровой комплект '+gameProduct(kit.systemId).name,{details:{kitId,condition:kit.condition,refund}});
 syncRooms(club);updateCampaign(club);return{ok:true,refund,roomIds:assigned.map(r=>r.id)};
}
export function hireMaster(club,index){
 const id=typeof index==='string'&&!/^\d+$/.test(index)?index:`hire-${index}`;
 if(club.staff.some(m=>m.id===id))return fail('Этот мастер уже работает в клубе.');
 const candidate=availableMasterCandidates(club).find(m=>m.id===id);if(!candidate)return fail('Кандидат не найден.');
 if(clubPrestige(club).value<prestigeNeeded(candidate))return fail(`Для этого мастера нужен престиж ${prestigeNeeded(candidate)}. Оснастите клуб и проводите хорошие игры.`);
 if(!canHireStaff(club))return fail('Для нового мастера нужно свободное доступное место в комнате отдыха.');
 if(money(club)<candidate.fee)return fail(money(club)<0?'Сначала погасите долг.':'На наём не хватает денег.');
 const rehired=(club.personnelArchive??[]).some(m=>m.id===id);
 club.staff.push(candidate);club.personnelArchive=(club.personnelArchive??[]).filter(m=>m.id!==id);
 recordMoney(club,-candidate.fee,'hire',(rehired?'Вернулся мастер ':'Нанят мастер ')+candidate.name);retireStaffRoomLegacyCredit(club);syncRooms(club);replenish(club,{removeExpired:false});return{ok:true,master:candidate,rehired,price:candidate.fee};
}
export function masterTrainingOffer(master,systemId){
 const game=gameProduct(systemId),group=['teaching','turns'].includes(systemId);
 if(!master||(!game&&!group))return fail('Курс не найден.');
 if(!group&&master.known.includes(systemId))return fail('Мастер уже знает эту игру.');
 const p=masterPreferences(master);
 if(systemId==='teaching'&&p.wantsTeaching&&p.teachingSkill>=1&&p.teachingCapacity>=4)return fail('Мастер уже освоил этот курс: объяснение правил и работа с четырьмя новичками.');
 if(systemId==='turns'&&p.invites&&p.facilitation>=1)return fail('Мастер уже освоил этот курс работы с группой.');
 return{ok:true,systemId,cost:group?1200:[600,1000,1600][game.complexity-1],hours:group?12:[8,12,16][game.complexity-1]};
}
export function trainMaster(club,id,systemId){
 const master=getMaster(club,id),offer=masterTrainingOffer(master,systemId),group=['teaching','turns'].includes(systemId);
 if(!offer.ok)return offer;
 if(master.training||club.rooms.some(r=>r.masterId===id&&r.status==='running'))return fail('Мастер сейчас недоступен для обучения.');
 if(!club.staff.some(m=>m.id!==id&&!m.training&&club.library.copies.some(k=>m.known.includes(k.systemId))))return fail('Сначала нужен другой мастер, который сможет вести одну из купленных игр.');
 const {cost,hours}=offer;if(money(club)<cost)return fail('На обучение не хватает денег.');
 master.training={systemId,startedAt:club.clock,endsAt:club.clock+hours,cost};recordMoney(club,-cost,'training',master.name+(group?' учится работать с группой':' учится вести '+gameProduct(systemId).name));for(const r of club.rooms)if(r.masterId===id)r.masterId=null;syncRooms(club);return{ok:true,cost,hours};
}
export function configureRoom(club,id,{kitId,masterId,adventureId,hours,enabled}={}){
 const room=roomById(club,id);if(!room||room.status==='running')return fail('Настройки занятой комнаты сохранятся до конца игры.');
 const k=kitId??room.kitId,m=masterId??room.masterId,kit=getKit(club,k),master=getMaster(club,m);
 if(k&&(!kit||!resourceFree(club,'kitId',k,id)))return fail('Этот комплект занят в другой комнате.');
 if(m&&(!master||!resourceFree(club,'masterId',m,id)||master.training))return fail('Этот мастер уже занят.');
 if(kit&&master&&!master.known.includes(kit.systemId))return fail('Мастер ещё не знает эту игру.');
 if(adventureId&&(!club.library.adventures.includes(adventureId)||!SESSIONS.some(s=>s.id===adventureId&&s.systemId===kit?.systemId)))return fail('Купите подходящее приключение.');
 const adventure=adventureFor(club,kit?.systemId,adventureId??room.adventureId);
 if(hours!==undefined&&hours!==sessionHours(adventure))return fail(`Приключение «${adventure?.title??''}» длится ${sessionHours(adventure)} ч. Длительность задаётся историей.`);
 Object.assign(room,{kitId:k,masterId:m,adventureId:adventure?.id??null,hours:sessionHours(adventure),...(enabled!==undefined?{enabled}: {})});syncRooms(club);replenish(club,{removeExpired:false});updateCampaign(club);return{ok:true};
}
export function setEquipment(club,id,settings){
 const draft=retireStaffRoomLegacyCredit(structuredClone(club)),item=draft.layout.objects.find(i=>i.id===id);if(!item)return fail('Предмет не найден.');
 if(runningRooms(club).some(r=>r.layout.items.includes(id)))return fail('Дождитесь окончания игры.');
 for(const key of ['enabled','autoRefill'])if(settings[key]!==undefined)item[key]=Boolean(settings[key]);
 const capacity=validateStaffCapacity(draft);if(!capacity.ok)return capacity;
 try{validateOccupiedLayout(club,draft.layout);}catch(error){return fail(error.message);}
 retireStaffRoomLegacyCredit(draft);syncRooms(draft);updateCampaign(draft);Object.assign(club,draft);return{ok:true};
}
export function startRoom(club,id,{acceptRisk=false}={}){
 if(money(club)<0)return fail('При долге нельзя начинать новые партии. Доиграйте текущие и откройте кассу.');if(club.campaign.status==='bankrupt')return fail('Это прохождение завершено.');
 syncRooms(club);const room=roomById(club,id);if(!room)return fail('Комната не найдена.');
 const preparation=roomPreparation(club,id),kit=kitStatus(club,room.kitId);
 if(!preparation.ready)return fail(preparation.reason);if(!kit.ok)return fail(kit.reason);
 if(!readyRooms(club).includes(room))return fail('Для игры нужна готовая комната, мастер и четыре гостя.');
 const guests=roomOccupants(club,id).map(g=>({...structuredClone(g),waiting:guestWaitingSummary(club,g)})),runId=`${club.seed}|${id}|${room.turn}|${club.clock}`;
 const equipment=equipRoom(club,room.layout),hours=room.hours??2,snapshot=structuredClone({...room,run:null,equipment,environment:{hot:hours>=5&&room.layout.cells.length<=28,noisyAppliances:commerceItems(club.layout).some(i=>i.enabled&&equipmentRunning(club,i)&&PRODUCTS[i.type].noisy&&room.layout.cells.some(k=>{const [x,y]=k.split(',').map(Number);return Math.abs(i.x-x)+Math.abs(i.y-y)<=2;}))}});
 const forecast=sessionForecast(club,id);
 const run={id:runId,ratingVersion:CAMPAIGN_RATING_VERSION,startedAt:club.clock,endsAt:club.clock+hours,room:snapshot,guests,contract:{pricingVersion:3,paymentCurve:3,hourlyRate:ECONOMY.guestHour,guestPrice:hours*ECONOMY.guestHour,wageTotal:hours*room.master.hourlyWage,forecast,tipRolls:Object.fromEntries(guests.map(g=>[g.id,hash(club.seed+'|tips|'+runId+'|'+g.id)/4294967296]))}};
 const trial=structuredClone(club);trial.rooms.find(r=>r.id===id).status='running';trial.rooms.find(r=>r.id===id).run=run;const reserve=reserveRequired(trial);
 if(!acceptRisk&&money(club)<reserve)return{ok:false,needsRiskConfirmation:true,reserve,cash:money(club),reason:`Если никто не заплатит, текущие партии и клуб потребуют до ${reserve} ₽. В кассе ${Math.round(money(club))} ₽.`};
 room.status='running';room.run=freeze(run);club.activity[runId]={noiseHours:0,services:[]};club.campaign.openingHelp=false;syncGuestWaiting(club);
 if(lockedGuest(club,actorById(club,club.selectedId)))club.selectedId=waitingGuests(club)[0]?.id??null;return{ok:true,sessionId:runId,reserve};
}
export function advanceClub(club){
 const running=runningRooms(club);if(!running.length)return fail('Сначала нажмите «Начать игру» у готовой комнаты.');
 return advanceCampaignTo(club,Math.min(...running.map(r=>r.run.endsAt)));
}
export function waitForPreparation(club){
 const deadlines=kitDeadlines(club);if(!deadlines.length)return fail('Нет подготовки или ремонта, окончания которых нужно дождаться.');
 if(club.campaign.status==='bankrupt')return fail('Это прохождение завершено.');
 return advanceCampaignTo(club,Math.min(...deadlines));
}
export function waitForOperation(club){
 const deadlines=[...(club.operations?.tasks??[]).filter(t=>['active','queued'].includes(t.state)).map(t=>t.dueAt),...(club.inventory?.orders??[]).filter(o=>o.state==='ordered').map(o=>o.dueAt)].filter(t=>Number.isFinite(t)&&t>club.clock);
 if(!deadlines.length)return fail('Нет оплаченной работы или поставки, окончания которой нужно дождаться.');
 if(club.campaign.status==='bankrupt')return fail('Это прохождение завершено.');
 return advanceCampaignTo(club,Math.min(...deadlines));
}
export function waitForGuests(club){
 if(club.campaign.status==='bankrupt')return fail('Это прохождение завершено.');
 ensureGuestFlow(club);const status=guestFlowStatus(club);
 if(!status.enabled)return fail(status.reason);
 if(club.finance.cash<status.waitingCost)return fail(`До следующего прихода понадобится до ${status.waitingCost} ₽ на содержание. Сначала закройте пустые комнаты или освободите деньги.`);
 return advanceCampaignTo(club,status.waitingUntil);
}
function advanceCampaignTo(club,target){
 const completed=[],departures=[],beforeCash=money(club),ledgerStart=club.finance.ledger.length;let completedAtTimestamp=false;
 const result=advanceEventClock(club,target,{
  progressInterval(from,to){
   trackGuestWaiting(club,from,to);progressStaff(club,from,to);accrueGuestFlow(club,from,to);const active=runningRooms(club);
   for(const room of active){const exposure=club.activity[room.run.id]??={noiseHours:0,services:[]},cells=new Set(room.layout.cells);if(active.some(r=>r.id!==room.id&&r.layout.cells.some(k=>{const [x,y]=k.split(',').map(Number);return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>cells.has(cellKey(x+dx,y+dy)));})))exposure.noiseHours+=to-from;}
  },
  settleSessions(time){
   const gone=new Set();
   for(const room of runningRooms(club).filter(r=>Math.abs(r.run.endsAt-time)<1e-8)){
    const run={...room.run,observed:club.activity[room.run.id]??{}},reviews=run.guests.map(g=>[3,4,5,6,7,8].includes(run.ratingVersion)?rateCampaignGuest(run,g):rateLegacyGuest(run,g));
    const settlement=settleRun(club,run,reviews);if(!settlement)throw new Error('Эта игра уже рассчитана.');
    recordGuestOutcome(club,run,settlement.reviews);prepareAfterRun(club,run,room);
    for(const review of settlement.reviews)if(!club.reviewIds.includes(review.reviewId)){club.reviewIds.push(review.reviewId);club.rating.sum+=review.score;club.rating.count++;}
    completed.push({sessionId:run.id,roomId:room.id,number:room.number,title:run.room.session.title,game:run.room.session.game,master:run.room.master.name,startedAt:run.startedAt,endsAt:run.endsAt,...settlement});departures.push({roomId:room.id,sessionId:run.id,guests:run.guests});
    for(const guest of run.guests)gone.add(guest.id);
    room.turn++;room.status='seating';room.run=null;delete club.activity[run.id];completedAtTimestamp=true;
   }
   club.guests=club.guests.filter(g=>!gone.has(g.id));
  },
  afterTimestamp(){syncRooms(club);replenish(club,{removeExpired:true,arrivals:true,completed:completedAtTimestamp});completedAtTimestamp=false;updateCampaign(club);},
 });
 club.step++;club.departures=departures;club.drag=null;
 const entries=club.finance.ledger.slice(ledgerStart),incoming=Math.round(entries.reduce((sum,e)=>sum+Math.max(0,e.amount),0)*100)/100,outgoing=Math.round(entries.reduce((sum,e)=>sum+Math.max(0,-e.amount),0)*100)/100;
 club.lastReport=freeze({step:club.step,clock:club.clock,completed,started:[],rating:structuredClone(club.rating),operations:result.operations,services:{sales:result.services.sales,portions:result.services.portions},events:result.events,stopped:result.stopped,reason:result.reason,finance:{beforeCash,cash:money(club),cashChange:money(club)-beforeCash,incoming,outgoing,obligations:obligations(club)},campaign:structuredClone(club.campaign)});
 return{ok:true,...result,report:club.lastReport};
}
export function campaignProgress(club){const rooms=club.rooms.filter(r=>r.operational&&(getKit(club,r.kitId)?.condition??100)>0),systems=new Set(rooms.map(r=>getKit(club,r.kitId)?.systemId).filter(Boolean));return{rooms:rooms.length,participations:club.rating.count,rating:clubRating(club)??0,reserve:money(club)-reserveRequired(club),systems:systems.size,genres:systems.size};}
export function updateCampaign(club){
 const progress=campaignProgress(club),goal=club.campaign.goal;if(!club.campaign.won&&Object.keys(goal).every(k=>progress[k]>=goal[k])){club.campaign.won=true;club.campaign.wonAt=club.clock;}
 if(money(club)>=0){club.campaign.status='playing';club.campaign.recoveryPlan=null;}
 else if(runningRooms(club).length){club.campaign.status='debt';club.campaign.recoveryPlan=null;}
 else {const plan=findRecoveryPlan(club);club.campaign.status=plan?'restructure':canProveInsolvent(club)?'bankrupt':'restructure';club.campaign.recoveryPlan=plan;}
 return club.campaign;
}
export function recoverClub(club){if(runningRooms(club).length)return fail('Сначала завершите начатые игры.');const plan=findRecoveryPlan(club);if(!plan)return fail('Продажа имущества уже не позволит сохранить клуб.');applyRecoveryPlan(club,plan);syncRooms(club);replenish(club,{removeExpired:false});updateCampaign(club);return{ok:true,plan};}
function migratePrototype(raw){
 const old=structuredClone(decodePrototype(raw)),layout=old.layout??layoutForRooms(old.rooms);
 const regions=inspectRooms(layout);old.version=6;old.layout=layout;old.library={copies:[],adventures:[],nextId:1};old.staff=[];old.finance={cash:4050,ledger:[],nextId:1,settledRuns:[],serviceIds:[]};old.activity={};old.nextRoomNumber=old.rooms.length+1;
 old.campaign={won:false,wonAt:null,status:'playing',goal:{rooms:5,participations:100,rating:8,reserve:8000,genres:4},openingHelp:false};
 old.rooms.forEach((r,i)=>{const region=regions.find(p=>p.id===r.id)??regions[i];const base=structuredClone(r.master),master=masterPreferences({...base,baseId:base.id,id:'legacy-master-'+i,known:[r.session.systemId],systemSkills:{[r.session.systemId]:80},hourlyWage:220,fee:800,training:null});old.staff.push(master);const kit={id:'legacy-kit-'+i,systemId:r.session.systemId,price:gameProduct(r.session.systemId).price};old.library.copies.push(kit);if(!old.library.adventures.includes(r.session.id))old.library.adventures.push(r.session.id);Object.assign(r,{tableId:region.tableId,layout:region,chairIds:region.chairIds,masterChairId:region.masterChairId,masterId:master.id,kitId:kit.id,adventureId:r.session.id,hours:r.session.minutes/60,enabled:true,operational:true});if(r.run){r.run.contract={guestPrice:0,wageTotal:0,tipRolls:{}};old.activity[r.run.id]={noiseHours:0,services:[]};}});
 for(const g of old.guests){g.preferences=makeLegacyPreferences(old.seed,g);g.dialogueVersion??=1;g.preferences.receiveHelp=g.habit.id==='own-space'?'none':g.habit.id==='ask-help'?'welcome':'rules';g.preferences.giveHelp=g.habit.id==='offer-help'?'asked':g.habit.id==='unsolicited'?'offers':'none';}
 syncRooms(old);return old;
}
export const encodeClub=club=>JSON.stringify(club);
export function decodeClub(raw){
 if(!raw)return null;let club=JSON.parse(raw);const legacyOperations=club.version<7;if(club.version===4)club=migratePrototype(raw);
 if(club.version===5){club.layout=convertRecoveryLayout(club.layout,club.rooms);club.version=6;}
 if(club.version===6){club.staffRoomLegacyIds=club.staff.map(m=>m.id);club.personnelArchive??=[];club.campaign.goal.systems=club.campaign.goal.systems??club.campaign.goal.genres??4;delete club.campaign.goal.genres;club.version=7;}
 if(club.version!==7||typeof club.seed!=='string'||!Number.isFinite(club.clock)||!Array.isArray(club.rooms)||!Array.isArray(club.guests)||!Array.isArray(club.staff)||!club.library||!club.campaign)throw new Error('Не удалось прочитать сохранение клуба.');
 validateLayout(club.layout);validateServiceStaff(club);validatePersonnel(club);retireStaffRoomLegacyCredit(club);const staffCapacity=validateStaffCapacity(club);if(!staffCapacity.ok)throw new Error(staffCapacity.reason);if(!Number.isInteger(club.layout.entry?.x)||!Number.isInteger(club.layout.entry?.y)||!ownedCells(club.layout).has(cellKey(club.layout.entry.x,club.layout.entry.y)))throw new Error('Повреждён вход в клуб.');
 if(!Number.isFinite(club.finance?.cash)||!Array.isArray(club.finance.ledger)||!Array.isArray(club.finance.settledRuns)||new Set(club.finance.settledRuns).size!==club.finance.settledRuns.length||!Array.isArray(club.finance.serviceIds)||new Set(club.finance.serviceIds).size!==club.finance.serviceIds.length||club.finance.ledger.some(e=>typeof e.id!=='string'||!Number.isFinite(e.amount)||!Number.isFinite(e.clock))||new Set(club.finance.ledger.map(e=>e.id)).size!==club.finance.ledger.length)throw new Error('Повреждена история кассы.');
 if(legacyOperations)ensureKits(club);validateKits(club);validateOperations(club,{allowMigration:legacyOperations});
 if(!Number.isInteger(club.rating?.count)||club.rating.count<0||!Number.isFinite(club.rating.sum)||club.rating.sum<club.rating.count||club.rating.sum>10*club.rating.count||!Array.isArray(club.reviewIds)||new Set(club.reviewIds).size!==club.rating.count)throw new Error('Повреждена история отзывов.');
 if(new Set(club.library.copies?.map(k=>k.id)).size!==club.library.copies?.length||club.library.copies.some(k=>!gameProduct(k.systemId)||!Number.isFinite(k.price)||k.price<0)||new Set(club.staff.map(m=>m.id)).size!==club.staff.length||club.staff.some(m=>!Array.isArray(m.known)||m.known.some(id=>!gameProduct(id))||!Number.isFinite(m.hourlyWage)||m.hourlyWage<0))throw new Error('Повреждены купленные игры или мастера.');
 if(!Number.isInteger(club.step)||club.step<0||!Number.isInteger(club.arrivals)||club.arrivals<0||new Set(club.rooms.map(r=>r.id)).size!==club.rooms.length||club.rooms.some(r=>r.capacity!==4||!Number.isInteger(r.turn)||r.turn<0||!Number.isInteger(r.hours)||r.hours<2||r.hours>6))throw new Error('Повреждены события клуба.');
 const ids=new Set(),seats=new Set();
 for(const g of club.guests){if(ids.has(g.id)||!g.identity?.portrait||!g.profile||!Array.isArray(g.dialogue)||!Array.isArray(g.asked)||!Number.isFinite(g.schedule?.leaveAt)||!g.preferences)throw new Error('Повреждён гость.');ids.add(g.id);if(g.roomId){const room=roomById(club,g.roomId),key=g.roomId+':'+g.seat;if(!room||!Number.isInteger(g.seat)||g.seat<0||g.seat>3||seats.has(key))throw new Error('Повреждена рассадка.');seats.add(key);}g.dialogueVersion??=1;g.dialogue.forEach(a=>{if(!QUESTIONS.some(q=>q.id===a.questionId))throw new Error('Повреждён разговор.');a.reply??=answerText(g,a.questionId,a.variant);});if(g.lastAnswer)g.lastAnswer=g.dialogue.find(a=>a.questionId===g.lastAnswer.questionId&&a.variant===g.lastAnswer.variant)??null;}
 for(const r of club.rooms)if(r.status==='running'){const run=r.run;if(!run||![1,2,3,4,5,6,7,8].includes(run.ratingVersion??1)||run.endsAt<=club.clock||run.guests.length!==4||new Set(run.guests.map(g=>g.id)).size!==4||run.endsAt!==run.startedAt+run.room.session.minutes/60||run.guests.some(g=>!roomOccupants(club,r.id).some(p=>p.id===g.id))||!Number.isFinite(run.contract?.guestPrice)||run.contract.guestPrice<0||run.contract.wageTotal<0||!Number.isFinite(run.contract?.wageTotal)||run.contract.pricingVersion===3&&run.contract.paymentCurve!==3||run.ratingVersion>=3&&run.guests.some(g=>!Number.isFinite(run.contract.tipRolls?.[g.id])||run.contract.tipRolls[g.id]<0||run.contract.tipRolls[g.id]>=1))throw new Error('Повреждена начатая игра.');freeze(run);}
 validateGuestWaiting(club);adoptGuestWaiting(club);ensureGuestRegistry(club);validateGuestRegistry(club);
 club.construction??={version:1,transactions:[]};club.campaignActions??=[];
 club.drag=null;club.phase='placing';syncRooms(club);validateGuestFlow(club);ensureGuestFlow(club);replenish(club,{removeExpired:false});freeze(club.lastReport);return club;
}

export function dismissGuest(club,id){
 const guest=actorById(club,id);if(!guest||guest.roomId)return fail('Проводить можно гостя, который сейчас ждёт у стойки.');
 recordGuestDeparture(club,guest,'dismissed');club.guests=club.guests.filter(g=>g.id!==id);replenish(club);return{ok:true};
}
export function progressStaff(club,from,to){
 const hours=to-from;
 for(const master of club.staff){
  const working=runningRooms(club).some(r=>r.masterId===master.id),learning=Boolean(master.training);
  const restRate=!working&&!learning&&staffCanRest(club,master.id)?(staffSeatForMaster(club,master.id)?.restRate??0):0;
  master.hoursWorked=(master.hoursWorked??0)+(working?hours:0);
  master.fatigue=Math.max(0,Math.min(12,(master.fatigue??0)+hours*(working?.35:-restRate)));
  if(master.training&&master.training.endsAt<=to){
   if(master.training.systemId==='teaching'){const current=masterPreferences(master);master.wantsTeaching=true;master.coaching=true;master.teachingSkill=Math.min(1,current.teachingSkill+.2);master.teachingCapacity=Math.min(4,current.teachingCapacity+1);}
   else if(master.training.systemId==='turns'){const current=masterPreferences(master);master.invites=true;master.facilitation=Math.min(1,current.facilitation+.25);}
   else{if(!master.known.includes(master.training.systemId))master.known.push(master.training.systemId);(master.systemSkills??={})[master.training.systemId]=75;}
   master.training=null;
  }
 }
}
export function advanceIdle(club,hours=1){
 if(runningRooms(club).length)return fail('Пока гости играют, используйте «Проверить»: время перейдёт к ближайшему окончанию.');
 if(club.campaign.status==='bankrupt')return fail('Это прохождение завершено.');
 if(hours!==1)return fail('Можно подождать один час.');
 return advanceCampaignTo(club,club.clock+1);
}
export function dismissMaster(club,id,{acceptTrainingLoss=false}={}){
 if(runningRooms(club).some(r=>r.masterId===id||r.run?.room?.master?.id===id))return fail('Сначала дождитесь окончания партии мастера и расчёта зарплаты.');
 const master=getMaster(club,id);if(!master)return fail('Мастер не найден.');
 if(master.training&&!acceptTrainingLoss)return{ok:false,needsTrainingLossConfirmation:true,training:structuredClone(master.training),reason:'Обучение будет прервано без возврата оплаты. Полученные раньше навыки сохранятся. Подтвердите потерю оплаченного курса.'};
 const archived=structuredClone(master),cancelledTraining=archived.training;
 if(cancelledTraining)archived.cancelledTraining={...cancelledTraining,cancelledAt:club.clock};
 archived.training=null;(club.personnelArchive??=[]).push(archived);
 club.staff=club.staff.filter(m=>m.id!==id);club.staffRoomLegacyIds=(club.staffRoomLegacyIds??[]).filter(value=>value!==id);for(const room of club.rooms)if(room.masterId===id)room.masterId=null;
 retireStaffRoomLegacyCredit(club);syncRooms(club);updateCampaign(club);return{ok:true,trainingCancelled:Boolean(cancelledTraining),cancelledTraining,refund:0};
}
function validatePersonnel(club){
 club.personnelArchive??=[];club.staffRoomLegacyIds??=[];
 if(!Array.isArray(club.personnelArchive)||!Array.isArray(club.staffRoomLegacyIds))throw new Error('Повреждён архив сотрудников.');
 const people=[...club.staff,...club.personnelArchive],ids=new Set();
 for(const master of people){
  if(typeof master.id!=='string'||ids.has(master.id)||typeof master.name!=='string'||!Array.isArray(master.known)||master.known.some(id=>!gameProduct(id))||new Set(master.known).size!==master.known.length||!Number.isFinite(master.hourlyWage)||master.hourlyWage<0||!Number.isFinite(master.fee)||master.fee<0)throw new Error('Повреждены данные мастера.');
  ids.add(master.id);master.systemSkills??=Object.fromEntries(master.known.map(id=>[id,70]));master.fatigue??=0;master.hoursWorked??=0;master.training??=null;
  if(!master.systemSkills||Object.entries(master.systemSkills).some(([id,n])=>!gameProduct(id)||!Number.isFinite(n)||n<0||n>100)||!Number.isFinite(master.fatigue)||master.fatigue<0||master.fatigue>12||!Number.isFinite(master.hoursWorked)||master.hoursWorked<0)throw new Error('Повреждены навыки или усталость мастера.');
  if(master.training&&(!Number.isFinite(master.training.endsAt)||!['teaching','turns'].includes(master.training.systemId)&&!gameProduct(master.training.systemId)||master.training.cost!==undefined&&(!Number.isFinite(master.training.cost)||master.training.cost<0)))throw new Error('Повреждено обучение мастера.');
  for(const field of ['teachingSkill','facilitation'])if(master[field]!==undefined&&(!Number.isFinite(master[field])||master[field]<0||master[field]>1))throw new Error('Повреждён навык работы с группой.');
  if(master.teachingCapacity!==undefined&&(!Number.isInteger(master.teachingCapacity)||master.teachingCapacity<0||master.teachingCapacity>4))throw new Error('Повреждена учебная нагрузка мастера.');
 }
 if(club.personnelArchive.some(m=>m.training)||new Set(club.staffRoomLegacyIds).size!==club.staffRoomLegacyIds.length||club.staffRoomLegacyIds.some(id=>!club.staff.some(m=>m.id===id)))throw new Error('Повреждены сохранённые места сотрудников.');
}
export function executeCampaignAction(club,action){
 if(!action||typeof action.type!=='string')return fail('Действие не найдено.');
 const id=action.transactionId,fingerprint=JSON.stringify(Object.fromEntries(Object.entries(action).filter(([key])=>key!=='transactionId').sort(([a],[b])=>a.localeCompare(b))));
 const old=id&&(club.campaignActions??[]).find(t=>t.id===id);
 if(old)return old.fingerprint===fingerprint?{...structuredClone(old.result),replayed:true}:fail('Номер действия уже использован для другой покупки.');
 if(club.campaign.status==='bankrupt')return fail('Кампания завершена. Историю можно сохранить и начать новую отдельную кампанию.');
 const draft=structuredClone(club);let result;
 switch(action.type){
 case 'hireServiceStaff':result=hireServiceStaff(draft);break;
 case 'setServiceShift':result=setServiceShift(draft,action.active);break;
 case 'purchaseGame':result=buyGame(draft,action.systemId);break;
 case 'sellGame':result=sellGame(draft,action.kitId,{acceptUnassign:action.acceptUnassign===true});break;
 case 'buyAdventure':result=buyAdventure(draft,action.adventureId);break;
 case 'hireMaster':{const id=String(action.candidateId??'');result=/^(?:hire-|legacy-master-)?\d+$/.test(id)?hireMaster(draft,id):fail('Кандидат не найден.');break;}
 case 'trainMaster':result=trainMaster(draft,action.masterId,action.systemId);break;
 case 'assignRoom':result=configureRoom(draft,action.roomId,{kitId:action.gameId,masterId:action.masterId,adventureId:action.adventureId,hours:action.hours,enabled:true});break;
 case 'disableRoom':result=configureRoom(draft,action.roomId,{enabled:false});break;
 case 'dismissMaster':result=dismissMaster(draft,action.masterId,{acceptTrainingLoss:action.acceptTrainingLoss===true});break;
 case 'setEquipment':result=setEquipment(draft,action.itemId,{...(action.enabled!==undefined?{enabled:action.enabled}:{}),...(action.autoRefill!==undefined?{autoRefill:action.autoRefill}:{})});break;
 case 'repairKit':result=repairKit(draft,action.kitId);break;
 case 'waitForPreparation':result=waitForPreparation(draft);break;
 case 'waitForOperation':result=waitForOperation(draft);break;
 case 'waitForGuests':result=waitForGuests(draft);break;
 case 'restock':result=restock(draft,action.itemId,action.portions??20);break;
 case 'liquidate':{const plan=findRecoveryPlan(draft);if(!action.planId||action.planId!==plan?.id)return fail('План изменился. Откройте новый расчёт и подтвердите его заново.');result=recoverClub(draft);break;}
 case 'continueSandbox':draft.campaign.continued=true;result={ok:true};break;
 case 'advanceIdle':result=advanceIdle(draft,1);break;
 default:result=executeOperationsAction(draft,action);break;
 }
 if(!result?.ok)return result;
 updateCampaign(draft);if(id)(draft.campaignActions??=[]).push({id,fingerprint,result:structuredClone(result)});
 Object.assign(club,draft);return result;
}
export {campaignMarket,campaignStatus,roomAssignment,startQuote} from './campaign-view.js';
