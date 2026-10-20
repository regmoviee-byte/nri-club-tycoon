import {makeLegacyPreferences,sessionProgram,masterPreferences,guestVoice} from './preferences.js';
import {disclosedWeights} from './rating.js';
import {gameProduct,PRODUCTS} from '../data/commerce.js';
import {roomUpgradeBenefit,roomUpgradeBenefitV8,serviceUpgradeBenefitV8} from './upgrades.js';
import {QUALITY_BALANCE as Q} from '../data/balance.js';
export const CAMPAIGN_RATING_VERSION=8;
const keys=['game','master','company','duration'];
const clamp=n=>Math.max(0,Math.min(1,n));
const fact=(fit,text,question,code)=>({fit:clamp(fit),text,question,code});
const weakest=items=>items.reduce((a,b)=>a.fit<=b.fit?a:b);
const baseGuest=(run,g)=>({...g,preferences:g.preferences??makeLegacyPreferences(run.id,g)});
export function tableWorkloadV3(run){
 const system=run.room.session.systemId,complexity=gameProduct(system)?.complexity??1,master=masterPreferences(run.room.master),guests=run.guests.map(g=>baseGuest(run,g));
 const demand=guests.reduce((n,g)=>n+(g.preferences.knowledge[system]>=2?0:complexity*{ahead:.35,table:.8,describe:1.2}[g.preferences.learning]),0);
 const volunteers=guests.filter(g=>g.preferences.giveHelp!=='none'&&g.preferences.knowledge[system]>=2&&g.preferences.respectsNo);
 const accepted=guests.filter(g=>g.preferences.receiveHelp!=='none'&&g.preferences.knowledge[system]<2).length;
 const peerCapacity=Math.min(accepted,volunteers.length)*Math.max(0,...volunteers.map(g=>g.preferences.teachingSkill));
 const capacity=(master.wantsTeaching?master.teachingCapacity*master.teachingSkill:0)+peerCapacity;
 const materials=run.room.equipment?.some(i=>['board','tablet'].includes(i.type)&&i.enabled)?.25:0;
 const served=demand?clamp((capacity+materials)/demand):1;
 return{demand,capacity,served,teachingMinutes:Math.round(demand*8/Math.max(.4,capacity)),volunteers:volunteers.map(g=>g.id)};
}
function directedPair(master,guest,other){
 const p=guest.preferences,q=other.preferences,items=[];
 if(q.giveHelp==='offers'&&p.receiveHelp==='none'){
  if(q.asksBeforeHelping&&q.respectsNo)items.push(fact(1,'Я не люблю советы от других игроков. Мы договорились, и мне дали самому выбрать ход.','habits','help-respected'));
  else if(q.respectsNo)items.push(fact(.85,'Мне подсказали ход, но после моей просьбы перестали. Я предпочитаю решать сам.','habits','help-first-miss'));
  else items.push(fact(master.protectsChoices?.85:0,master.protectsChoices?'Другой игрок продолжал подсказывать, но мастер напомнил, что я сам выбираю ход.':'Не люблю советы от других игроков, а мне всё время подсказывали, даже когда я просил перестать.','habits','help-pressure'));
 }
 if(q.giveHelp==='offers'&&!q.respectsNo&&p.receiveHelp!=='none')items.push(fact(master.protectsChoices?.9:.3,master.protectsChoices?'Мне нравится помощь, но ход выбираю я. Мастер помог об этом договориться.':'Помощь мне нравится, но в этот раз другой игрок настаивал на своём ходе.','habits','choice-pressure'));
 if(q.interrupts)items.push(fact(master.facilitation>=.8?.95:p.spotlight==='invited'?.1:.45,master.facilitation>=.8?'Когда меня перебили, мастер вернул мне слово.':'Мне не хватило времени сказать, что делает мой герой: меня перебивали.','participation','interruptions'));
 if(!items.length)items.push(fact(1,p.receiveHelp==='welcome'&&q.giveHelp!=='none'?'Люблю, когда другие игроки помогают. Здесь можно было спросить и вместе разобраться.':'Мы давали друг другу закончить мысль и выбрать свой ход.','habits','peers-fit'));
 return weakest(items);
}
function roomComfort(run,guest){
 const p=guest.preferences.comfort,items=(run.room.equipment??[]).filter(i=>i.enabled),has=effect=>items.some(i=>PRODUCTS[i.type]?.effect===effect),hours=run.endsAt-run.startedAt,chair=items.find(i=>i.id===run.room.chairIds?.[guest.seat]),helped=[],notes=[];let penalty=0;
 if(p.longSeat&&hours>=5){if(PRODUCTS[chair?.type]?.effect==='long-seat'||PRODUCTS[chair?.type]?.effect==='arms'||run.room.master.breaks){helped.push('Долгую игру было легче высидеть: удобный стул или перерывы.');}else{penalty+=.55;notes.push('На длинной игре устал сидеть на простом стуле.');}}
 const noisy=(run.observed?.noiseHours??0)>0||(run.room.environment?.noisyAppliances??false);
 if(p.quiet&&noisy){if(has('quiet'))helped.push('Звукоизоляция помогла сосредоточиться, когда по соседству шумели.');else{penalty+=.5;notes.push('Из соседнего помещения было слышно шум.');}}
 if(p.heat&&(run.room.environment?.hot??false)){if(has('heat'))helped.push('В комнате было комфортнее благодаря вентиляции.');else{penalty+=.35;notes.push('В маленькой комнате на длинной игре стало душно.');}}
 if(run.room.session.genres.includes('horror')&&guest.preferences.tone==='serious'&&has('atmosphere'))helped.push('Приглушённый свет помог настроиться на страшную историю.');
 if(run.room.session.genres.includes('tactics')&&['map','tactics','materials'].some(has)&&guest.preferences.scenes.combat>=.8)helped.push('Играть с картой и миниатюрами было удобнее.');
 const used=(run.observed?.services??[]).filter(s=>s.guestId===guest.id);
 if(used.some(s=>s.service===p.drink)&&hours>=4)helped.push(p.drink==='tea'?'Чай пришёлся кстати на длинной игре.':p.drink==='coffee'?'Кофе пришёлся кстати.':'Можно было попить воды во время игры.');
 const waited=run.startedAt-guest.schedule.arrivalAt;
 if((run.ratingVersion??CAMPAIGN_RATING_VERSION)>=6){
  const waiting=guest.waiting??{totalHours:waited,seatedHours:0,standingHours:waited};
  if(waiting.standingHours+1e-9>=3){penalty+=.25;notes.push('Перед игрой пришлось ждать стоя не меньше трёх часов: доступного места не хватило.');}
  else if(waiting.totalHours+1e-9>=3&&waiting.seatedHours>0)helped.push('Во время ожидания у меня было настоящее место, где можно присесть.');
 }else if(waited>=3){if(has('waiting')||used.some(s=>s.service==='tea'||s.service==='cookie'))helped.push('Пока ждал игру, можно было отдохнуть и перекусить.');else{penalty+=.25;notes.push('Перед игрой пришлось долго ждать, а присесть было негде.');}}
 return{penalty:Math.min(1,penalty),helped:[...new Set(helped)],notes,...((run.ratingVersion??CAMPAIGN_RATING_VERSION)>=6?{waiting:structuredClone(guest.waiting??{totalHours:waited,seatedHours:0,standingHours:waited,legacyHours:0})}:{})};
}
export function rateCampaignGuestV3(run,original){
 const guest=baseGuest(run,original),p=guest.preferences,session=run.room.session,master=masterPreferences(run.room.master),system=session.systemId,program=run.room.program??sessionProgram(session),work=tableWorkloadV3(run),evidence={game:[],master:[],company:[],duration:[]};
 const preferred=guest.profile.genres,genre=session.genres.includes(preferred[0].id)?1:preferred.some(g=>session.genres.includes(g.id))?.55:.1;
 evidence.game.push(fact(genre,genre===1?'История была как раз о том, что мне интересно.':genre>.1?'В истории было кое-что интересное, но хотелось другого.':'Мне хотелось совсем другой истории.','stories','genre'));
 const favorite=Object.keys(p.scenes).sort((a,b)=>p.scenes[b]-p.scenes[a])[0],scene=program.scenes[favorite];
 evidence.game.push(fact(scene,scene>=.8?'Моих любимых сцен было достаточно.':'Мне не хватило тех сцен, ради которых я пришёл.','scenes','scenes'));
 const tone=p.tone==='mixed'||program.tone==='mixed'||p.tone===program.tone?1:.25;
 evidence.game.push(fact(tone,tone===1?'Мы одинаково настроились на эту историю.':p.tone==='comic'?'Мне хотелось лёгкой игры, а история была мрачной.':'Хотелось всерьёз переживать за историю, а игру всё время превращали в шутку.','tone','tone'));
 const stakes=p.stakes===program.stakes?1:p.stakes==='safe'&&program.stakes==='lethal'?.1:p.stakes==='risk'?.8:.6;
 evidence.game.push(fact(stakes,stakes>=.8?'Риск для героев был таким, как я ожидал.':p.stakes==='safe'?'Я хотел довести героя до финала, а здесь легко было его потерять.':'Мне хотелось другого риска для героя.','stakes','stakes'));
 const rulesWish=guest.profile.traits.rules.id,mechanics=rulesWish==='light'&&session.rules==='precise'?0:rulesWish==='light'&&session.rules==='flexible'?.65:rulesWish==='precise'&&session.rules==='light'&&!master.preparedSheets?.7:1;
 evidence.game.push(fact(mechanics,mechanics>=.95?'С таким количеством бросков и расчётов мне удобно играть.':rulesWish==='light'?'Хотелось меньше бросков и расчётов, а мы часто заглядывали в правила.':'Хотелось яснее понимать, какой бросок решает исход.','rules','mechanics'));
 const skills=master.systemSkills?.[system]??70,complexity=gameProduct(system)?.complexity??1,knowledge=skills>=50+complexity*10?1:skills/100;
 evidence.master.push(fact(knowledge,knowledge===1?'Мастер уверенно разбирался с правилами этой игры.':'Мастер тоже путался в правилах, и мы долго разбирали ходы.','knowledge','master-knowledge'));
 const policy=master.rulesPolicy,policyFit=p.rulesPolicy===policy||p.rulesPolicy==='announced'&&master.announcesChanges||p.rulesPolicy==='homebrew'&&policy==='announced'?1:p.rulesPolicy==='raw'&&policy!=='raw'?.15:.65;
 evidence.master.push(fact(policyFit,policyFit===1?'Мы заранее договорились, по каким правилам играем.':p.rulesPolicy==='raw'?'Хотел сыграть по книге, а у мастера свои изменения правил.':'Хотел попробовать домашние правила, но сегодня играли строго по книге.','houseRules','house-rules'));
 const needs=p.knowledge[system]<2,teaching=needs?work.served:1;
 evidence.master.push(fact(teaching,teaching>=.9?needs?'Я успел разобраться с правилами, мне всё показали на ходу.':'Правила я уже знал, и можно было сразу играть.':p.learning==='describe'?'Я рассчитывал, что с кубиками помогут, а мастер ждал, что я сам выучу правила.':'Сразу нескольким игрокам нужна была помощь. Мастер не успевал всё объяснить.','learning','teaching'));
 const clarification=complexity>=2&&work.demand>0&&policy!=='raw',disputeFit=!clarification||p.disputes===master.disputePolicy||p.disputes==='trust'?1:p.disputes==='check'?.55:.75;
 evidence.master.push(fact(disputeFit,disputeFit===1?'Если правило было непонятно, мы разбирались привычным для меня способом.':p.disputes==='check'?'Мне хотелось сразу проверить правило, а мастер предложил вернуться к нему после игры.':'Мы слишком долго выясняли правило, хотя я был готов продолжать.','disputes','rules-discussion'));
 const pace=guest.profile.traits.pace.id,paceFit=pace===session.pace||session.pace==='varied'?1:master.flexiblePace?.9:.3;
 evidence.master.push(fact(paceFit,paceFit>=.9?'Мне хватало времени подумать, и игра двигалась вперёд.':'Темп мне не подошёл: хотелось иначе распределить время на решения.','pace','pace'));
 const others=run.guests.filter(g=>g.id!==guest.id).map(g=>baseGuest(run,g));
 for(const other of others)evidence.company.push({...directedPair(master,guest,other),otherId:other.id});
 const needsInvite=p.spotlight==='invited',allWait=run.guests.every(g=>(g.preferences??makeLegacyPreferences(run.id,g)).spotlight==='invited');
 evidence.company.push(fact(needsInvite&&!master.invites?allWait?.1:.35:1,needsInvite&&!master.invites?'Я ждал, что мастер спросит про моего героя, а он ждал инициативы от нас.':'У моего героя тоже было время для своего хода.','participation','invitation'));
 const hours=run.endsAt-run.startedAt,[low,high]=guest.schedule.preferred,distance=Math.max(low-hours,hours-high,0);
 evidence.duration.push(fact(1-distance/2,distance?`Мне удобно ${low===high?low:low+'–'+high} ч, а эта игра длилась ${hours} ч.`:'Длительность игры мне подошла.','time','duration'));
 const components={game:.55*genre+.15*scene+.1*tone+.05*stakes+.15*mechanics,master:.65*weakest(evidence.master).fit+.35*evidence.master.reduce((n,f)=>n+f.fit,0)/5,company:weakest(evidence.company).fit,duration:evidence.duration[0].fit},weights=disclosedWeights(guest);
 const shortfall=Math.sqrt(keys.reduce((n,k)=>n+weights[k]*(1-components[k])**2,0)/10),comfort=roomComfort({...run,room:{...run.room,master}},guest);
 const violations=[];if(run.endsAt>guest.schedule.leaveAt)violations.push('Мне нужно было уйти раньше, чем закончилась игра.');
 if(guest.profile.boundaries.some(b=>session.requiredTopics.includes(b.id)))violations.push('В истории была тема, которую я просил исключить.');
 if(guest.avoidGenres?.some(id=>session.genres.includes(id)))violations.push('Я заранее сказал, что не хочу играть в этот жанр.');
 if(program.format!==p.format)violations.push('Я пришёл на одну законченную историю, а это оказалось началом длинной кампании.');
 let score=Math.max(1,Math.min(10,Math.round(10-9*shortfall-comfort.penalty)));if(genre<.2)score=Math.min(score,6);if(violations.length)score=Math.min(score,4);
 const category=keys.toSorted((a,b)=>weights[b]*(1-components[b])**2-weights[a]*(1-components[a])**2)[0],reason=weakest(evidence[category]);
 let text=violations[0]??(reason.fit<.95?(score>=8?'Игра понравилась. ':'')+reason.text:comfort.notes[0]??'История, мастер и компания мне подошли. Ещё бы так поиграл.');text=guestVoice(guest,text);
 for(const facts of Object.values(evidence))for(const f of facts)f.text=guestVoice(guest,f.text);comfort.notes=comfort.notes.map(s=>guestVoice(guest,s));comfort.helped=comfort.helped.map(s=>guestVoice(guest,s));
 return{reviewId:run.id+'|'+guest.id,guestId:guest.id,name:guest.profile.name,identity:structuredClone(guest.identity),score,text,components,weights,evidence,violations:violations.map(s=>guestVoice(guest,s)),comfort,ratingVersion:3,events:[...Object.values(evidence).flat().filter(f=>f.fit<.95||['teaching','peers-fit'].includes(f.code))],workload:{...work}};
}

