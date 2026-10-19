// Educational rules, not a psychological measurement. Every input below is
// available through a guest's questions or the master's public description.
export const RATING_VERSION=2;
export const RATING_LABELS={game:'История',master:'Как ведёт мастер',company:'Компания за столом',duration:'Длительность'};
const KEYS=Object.keys(RATING_LABELS);
const average=items=>items.reduce((sum,item)=>sum+item.fit,0)/items.length;
const fact=(fit,text,question)=>({fit,text,question});

export function disclosedWeights(guest){
  // The priorities reply discloses the first two only. Do not secretly order
  // the remaining two criteria by their old generated weights of 1 and 2.
  const order=[...KEYS].sort((a,b)=>guest.weights[b]-guest.weights[a]);
  return Object.fromEntries(order.map((key,index)=>[key,index===0?4:index===1?3:1.5]));
}

export function ratingEvidence(run,guest){
 const {session:s,master:m}=run.room,p=guest.profile,others=run.guests.filter(g=>g.id!==guest.id),master=[],company=[];
 const primary=p.genres[0].id,story=s.genres.includes(primary);
 const game=[fact(story?1:0,story?'Главное пожелание к истории совпало с жанрами игры.':'Главное пожелание к истории не совпало с жанрами игры.','stories')];
 // A precise preference asks for a clear procedure, not necessarily a heavy
 // system. Only the explicit wish for fewer rolls contradicts a precise slot.
 if(p.traits.rules.id==='light'&&s.rules==='precise')master.push(fact(0,'Хотелось меньше бросков и расчётов, а игра требует их часто.','rules'));
 else if(p.traits.rules.id==='light'&&s.rules==='flexible')master.push(fact(.65,'Правила остаются частью игры; пожелание сократить расчёты учтено частично.','rules'));
 else master.push(fact(1,'Объявленный порядок правил подходит озвученному пожеланию.','rules'));
 const pace=p.traits.pace.id;
 if(pace===s.pace||s.pace==='varied')master.push(fact(1,'Ритм игры оставляет место нужным сценам и паузам.','pace'));
 else if(m.flexiblePace)master.push(fact(.85,'Мастер обещает подстроить ритм; исходный темп игры другой.','pace'));
 else master.push(fact(pace==='varied'?.25:0,pace==='varied'?'Хотелось чередования, а мастер держит один объявленный ритм.':'Нужный темп расходится с игрой, а мастер не обещает его менять.','pace'));
 const needsExample=['new','some'].includes(p.experience.id);
 if(needsExample||guest.habit.id==='ask-help'){
  const helper=others.some(g=>g.habit.id==='offer-help');
  // One support need, even when both experience and habits reveal it.
  master.push(m.coaching?fact(1,'Мастер объясняет ход и помогает с правилом по просьбе.',needsExample?'experience':'habits'):helper?fact(needsExample?.6:1,needsExample?'Сосед готов объяснить правило, но мастер не показывает первый ход.':'Сосед готов объяснить правило по просьбе.',needsExample?'experience':'habits'):fact(0,needsExample?'Просили пример хода; ни мастер, ни сосед не предлагают нужной поддержки.':'Нужна помощь по просьбе, но её не предлагает ни мастер, ни соседи.',needsExample?'experience':'habits'));
 }
 if(guest.habit.id==='own-space')master.push(m.adviceBoundary?fact(1,'Мастер защищает самостоятельные решения.','habits'):fact(0,'Просили сначала спрашивать, а мастер может предлагать решения без просьбы.','habits'));

 // Turn-taking is a group condition, counted here once rather than also in
 // the master component. Mixed personalities alone are not a conflict.
 const initiative=p.traits.initiative.id;
 if(m.invites)company.push(fact(1,'Мастер даёт слово каждому и напоминает передать ход.','participation'));
 else if(initiative==='invited')company.push(fact(.1,'Нужно прямое приглашение, а мастер ждёт самостоятельной инициативы.','participation'));
 else if(others.some(g=>g.profile.traits.initiative.id==='shared'))company.push(fact(.9,'В компании есть участник, который явно предлагает передавать ход.','participation'));
 else company.push(fact(initiative==='shared'?.85:.7,initiative==='shared'?'Гость сам передаёт ход; поддержки этой привычки со стороны стола пока не обещано.':'Инициатива есть; напоминать о передаче хода мастер не обещает.','participation'));
 const asksFirst=g=>['own-space','ask-help'].includes(g.habit.id);
 const adviceClash=asksFirst(guest)&&others.some(g=>g.habit.id==='unsolicited');
 if(m.adviceBoundary)company.push(fact(1,'Мастер останавливает советы без согласия.','habits'));
 else if(adviceClash)company.push(fact(0,'Советы без запроса расходятся с просьбой сначала дать решить самостоятельно; посредничество не обещано.','habits'));
 else if(guest.habit.id==='unsolicited')company.push(fact(.7,'Гость предлагает заранее договориться о советах; мастер не берётся поддержать эту договорённость.','habits'));
 else company.push(fact(1,'Озвученные привычки сохраняют право решать за своего героя.','habits'));
 // Peer pace differences are not charged again: a varied slot already serves
 // brisk and reflective guests, and individual delivery is assessed above.
 const hours=s.minutes/60,[low,high]=guest.schedule.preferred,distance=Math.max(low-hours,hours-high,0);
 const duration=[fact(Math.max(0,1-distance/2),distance?`Удобно ${low===high?low:low+'–'+high} ч; эта игра длится ${hours} ч.`:'Длительность попала в названный удобный интервал.','time')];
 return{game,master,company,duration};
}

export function rateGuestV2(run,guest){
 const evidence=ratingEvidence(run,guest),components=Object.fromEntries(KEYS.map(k=>[k,average(evidence[k])])),weights=disclosedWeights(guest);
 // Root mean square shortfall prevents one clear contradiction being hidden
 // behind three perfect components. No blanket subtraction is applied.
 const shortfall=Math.sqrt(KEYS.reduce((sum,k)=>sum+weights[k]*(1-components[k])**2,0)/10);
 const uncapped=1+9*(1-shortfall),violations=[];
 if(run.endsAt>guest.schedule.leaveAt)violations.push('Игра закончилась позже времени, до которого я мог остаться.');
 if(guest.profile.boundaries.some(b=>run.room.session.requiredTopics.includes(b.id)))violations.push('В игре появилась тема, которую я просил исключить.');
 let score=Math.max(1,Math.min(10,Math.round(uncapped)));if(violations.length)score=Math.min(score,4);
 const weakest=[...KEYS].sort((a,b)=>weights[b]*(1-components[b])**2-weights[a]*(1-components[a])**2)[0];
 const reason=[...evidence[weakest]].sort((a,b)=>a.fit-b.fit)[0];
 const text=violations[0]??(components[weakest]<1?reason.text:'Мои пожелания к истории, ведению, компании и времени совпали с этой игрой.');
 return{reviewId:run.id+'|'+guest.id,guestId:guest.id,name:guest.profile.name,identity:structuredClone(guest.identity),score,text,components,weights,evidence,violations,ratingVersion:RATING_VERSION};
}
