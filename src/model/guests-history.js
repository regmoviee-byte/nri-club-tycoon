import {hash} from './generator.js';
import {experiences,motifs,boundaries} from '../data/catalog.js';
import {SYSTEMS} from '../data/systems.js';
import {SCENES} from '../data/preferences.js';
import {DIALOGUE_VERSION} from './preferences.js';

const copy=structuredClone;
const own=(object,key)=>Object.hasOwn(object,key);
const draw=text=>{let n=hash(text);n^=n>>>16;n=Math.imul(n,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);return(n^(n>>>16))>>>0;};
const activeGuests=club=>[...(club.guests??[]),...(club.receptionAway??[])];
function registryFor(club){
 if(!club.guestRegistry)club.guestRegistry={version:1,persons:{},visits:{},requests:{},outcomes:{}};
 if(club.guestRegistry.version!==1)throw new Error('Неизвестная версия истории посетителей.');
 return club.guestRegistry;
}
function register(club,guest){
 const registry=registryFor(club);
 guest.personId??='person:'+guest.id;guest.visitId??=guest.id;
 if(guest.visitId!==guest.id)throw new Error('Идентификатор визита не совпадает с гостем.');
 if(!own(registry.persons,guest.personId))registry.persons[guest.personId]={
  id:guest.personId,identity:copy(guest.identity),profile:copy(guest.profile),preferences:copy(guest.preferences),avoidGenres:copy(guest.avoidGenres??[]),habit:copy(guest.habit),weights:copy(guest.weights??{}),ratingPriority:guest.ratingPriority,dialogueVersion:guest.dialogueVersion??1,
  preferredDuration:copy(guest.schedule.preferred),initialExperience:guest.profile.experience.id,visits:0,played:0,availableAfter:club.clock,knownAnswers:{},history:[],programs:{},favoriteAdventureId:null,
 };
 const person=registry.persons[guest.personId];
 if(!own(registry.visits,guest.visitId)){
  registry.visits[guest.visitId]={id:guest.visitId,personId:person.id,arrivedAt:guest.schedule.arrivalAt,status:'present'};
  person.visits++;person.lastVisitId=guest.visitId;
 }
 return guest;
}
export function ensureGuestRegistry(club){
 const registry=registryFor(club);
 for(const guest of activeGuests(club))register(club,guest);
 return registry;
}
export function registerGuestVisit(club,guest){ensureGuestRegistry(club);return register(club,guest);}
export function hasGuestIdentity(club,identityId){return Object.values(ensureGuestRegistry(club).persons).some(p=>p.identity.id===identityId);}

// The campaign owns the pool size and chooses an allowed visual age mix. No
// library purchase is an input here, and an unavailable regular never leaves
// the reception empty: the caller creates a new person when this returns null.
export function returningGuest(club,arrival,{opening=false,identityAllowed=()=>true}={}){
 const registry=ensureGuestRegistry(club);
 if(opening||draw(club.seed+'|returning|'+arrival)%100>=45)return null;
 const active=new Set(activeGuests(club).map(g=>g.personId)),identities=new Set(activeGuests(club).map(g=>g.identity.id));
 const eligible=Object.values(registry.persons).filter(p=>!active.has(p.id)&&!identities.has(p.identity.id)&&registry.visits[p.lastVisitId]?.status!=='present'&&p.availableAfter<=club.clock&&identityAllowed(p.identity));
 if(!eligible.length)return null;
 const person=eligible.toSorted((a,b)=>draw(club.seed+'|return-choice|'+arrival+'|'+a.id)-draw(club.seed+'|return-choice|'+arrival+'|'+b.id)||a.id.localeCompare(b.id))[0];
 const id='visit:'+person.id+':'+arrival;if(own(registry.visits,id))return null;
 const budget=2+draw(club.seed+'|visit-time|'+id)%9;
 return{id,visitId:id,personId:person.id,profile:copy(person.profile),identity:copy(person.identity),preferences:copy(person.preferences),avoidGenres:copy(person.avoidGenres),habit:copy(person.habit),weights:copy(person.weights),ratingPriority:person.ratingPriority,dialogueVersion:DIALOGUE_VERSION,playedAtClub:person.played,startedAsNovice:person.initialExperience==='new',roomId:null,seat:null,asked:[],storyIndex:0,dialogue:[],lastAnswer:null,schedule:{arrivalAt:club.clock,leaveAt:club.clock+budget,preferred:copy(person.preferredDuration)}};
}