// V3 remains above, including its arithmetic and wording, for already running
// saved sessions. V4 is an explicit new-session rule set, never a history rewrite.
function restedMaster(master){
 const m=masterPreferences(master),fatigue=Math.max(0,Math.min(12,Number(m.fatigue)||0)),tired=Math.max(0,fatigue-4);
 return{...m,fatigue,teachingSkill:m.teachingSkill*(1-tired*.0225),facilitation:m.facilitation*(1-tired*.015)};
}
function acceptedHelper(a,b,system){
 const p=a.preferences,q=b.preferences;
 return a.id!==b.id&&p.giveHelp!=='none'&&p.knowledge[system]>=2&&p.respectsNo&&q.receiveHelp!=='none'&&q.knowledge[system]<2;
}
export function tableWorkload(run){
 if((run.ratingVersion??CAMPAIGN_RATING_VERSION)>=8)return tableWorkloadV8(run);
 if((run.ratingVersion??CAMPAIGN_RATING_VERSION)<4)return tableWorkloadV3(run);
 const system=run.room.session.systemId,complexity=gameProduct(system)?.complexity??1,master=restedMaster(run.room.master),guests=run.guests.map(g=>baseGuest(run,g));
 const demandById=Object.fromEntries(guests.map(g=>[g.id,g.preferences.knowledge[system]>=2?0:complexity*{ahead:.35,table:.8,describe:1.2}[g.preferences.learning]*(g.preferences.knowledge[system]===1?.75:1)]));
 const demand=Object.values(demandById).reduce((n,v)=>n+v,0),masterCapacity=master.wantsTeaching?master.teachingCapacity*master.teachingSkill:0;
 const assigned=Object.fromEntries(guests.map(g=>[g.id,demand?Math.min(demandById[g.id],masterCapacity*demandById[g.id]/demand):0]));
 const volunteers=guests.filter(g=>g.preferences.giveHelp!=='none'&&g.preferences.knowledge[system]>=2&&g.preferences.respectsNo);
 let peerCapacity=0;
 for(const helper of volunteers){
  const targets=guests.filter(g=>acceptedHelper(helper,g,system)&&assigned[g.id]<demandById[g.id]);
  const available=Math.max(0,helper.preferences.teachingSkill??.5),unserved=targets.reduce((n,g)=>n+demandById[g.id]-assigned[g.id],0);
  for(const target of targets){const share=unserved?Math.min(demandById[target.id]-assigned[target.id],available*(demandById[target.id]-assigned[target.id])/unserved):0;assigned[target.id]+=share;peerCapacity+=share;}
 }
 const materials=(run.room.equipment??[]).some(i=>['board','tablet'].includes(i.type)&&i.enabled);
 const materialsById=Object.fromEntries(guests.map(g=>[g.id,materials&&g.preferences.learning!=='describe'&&assigned[g.id]<demandById[g.id]?Math.min(.25,demandById[g.id]-assigned[g.id]):0]));
 const servedById=Object.fromEntries(guests.map(g=>[g.id,demandById[g.id]?clamp((assigned[g.id]+materialsById[g.id])/demandById[g.id]):1]));
 const supported=guests.reduce((n,g)=>n+Math.min(demandById[g.id],assigned[g.id]+materialsById[g.id]),0),capacity=masterCapacity+peerCapacity;
 return{demand,capacity,served:demand?clamp(supported/demand):1,servedById,demandById,materialsById,teachingMinutes:Math.round(demand*8/Math.max(.4,capacity)),volunteers:volunteers.map(g=>g.id),fatigue:master.fatigue};
}
export function rateCampaignGuestV4(run,original){
 const guest=baseGuest(run,original),p=guest.preferences,session=run.room.session,system=session.systemId,master=restedMaster(run.room.master),program=run.room.program??sessionProgram(session);
 const legacy=rateCampaignGuestV3(run,original),evidence=legacy.evidence,work=tableWorkload({...run,ratingVersion:4});
 const others=run.guests.filter(g=>g.id!==guest.id).map(g=>baseGuest(run,g)),needs=p.knowledge[system]<2,teaching=needs?work.servedById[guest.id]:1;
 const replace=(group,code,item)=>{const index=evidence[group].findIndex(f=>f.code===code);if(index<0)evidence[group].push(item);else evidence[group][index]=item;};
 const favorite=Object.keys(p.scenes).sort((a,b)=>p.scenes[b]-p.scenes[a])[0],sceneTotal=Object.values(p.scenes).reduce((n,v)=>n+v,0);
 const overlap=Object.keys(p.scenes).reduce((n,key)=>n+Math.min(p.scenes[key],program.scenes[key]??0),0)/sceneTotal;
 const scene=.85*(program.scenes[favorite]??0)+.15*overlap,oldScene=evidence.game.find(f=>f.code==='scenes').fit;
 replace('game','scenes',fact(scene,scene>=.8?'В игре хватило любимых сцен и нашлось место другим интересам.':'Время между боями, исследованием, загадками и разговорами распределилось иначе, чем хотелось.','scenes','scenes'));
 replace('master','teaching',fact(teaching,teaching>=.9?needs?'Я успел разобраться с правилами: объяснений и времени на первый ход хватило.':'Правила этой системы я уже знал и мог самостоятельно делать ходы.':master.fatigue>4?'Мастер устал после предыдущих игр и не успевал спокойно разобрать все вопросы.':p.receiveHelp==='none'&&work.volunteers.length?'Другие игроки предлагали помощь, но я хотел разобраться с мастером. Его времени на все вопросы не хватило.':p.learning==='describe'?'Я рассчитывал, что с кубиками помогут, а за столом пришлось самостоятельно осваивать механику.':'Сразу нескольким игрокам нужны были объяснения; на каждый вопрос времени не хватило.','learning','teaching'));
 const complexity=gameProduct(system)?.complexity??1,clarification=complexity>=2&&(work.demand>0||run.guests.some(g=>baseGuest(run,g).preferences.disputes==='check'));
 let disputeFit=!clarification||p.disputes===master.disputePolicy||p.disputes==='trust'?1:p.disputes==='check'?.55:.75;
 if(disputeFit<1)disputeFit=Math.min(.9,disputeFit+master.facilitation*.08);
 replace('master','rules-discussion',fact(disputeFit,disputeFit>=.9?'Если возникал вопрос о правиле, мы разбирали его удобным способом.':p.disputes==='check'?'Хотелось проверить непонятное правило сразу, но мастер отложил разбор.':'Разбор правил занимал больше времени, чем хотелось; я был готов продолжить.','disputes','rules-discussion'));
 for(const other of others){
  const index=evidence.company.findIndex(f=>f.otherId===other.id),pair=directedPair(master,guest,other);
  if(pair.code==='interruptions'){
   pair.fit=clamp((p.spotlight==='invited'?.1:.45)+master.facilitation*(p.spotlight==='invited'?.85:.5));
   pair.text=pair.fit>=.85?'Когда меня перебили, мастер вернул мне слово.':'Меня перебивали; мастер помогал передать слово, но не всегда успевал.';
  }
  // An offer does not imply useful instruction from an unqualified helper.
  if(pair.code==='peers-fit')pair.text=p.receiveHelp==='welcome'&&acceptedHelper(other,guest,system)?'Другой игрок помог с правилом и оставил окончательный выбор мне.':'Мы давали друг другу закончить мысль и выбрать свой ход.';
  if(index>=0)evidence.company[index]={...pair,otherId:other.id};
 }
 const peerHelp=others.some(other=>acceptedHelper(other,guest,system));
 if(p.receiveHelp==='welcome'&&needs&&!peerHelp)evidence.company.push(fact(.85,'Мне нравится помощь других игроков, но здесь соседи не брались объяснять новую для меня систему.','habits','missing-peer-help'));
 if(p.giveHelp==='asked'&&work.volunteers.includes(guest.id)&&others.filter(g=>acceptedHelper(guest,g,system)).length>2)evidence.company.push(fact(.85,'Помогать пришлось почти каждому соседу; на собственные ходы осталось меньше времени.','helpOthers','helper-load'));
 if(p.breaks==='regular'&&session.minutes>=240)evidence.duration.push(fact(master.breaks?1:.65,master.breaks?'Короткие перерывы помогли сохранить внимание.':'На длинной игре не хватало коротких перерывов.','commitment','breaks'));
 const formatFits=p.format==='either'||program.format===p.format;
 const regularityFits=program.format!=='campaign'||!program.regularity||program.regularity==='irregular'||p.regularity===program.regularity;
 const components={...legacy.components,game:clamp(legacy.components.game+.15*(scene-oldScene)),master:.65*weakest(evidence.master).fit+.35*evidence.master.reduce((n,f)=>n+f.fit,0)/evidence.master.length,company:weakest(evidence.company).fit,duration:evidence.duration.length===1?evidence.duration[0].fit:.85*evidence.duration[0].fit+.15*evidence.duration[1].fit};
 const weights=legacy.weights,shortfall=Math.sqrt(keys.reduce((n,k)=>n+weights[k]*(1-components[k])**2,0)/10),comfort=legacy.comfort;
 // Useful teaching materials only count when the guest actually used them.
 if(work.materialsById[guest.id]>0)comfort.helped.push('Памятка на доске или планшет помогли разобрать нужное правило.');
 if(p.comfort.cold&&(run.observed?.services??[]).some(use=>use.guestId===guest.id&&use.service==='cold'))comfort.helped.push('Холодный напиток из холодильника пришёлся кстати.');
 const violations=[];
 if(run.endsAt>guest.schedule.leaveAt)violations.push('Мне нужно было уйти раньше, чем закончилась игра.');
 if(guest.profile.boundaries.some(b=>session.requiredTopics.includes(b.id)))violations.push('В истории была тема, которую я просил исключить.');
 if(guest.avoidGenres?.some(id=>session.genres.includes(id)))violations.push('Я заранее сказал, что не хочу играть в этот жанр.');
 if(!formatFits)violations.push('Я пришёл на одну законченную историю, а стол рассчитывал на несколько встреч.');
 if(!regularityFits)violations.push('Мы договорились о повторных встречах в дни, когда я не могу приходить.');
 const genre=evidence.game.find(f=>f.code==='genre').fit;
 let score=Math.max(1,Math.min(10,Math.round(10-9*shortfall-comfort.penalty)));if(genre<.2)score=Math.min(score,6);if(violations.length)score=Math.min(score,4);
 const category=keys.toSorted((a,b)=>weights[b]*(1-components[b])**2-weights[a]*(1-components[a])**2)[0],reason=weakest(evidence[category]);
 let text=violations[0]??(reason.fit<.95?(score>=8?'Игра понравилась. ':'')+reason.text:comfort.notes[0]??'История, мастер и компания мне подошли. Ещё бы так поиграл.');
 for(const facts of Object.values(evidence))for(const item of facts)item.text=guestVoice(guest,item.text);
 comfort.helped=[...new Set(comfort.helped.map(s=>guestVoice(guest,s)))];
 // No tips boost for service that merely coexisted with a hard mismatch.
 const equipmentBenefit=comfort.helped.length>0&&!violations.length&&genre>=.55;
 if(!equipmentBenefit)comfort.helped=[];
 return{...legacy,score,text:guestVoice(guest,text),components,evidence,violations:violations.map(s=>guestVoice(guest,s)),comfort,ratingVersion:4,events:Object.values(evidence).flat().filter(f=>f.fit<.95||f.code==='teaching'),workload:work,equipmentBenefit};
}
// V5 adds only observed housekeeping exposure. V1–V4 and their rounding,
// evidence and review wording remain fixed for already accepted contracts.
export function rateCampaignGuestV5(run,guest){
 const review=rateCampaignGuestV4(run,guest),hours=run.endsAt-run.startedAt,dirtyHours=Number(run.observed?.dirtyHours??0);
 if(!(hours>0&&Number.isFinite(dirtyHours)&&dirtyHours+1e-9>=hours*.25))return{...review,ratingVersion:5};
 const text='В комнате было грязно заметную часть игры; это мешало чувствовать себя удобно.';
 const comfort={...review.comfort,penalty:Math.min(1,review.comfort.penalty+1),notes:[...review.comfort.notes,text]};
 const shortfall=Math.sqrt(keys.reduce((n,k)=>n+review.weights[k]*(1-review.components[k])**2,0)/10);
 let score=Math.max(1,Math.min(10,Math.round(10-9*shortfall-comfort.penalty)));
 if(review.evidence.game.find(f=>f.code==='genre').fit<.2)score=Math.min(score,6);
 if(review.violations.length)score=Math.min(score,4);
 return{...review,score,comfort,ratingVersion:5,text:review.violations.length?review.text:review.score===10?text:review.text+' '+text,events:[...review.events,fact(0,text,'comfort','dirty-room')]};
}
export function rateCampaignGuest(run,guest){
 const version=run.ratingVersion??CAMPAIGN_RATING_VERSION;
 if(version===3)return rateCampaignGuestV3(run,guest);
 if(version===4)return rateCampaignGuestV4(run,guest);
 if(version===5)return rateCampaignGuestV5(run,guest);
 if(version===6)return{...rateCampaignGuestV5(run,guest),ratingVersion:6};
 if(version===7){
  const review=rateCampaignGuestV5(run,guest),benefit=roomUpgradeBenefit(run,guest);
  const genre=review.evidence.game.find(f=>f.code==='genre')?.fit??0;
  if(review.violations.length||genre<.55||!benefit.effects.length)return {...review,ratingVersion:7};
  const shortfall=Math.sqrt(keys.reduce((n,k)=>n+review.weights[k]*(1-review.components[k])**2,0)/10);
  const score=Math.max(1,Math.min(10,Math.round(10-9*shortfall-review.comfort.penalty+benefit.bonus)));
  return {...review,score,ratingVersion:7,equipmentBenefit:true,upgradeBenefit:benefit,comfort:{...review.comfort,helped:[...review.comfort.helped,...benefit.effects.map(e=>e.text)]}};
 }
 if(version===8)return rateCampaignGuestV8(run,guest);
 throw new Error('Неизвестная версия оценки кампании.');
}

