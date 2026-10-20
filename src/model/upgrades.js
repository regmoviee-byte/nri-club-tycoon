import {BUILD_CATALOG} from '../data/build-catalog.js';
import {QUALITY_BALANCE as Q} from '../data/balance.js';
import {objectApproaches} from './layout.js';
import {itemContext} from './item-context.js';

// Effects are shared by the shop, inspector, hiring and new session contracts.
// Cosmetic purchases have a real, capped prestige effect instead of fake tips.
export const ITEM_EFFECTS = Object.freeze({
 reception:['Место прибытия и разговора. Без доступной стойки новые гости не приходят.',0],
 table:['Место для партии: мастер и четыре игрока.',0],
 tableComfort:['Простор для материалов: +0,30 к удовлетворённости подходящей партией.',3],
 chair:['Одно игровое место. Пять стульев нужны для готовой комнаты.',0],
 chairSoft:['Снимает неудобство долгой игры у сидящего на этом стуле.',1],
 chairArms:['Мягкое место и +0,20 на игре от 4 ч гостю, которому важно долго сидеть удобно.',2],
 light:['Освещает комнату: без включённого света партия недоступна.',0],
 lightAdjustable:['Свет и +0,15 серьёзному любителю ужаса за подходящей историей.',2],
 deskLamp:['Освещает игровую комнату. Ставится свободно на столешницу.',0],
 shelf:['Хранит 6 экземпляров игр. Нужен свободный подход.',0],
 shelfLarge:['Хранит 16 экземпляров игр. Нужен свободный подход.',1],
 sofa:['Три места ожидания; +0,20 после часа настоящего отдыха на диване.',2],
 bench:['Три доступных места ожидания вместо стояния.',0],
 staffChair:['Одно место в штате. Свободный мастер отдыхает на 0,65 усталости/ч.',0],
 staffBench:['Три места в штате; восстановление по 0,65 усталости/ч.',1],
 staffSofa:['Три места в штате; ускоренный отдых по 0,85 усталости/ч.',3],
 hanger:['Гардероб: +2 престижа при свободном подходе.',2],
 bin:['Уменьшает накопление мусора в своей зоне.',0],
 plant:['Живое оформление: +2 престижа.',2],
 poster:['Оформление стен: +3 престижа.',3],
 decor:['Коллекция клуба: +6 престижа.',6],
 kitchen:['Хранит 40 сухих порций для сервиса.',2],
 water:['Оплаченный запас воды; +0,15 любителю воды на игре от 3 ч после реальной порции.',1],
 kettle:['Оплаченный запас чая; +0,18 любителю чая на игре от 3 ч после реальной порции.',1],
 coffee:['Кофе по 40 ₽, до 2 порций/ч. +0,18 любителю кофе на игре от 3 ч после реальной порции.',2],
 coffeeAuto:['До 6 порций кофе/ч по 40 ₽; порция обходится в 8 ₽. Для большого потока; шумит.',4],
 cookies:['20 порций хранения; +0,20 любителю перекуса на игре от 3 ч после реальной порции.',1],
 fridge:['20 холодных порций, продажа по 45 ₽; +0,18 любителю холодного на игре от 3 ч.',2],
 fan:['Уменьшает духоту на длинных играх; создаёт шум.',0],
 conditioner:['Убирает духоту без шума вентилятора. +3 престижа.',3],
 whiteboard:['До 0,25 помощи с правилами тому, кто учится заранее или по ходу игры.',1],
 dice:['Дополнительные кубики: +0,18 новичку за этим столом.',1],
 mat:['Карта: +0,25 любителю боя или +0,20 любителю исследования; эффекты не складываются.',2],
 miniatures:['+0,35 любителю боя; до 0,15 наглядной помощи новичку, играющему с подсказками.',3],
 screen:['Ширма: +0,20 серьёзному гостю подходящей истории.',4],
 tablet:['До 0,40 помощи с правилами, в том числе при игре с подсказками; доска не добавляется.',5],
 soundproof:['Убирает соседний шум; собственный шум приборов уменьшает вдвое.',2],
});

export const effectText = kind => ITEM_EFFECTS[kind]?.[0] ?? '';
export function clubPrestige(club) {
 const counts={},sources=[],decorative=new Set(['poster','plant','decor','hanger']);let decorPoints=0,physicalPoints=0;
 for(const item of club.layout.objects){
  const points=ITEM_EFFECTS[item.kind]?.[1]??0;
  if(!points||item.enabled===false||(counts[item.kind]??0)>=2||!objectApproaches(club.layout,item).length)continue;
  const count=counts[item.kind]??0;counts[item.kind]=count+1;
  const offered=points*(count ? .25 : 1),awarded=Math.max(0,Math.min(offered,25-physicalPoints,decorative.has(item.kind)?8-decorPoints:Infinity));
  if(!awarded)continue;physicalPoints+=awarded;if(decorative.has(item.kind))decorPoints+=awarded;sources.push({id:item.id,name:BUILD_CATALOG[item.kind].name,points:awarded});
 }
 const reputation=club.rating.count>=8?Math.floor(Math.min(16,(club.rating.sum/club.rating.count)*2)*Math.min(1,club.rating.count/16)):0;
 return {value:Math.round((physicalPoints+reputation)*100)/100,sources,reputation,decorative:decorPoints,physical:physicalPoints};
}
export const prestigeNeeded = master => master.tier==='specialist'?(master.fee>=1400?24:12):master.fee<=900?0:5;
export function roomUpgradeBenefit(run,guest){
 const items=run.room.equipment??[],has=kind=>items.some(i=>(i.kind??i.type)===kind&&i.enabled!==false);
 const effects=[],p=guest.preferences;
 if(has('tableComfort'))effects.push({value:.12,text:'За просторным столом хватало места для материалов.'});
 if(has('dice')&&(p?.knowledge?.[run.room.session.systemId]??2)<2)effects.push({value:.12,text:'Дополнительные кубики помогали пробовать правила без ожидания.'});
 if((p?.scenes?.combat??0)>=.8){
  if(has('mat'))effects.push({value:.18,text:'На игровом коврике было проще следить за боем.'});
  if(has('miniatures'))effects.push({value:.20,text:'Миниатюры делали тактические сцены наглядными.'});
 }
 if(has('screen')&&p?.tone==='serious')effects.push({value:.10,text:'Ширма помогала сохранить интригу серьёзной истории.'});
 return {bonus:Math.min(.6,effects.reduce((n,e)=>n+e.value,0)),effects};
}

