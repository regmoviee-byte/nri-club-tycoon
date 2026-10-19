import { createShift,roomOccupants,roomById,actorById,askQuestion,answerText } from './club.js';
import { generateVisitor,hash } from './generator.js';
import { shuffled } from './search.js';
import { assessGroup,assessPair } from './assessment.js';
import { IDENTITIES,SPARSE_PORTRAIT_IDS } from '../data/identities.js';
import { SESSIONS,MASTERS,HABITS,QUESTIONS } from '../data/club.js';
import {nextWaitingGuest} from './reception.js';
import {RATING_VERSION,rateGuestV2} from './rating.js';

export const CLUB_KEY='nri-club-tycoon:club:v4';
const CATEGORIES=['game','master','company','duration'];
const PRIORITY_TEXT={game:'сама история',master:'как мастер ведёт игру',company:'компания за столом',duration:'удобная длительность'};
export const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const waitingGuests=club=>club.guests.filter(g=>!g.roomId);
export const openRooms=club=>club.rooms.filter(r=>r.status==='seating');
export const totalGuestSeats=club=>club.rooms.reduce((count,room)=>count+room.capacity,0);
export const targetGuestCount=club=>Math.ceil(totalGuestSeats(club)*1.5);
export const readyRooms=club=>openRooms(club).filter(r=>r.master&&roomOccupants(club,r.id).length===r.capacity);
export const clubReady=club=>club.rooms.some(r=>r.status==='running')||readyRooms(club).length>0;
export const lockedGuest=(club,g)=>roomById(club,g?.roomId)?.status==='running';
export const clubRating=club=>club.rating.count?club.rating.sum/club.rating.count:null;
export function clockText(clock){return`${Math.floor(clock%24).toString().padStart(2,'0')}:00${clock>=24?' · день '+(Math.floor(clock/24)+1):''}`;}

function giveSchedule(club,g,budget){
  const n=hash(club.seed+'|schedule|'+g.id),low=2+n%4;
  g.schedule={arrivalAt:club.clock,leaveAt:club.clock+budget,preferred:[low,Math.min(6,low+(n>>>4)%2)]};
  const order=shuffled(CATEGORIES,club.seed+'|weights|'+g.id);g.weights=Object.fromEntries(order.map((key,i)=>[key,4-i]));
  g.ratingPriority=`Главное для меня — ${PRIORITY_TEXT[order[0]]}. Ещё важно: ${PRIORITY_TEXT[order[1]]}.`;
}
function newGuest(club,identity){
  let profile,index;do{index=club.arrivals++;profile=generateVisitor(club.seed+'|arrivals',index);}while(profile.format.id==='solo'||club.guests.some(g=>g.id===profile.id));
  profile.name=identity.name;profile.age=identity.age;
  const g={id:profile.id,profile,identity:structuredClone(identity),habit:structuredClone(HABITS[hash(profile.id)%HABITS.length]),roomId:null,seat:null,asked:[],storyIndex:0,dialogue:[],lastAnswer:null};
  giveSchedule(club,g,2+hash(club.seed+'|budget|'+index)%9);return g;
}
export function replenish(club,{removeExpired=true}={}){
  // Waiting consumes the same absolute deadline as playing. Active visitors stay
  // at their table until the actual end, even if the player ran past a deadline.
  if(removeExpired)club.guests=club.guests.filter(g=>lockedGuest(club,g)||g.schedule.leaveAt>club.clock);
  const target=targetGuestCount(club);
  let remaining=target-club.guests.length;
  const occupied=new Set(club.guests.map(g=>g.identity.id));
  const deck=shuffled(IDENTITIES.filter(i=>!occupied.has(i.id)),club.seed+'|arrivals|'+club.arrivals),sparseTarget=1+(hash(club.seed+'|local-cast')%4===0?1:0);
  // Prefer young adults when filling the initial waiting pool. The authored
  // cast limits every 20-seat composition to at most two people aged 60+.
  deck.sort((a,b)=>{const missing=club.guests.filter(g=>SPARSE_PORTRAIT_IDS.includes(g.identity.id)).length<sparseTarget;return (SPARSE_PORTRAIT_IDS.includes(a.id)?missing?0:2:1)-(SPARSE_PORTRAIT_IDS.includes(b.id)?missing?0:2:1);});
  for(const identity of deck){
    if(remaining<=0)break;
    if(SPARSE_PORTRAIT_IDS.includes(identity.id)&&club.guests.filter(g=>SPARSE_PORTRAIT_IDS.includes(g.identity.id)).length>=sparseTarget)continue;
    const min=identity.age<=40?18:identity.age<60?41:60,max=identity.age<=40?40:identity.age<60?59:99,cap=min===18?Math.max(0,target-4):min===41?3:1;
    if(club.guests.filter(g=>g.identity.age>=min&&g.identity.age<=max).length>=cap)continue;
    club.guests.push(newGuest(club,identity));remaining--;
  }
  if(club.guests.length<target)throw new Error('Недостаточно разных посетителей для полного пула клуба.');
  if(!actorById(club,club.selectedId))club.selectedId=waitingGuests(club)[0]?.id??null;
}
function replaceRoom(club,room){
  const key=club.seed+'|'+room.id+'|'+room.turn;
  room.session=structuredClone(shuffled(SESSIONS.filter(s=>s.id!==room.session.id),key+'|game')[0]);
  room.master=structuredClone(shuffled(MASTERS.filter(m=>m.id!==room.master.id),key+'|master')[0]);
  room.session.minutes=(2+hash(key+'|duration')%5)*60;
  room.status='seating';room.reviewAt=club.clock;room.run=null;
}
export function createClub(seed,history={}){
  const club=createShift(seed);club.version=4;club.clock=history.clock??12;club.rating=structuredClone(history.rating??{sum:0,count:0});
  club.reviewIds=[...(history.reviewIds??[])];club.arrivals=0;club.lastReport=null;club.departures=[];club.step=0;
  const durations=shuffled([2,3,4,5,6],club.seed+'|durations');
  club.rooms.forEach((r,i)=>{r.status='seating';r.turn=0;r.run=null;r.reviewAt=club.clock;r.session.minutes=durations[i]*60;});
  const budgets=shuffled(Array.from({length:20},(_,i)=>2+Math.floor(i/4)),club.seed+'|budgets');
  club.guests.forEach((g,i)=>giveSchedule(club,g,budgets[i]+hash(g.id+'|extra-time')%3));
  replenish(club);return club;
}