export const learningComplexityMultiplier=systemId=>Q.teachingComplexity[(gameProduct(systemId)?.complexity??1)-1]??1;
export function learningMaterialAllowance(items,{learning,combat=0}={}){
 const enabled=(items??[]).filter(i=>i.enabled!==false),has=kind=>enabled.some(i=>(i.kind??i.type)===kind||i.type===kind),tablet=has('tablet'),board=has('whiteboard')||has('board');
 const written=tablet?Q.tabletMaterials:board&&['ahead','table'].includes(learning)?Q.boardMaterials:0,visual=has('miniatures')&&learning==='describe'&&combat>=.8?Q.miniatureMaterials:0;
 return Math.max(written,visual);
}
export function tableWorkloadV8(run){
 const system=run.room.session.systemId,complexity=learningComplexityMultiplier(system),master=restedMaster(run.room.master),guests=run.guests.map(g=>baseGuest(run,g));
 const demandById=Object.fromEntries(guests.map(g=>[g.id,g.preferences.knowledge[system]>=2?0:complexity*{ahead:.35,table:.8,describe:1.2}[g.preferences.learning]*(g.preferences.knowledge[system]===1?.75:1)]));
 const demand=Object.values(demandById).reduce((n,v)=>n+v,0),masterCapacity=master.wantsTeaching?master.teachingCapacity*master.teachingSkill:0;
 const assigned=Object.fromEntries(guests.map(g=>[g.id,demand?Math.min(demandById[g.id],masterCapacity*demandById[g.id]/demand):0]));
 const volunteers=guests.filter(g=>g.preferences.giveHelp!=='none'&&g.preferences.knowledge[system]>=2&&g.preferences.respectsNo);
 let peerCapacity=0;
 for(const helper of volunteers){
  const targets=guests.filter(g=>acceptedHelper(helper,g,system)&&assigned[g.id]<demandById[g.id]);
  const available=Math.max(0,helper.preferences.teachingSkill??.5),unserved=targets.reduce((n,g)=>n+demandById[g.id]-assigned[g.id],0);
  for(const target of targets){const share=unserved?Math.min(demandById[target.id]-assigned[target.id],available*(demandById[target.id]-assigned[target.id])/unserved):0;assigned[target.id]+=share;peerCapacity+=share;}
 }
 const materialsById=Object.fromEntries(guests.map(g=>{const allowance=learningMaterialAllowance(run.room.equipment,{learning:g.preferences.learning,combat:g.preferences.scenes.combat});return[g.id,Math.min(allowance,Math.max(0,demandById[g.id]-assigned[g.id]))];}));
 const servedById=Object.fromEntries(guests.map(g=>[g.id,demandById[g.id]?clamp((assigned[g.id]+materialsById[g.id])/demandById[g.id]):1]));
 const supported=guests.reduce((n,g)=>n+Math.min(demandById[g.id],assigned[g.id]+materialsById[g.id]),0),capacity=masterCapacity+peerCapacity;
 return{demand,capacity,served:demand?clamp(supported/demand):1,servedById,demandById,materialsById,teachingMinutes:Math.round(demand*8/Math.max(.4,capacity)),volunteers:volunteers.map(g=>g.id),fatigue:master.fatigue,complexityMultiplier:complexity};
}