// V7 above is immutable accepted-contract arithmetic. New sessions use V8.
const aliases={wideTable:'tableComfort',softChair:'chairSoft',armchair:'chairArms',dimmer:'lightAdjustable',board:'whiteboard',tea:'kettle',aircon:'conditioner'};
const itemKind=item=>item.kind??aliases[item.type]??item.type;
export function roomUpgradeBenefitV8(run,guest){return modernRoomBenefit(run,guest,false);}
export function roomUpgradeBenefitV9(run,guest){return modernRoomBenefit(run,guest,true);}
function modernRoomBenefit(run,guest,contextual){
 const items=(run.room.equipment??[]).filter(i=>i.enabled!==false),has=kind=>items.some(i=>itemKind(i)===kind),p=guest.preferences,hours=run.endsAt-run.startedAt,effects=[];
 const add=(kind,value,text)=>effects.push({kind,value,text,group:'equipment'});
 if(has('tableComfort'))add('tableComfort',Q.tableComfort,'За просторным столом хватало места для материалов.');
 if(has('dice')&&(p?.knowledge?.[run.room.session.systemId]??2)<2)add('dice',Q.dice,'Дополнительные кубики помогли освоить первый ход.');
 const context=contextual?itemContext(run.room.session,run.room.program):{combat:1,exploration:1};
 if(has('mat')){if((p?.scenes?.combat??0)>=.8&&context.combat>0)add('mat',Q.mat*context.combat,'Коврик помогал видеть положение участников боя.');else if((p?.scenes?.exploration??0)>=.8&&context.exploration>0)add('mat',Q.mapExploration*context.exploration,'Карта на коврике помогала следить за исследованием местности.');}
 if((p?.scenes?.combat??0)>=.8&&has('miniatures')&&context.combat>0)add('miniatures',Q.miniatures*context.combat,'Миниатюры делали тактические сцены наглядными.');
 if(has('screen')&&p?.tone==='serious')add('screen',Q.screen,'Ширма помогала сохранить интригу серьёзной истории.');
 const chair=items.find(i=>i.id===run.room.chairIds?.[guest.seat]);
 if(itemKind(chair??{})==='chairArms'&&p?.comfort?.longSeat&&hours>=4)add('chairArms',Q.armchair,'Подлокотники помогли удобно устроиться на долгую игру.');
 if(has('lightAdjustable')&&run.room.session.genres.includes('horror')&&p?.tone==='serious')add('lightAdjustable',Q.dimmer,'Приглушённый свет поддерживал атмосферу страшной истории.');
 if((guest.waiting?.sofaHours??0)>=1)add('sofa',Q.sofa,'Перед игрой получилось отдохнуть на диване.');
 return{bonus:Math.min(Q.equipmentCap,effects.reduce((n,e)=>n+e.value,0)),effects,cap:Q.equipmentCap};
}
export function serviceUpgradeBenefitV8(run,guest){
 const hours=run.endsAt-run.startedAt,p=guest.preferences?.comfort??{},effects=[];
 if(hours<Q.serviceMinimumHours)return{bonus:0,effects,cap:Q.serviceCap};
 const used=new Set((run.observed?.services??[]).filter(use=>use.guestId===guest.id&&Number.isFinite(use.clock??use.hour)&&(use.clock??use.hour)>=run.startedAt&&(use.clock??use.hour)<run.endsAt).map(use=>use.service));
 const add=(kind,text)=>effects.push({kind,value:Q[kind],text,group:'service'});
 if(p.drink!=='none'&&used.has(p.drink)&&['water','tea','coffee'].includes(p.drink))add(p.drink,{water:'Во время долгой игры было приятно попить воды.',tea:'На долгой игре чай пришёлся кстати.',coffee:'Кофе помог устроиться на долгую игру.'}[p.drink]);
 if(p.snack&&used.has('cookie'))add('cookie','Печенье пригодилось во время длинной игры.');
 if(p.cold&&used.has('cold'))add('cold','Холодный напиток оказался кстати.');
 return{bonus:Math.min(Q.serviceCap,effects.reduce((n,e)=>n+e.value,0)),effects,cap:Q.serviceCap};
}
