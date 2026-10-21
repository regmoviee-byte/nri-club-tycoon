import { generateVisitor,normalizeSeed,hash } from './generator.js';
import { ROOM_COUNT,ROOM_CAPACITY,GUEST_COUNT,SESSIONS,MASTERS,HABITS,QUESTIONS } from '../data/club.js';
import { IDENTITIES,IDENTITY_AGE_MIX,SPARSE_PORTRAIT_IDS,experienceReply } from '../data/identities.js';
import { assessGroup,assessGuest,better } from './assessment.js';
import { shuffled,feasibleGrouping,searchArrangement } from './search.js';
import {roomOperational} from './layout-club.js';
import {preferenceAnswer} from './preferences.js';
import {guestSeatNumbers} from './group-size.js';
import {captureGuestConversation} from './guests-history.js';
export { assessGroup,assessGuest,searchArrangement,feasibleGrouping };
export const actorById=(shift,id)=>shift.guests.find(g=>g.id===id);
export const roomById=(shift,id)=>shift.rooms.find(r=>r.id===id);
export const roomOccupants=(shift,id)=>shift.guests.filter(g=>g.roomId===id).sort((a,b)=>a.seat-b.seat);
export const assignedCount=shift=>shift.guests.filter(g=>g.roomId).length;
export const isReady=shift=>shift.guests.length===GUEST_COUNT&&shift.rooms.length===ROOM_COUNT&&shift.rooms.every(r=>roomOccupants(shift,r.id).length===r.capacity);
function roomsFrom(sessions,masters){return sessions.map((session,i)=>({id:`room-${i+1}`,number:i+1,capacity:ROOM_CAPACITY,session:structuredClone(session),master:structuredClone(masters[i])}));}
export function createFallbackRooms(){return roomsFrom(SESSIONS.filter(s=>s.minutes<=120&&!s.requiredTopics.length).slice(0,ROOM_COUNT),MASTERS.slice(0,ROOM_COUNT));}
export function createShift(seed){
  const canonical=normalizeSeed(seed),ageDeck=IDENTITY_AGE_MIX.flatMap(band=>{
    const pool=IDENTITIES.filter(i=>i.age>=band.min&&i.age<=band.max),ordinary=shuffled(pool.filter(i=>!SPARSE_PORTRAIT_IDS.includes(i.id)),canonical+'|age-band|'+band.min),sparse=shuffled(pool.filter(i=>SPARSE_PORTRAIT_IDS.includes(i.id)),canonical+'|sparse');
    const count=band.min===18&&(hash('portrait-quota|'+canonical)>>>17)%4===0?1:0;
    return ordinary.slice(0,band.count-count).concat(sparse.slice(0,count));
  }),identities=shuffled(ageDeck,canonical+'|identities'),guests=[];
  for(let index=0;guests.length<GUEST_COUNT&&index<200;index++){
    const profile=generateVisitor(canonical,index);if(profile.format.id==='solo')continue;
    const identity=structuredClone(identities[guests.length]);profile.name=identity.name;profile.age=identity.age;
    const habit=structuredClone(HABITS[hash(`${canonical}|${index}|habit`)%HABITS.length]);
    guests.push({id:profile.id,profile,identity,habit,roomId:null,seat:null,asked:[],storyIndex:0,dialogue:[],lastAnswer:null});
  }
  if(guests.length!==GUEST_COUNT)throw new Error('Не удалось подготовить двадцать гостей.');
  let rooms,feasible,attempt;
  for(attempt=0;attempt<8;attempt++){
    rooms=roomsFrom(shuffled(SESSIONS,canonical+'|games|'+attempt).slice(0,ROOM_COUNT),shuffled(MASTERS,canonical+'|masters|'+attempt).slice(0,ROOM_COUNT));
    feasible=feasibleGrouping(rooms,guests,canonical+'|feasibility');if(feasible)break;
  }
  if(!feasible){rooms=createFallbackRooms();feasible=feasibleGrouping(rooms,guests,canonical+'|fallback');}
  if(!feasible)throw new Error('Нет допустимой рассадки в резервном наборе.');
  return{version:3,seed:canonical,rooms,guests,selectedId:guests[0].id,phase:'placing',drag:null,report:null,generationAttempts:Math.min(attempt+1,9)};
}
export function greeting(g){return g.profile.experience.id==='new'?'Привет. Это моя первая игра здесь. Давайте сначала немного поговорим?':'Привет! Какие игры сегодня идут? Хочется найти подходящую компанию.';}
const rulesReplies={light:'Хочу меньше бросков и расчётов и больше самой истории.',flexible:'Нужны общие правила. А об исключениях давайте договариваться вслух.',precise:'Мне важно понимать, что бросить и посчитать, чтобы узнать результат действия.'};
const paceReplies={reflective:'Мне нужны паузы перед важным выбором. Люблю успеть подумать.',varied:'Люблю чередовать активные сцены и спокойные разговоры.',brisk:'Хочется коротких сцен и заметного движения вперёд. Долгая подготовка утомляет.'};
const participationReplies={invited:'Мне легче вступить, когда меня прямо спрашивают. Если просто ждать инициативы, я могу не успеть включиться.',shared:'Люблю предложить идею и передать ход. Хочется, чтобы всем хватило внимания.',proactive:'Идей обычно много. Если я увлекусь, можно напомнить передать ход другим.'};
export function answerText(g,q,variant=0){
  const v=g.profile;if(q==='stories'){const work=v.tastes[variant%v.tastes.length];return`Из любимого — ${work.title}. Цепляет вот что: ${work.why}. ${v.wish}`;}
  const specific=preferenceAnswer(g,q);if(specific!==null)return specific;
  if(q==='rules')return rulesReplies[v.traits.rules.id];if(q==='pace')return paceReplies[v.traits.pace.id];
  if(q==='time'&&g.schedule){
    const minute=Math.round(g.schedule.leaveAt*60),precise=(g.dialogueVersion??1)>=2;
    const hour=precise?Math.floor((minute%1440)/60):Math.floor(g.schedule.leaveAt%24),day=precise?Math.floor(minute/1440)+1:Math.floor(g.schedule.leaveAt/24)+1;
    const time=precise?`${hour}:${String(minute%60).padStart(2,'0')}`:`${hour}:00`;
    return `Обычно мне удобно ${g.schedule.preferred[0]===g.schedule.preferred[1]?g.schedule.preferred[0]:g.schedule.preferred.join('–')} ч за столом. Сегодня могу до ${time}${day>1?' (день '+day+')':''}; время ожидания тоже входит.`;
  }
  if(q==='time')return v.context;
  if(q==='priorities')return g.ratingPriority??'Главное — услышать ожидания друг друга и договориться перед игрой.';
  if(q==='boundaries')return v.boundaries.map(b=>b.text).join(' ');if(q==='habits')return g.habit.reply;
  if(q==='experience')return experienceReply(g);return participationReplies[v.traits.initiative.id];
}
export function askQuestion(shift,id,q){
  const g=actorById(shift,id);if(!g||shift.phase!=='placing'||!QUESTIONS.some(v=>v.id===q))return null;
  if(roomById(shift,g.roomId)?.status==='running'){const heard=g.dialogue.findLast(a=>a.questionId===q);if(heard)g.lastAnswer=heard;return heard??null;}
  const variant=q==='stories'?g.storyIndex:0;if(q==='stories')g.storyIndex=(g.storyIndex+1)%3;
  let answer=g.dialogue.find(a=>a.questionId===q&&a.variant===variant);const created=!answer;
  if(!answer){answer={questionId:q,variant,reply:answerText(g,q,variant)};g.dialogue.push(answer);}
  if(!g.asked.includes(q))g.asked.push(q);g.lastAnswer=answer;captureGuestConversation(shift,g,created?{questionId:q,variant}:null);return answer;
}
export function recallAnswer(shift,id,index){const g=actorById(shift,id);if(!g||!g.dialogue[index])return null;g.lastAnswer=g.dialogue[index];return g.lastAnswer;}
export function assignGuest(shift,id,roomId,preferredSeat=null){
  if(shift.phase!=='placing')return{ok:false,reason:'Итог зафиксирован. Выберите явный повтор рассадки.'};
  const g=actorById(shift,id),r=roomById(shift,roomId);if(!g||!r)return{ok:false,reason:'Гость или комната не найдены.'};
  if(!roomOperational(shift,roomId))return{ok:false,reason:'Сначала оборудуйте комнату и откройте проход ко всем пяти стульям.'};
  if(r.status==='running'||roomById(shift,g.roomId)?.status==='running')return{ok:false,reason:'Эта сессия уже идёт. Пересаживать можно до её запуска.'};
  const occupied=roomOccupants(shift,roomId).filter(p=>p.id!==id).map(p=>p.seat),available=guestSeatNumbers(r),seat=preferredSeat??available.find(i=>!occupied.includes(i));
  if(!Number.isInteger(seat)||!available.includes(seat)||occupied.includes(seat))return{ok:false,reason:'Место занято или стул отсутствует. Выберите свободное место.',needsSwap:true,roomId};
  g.roomId=roomId;g.seat=seat;return{ok:true,roomId,seat};
}
export function swapGuests(shift,aId,bId){
  if(shift.phase!=='placing')return{ok:false,reason:'Итог зафиксирован.'};
  const a=actorById(shift,aId),b=actorById(shift,bId);if(!a||!b||a===b)return{ok:false,reason:'Выберите двух разных гостей.'};
  if([a,b].some(g=>g.roomId&&!roomOperational(shift,g.roomId)))return{ok:false,reason:'К одному из мест нет доступа.'};
  if([a,b].some(g=>roomById(shift,g.roomId)?.status==='running'))return{ok:false,reason:'Гости уже играют. Их места сохранятся до конца сессии.'};
  [a.roomId,b.roomId]=[b.roomId,a.roomId];[a.seat,b.seat]=[b.seat,a.seat];return{ok:true,swapped:true};
}
export function unassignGuest(shift,id){const g=actorById(shift,id);if(!g||shift.phase!=='placing'||roomById(shift,g.roomId)?.status==='running')return false;g.roomId=null;g.seat=null;return true;}
export function beginDrag(shift,id){const g=actorById(shift,id);if(shift.phase!=='placing'||shift.drag||!g||roomById(shift,g.roomId)?.status==='running')return false;shift.drag={guestId:id};return true;}
export function cancelDrag(shift){shift.drag=null;}
export function endDrag(shift,roomId,seat=null){
  if(!shift.drag)return{ok:false,reason:'Сначала выберите гостя.'};const id=shift.drag.guestId;cancelDrag(shift);
  if(!roomId||!Number.isInteger(seat))return{ok:false,cancelled:true,reason:'Гость остаётся на своём месте.'};
  if(seat!==null){const other=roomOccupants(shift,roomId).find(g=>g.seat===seat);if(other&&other.id!==id)return swapGuests(shift,id,other.id);}
  return assignGuest(shift,id,roomId,seat);
}
export function assessArrangement(shift){return shift.rooms.map(r=>({roomId:r.id,guestIds:roomOccupants(shift,r.id).map(g=>g.id),...assessGroup(r,roomOccupants(shift,r.id))}));}
function frozen(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
export function checkShift(shift){
  if(shift.phase==='checked'&&shift.report)return{ok:true,report:shift.report};
  if(!isReady(shift))return{ok:false,reason:'Сначала назначьте всех двадцать гостей в пять комнат.'};
  const rooms=assessArrangement(shift),actual=rooms.reduce((sum,r)=>({hard:sum.hard+r.hard,soft:sum.soft+r.soft}),{hard:0,soft:0});
  const groups=shift.rooms.map(r=>roomOccupants(shift,r.id).map(g=>shift.guests.indexOf(g)));
  const found=searchArrangement(shift.rooms,shift.guests,{seed:shift.seed+'|review',initialGroups:groups}),alternatives=[];
  for(let a=0;a<shift.guests.length;a++)for(let b=a+1;b<shift.guests.length;b++){
    const one=shift.guests[a],two=shift.guests[b];if(one.roomId===two.roomId)continue;
    const ri=shift.rooms.findIndex(r=>r.id===one.roomId),si=shift.rooms.findIndex(r=>r.id===two.roomId);
    const oneGroup=roomOccupants(shift,one.roomId),twoGroup=roomOccupants(shift,two.roomId);
    const afterA=assessGroup(shift.rooms[ri],oneGroup.map(g=>g.id===one.id?two:g)),afterB=assessGroup(shift.rooms[si],twoGroup.map(g=>g.id===two.id?one:g));
    const before={hard:rooms[ri].hard+rooms[si].hard,soft:rooms[ri].soft+rooms[si].soft},after={hard:afterA.hard+afterB.hard,soft:afterA.soft+afterB.soft};
    if(better(after,before))alternatives.push({a:one.id,b:two.id,roomIds:[one.roomId,two.roomId],hardImprovement:before.hard-after.hard,softImprovement:before.soft-after.soft});
  }
  alternatives.sort((a,b)=>b.hardImprovement-a.hardImprovement||b.softImprovement-a.softImprovement);
  const noPerfectGuest=shift.guests.filter(g=>shift.rooms.every(r=>{const x=assessGuest(r,g);return x.hard>0||x.soft>0;})).map(g=>g.id);
  shift.phase='checked';shift.report=frozen({rooms,actual,reference:{hard:found.hard,soft:found.soft,method:found.method,provenOptimal:false,checkedSwaps:found.checkedSwaps},notWorseThanFound:!better(found,actual),alternatives,noPerfectGuest});
  return{ok:true,report:shift.report};
}
export function resumeShift(shift){shift.phase='placing';shift.report=null;}
