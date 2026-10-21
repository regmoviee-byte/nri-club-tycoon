import {gameProduct} from '../data/commerce.js';
import {masterPreferences,sessionProgram} from './preferences.js';
import {askQuestion} from './club.js';
import {CAMPAIGN_RATING_VERSION,learningComplexityMultiplier,learningMaterialAllowance,tableWorkloadV9} from './campaign-rating.js';
import {itemContext,contextualLearningAllowance} from './item-context.js';
import {planningGuest} from './guest-knowledge.js';
import {groupLimits} from './group-size.js';

const basic=[['time','время'],['stories','интересы'],['boundaries','границы'],['avoidGenres','отказ от жанров'],['commitment','формат встречи'],['knowledge','знание системы'],['learning','способ обучения']];
const note=(code,text,tone='good')=>({code,text,tone});
const heard=(guest,id)=>(guest.asked??[]).includes(id);
const name=guest=>guest.profile?.name??guest.identity?.name??'Гость';
const duration=hours=>Number.isInteger(hours)?String(hours):String(Math.round(hours*10)/10).replace('.',',');
export const QUICK_INTERVIEW_QUESTIONS=Object.freeze(['stories','time','boundaries','avoidGenres','commitment','knowledge','learning','participation']);

// An explicit management action: real conversations, no time advance and no
// automatic seating. Skipping heard questions makes repeat clicks harmless.
export function quickInterview(club,guestId){
 const guest=club.guests.find(person=>person.id===guestId);
 if(!guest)return{ok:false,reason:'Гость не найден.'};
 if(club.phase!=='placing'||club.rooms.some(room=>room.id===guest.roomId&&room.status==='running'))return{ok:false,reason:'Гость уже играет. Поговорить можно перед следующей партией.'};
 const asked=[],answers=[];
 const known=new Set(planningGuest(club,guest).asked);
 for(const id of QUICK_INTERVIEW_QUESTIONS){
  if(known.has(id))continue;
  const answer=askQuestion(club,guestId,id);
  if(!answer)return{ok:false,reason:'Не удалось закончить знакомство.',asked,answers};
  asked.push(id);answers.push(answer);
 }
 return{ok:true,guestId,asked,answers};
}

