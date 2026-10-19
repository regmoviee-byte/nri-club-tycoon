import {visualFor} from './visuals.js';
import { contexts } from './catalog.js';
import { SYSTEMS } from './systems.js';
export const ROOM_COUNT=5;
export const ROOM_CAPACITY=4;
export const GUEST_COUNT=ROOM_COUNT*ROOM_CAPACITY;
export const CONTEXT_LIMITS=new Map([[contexts[0],120],[contexts[1],180]]);
// Actual public announcement titles and systems. Timing/tempo below are the
// club's teaching slots, not claims about the original announcement's duration.
const announcements=[
 ['dragon','dnd5','Ужин дракона','Спасти детей, похищенных кобольдами. Приключение третьего уровня.','https://www.rolecon.ru/game/19817',['tactics','journey','myth'],'Тактика · приключение','precise','brisk',180,'Похищение детей'],
 ['heather','vaesen','Дьявол вересковых пустошей','Расследовать, кто мешает освоению пустошей, где фольклор может оказаться правдой.','https://rolecon.ru/game/15543',['mystery','horror','history'],'Фольклорное расследование','flexible','reflective',120,'Фольклорный ужас'],
 ['tailor','coriolis','Майранский Портной','Найти биореконструктора на пересечении интересов разных фракций.','https://rolecon.ru/game/14166',['science','mystery','heist'],'Фантастика · интрига','flexible','varied',120,'Космическая мистика'],
 ['redhook','trail','Возвращение в Ред-Хук','Исчезновение человека в Нью-Йорке 1932 года. Расследование важнее боёв.','https://rolecon.ru/game/11070',['mystery','horror','history'],'Расследование · ужас','flexible','reflective',120,'Исчезновение человека'],
 ['edge','cthulhu7','Грань тьмы','Вводное детективное расследование с космическим ужасом.','https://rolecon.ru/game/11402',['mystery','horror'],'Детектив · ужас','precise','reflective',120,'Космический ужас'],
 ['sister','cthulhu7','Моя маленькая сестра','Память и выживание на корабле, который удаляется от Земли.','https://www.rolecon.ru/game/20050',['science','horror','drama'],'Фантастика · выживание','precise','varied',120,'Память и изоляция'],
 ['dark','fate','Высшая Тьма','Двойные агенты в альтернативном лавкрафтовском Петербурге.','https://www.rolecon.ru/game/19795',['heist','horror','drama'],'Агенты · интрига','light','varied',120,'Мистическая интрига'],
 ['borders','vampire','Тонкости межевания','Молодые вампиры решают территориальный конфликт в Лос-Анджелесе.','https://rolecon.ru/game/8534',['drama','heist'],'Отношения · интрига','precise','varied',120,'Вампирский ужас'],
 ['noon','vampire','Демоны полудня','Вампирский вестерн в Дакоте 1868 года.','https://rolecon.ru/game/10428',['history','drama','heist'],'Вестерн · вампиры','precise','brisk',120,'Вампирский ужас'],
 ['orleans','vampire','Ночи Нового Орлеана: Праздник не для всех','Найти пропавшего во время праздника Марди Гра.','https://rolecon.ru/game/15913',['mystery','drama','heist'],'Поиск · интрига','precise','varied',120,'Исчезновение человека'],
 ['owl','mausritter','Пробуждение совиной башни','Исследовать запечатанную башню сов-волшебников.','https://www.rolecon.ru/game/19952',['journey','myth','tactics'],'Исследование · сказка','light','reflective',120,'Опасности для героев'],
 ['cargo','cyberpunk','Подозрительный груз','Доставить кейс за подозрительно высокий гонорар.','https://www.rolecon.ru/game/20051',['science','heist','tactics'],'Киберпанк · авантюра','precise','brisk',120,'Рискованная сделка'],
 ['nightmares','loop','Лекарство от КОШМАРОВ','Дети-персонажи исследуют странности 1988 года. ','https://ww.rolecon.ru/game/20088',['science','mystery','drama'],'Тайны · фантастика','light','varied',120,'Персонажи — дети; анонс 18+'],
];
const rulesText={light:'Правил немного: чаще вы предлагаете, что делает ваш герой',flexible:'Правила помогают решить спорный исход; об исключениях договариваются за столом',precise:'Нужно часто бросать кости, считать результат и сверять способности героя'};
const paceText={brisk:'Решения часто нужно принимать быстро',reflective:'Есть время подумать и обсудить план',varied:'После быстрых сцен есть время спокойно поговорить'};
export const SESSIONS=announcements.map(([id,systemId,title,premise,sourceUrl,genres,genreText,rules,pace,minutes,topicText])=>({id,systemId,game:SYSTEMS[systemId].name,title,premise,sourceUrl,genres,genreText,rules,rulesText:rulesText[rules],pace,paceText:paceText[pace],minutes,requiredTopics:[],topicText,slotNote:'Длительность и ритм — условия учебного слота клуба; границы согласуются до начала игры.'}));
export const MASTERS=[
 {id:'asya',name:'Ася',style:'Вопросы и паузы',detail:"Спрашивает каждого, что делает его герой, и помогает с первым ходом. Если игрокам нужно больше времени, даёт обсудить план. Может подсказать решение без просьбы.",skills:['Объясняет первый ход','Даёт слово каждому'],invites:true,coaching:true,adviceBoundary:false,flexiblePace:true},
 {id:'mark',name:'Марк',style:'Порядок и ясность',detail:"Обращается к игрокам по очереди и объясняет, что бросить и посчитать. Спрашивает, нужна ли помощь, и не решает за новичка. Ведёт игру в заранее выбранном темпе.",skills:['Объясняет процедуры','Ограничивает советы без запроса'],invites:true,coaching:true,adviceBoundary:true,flexiblePace:false},
 {id:'mira',name:'Мира',style:'Свой темп, ясные границы',detail:"После напряжённых сцен даёт время спокойно поговорить и обсудить план. Не даёт одному игроку решать за другого. С правилами предлагает разобраться вместе с соседями. Ждёт, что игроки сами предложат действия.",skills:['Чередует ритм','Следит за согласием'],invites:false,coaching:false,adviceBoundary:true,flexiblePace:true},
 {id:'lev',name:'Лев',style:'Инициатива игроков',detail:"Разбирает броски и расчёты вместе с новичком. Может сразу предложить, что сделать герою. Ждёт инициативы от игроков и не делает долгих пауз.",skills:['Поддерживает инициативу','Помогает с правилами'],invites:false,coaching:true,adviceBoundary:false,flexiblePace:false},
 {id:'vera',name:'Вера',style:'Равное внимание',detail:"Спрашивает тихих игроков, что делают их герои. Даёт больше времени на разговор или план, если это нужно столу. Не объясняет каждый ход; иногда сама предлагает решение.",skills:['Делит внимание','Чередует ритм'],invites:true,coaching:false,adviceBoundary:false,flexiblePace:true},
 {id:'denis',name:'Денис',style:'Самостоятельные решения',detail:"Ждёт, что игроки сами выберут действия и разберутся с правилами. Не даёт одному игроку командовать чужим героем. Держит заранее выбранный темп.",skills:['Защищает самостоятельность','Передаёт инициативу группе'],invites:false,coaching:false,adviceBoundary:true,flexiblePace:false},
 {id:'nika',name:'Ника',style:'Поддержка и договорённости',detail:"Спрашивает каждого, что делает его герой. Перед подсказкой уточняет, нужна ли помощь. Объясняет броски новичку и даёт время подумать, когда стол просит паузу.",skills:['Обучает первым ходам','Поддерживает договорённости'],invites:true,coaching:true,adviceBoundary:true,flexiblePace:true},
].map((master,index)=>{const age=[32,44,37,41,35,38,29][index],grammar=['asya','mira','vera','nika'].includes(master.id)?'feminine':'masculine';return{...master,identity:{id:'master-'+master.id,name:master.name,age,grammar,portrait:visualFor('master-'+master.id,age,grammar,index+50)}};});
export const HABITS=[
 {id:'ask-help',reply:'Если застряну с правилами, мне нужна помощь. Но сначала дайте попробовать самостоятельно.'},
 {id:'offer-help',reply:'Могу объяснить правило, если попросят. Решения за чужого героя принимать не хочу.'},
 {id:'unsolicited',reply:'Бывает, сразу предлагаю другим решения. Лучше заранее договориться, когда совет уместен.'},
 {id:'own-space',reply:'Хочу самостоятельно решать за своего героя. Непрошеные советы сбивают — лучше сначала спросить.'},
];
export const QUESTIONS=[{id:'stories',text:'Что цепляет в историях?'},{id:'rules',text:'Как вам с правилами?'},{id:'pace',text:'Какой темп вам удобен?'},{id:'time',text:'Какая длительность подойдёт?'},{id:'boundaries',text:'Какие темы исключаем?'},{id:'habits',text:'Как вам советы и помощь?'},{id:'participation',text:'Как включаться в сцену?'},{id:'experience',text:'Уже доводилось играть?'},{id:'priorities',text:'Что для вас главное?'}];