function request(registry,guest,kind,value,at){
 const id=guest.visitId+'|'+kind+'|'+value;
 registry.requests[id]??={id,visitId:guest.visitId,personId:guest.personId,kind,value,at:Number.isFinite(at)?at:null};
}
export function captureGuestConversation(club,guest,actualAnswer=null){
 if(!club.finance||club.version<6)return;
 registerGuestVisit(club,guest);const registry=registryFor(club),person=registry.persons[guest.personId];
 for(const answer of guest.dialogue){
  const key=answer.questionId+'|'+answer.variant;
  if(person.knownAnswers[key]?.visitId!==guest.visitId){
   const previous=person.knownAnswers[key];
   // Archive only on a real conversation capture. Reading an old save remains
   // pure, and repeating a question cannot erase what was said last visit.
   if(previous){
    (person.previousAnswers??={})[key]=copy(previous);
    const oldVisit=registry.visits[previous.visitId];
    if(oldVisit)(oldVisit.answers??={})[key]??=copy(previous);
   }
   person.knownAnswers[key]={questionId:answer.questionId,variant:answer.variant,reply:answer.reply,visitId:guest.visitId,at:actualAnswer?.questionId===answer.questionId&&actualAnswer?.variant===answer.variant?club.clock:null};
  }
  (registry.visits[guest.visitId].answers??={})[key]??=copy(person.knownAnswers[key]);
  const at=person.knownAnswers[key].at,heard=(kind,value)=>request(registry,guest,kind,value,at);
  // The summary is evidence from literal saved replies, not a second read of
  // today's private profile. This also preserves truth for old dialogue text.
  const text=answer.reply;
  if(answer.questionId==='stories')for(const motif of motifs)if(text.includes(motif.wish))heard('genre',motif.id);
  if(answer.questionId==='knowledge')for(const match of text.matchAll(/(?:Знаю основы:|Знаю свой лист:|Правила хорошо знаю:|Уверенно играю:|Могу быстро найти нужное правило:)\s*([^.!?]*)/g))for(const[id,system]of Object.entries(SYSTEMS))if(match[1].includes(system.name))heard('knownSystem',id);
  if(answer.questionId==='avoidGenres')for(const motif of motifs)if(text.includes(motif.label))heard('avoidGenre',motif.id);
  if(answer.questionId==='boundaries')for(const b of boundaries)if(text.includes(b.text))heard('boundary',b.id);
  if(answer.questionId==='scenes')for(const[id,label]of Object.entries(SCENES))if(text.includes('Больше всего люблю '+label+'.'))heard('scene',id);
  if(answer.questionId==='tone'){const id=text.includes('всерьёз')?'serious':text.includes('лёгкую, смешную')?'comic':text.includes('Люблю и пошутить')?'mixed':null;if(id)heard('tone',id);}
  if(answer.questionId==='stakes'){const id=text.includes('доживёт')?'safe':text.includes('настоящий риск')?'lethal':text.includes('Смерть героя принимаю')?'risk':null;if(id)heard('stakes',id);}
  if(answer.questionId==='time'){const match=text.match(/Обычно мне удобно (\d)(?:–(\d))? ч/);if(match)heard('duration',[match[1],match[2]??match[1]].join('–'));}
 }
}

export function recordGuestDeparture(club,guest,reason='dismissed'){
 registerGuestVisit(club,guest);captureGuestConversation(club,guest);
 const registry=registryFor(club),visit=registry.visits[guest.visitId],person=registry.persons[guest.personId];
 if(visit.status!=='present')return false;
 visit.status=reason==='completed'?'completed':'dismissed';visit.closedAt=club.clock;visit.expired=guest.schedule.leaveAt<=club.clock;
 // A dismissal never rewrites preferences or invents a negative review.
 person.availableAfter=Math.max(person.availableAfter,club.clock+8);return true;
}

export function recordGuestOutcome(club,run,reviews){
 const registry=ensureGuestRegistry(club);let recorded=0;
 for(const review of reviews){
  if(own(registry.outcomes,review.reviewId))continue;
  const original=run.guests.find(g=>g.id===review.guestId);if(!original)continue;
  // Do not attach metadata to the frozen, possibly V1–V4, run snapshot.
  const guest=activeGuests(club).find(g=>g.id===original.id)??copy(original);register(club,guest);captureGuestConversation(club,guest);
  const person=registry.persons[guest.personId],session=run.room.session,system=session.systemId;
  const reasons=[...new Set([review.text,...(review.violations??[]),...(review.events??[]).filter(e=>e.fit<.95).map(e=>e.text)])].slice(0,4);
  const memory={reviewId:review.reviewId,visitId:guest.visitId,at:run.endsAt,adventureId:session.id,title:session.title,systemId:system,masterId:run.room.master.id,masterName:run.room.master.name,score:review.score,text:review.text,reasons};
  registry.outcomes[review.reviewId]={reviewId:review.reviewId,visitId:guest.visitId,personId:person.id,systemId:system,adventureId:session.id,score:review.score};
  person.history.push(memory);person.history=person.history.slice(-8);person.played++;
  const program=person.programs[session.id]??={id:session.id,title:session.title,systemId:system,plays:0,totalScore:0,disappointments:0};
  program.plays++;program.totalScore+=review.score;program.lastScore=review.score;program.disappointments=review.score<6?program.disappointments+1:0;
  person.favoriteAdventureId=Object.values(person.programs).filter(p=>p.totalScore/p.plays>=8).toSorted((a,b)=>b.totalScore/b.plays-a.totalScore/a.plays||a.id.localeCompare(b.id))[0]?.id??null;
  const delay=review.score>=8?8:review.score>=6?16:32+Math.min(2,program.disappointments-1)*16;
  person.availableAfter=run.endsAt+delay;
  const served=review.workload?.servedById?.[guest.id]??review.workload?.served??0,current=person.preferences.knowledge[system]??0;
  if(current<2&&review.score>=6&&served>=.9)person.preferences.knowledge[system]=current+1;
  if(person.initialExperience==='new')person.profile.experience=copy(experiences.find(e=>e.id==='some'));
  const visit=registry.visits[guest.visitId];visit.status='completed';visit.closedAt=run.endsAt;visit.reviewId=review.reviewId;
  recorded++;
 }
 return recorded;
}