// Planning uses the conversation flags before reading any private preference.
// Unknown facts can never change its output. It offers reasons, not a solved
// arrangement or a prediction of the guest's exact final review.
export function tablePlan(club,roomId){
 const source=club.rooms.find(room=>room.id===roomId);
 if(!source)return{count:0,capacity:4,rows:[],summary:[note('room-missing','Комната не найдена.','warning')],unknownCount:0};
 const running=source.status==='running'&&source.run,room=running?source.run.room:source;
 const guests=(running?source.run.guests:club.guests.filter(guest=>guest.roomId===roomId).map(guest=>planningGuest(club,guest))).toSorted((a,b)=>(a.seat??0)-(b.seat??0));
 const session=room.session,master=room.master?masterPreferences(room.master):null;
 const hours=session?.minutes/60??source.hours??2,end=running?source.run.endsAt:club.clock+hours;
 const program=session?room.program??sessionProgram(session):null,summary=[],rows=[];
 const version=running?source.run.ratingVersion??CAMPAIGN_RATING_VERSION:CAMPAIGN_RATING_VERSION;
 const equipment=running?room.equipment??[]:(club.layout?.objects??[]).filter(item=>(room.layout?.items??[]).includes(item.id));
 const has=kind=>equipment.some(item=>item.enabled!==false&&(item.kind??item.type)===kind);
 const tablet=has('tablet'),board=has('whiteboard')||has('board');
 let unknownCount=0,storyKnown=0,storyMatched=0,teachingKnown=0,teachingDemand=0,materialSupport=0;
 const learners=[],helpers=[],learningNeeds=[];
 const limits=groupLimits(source);
 if(guests.length<limits.minimum)summary.push(note('seats',`За столом ${guests.length} из ${limits.maximum} гостей. Для этой истории нужны ещё ${limits.minimum-guests.length}.`,'warning'));
 else if(guests.length<limits.maximum)summary.push(note('seats',`Можно начать с ${guests.length} гостями или выбрать ещё ${limits.maximum-guests.length}. Зарплата мастера и содержание комнаты не уменьшаются.`));
 if(master&&version>=10&&guests.length>master.maxPlayers)summary.push(note('master-group',`Мастеру комфортно до ${master.maxPlayers} игроков; сейчас ${guests.length}. Внимания на каждого будет меньше, качество игры снизится.`,'warning'));
 if(!master)summary.push(note('master-missing','Назначьте мастера: без него нельзя проверить поддержку группы.','warning'));
 if(!session)summary.push(note('story-missing','Выберите приключение: от него зависят время и содержание игры.','warning'));
 for(const guest of guests){
  const notes=[],p=guest.preferences,profile=guest.profile,missing=basic.filter(([id])=>!heard(guest,id)).map(([,label])=>label);
  if(missing.length){unknownCount++;notes.push(note('unknown','Ещё не уточнены: '+missing.join(', ')+'.','unknown'));}
  if(session&&heard(guest,'time')&&guest.schedule){
   if(guest.schedule.leaveAt<end)notes.push(note('deadline',`Не успевает до конца: нужно уйти раньше окончания ${duration(hours)}-часовой игры.`,'warning'));
   else{
    const [low,high]=guest.schedule.preferred;
    notes.push(hours<low||hours>high?note('duration',`Обычно удобны ${low===high?low:low+'–'+high} ч; эта история длится ${duration(hours)} ч.`,'warning'):note('duration','Время до конца и длительность подходят.'));
   }
  }
  if(session&&heard(guest,'stories')){
   storyKnown++;const primary=profile.genres[0]?.id,match=session.genres.includes(primary);
   if(match)storyMatched++;
   notes.push(match?note('story','Основной интерес совпадает с историей.'):note('story','У истории другой основной жанровый акцент.','warning'));
  }
  if(session&&heard(guest,'boundaries')){
   const conflict=(profile.boundaries??[]).filter(boundary=>session.requiredTopics.includes(boundary.id));
   notes.push(conflict.length?note('boundaries','В истории есть тема, которую гость просил исключить. Выберите другое приключение.','warning'):note('boundaries','Заявленные границы соблюдены.'));
  }
  if(session&&heard(guest,'avoidGenres')&&(guest.avoidGenres??[]).some(id=>session.genres.includes(id)))notes.push(note('avoid-genre','Гость прямо отказался от одного из жанров этой истории.','warning'));
  if(session&&heard(guest,'rules')&&profile.traits.rules.id==='light'&&session.rules==='precise')notes.push(note('rules','Гость просил меньше расчётов; в этой системе подробные процедуры.','warning'));
  if(session&&master&&heard(guest,'pace')){
   const pace=profile.traits.pace.id;
   if(pace!==session.pace&&session.pace!=='varied'&&!master.flexiblePace)notes.push(note('pace','Желаемый темп отличается, мастер держит заранее выбранный ритм.','warning'));
  }
  if(master&&heard(guest,'participation')&&p?.spotlight==='invited')notes.push(master.invites?note('participation','Мастер сам приглашает тихих игроков к действию.'):note('participation','Гость ждёт приглашения к ходу, а мастер ждёт инициативы.','warning'));
  if(master&&heard(guest,'houseRules')&&p?.rulesPolicy==='raw'&&master.rulesPolicy!=='raw')notes.push(note('house-rules','Гость хочет строго по книге, мастер использует изменения правил.','warning'));
  if(master&&heard(guest,'disputes')&&p?.disputes==='check'&&master.disputePolicy!=='check')notes.push(note('disputes','Гость хочет проверять спорное правило сразу; мастер обычно откладывает разбор.','warning'));
  if(program&&heard(guest,'tone')&&p&&p.tone!=='mixed'&&program.tone!=='mixed'&&p.tone!==program.tone)notes.push(note('tone','Настрой истории отличается от желаемого: серьёзность и юмор стоит обсудить.','warning'));
  if(program&&heard(guest,'stakes')&&p?.stakes==='safe'&&program.stakes==='lethal')notes.push(note('stakes','Гость хочет сохранить героя до финала; в истории возможна его гибель.','warning'));
  if(program&&heard(guest,'commitment')&&p){
   if(p.format!=='either'&&p.format!==program.format)notes.push(note('format','Желаемое число встреч не совпадает с форматом истории.','warning'));
   if(heard(guest,'time')&&p.breaks==='regular'&&hours>=4&&master&&!master.breaks)notes.push(note('breaks','Гость просит короткие перерывы, мастер не планирует регулярных пауз.','warning'));
  }
  if(session&&p&&heard(guest,'knowledge')&&heard(guest,'learning')){
   teachingKnown++;const knowledge=p.knowledge[session.systemId]??0;
   if(knowledge<2){
    const complexity=version>=8?learningComplexityMultiplier(session.systemId):gameProduct(session.systemId)?.complexity??1;
    const demand=complexity*{ahead:.35,table:.8,describe:1.2}[p.learning]*(knowledge===1?.75:1);
    teachingDemand+=demand;learners.push(guest);
    const allowance=version>=9?contextualLearningAllowance(equipment,{learning:p.learning,context:itemContext(session,program)}):version>=8?learningMaterialAllowance(equipment,{learning:p.learning,combat:p.scenes?.combat??0}):(tablet||board)&&p.learning!=='describe' ? .25 : 0;
    materialSupport+=Math.min(allowance,demand);
    learningNeeds.push({demand,allowance});
    notes.push(note('learning',knowledge===1?'Знает основы; на первых ходах нужна поддержка.':'Нужны объяснения правил этой системы.'));
   }else notes.push(note('knowledge','Правила системы уже знает.'));
  }else if(heard(guest,'experience')&&profile.experience.id==='new')notes.push(note('experience','Первая НРИ: уточните знание этой системы и способ обучения.','unknown'));
  if(session&&p&&heard(guest,'knowledge')&&heard(guest,'helpOthers')&&p.knowledge[session.systemId]>=2&&p.giveHelp!=='none')helpers.push(guest);
  const memory=guest.planningMemory??[];
  if(memory.length)notes.push(note('memory',`Учтены ответы из прошлого разговора (${memory.length}); сегодняшний срок, границы, отказ от жанров и знание системы уточняются заново.`));
  rows.push({guestId:guest.id,name:name(guest),tone:notes.some(n=>n.tone==='warning')?'warning':notes.some(n=>n.tone==='unknown')?'unknown':'good',notes,memory});
 }
 // A pair concern is shown only when the relevant answers of both people
 // were heard. Public facilitation skills may mitigate it without revealing
 // any other person's private traits.
 for(const row of rows){
  const guest=guests.find(g=>g.id===row.guestId),p=guest.preferences;
  if(!p)continue;
  for(const other of guests){
   if(other===guest||!other.preferences)continue;const q=other.preferences;
   if(heard(guest,'habits')&&heard(other,'helpOthers')&&p.receiveHelp==='none'&&q.giveHelp==='offers'&&(!q.asksBeforeHelping||!q.respectsNo)){
    row.notes.push(note('help-boundary',`${name(other)} сразу предлагает решения; ${master?.protectsChoices?'мастер защищает право отказаться от подсказки.':'стоит заранее договориться о подсказках.'}`,master?.protectsChoices?'good':'warning'));
   }
   if(heard(guest,'participation')&&heard(other,'participation')&&q.interrupts){
    row.notes.push(note('interruptions',`${name(other)} иногда перебивает; ${master?.facilitation>=.8?'мастер умеет возвращать слово.':'мастер не всегда успевает управлять спором.'}`,master?.facilitation>=.8?'good':'warning'));
   }
  }
  row.notes=row.notes.filter((n,index,all)=>all.findIndex(item=>item.code===n.code&&item.text===n.text)===index);
  row.tone=row.notes.some(n=>n.tone==='warning')?'warning':row.notes.some(n=>n.tone==='unknown')?'unknown':'good';
 }
 if(storyKnown)summary.push(note('story-fit',`Основной интерес совпадает с историей у ${storyMatched} из ${storyKnown} опрошенных.`,storyMatched===storyKnown?'good':'warning'));
 if(master&&learners.length){
  const fatigue=Math.max(0,Math.min(12,Number(master.fatigue)||0)),capacity=master.wantsTeaching?master.teachingCapacity*master.teachingSkill*(1-Math.max(0,fatigue-4)*.0225):0;
  let supported=learningNeeds.reduce((sum,need)=>{const allocated=Math.min(need.demand,capacity*need.demand/teachingDemand);return sum+allocated+Math.min(need.allowance,need.demand-allocated);},0);
  if(version>=9){
   const system=session.systemId,knownGuests=guests.map(guest=>{const g=structuredClone(guest);g.preferences??={};
    if(!heard(guest,'knowledge')||!heard(guest,'learning'))g.preferences.knowledge={...g.preferences.knowledge,[system]:2};
    if(!heard(guest,'helpOthers')||!heard(guest,'knowledge')){g.preferences.giveHelp='none';g.preferences.teachingSkill=0;g.preferences.respectsNo=true;}
    if(!heard(guest,'habits'))g.preferences.receiveHelp='none';return g;});
   const work=tableWorkloadV9({ratingVersion:9,room:{...room,master,equipment},guests:knownGuests});supported=work.served*work.demand;
  }
  const coverage=Math.min(1,supported/teachingDemand),overload=coverage<.9;
  const estimate=overload?`Для известных потребностей хватает примерно ${Math.round(coverage*10)*10}% поддержки мастера и материалов. Распределите новичков или подготовьте помощь.`:materialSupport>0?'Мастер и материалы обычно справляются с такой уточнённой нагрузкой.':'Мастер обычно справляется с такой уточнённой нагрузкой.';
  summary.push(note('teaching',`${learners.length} ${learners.length===1?'гостю нужны':'гостям нужны'} объяснения. `+estimate+(teachingKnown<guests.length?' У остальных способ обучения ещё не уточнён.':''),overload?'warning':teachingKnown<guests.length?'unknown':'good'));
  if(helpers.length)summary.push(note('peer-help','Знают систему и готовы помогать: '+helpers.map(name).join(', ')+'. Учитывайте согласие тех, кому нужна помощь.'));
 }
 if(unknownCount)summary.push(note('unknown',`У ${unknownCount} из ${guests.length} гостей ещё не уточнены важные условия. Прогноз опирается только на разговоры.`,'unknown'));
 if(!summary.length)summary.push(note('ready','По услышанным условиям явных рисков не видно. Окончательный результат зависит от состава и условий игры.'));
 return{count:guests.length,capacity:limits.maximum,minimumGuests:limits.minimum,rows,summary,unknownCount};
}