function rateGuestV1(run,g){
  const room=run.room,others=run.guests.filter(v=>v.id!==g.id),p=g.profile,m=room.master,s=room.session;
  const game=s.genres.includes(p.genres[0].id)?1:p.genres.some(x=>s.genres.includes(x.id))?.65:.25;
  let masterPenalty=0;
  if(p.traits.rules.id==='light'&&s.rules==='precise')masterPenalty+=2;
  if(p.traits.rules.id==='precise'&&s.rules==='light'&&!m.coaching)masterPenalty++;
  if(p.traits.initiative.id==='invited'&&!m.invites)masterPenalty++;
  if(p.traits.pace.id!=='varied'&&s.pace!=='varied'&&s.pace!==p.traits.pace.id&&!m.flexiblePace)masterPenalty++;
  const master=Math.max(0,1-masterPenalty/5);
  let companyPenalty=others.reduce((n,o)=>n+assessPair(room,g,o).soft,0);
  if(g.habit.id==='ask-help'&&!m.coaching&&!others.some(o=>o.habit.id==='offer-help'))companyPenalty+=2;
  const company=Math.max(0,1-companyPenalty/6),[low,high]=g.schedule.preferred,hours=s.minutes/60;
  const distance=Math.max(low-hours,hours-high,0),duration=Math.max(0,1-distance/4);
  const components={game,master,company,duration},weights=g.weights;
  const mean=CATEGORIES.reduce((n,k)=>n+components[k]*weights[k],0)/CATEGORIES.reduce((n,k)=>n+weights[k],0);
  const violations=[];
  if(run.endsAt>g.schedule.leaveAt)violations.push('Игра закончилась позже времени, до которого я мог остаться.');
  if(p.boundaries.some(b=>s.requiredTopics.includes(b.id)))violations.push('В игре оказалась тема, которую я просил исключить.');
  let score=Math.max(1,Math.min(10,Math.round(1+9*mean)));if(violations.length)score=Math.min(score,4);
  const masterComment=p.traits.rules.id==='light'&&s.rules==='precise'?'Мне хотелось меньше бросков и расчётов.':p.traits.rules.id==='precise'&&s.rules==='light'&&!m.coaching?'Не хватило объяснений, как правила решают исход.':p.traits.initiative.id==='invited'&&!m.invites?'Мне было трудно вступить в игру: мастер не спрашивал, что делает мой герой.':'Мне не хватило времени на решения, или игра шла медленнее, чем хотелось.';
  const companyComment=g.habit.id==='ask-help'&&!m.coaching&&!others.some(o=>o.habit.id==='offer-help')?'Я просил помочь с правилами, но за столом никто не объяснил ход.':'Нам мешали советы без просьбы или споры о том, сколько времени дать на ход.';
  const comments={game:'Хотелось другой истории.',master:masterComment,company:companyComment,duration:hours<low?'Мне хотелось более долгой встречи.':'Встреча была длиннее, чем мне удобно.'};
  const weakest=CATEGORIES.filter(k=>components[k]<.8).sort((a,b)=>weights[b]*(1-components[b])-weights[a]*(1-components[a]));
  const praise={game:'История попала в мои интересы.',master:'Мастер давал мне достаточно времени и помогал, когда это было нужно.',company:'С компанией получилось договориться.',duration:'Длительность мне подошла.'};
  const strongest=[...CATEGORIES].sort((a,b)=>weights[b]*components[b]-weights[a]*components[a])[0];
  const review=violations[0]??(weakest.length?comments[weakest[0]]:praise[strongest]);
  return{reviewId:run.id+'|'+g.id,guestId:g.id,name:g.profile.name,identity:structuredClone(g.identity),score,text:review,components};
}

