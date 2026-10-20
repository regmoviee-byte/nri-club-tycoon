import {hash} from './generator.js';
import {SYSTEMS} from '../data/systems.js';
import {SCENES} from '../data/preferences.js';
import {motifs} from '../data/catalog.js';
const choose=(seed,key,items)=>items[hash(seed+'|'+key)%items.length];
// Frozen generation for old saves and V3/V4 snapshots without preferences.
// Its low-bit correlations are intentional here: history must not be rerolled.
export function makeLegacyPreferences(seed,guest){
 const key=seed+'|'+guest.id,systems=Object.keys(SYSTEMS),scene=choose(key,'scenes',Object.keys(SCENES));
 const avoid=motifs.filter(m=>!guest.profile.genres.some(g=>g.id===m.id));
 return{version:2,knowledge:Object.fromEntries(systems.map(id=>[id,hash(key+'|knows|'+id)%4])),learning:choose(key,'learning',['ahead','table','describe']),rulesPolicy:choose(key,'policy',['raw','announced','homebrew']),disputes:choose(key,'dispute',['check','after','trust']),receiveHelp:choose(key,'receive',['none','rules','welcome']),giveHelp:choose(key,'give',['none','asked','offers']),asksBeforeHelping:hash(key+'|asks')%5!==0,respectsNo:hash(key+'|refusal')%10!==0,teachingSkill:.35+(hash(key+'|explain')%66)/100,scenes:Object.fromEntries(Object.keys(SCENES).map(id=>[id,id===scene?1:.15+(hash(key+'|scene|'+id)%30)/100])),tone:choose(key,'tone',['serious','mixed','comic']),stakes:choose(key,'stakes',['safe','risk','lethal']),spotlight:choose(key,'space',['invited','share','lead']),interrupts:hash(key+'|interrupt')%10===0,comfort:{longSeat:hash(key+'|seat')%3===0,quiet:hash(key+'|noise')%3===0,drink:choose(key,'drink',['water','tea','coffee','none']),snack:hash(key+'|snack')%3!==0,heat:hash(key+'|heat')%4===0,cold:(hash(key+'|cold-drink')>>>8)%4===0},format:'one-shot',regularity:choose(key,'regularity',['weekly','fortnightly','irregular']),breaks:choose(key,'breaks',['regular','flexible']),avoidGenres:avoid.length&&hash(key+'|avoid-genre')%7===0?[choose(key,'avoid-choice',avoid).id]:[]};
}
export const DIALOGUE_VERSION=2;
// An avalanche finalizer prevents the low bits of FNV from coupling channels
// with powers-of-two cardinalities (knowledge, drink and breaks in particular).
function preferenceHash(text){
 let value=hash(text);value^=value>>>16;value=Math.imul(value,0x85ebca6b);
 value^=value>>>13;value=Math.imul(value,0xc2b2ae35);return(value^(value>>>16))>>>0;
}
export function makePreferences(seed,guest){
 const key=seed+'|'+guest.id,number=channel=>preferenceHash(key+'|'+channel);
 const pick=(channel,values)=>values[number(channel)%values.length];
 const systems=Object.keys(SYSTEMS),scene=pick('scenes',Object.keys(SCENES));
 const avoid=motifs.filter(m=>!guest.profile.genres.some(g=>g.id===m.id));
 return{
  version:3,knowledge:Object.fromEntries(systems.map(id=>[id,number('knows|'+id)%4])),
  learning:pick('learning',['ahead','table','describe']),rulesPolicy:pick('policy',['raw','announced','homebrew']),disputes:pick('dispute',['check','after','trust']),
  receiveHelp:pick('receive',['none','rules','welcome']),giveHelp:pick('give',['none','asked','offers']),
  asksBeforeHelping:number('asks')%5!==0,respectsNo:number('refusal')%10!==0,teachingSkill:.35+(number('explain')%66)/100,
  scenes:Object.fromEntries(Object.keys(SCENES).map(id=>[id,id===scene?1:.15+(number('scene|'+id)%30)/100])),
  tone:pick('tone',['serious','mixed','comic']),stakes:pick('stakes',['safe','risk','lethal']),
  spotlight:pick('space',['invited','share','lead']),interrupts:number('interrupt')%10===0,
  comfort:{longSeat:number('seat')%3===0,quiet:number('noise')%3===0,drink:pick('drink',['water','tea','coffee','none']),snack:number('snack')%3!==0,heat:number('heat')%4===0,cold:number('cold-drink')%4===0},
  format:'one-shot',regularity:pick('regularity',['weekly','fortnightly','irregular']),breaks:pick('breaks',['regular','flexible']),
  avoidGenres:avoid.length&&number('avoid-genre')%7===0?[pick('avoid-choice',avoid).id]:[],
 };
}
// Generate refusals only for a new arrival. Loading an established guest must
// not silently invent a new hard restriction after the player has talked to them.
export function ensureGuestPreferences(seed,guest,{generateAvoidGenres=false}={}){
 if(!guest.preferences){guest.preferences=makePreferences(seed,guest);guest.dialogueVersion=DIALOGUE_VERSION;}
 if(generateAvoidGenres&&guest.avoidGenres===undefined)guest.avoidGenres=[...(guest.preferences.avoidGenres??[])];
 return guest.preferences;
}
function rawPreferenceAnswer(guest,question){
 const p=guest.preferences;if(!p)return null;
 const dialogueVersion=guest.dialogueVersion??(p.version>=3?DIALOGUE_VERSION:1);
 if(question==='experience'&&dialogueVersion>=2&&guest.startedAsNovice&&guest.playedAtClub===1)return'Один раз уже играл. Это было здесь, в клубе. Теперь хочу попробовать ещё, а с новой системой всё равно нужно разобраться.';
 if(question==='knowledge')return [0,1,2,3].map(level=>{const names=Object.keys(p.knowledge).filter(id=>p.knowledge[id]===level).map(id=>SYSTEMS[id]?.name??id);const prefixes=dialogueVersion>=2?['Правила пока не знаю: ','Знаю основы: ','Правила хорошо знаю: ','Могу быстро найти нужное правило: ']:['Правила пока не знаю: ','Знаю свой лист: ','Уверенно играю: ','Могу быстро найти нужное правило: '];return names.length?prefixes[level]+names.join(', ')+'.':'';}).filter(Boolean).join(' ');
 if(question==='experience'&&dialogueVersion>=2&&guest.profile.experience.id==='new')return'В НРИ пока не играл. Это будет моя первая партия. '+(Object.values(p.knowledge).some(level=>level>0)?'Кое-какие правила уже знаю по книгам и учебным примерам.':'С правилами тоже пока разбираюсь впервые.');
 if(question==='experience')return{new:'В НРИ пока не играл. Это будет моя первая партия.',some:'Несколько раз уже играл. Если система новая, всё равно придётся с ней разобраться.',returning:'Раньше играл, потом был перерыв. Хочется снова выбраться за стол.',regular:'Играю время от времени. Знакомые системы помню, а новые ещё надо освоить.',veteran:'Играю давно. Но это не значит, что знаю любую систему.'}[guest.profile.experience.id]??'За столом уже доводилось играть. Про конкретную систему лучше спросите отдельно.';
 if(question==='learning')return{ahead:'Дайте пару страниц или памятку, я прочту заранее. Не люблю весь вечер разбирать свой лист.',table:'Покажите на моём первом ходу, так быстрее пойму. Потом попробую сам.',describe:'Я после работы. Хочу сказать, что делает герой, а с кубиками пусть помогут. Учить целую книгу сегодня не хочу.'}[p.learning];
 if(question==='houseRules')return{raw:'Хочу сыграть по книге, без сюрпризов с моим персонажем.',announced:'Домашние правила нормально, только скажите до того, как начнём.',homebrew:'А у вас есть свои классы или необычная магия? Мне нравится пробовать домашние правила.'}[p.rulesPolicy];
 if(question==='disputes')return{check:'Давайте откроем страницу, если правило непонятно. Мне важно разобраться.',after:'Сейчас можно сыграть, как мастер решит. А после партии посмотрим, что в книге.',trust:'Если мастер решил, продолжаем. Мне не хочется останавливать историю из-за каждого правила.'}[p.disputes];
 if(question==='habits')return{none:'Не люблю советы от других игроков. Даже если ошибусь, лучше сам попробую.',rules:'Правила объясните, а ход я выберу сам.',welcome:'Люблю, когда другие игроки помогают. Если забуду что-то полезное, подскажите.'}[p.receiveHelp];
 if(question==='helpOthers'){const base={none:'Я пришёл играть, объяснять чужие ходы весь вечер не хочу.',asked:'Если спросят, помогу найти правило. Решать за другого игрока не буду.',offers:p.asksBeforeHelping?'Люблю предлагать варианты. Сначала спрашиваю, нужна ли помощь.':'Часто сразу предлагаю другим, что можно сделать. Мне нравится помогать с общим планом.'}[p.giveHelp];return base+(p.giveHelp==='offers'?(p.respectsNo?' Если человек хочет сам, не настаиваю.':' Иногда увлекаюсь и продолжаю объяснять, даже когда уже выбрали другой ход.'):'');}
 if(question==='scenes'){const ranked=Object.keys(SCENES).sort((a,b)=>p.scenes[b]-p.scenes[a]);return'Больше всего люблю '+SCENES[ranked[0]]+'. '+(ranked[0]==='combat'?'Хочу трудный бой, где есть над чем подумать.':'Сражения тоже бывают интересны, только не весь вечер.');}
 if(question==='tone')return{serious:'Можно пошутить между сценами, но саму историю хочу воспринимать всерьёз.',mixed:'Люблю и пошутить, и переживать за героя. Только не сбивать каждую важную сцену.',comic:'Хочу лёгкую, смешную историю. После работы совсем не тянет на сплошную мрачность.'}[p.tone];
 if(question==='stakes')return{safe:'Хочется приключения, где герой доживёт до финала. Просто потерять его из-за одного броска было бы обидно.',risk:'Смерть героя принимаю, если риск был понятен и можно было отступить.',lethal:'Мне интересен настоящий риск. Пусть кости решат, только правила должны быть понятны заранее.'}[p.stakes];
 if(question==='participation')return{invited:'Я сначала посмотрю. Но хорошо, если мастер сам спросит, что делает мой герой.',share:'Люблю предложить идею и передать ход. Хочется, чтобы у каждого была своя сцена.',lead:'Могу вести переговоры и предлагать план, если остальные не против.'}[p.spotlight]+(p.interrupts?' Иногда влезаю с идеей раньше, чем другой человек закончит.':'');
 if(question==='commitment')return(p.format==='campaign'?'Хочу историю на несколько встреч.':p.format==='either'?'Подойдёт и одна история, и несколько встреч, если договоримся заранее.':'Сегодня хочу одну законченную историю. На продолжение пока не записываюсь.')+' '+{weekly:'Обычно могу раз в неделю.',fortnightly:'Могу регулярно раз в две недели.',irregular:'Постоянный день обещать не могу.'}[p.regularity??'irregular']+(p.breaks==='regular'?' На длинной игре нужны короткие перерывы.':' С перерывами подстроюсь под группу.');
 if(question==='avoidGenres'){const avoided=guest.avoidGenres??[];return avoided.length?'Сегодня точно не хочу такие жанры: '+avoided.map(id=>motifs.find(m=>m.id===id)?.label??id).join(', ')+'. Подберите другую историю, пожалуйста.':'Жанров, которые совсем не хочу играть, сегодня нет. Но любимые истории всё равно важны, а запретные темы обсудим отдельно.';}
 if(question==='comfort'){const lines=[];if(p.comfort.longSeat)lines.push('На долгую игру лучше бы мягкий стул.');if(p.comfort.quiet)lines.push('Мне сложно сосредоточиться, когда рядом шумят.');if(p.comfort.heat)lines.push('В маленькой комнате на долгой игре мне бывает жарко. Хорошо бы проветривать.');if(p.comfort.drink!=='none')lines.push({water:'Воду обычно пью понемногу весь вечер.',tea:'За длинной игрой люблю чай.',coffee:'Кофе бы выпил, если у вас есть.'}[p.comfort.drink]);if(p.comfort.cold)lines.push('Холодный напиток из холодильника тоже был бы кстати.');if(p.comfort.snack)lines.push('И печенье было бы кстати.');return lines.join(' ')||'Обычного стула и света достаточно. Лишь бы игра была интересная.';}
 return null;
}
export function guestVoice(guest,text){
 if(guest.identity.grammar!=='feminine')return text;
 const phrases=[['не играл.','не играла.'],['уже играл.','уже играла.'],['Раньше играл,','Раньше играла,'],['С правилами знаком:','С правилами знакома:'],['Я пришёл','Я пришла'],['я пришёл','я пришла'],['лучше сам попробую','лучше сама попробую'],['Я лучше сам решу','Я лучше сама решу'],['дали самому выбрать','дали самой выбрать'],['я сам выбираю','я сама выбираю'],['я просил','я просила'],['Я хотел','Я хотела'],['Хотел сыграть','Хотела сыграть'],['Хотел попробовать','Хотела попробовать'],['Я успел','Я успела'],['я уже знал','я уже знала'],['Я рассчитывал','Я рассчитывала'],['Я ждал','Я ждала'],['Перед игрой устал','Перед игрой устала'],['устал сидеть','устала сидеть'],['Пока ждал','Пока ждала']];
 for(const [from,to]of phrases)text=text.replaceAll(from,to);return text;
}
export const preferenceAnswer=(guest,question)=>{const text=rawPreferenceAnswer(guest,question);return text===null?null:guestVoice(guest,text);};
export function sessionProgram(session){
 const genres=session.genres,scenes={combat:genres.includes('tactics')?1:.12,exploration:genres.includes('journey')?.95:.25,mystery:genres.includes('mystery')?1:.15,conversation:genres.includes('drama')||genres.includes('heist')?.95:.3,character:genres.includes('drama')?.9:.35};
 return{scenes,tone:genres.includes('horror')?'serious':session.systemId==='mausritter'?'mixed':'mixed',stakes:['cthulhu7','mausritter','cyberpunk'].includes(session.systemId)?'lethal':session.systemId==='fate'||session.systemId==='loop'?'safe':'risk',format:'one-shot',regularity:'irregular',...session.program};
}
export function sessionHours(session){
 const hours=Number(session?.minutes)/60;
 return Number.isInteger(hours)&&hours>=2&&hours<=6?hours:2;
}
export function sessionDurationRange(session){const hours=sessionHours(session);return [hours,hours];}
export function masterPreferences(master){
 const base=master.baseId??master.id,policies={asya:'announced',mark:'raw',mira:'homebrew',lev:'raw',vera:'announced',denis:'homebrew',nika:'announced'};
 return{...master,rulesPolicy:master.rulesPolicy??policies[base]??'raw',announcesChanges:master.announcesChanges??true,disputePolicy:master.disputePolicy??(['mark','mira'].includes(base)?'check':'after'),wantsTeaching:master.wantsTeaching??master.coaching,teachingSkill:master.teachingSkill??({asya:.75,mark:.85,mira:.55,lev:.6,vera:.45,denis:.35,nika:.95}[base]??.6),teachingCapacity:master.teachingCapacity??(master.coaching?base==='nika'?3:2:0),facilitation:master.facilitation??(master.invites?.9:.35),protectsChoices:master.protectsChoices??master.adviceBoundary,breaks:master.breaks??['asya','mira','nika'].includes(base),preparedSheets:master.preparedSheets??master.coaching};
}
export function masterExpectationText(master){
 const m=masterPreferences(master);
 return [m.rulesPolicy==='raw'?'Играю по книге.':m.rulesPolicy==='homebrew'?'Люблю домашнюю механику; изменения объясняю до записи.':'Изменения правил обсуждаем до начала.',m.disputePolicy==='check'?'Непонятное правило стараюсь сразу найти в книге.':m.disputePolicy==='trust'?'Прошу принять решение мастера и продолжить историю.':'Если быстро не нашли правило, принимаю временное решение и возвращаюсь к вопросу после сцены.',m.wantsTeaching?(m.teachingSkill>=.8?'Люблю вводные игры. Могу показать ход ещё раз другим способом.':'Берусь объяснять, но ещё учусь делать это понятно.'):'Предпочитаю тех, кто уже знает свой лист; весь вечер обучать не хочу.',m.wantsTeaching?`За столом готов помогать ${m.teachingCapacity===1?'одному новичку':m.teachingCapacity+' новичкам'}.`:'',m.invites?'Сам спрашиваю каждого, что делает его герой.':'Жду, что игроки сами предложат действия.',m.facilitation>=.8?'Умею вернуть слово тому, кого перебили.':'Когда спорят сразу несколько человек, могу не успеть дать слово каждому.',m.protectsChoices?'После отказа от подсказки защищаю право игрока выбрать самому.':'В обсуждении могу сразу предложить, какой ход сделать.',m.flexiblePace?'Могу чередовать быстрые сцены и паузы.':'Держу объявленный темп; долгие паузы мне трудно встроить.',m.breaks?'В длинной игре делаем короткие перерывы.':'Планирую играть одним темпом, без регулярных пауз.',(m.fatigue??0)>4?'После прошлых игр устал: сейчас труднее разбирать много вопросов одновременно.':'Сейчас достаточно сил для работы.'].filter(Boolean).join(' ');
}
export function sessionExpectationText(session,master,declared){
 const p=declared??sessionProgram(session),rank=Object.keys(p.scenes).sort((a,b)=>p.scenes[b]-p.scenes[a]);
 return`В клубном слоте больше всего времени займут ${SCENES[rank[0]]}, затем ${SCENES[rank[1]]}. ${{serious:'Атмосфера серьёзная.',mixed:'Будут и серьёзные сцены, и юмор.',comic:'Атмосфера лёгкая, с шутками.'}[p.tone]} ${{safe:'Герои доживут до финала; ошибки усложнят историю.',risk:'Тяжёлые последствия возможны, если риск был заранее понятен.',lethal:'Риск высокий; герой может погибнуть.'}[p.stakes]} ${p.format==='one-shot'?'Одна законченная история.':'История на несколько встреч.'} ${masterPreferences(master).breaks?'В долгой игре предусмотрены перерывы.':'Регулярные перерывы не запланированы.'}`;
}