function roomComfortV8(run,guest){
 const p=guest.preferences.comfort,items=(run.room.equipment??[]).filter(i=>i.enabled!==false),has=(...kinds)=>items.some(i=>kinds.includes(i.kind??i.type)||kinds.includes(i.type)),hours=run.endsAt-run.startedAt,master=masterPreferences(run.room.master),chair=items.find(i=>i.id===run.room.chairIds?.[guest.seat]),helped=[],notes=[],penalties=[];
 const add=(value,text,code)=>{penalties.push({value,text,code});notes.push(text);};
 if(p.longSeat&&hours>=5){
  if(['chairSoft','chairArms','softChair','armchair'].includes(chair?.kind??chair?.type)||master.breaks)helped.push('Удобное место или короткие перерывы помогли высидеть долгую игру.');
  else add(Q.longSeatPenalty,'На длинной игре устал сидеть на простом стуле.','long-seat');
 }
 if(p.quiet){
  const adjacent=(run.observed?.noiseHours??0)>0,appliance=run.room.environment?.noisyAppliances??false,insulated=has('soundproof');
  if(adjacent){if(insulated)helped.push('Звукоизоляция защитила от соседней партии.');else add(Q.adjacentNoisePenalty,'Было слышно соседнюю партию.','adjacent-noise');}
  if(appliance)add(Q.applianceNoisePenalty*(insulated ? .5 : 1),insulated?'Свой прибор немного шумел даже со звукоизоляцией.':'Свой прибор немного мешал сосредоточиться.','appliance-noise');
 }
 if(p.heat&&run.room.environment?.hot){if(has('fan','aircon','conditioner'))helped.push('Вентиляция помогла избежать духоты.');else add(Q.heatPenalty,'На долгой игре в тесной комнате стало душно.','heat');}
 const waited=Math.max(0,run.startedAt-(guest.schedule?.arrivalAt??run.startedAt)),waiting=structuredClone(guest.waiting??{totalHours:waited,seatedHours:0,standingHours:waited,legacyHours:0});
 if(waiting.standingHours+1e-9>=3)add(.25,'Перед игрой пришлось долго ждать стоя.','standing-wait');
 else if(waiting.totalHours+1e-9>=3&&waiting.seatedHours>0)helped.push('Во время ожидания было настоящее место, где можно присесть.');
 const dirty=(run.observed?.dirtyHours??0)+1e-9>=hours*.25;
 if(dirty)add(1,'В комнате было грязно заметную часть игры.','dirty-room');
 return{penalty:Math.min(1,penalties.reduce((n,e)=>n+e.value,0)),penalties,notes,helped,waiting,dirty};
}