export function rateGuest(run,g){
  const version=run.ratingVersion??1;
  if(version===1)return{...rateGuestV1(run,g),ratingVersion:1};
  if(version===RATING_VERSION)return rateGuestV2(run,g);
  throw new Error('Неизвестная версия оценки сессии.');
}

export function startRoom(club,roomId){
  const room=roomById(club,roomId);
  if(!room)return{ok:false,reason:'Комната не найдена.'};
  if(room.status==='running')return{ok:false,reason:'В этой комнате уже играют.'};
  if(!readyRooms(club).includes(room))return{ok:false,reason:'Для игры нужны мастер и четыре гостя.'};
  const guests=structuredClone(roomOccupants(club,room.id)),snapshot=structuredClone({...room,run:null,reviewAt:club.clock});
  const run=freeze({id:`${club.seed}|${room.id}|${room.turn}|${club.clock}`,ratingVersion:RATING_VERSION,startedAt:club.clock,endsAt:club.clock+room.session.minutes/60,room:snapshot,guests});
  room.run=run;room.status='running';
  if(lockedGuest(club,actorById(club,club.selectedId)))club.selectedId=nextWaitingGuest(club)?.id??null;
  return{ok:true,sessionId:run.id};
}
export function advanceClub(club){
  if(!clubReady(club))return{ok:false,reason:'Сначала соберите хотя бы один стол.'};
  const started=readyRooms(club).map(room=>startRoom(club,room.id).sessionId);
  const next=Math.min(...club.rooms.filter(r=>r.status==='running').map(r=>r.run.endsAt));
  if(!Number.isFinite(next))throw new Error('Нет активной сессии.');club.clock=next;
  const completed=[],departures=[],departedIds=new Set(),known=new Set(club.reviewIds);
  for(const room of club.rooms.filter(r=>r.status==='running'&&r.run.endsAt===next)){
    const run=room.run,reviews=run.guests.map(g=>rateGuest(run,g));
    for(const review of reviews)if(!known.has(review.reviewId)){known.add(review.reviewId);club.rating.sum+=review.score;club.rating.count++;}
    completed.push({sessionId:run.id,roomId:room.id,number:room.number,title:run.room.session.title,game:run.room.session.game,master:run.room.master.name,startedAt:run.startedAt,endsAt:run.endsAt,reviews,assessment:assessGroup(run.room,run.guests)});
    departures.push({roomId:room.id,sessionId:run.id,guests:run.guests});
    for(const guest of roomOccupants(club,room.id))departedIds.add(guest.id);
    room.turn++;replaceRoom(club,room);
  }
  club.rooms.forEach(r=>{r.reviewAt=club.clock;});club.reviewIds=[...known];club.step++;
  club.lastReport=freeze({step:club.step,clock:club.clock,started,completed,rating:structuredClone(club.rating)});club.departures=departures;
  club.guests=club.guests.filter(g=>!departedIds.has(g.id));
  replenish(club);club.drag=null;return{ok:true,report:club.lastReport};
}

