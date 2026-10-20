import {BUILD_CATALOG} from '../data/build-catalog.js';
import {objectApproaches} from './layout.js';

// Effects are shared by the shop, inspector, hiring and new session contracts.
// Cosmetic purchases have a real, capped prestige effect instead of fake tips.
export const ITEM_EFFECTS = Object.freeze({
 reception:['Место прибытия и разговора. Без доступной стойки новые гости не приходят.',0],
 table:['Место для партии: мастер и четыре игрока.',0],
 tableComfort:['Больше места для материалов. +0,12 к комфорту новой партии.',3],
 chair:['Одно игровое место. Пять стульев нужны для готовой комнаты.',0],
 chairSoft:['Снимает неудобство долгой игры у сидящего на этом стуле.',1],
 chairArms:['Удобство долгой игры и +2 престижа за каждый из первых двух.',2],
 light:['Освещает комнату: без включённого света партия недоступна.',0],
 lightAdjustable:['Атмосфера страшной истории; +2 престижа.',2],
 deskLamp:['Освещает игровую комнату. Ставится свободно на столешницу.',0],
 shelf:['Хранит 6 экземпляров игр. Нужен свободный подход.',0],
 shelfLarge:['Хранит 16 экземпляров игр. Нужен свободный подход.',1],
 sofa:['Три места ожидания: сидящие не получают штраф за долгое ожидание.',2],
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
 water:['Выдаёт воду из оплаченного запаса. Снимает потребность в напитке.',1],
 kettle:['Выдаёт чай из оплаченного запаса любителям чая.',1],
 coffee:['Продаёт кофе по 30 ₽. Нужны порции и обслуживание.',2],
 coffeeAuto:['До 8 порций кофе за раз; продажа по 30 ₽. Шумит.',4],
 cookies:['20 мест хранения печенья. Следите за годностью порций.',1],
 fridge:['Холодное хранение и продажа напитков по 35 ₽.',2],
 fan:['Уменьшает духоту на длинных играх; создаёт шум.',0],
 conditioner:['Убирает духоту без шума вентилятора. +3 престижа.',3],
 whiteboard:['Помогает объяснять правила игрокам, которым нужны материалы.',1],
 dice:['Дополнительные кубики: +0,12 к комфорту новичка за этим столом.',1],
 mat:['Карта боя: +0,18 к комфорту любителя тактических сцен.',2],
 miniatures:['Наглядные сражения: +0,20 к комфорту любителя тактики.',3],
 screen:['Ширма: +0,10 к комфорту серьёзной истории; +4 престижа.',4],
 tablet:['Помощь с правилами на столе и +5 престижа.',5],
 soundproof:['Защищает чувствительных к шуму гостей от соседних партий.',2],
});

export const effectText = kind => ITEM_EFFECTS[kind]?.[0] ?? '';
export function clubPrestige(club) {
 const counts={},sources=[];
 for(const item of club.layout.objects){
  const points=ITEM_EFFECTS[item.kind]?.[1]??0;
  if(!points||item.enabled===false||(counts[item.kind]??0)>=2||!objectApproaches(club.layout,item).length)continue;
  counts[item.kind]=(counts[item.kind]??0)+1;sources.push({id:item.id,name:BUILD_CATALOG[item.kind].name,points});
 }
 const reputation=club.rating.count?Math.floor((club.rating.sum/club.rating.count)*2):0;
 return {value:sources.reduce((n,s)=>n+s.points,0)+reputation,sources,reputation};
}
export const prestigeNeeded = master => master.fee<=900?0:master.fee<=1500?10:master.fee<=2400?20:30;
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