// New-session arithmetic only. Accepted V3–V7 reviews above remain unchanged.
export function rateCampaignGuestV8(run,original){
 const guest=baseGuest(run,original),session=run.room.session,master=restedMaster(run.room.master),p=guest.preferences,legacy=rateCampaignGuestV5({...run,ratingVersion:7},guest),evidence=legacy.evidence,work=tableWorkloadV8(run);
 const teaching=evidence.master.find(f=>f.code==='teaching'),needs=p.knowledge[session.systemId]<2,served=needs?work.servedById[guest.id]:1;
 if(teaching){teaching.fit=served;teaching.text=served>=.9?'Объяснений и времени на первый ход хватило.':p.learning==='describe'?'На первый ход с подсказками требовалось больше времени мастера.':'Нескольким игрокам требовались объяснения; времени мастера на всех не хватило.';}
 const hours=run.endsAt-run.startedAt,[low,high]=guest.schedule.preferred,distance=Math.max(low-hours,hours-high,0);
 evidence.duration[0].fit=Math.max(.4,1-distance*.2);
 const mean=items=>items.reduce((n,f)=>n+f.fit,0)/items.length;
 const components={...legacy.components,master:.4*weakest(evidence.master).fit+.6*mean(evidence.master),company:.45*weakest(evidence.company).fit+.55*mean(evidence.company),duration:evidence.duration.length===1?evidence.duration[0].fit:.85*evidence.duration[0].fit+.15*evidence.duration[1].fit};
 const shortfall=Math.sqrt(keys.reduce((n,k)=>n+legacy.weights[k]*(1-components[k])**2,0)/10),comfort=roomComfortV8(run,guest),genre=evidence.game.find(f=>f.code==='genre')?.fit??0;
 const eligible=!legacy.violations.length&&genre>=.55&&!comfort.dirty,equipment=eligible?roomUpgradeBenefitV8(run,guest):{bonus:0,effects:[]},service=eligible?serviceUpgradeBenefitV8(run,guest):{bonus:0,effects:[]};
 const teachingPenalty=needs&&work.demandById[guest.id]>0?Math.min(Q.teachingPenaltyCap,Q.teachingPenaltyStrength*Math.max(0,Q.teachingTarget-served)):0;
 const bonus=Math.min(Q.totalBonusCap,equipment.bonus+service.bonus),raw=10-9*shortfall-comfort.penalty-teachingPenalty+bonus;
 let satisfactionValue=Math.max(1,Math.min(10,raw));if(genre<.2)satisfactionValue=Math.min(satisfactionValue,6);if(legacy.violations.length)satisfactionValue=Math.min(satisfactionValue,4);
 satisfactionValue=Math.round(satisfactionValue*100)/100;
 const effects=[...equipment.effects,...service.effects],cleanText=text=>guest.identity.grammar==='feminine'?text.replace(/(ждала|рассчитывала|просила|хотела|успела|знала|сама|играла|устала)а+/gu,'$1'):text;
 comfort.helped=eligible?[...new Set([...comfort.helped,...effects.map(e=>e.text),...(work.materialsById[guest.id]>0?['Наглядные материалы помогли разобраться с правилом.']:[])])]:[];
 comfort.notes=comfort.notes.map(s=>cleanText(guestVoice(guest,s)));comfort.helped=comfort.helped.map(s=>cleanText(guestVoice(guest,s)));
 for(const facts of Object.values(evidence))for(const f of facts)f.text=cleanText(f.text);
 const category=keys.toSorted((a,b)=>legacy.weights[b]*(1-components[b])**2-legacy.weights[a]*(1-components[a])**2)[0],reason=weakest(evidence[category]);
 const learningText=p.learning==='describe'?'Мне требовалась помощь с кубиками на первом ходу, а мастер не успевал помочь всем.':'Для новой системы мне требовались объяснения, а времени мастера на все вопросы не хватило.';
 const text=legacy.violations[0]??(teachingPenalty>.35?learningText:reason.fit<.95?reason.text:comfort.notes[0]??'История, мастер и компания подошли. Было приятно играть.');
 return{...legacy,score:Math.round(satisfactionValue),satisfactionValue,satisfaction:satisfactionValue,baseSatisfaction:Math.round(Math.max(1,Math.min(10,10-9*shortfall-comfort.penalty-teachingPenalty))*100)/100,teachingPenalty,components,evidence,comfort,text:cleanText(text),violations:legacy.violations.map(cleanText),ratingVersion:8,equipmentBenefit:eligible&&comfort.helped.length>0,upgradeBenefit:{bonus,equipmentBonus:equipment.bonus,serviceBonus:service.bonus,effects,cap:Q.totalBonusCap},events:[...Object.values(evidence).flat().filter(f=>f.fit<.95||f.code==='teaching'),...comfort.penalties.map(p=>fact(0,p.text,'comfort',p.code)),...(teachingPenalty>0?[fact(served,learningText,'learning','unmet-teaching')]:[])],workload:work};
}
