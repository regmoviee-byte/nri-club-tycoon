import { CONTEXT_LIMITS } from '../data/club.js';

export function assessGuest(room,guest){
  const v=guest.profile,s=room.session,m=room.master,mandatory=[],needs=[],good=[];let soft=0;
  const limit=guest.schedule?Math.max(0,guest.schedule.leaveAt-(room.reviewAt??0))*60:CONTEXT_LIMITS.get(v.context);
  if(Number.isFinite(limit)&&s.minutes>limit)mandatory.push(`${v.name}: есть ${limit/60} ч, а учебный слот длится ${s.minutes/60} ч.`);
  for(const b of v.boundaries)if(s.requiredTopics.includes(b.id))mandatory.push(`${v.name}: «${b.text}» Слот включает тему «${s.topicText}».`);
  if(s.genres.includes(v.genres[0].id))good.push(`${v.name}: желание «${v.wish}» находит место в этой истории.`);
  else{soft+=2;needs.push(`${v.name}: «${v.wish}» У этой истории другой акцент.`);}
  if(v.traits.rules.id==='light'&&s.rules==='precise'){soft+=2;needs.push(`${v.name} просит меньше процедур, а здесь они подробные.`);}
  else if(v.traits.rules.id==='precise'&&s.rules==='light'&&!m.coaching){soft++;needs.push(`${v.name} просит ясную процедуру; мастер отдаёт разъяснения группе.`);}
  else good.push(`${v.name}: пожелания о правилах можно поддержать в этом слоте.`);
  if(v.traits.pace.id!=='varied'&&s.pace!==v.traits.pace.id&&s.pace!=='varied'&&!m.flexiblePace){soft++;needs.push(`${v.name}: «${v.traits.pace.text}» Ритм слота отличается, мастер не чередует его специально.`);}
  if(v.traits.initiative.id==='invited'){
    if(m.invites)good.push(`${v.name}: просьбу о приглашении в сцену поддерживает мастер ${m.name}.`);
    else{soft++;needs.push(`${v.name} легче включается по приглашению, а ${m.name} ждёт инициативы.`);}
  }
  if(guest.schedule){const hours=s.minutes/60,[low,high]=guest.schedule.preferred;if(hours<low||hours>high){soft++;needs.push(`${v.name}: обычно удобны встречи ${low}–${high} ч, здесь ${hours} ч.`);}}
  return{hard:mandatory.length,soft,mandatory,needs,good};
}
export function assessPair(room,a,b){
  const ids=new Set([a.habit.id,b.habit.id]),good=[],needs=[];let soft=0;
  if(ids.has('unsolicited')&&ids.has('own-space')){
    if(room.master.adviceBoundary)good.push(`${room.master.name} ограничивает непрошеные советы — это поддерживает разные способы участия.`);
    else{soft+=2;needs.push(`${a.profile.name} и ${b.profile.name}: один сразу советует, другому нужны советы только по запросу. Нужна договорённость.`);}
  }
  const paces=new Set([a.profile.traits.pace.id,b.profile.traits.pace.id]);
  if(paces.has('brisk')&&paces.has('reflective')){
    if(room.master.flexiblePace)good.push('Гости хотят разного ритма; мастер умеет чередовать действие и паузы.');
    else{soft++;needs.push(`${a.profile.name} и ${b.profile.name} хотят разного ритма; стоит договориться о паузах всей группы.`);}
  }
  return{soft,good,needs};
}
export function helpPenalty(room,guests){return!room.master.coaching&&!guests.some(g=>g.habit.id==='offer-help')?guests.filter(g=>g.habit.id==='ask-help').length:0;}
export function assessGroup(room,guests){
  const mandatory=[],needs=[],good=[];let hard=0,soft=0;
  for(const guest of guests){const part=assessGuest(room,guest);hard+=part.hard;soft+=part.soft;mandatory.push(...part.mandatory);needs.push(...part.needs);good.push(...part.good);}
  for(let i=0;i<guests.length;i++)for(let j=i+1;j<guests.length;j++){const p=assessPair(room,guests[i],guests[j]);soft+=p.soft;good.push(...p.good);needs.push(...p.needs);}
  const seeking=guests.filter(g=>g.habit.id==='ask-help');
  if(seeking.length){
    const missing=helpPenalty(room,guests);soft+=missing;
    if(missing)needs.push(`${seeking.map(g=>g.profile.name).join(', ')}: нужна помощь с правилами; мастер и соседи её пока не предложили.`);
    else good.push(room.master.coaching?`${room.master.name} поможет с первым ходом тем, кто просил поддержку.`:'В группе есть просьба о помощи и готовность помогать по запросу.');
  }
  return{hard,soft,mandatory,needs:[...new Set(needs)],good:[...new Set(good)]};
}
export const better=(a,b)=>!b||a.hard<b.hard||(a.hard===b.hard&&a.soft<b.soft);
export function buildCostModel(rooms,guests){
  const base=rooms.map(r=>guests.map(g=>assessGuest(r,g)));
  const pairs=rooms.map(r=>guests.map(a=>guests.map(b=>assessPair(r,a,b).soft)));
  const memo=new Map();
  return{base,score(roomIndex,indices){
    const key=roomIndex+':'+[...indices].sort((a,b)=>a-b).join(',');if(memo.has(key))return memo.get(key);
    let hard=0,soft=0;for(const index of indices){hard+=base[roomIndex][index].hard;soft+=base[roomIndex][index].soft;}
    for(let i=0;i<indices.length;i++)for(let j=i+1;j<indices.length;j++)soft+=pairs[roomIndex][indices[i]][indices[j]];
    soft+=helpPenalty(rooms[roomIndex],indices.map(i=>guests[i]));const result={hard,soft};memo.set(key,result);return result;
  }};
}