export function visibleGuestHistory(club,guest){
 const registry=club.guestRegistry,person=registry?.persons?.[guest.personId];if(!person)return null;
 const favorite=person.programs[person.favoriteAdventureId];
 const previous={...person.previousAnswers};
 for(const[key,answer]of Object.entries(person.knownAnswers))if(answer.visitId!==guest.visitId)previous[key]=answer;
 const currentAnswers=guest.dialogue.map(a=>{const recorded=person.knownAnswers[a.questionId+'|'+a.variant];return{...copy(a),at:recorded?.visitId===guest.visitId&&Number.isFinite(recorded.at)?recorded.at:null};});
 return{personId:person.id,visits:person.visits,played:person.played,returning:person.visits>1,favorite:favorite?{title:favorite.title,systemId:favorite.systemId}:null,recent:copy(person.history),knownAnswers:copy(Object.values(previous).filter(a=>a.visitId!==guest.visitId)),currentAnswers};
}
export function visibleDemand(club){
 const registry=club.guestRegistry;if(!registry)return{genres:[],knownSystems:[],avoidedGenres:[],boundaries:[],scenes:[],durations:[],played:[],unserved:0};
 // A single pass avoids rescanning years of conversations for each UI column.
 // Old records without a timestamp remain explicitly undated.
 const groups=new Map();for(const item of Object.values(registry.requests)){
  if(!groups.has(item.kind))groups.set(item.kind,new Map());const group=groups.get(item.kind);
  const row=group.get(item.value)??{id:item.value,count:0,lastHeardAt:null,undatedCount:0};row.count++;
  if(Number.isFinite(item.at))row.lastHeardAt=Math.max(row.lastHeardAt??-Infinity,item.at);else row.undatedCount++;
  group.set(item.value,row);
 }
 const summarize=kind=>[...(groups.get(kind)?.values()??[])].sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
 const genreName=id=>motifs.find(m=>m.id===id)?.label??id;
 const played=new Map();for(const item of Object.values(registry.outcomes)){const row=played.get(item.systemId)??{id:item.systemId,name:SYSTEMS[item.systemId]?.name??item.systemId,count:0,paid:0,declinedPayment:0};row.count++;if(item.score>=6)row.paid++;else row.declinedPayment++;played.set(item.systemId,row);}
 return{genres:summarize('genre').map(r=>({...r,name:genreName(r.id)})),knownSystems:summarize('knownSystem').map(r=>({...r,name:SYSTEMS[r.id]?.name??r.id})),avoidedGenres:summarize('avoidGenre').map(r=>({...r,name:genreName(r.id)})),boundaries:summarize('boundary').map(r=>({...r,name:boundaries.find(b=>b.id===r.id)?.label??r.id})),scenes:summarize('scene').map(r=>({...r,name:SCENES[r.id]??r.id})),durations:summarize('duration'),played:[...played.values()],unserved:Object.values(registry.visits).filter(v=>v.status==='dismissed').length};
}

export function validateGuestRegistry(club){
 const registry=registryFor(club);
 if(!registry.persons||!registry.visits||!registry.requests||!registry.outcomes)throw new Error('Повреждена история посетителей.');
 for(const[id,person]of Object.entries(registry.persons))if(person.id!==id||!person.identity?.id||!person.profile||!person.preferences||!Number.isInteger(person.visits)||person.visits<1||!Number.isInteger(person.played)||person.played<0||!Number.isFinite(person.availableAfter)||!Array.isArray(person.history)||!person.programs||!person.knownAnswers)throw new Error('Повреждена постоянная личность гостя.');
 for(const[id,visit]of Object.entries(registry.visits))if(visit.id!==id||!own(registry.persons,visit.personId)||!Number.isFinite(visit.arrivedAt)||!['present','completed','dismissed'].includes(visit.status))throw new Error('Повреждён визит гостя.');
 const active=activeGuests(club);if(new Set(active.map(g=>g.personId)).size!==active.length)throw new Error('Один человек не может находиться в клубе дважды.');
 for(const guest of active)if(!own(registry.persons,guest.personId)||registry.visits[guest.id]?.personId!==guest.personId||registry.visits[guest.id]?.status!=='present'||guest.visitId!==guest.id)throw new Error('Гость не связан со своим визитом.');
 return true;
}