export function encodeClub(club){return JSON.stringify(club);}
export function decodeClub(raw){
  if(!raw)return null;const club=JSON.parse(raw);
  if(club.version!==4||typeof club.seed!=='string'||!Number.isFinite(club.clock)||club.clock<0||!Array.isArray(club.rooms)||club.rooms.length!==5||!Array.isArray(club.guests)||club.guests.length>32||!club.guests.length)throw new Error('Неподдерживаемое сохранение клуба.');
  if(!Number.isInteger(club.rating?.count)||club.rating.count<0||!Number.isFinite(club.rating?.sum)||club.rating.sum<club.rating.count||club.rating.sum>10*club.rating.count||!Array.isArray(club.reviewIds)||new Set(club.reviewIds).size!==club.reviewIds.length||club.reviewIds.length!==club.rating.count)throw new Error('Повреждён рейтинг клуба.');
  if(!Number.isInteger(club.arrivals)||club.arrivals<0||!Number.isInteger(club.step)||club.step<0)throw new Error('Повреждены события клуба.');
  const ids=new Set(),identities=new Set(),seats=new Set(),rooms=new Set(club.rooms.map(r=>r.id));if(rooms.size!==5)throw new Error('Повтор комнаты.');
  for(const g of club.guests){
    const original=IDENTITIES.find(i=>i.id===g.identity?.id);
    if(!original||g.identity.name!==original.name||g.identity.age!==original.age||g.identity.grammar!==original.grammar||g.profile.name!==original.name||g.profile.age!==original.age||ids.has(g.id)||identities.has(original.id)||!Array.isArray(g.dialogue)||!Array.isArray(g.asked))throw new Error('Повреждён гость.');ids.add(g.id);identities.add(original.id);g.identity=structuredClone(original);
    if(!Number.isFinite(g.schedule?.leaveAt)||!Number.isFinite(g.schedule?.arrivalAt)||!Array.isArray(g.schedule.preferred)||g.schedule.preferred.length!==2||g.schedule.preferred.some(n=>!Number.isInteger(n)||n<2||n>6)||g.schedule.preferred[0]>g.schedule.preferred[1]||CATEGORIES.some(k=>!Number.isInteger(g.weights?.[k])||g.weights[k]<1||g.weights[k]>4))throw new Error('Повреждены ожидания гостя.');
    if(g.roomId!==null){const key=g.roomId+':'+g.seat;if(!rooms.has(g.roomId)||!Number.isInteger(g.seat)||g.seat<0||g.seat>3||seats.has(key))throw new Error('Повреждены места.');seats.add(key);}else if(g.seat!==null)throw new Error('Повреждено свободное место.');
    // JSON cannot preserve shared object identity. Rebuild reply selection.
    if(g.dialogue.length>QUESTIONS.length+2||g.dialogue.some(a=>!QUESTIONS.some(q=>q.id===a.questionId)||!Number.isInteger(a.variant)||a.variant<0||a.variant>(a.questionId==='stories'?2:0)))throw new Error('Повреждён разговор.');
    g.dialogue.forEach(a=>{a.reply=answerText(g,a.questionId,a.variant);});
    if(g.lastAnswer)g.lastAnswer=g.dialogue.find(a=>a.questionId===g.lastAnswer.questionId&&a.variant===g.lastAnswer.variant)??null;
  }
  const refreshArt=g=>{const authored=IDENTITIES.find(i=>i.id===g.identity?.id);if(authored)g.identity=structuredClone(authored);};
  const refreshMaster=room=>{const authored=MASTERS.find(m=>m.id===room.master?.id),session=SESSIONS.find(s=>s.id===room.session?.id);if(!authored||!session)throw new Error('Неизвестный мастер или игра.');for(const key of ['identity','detail','style','skills'])room.master[key]=structuredClone(authored[key]);for(const key of ['premise','rulesText','paceText'])room.session[key]=session[key];};
  for(const room of club.rooms){
    refreshMaster(room);
    if(room.capacity!==4||!['seating','running'].includes(room.status)||!Number.isInteger(room.turn)||room.turn<0||!Number.isInteger(room.session?.minutes)||room.session.minutes<120||room.session.minutes>360)throw new Error('Повреждена комната.');
    if(room.status==='running'){
      const run=room.run;if(!run||![1,RATING_VERSION].includes(run.ratingVersion??1)||run.endsAt<=club.clock||run.endsAt!==run.startedAt+run.room.session.minutes/60||run.guests.length!==4||new Set(run.guests.map(g=>g.id)).size!==4||run.guests.some(g=>!roomOccupants(club,room.id).some(p=>p.id===g.id)))throw new Error('Повреждена активная сессия.');run.guests.forEach(refreshArt);refreshMaster(run.room);freeze(run);
    }
  }
  club.departures?.forEach(d=>d.guests.forEach(refreshArt));club.lastReport?.completed.forEach(r=>r.reviews.forEach(refreshArt));
  if(!ids.has(club.selectedId))club.selectedId=waitingGuests(club)[0]?.id??null;
  freeze(club.lastReport);club.drag=null;club.phase='placing';
  // Top up older saves without advancing time or removing any existing visitor.
  replenish(club,{removeExpired:false});return club;
}
