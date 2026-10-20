import {SYSTEMS} from './systems.js';
import {SESSIONS} from './club.js';
export {masterCandidate,marketCandidates,availableMasterCandidates,MASTER_MARKET_COUNT} from './masters-market.js';
import {BUILD_CATALOG} from './build-catalog.js';
export const ECONOMY={initialBudget:14020,openingSpent:9970,guestHour:150,payThreshold:6,roomHour:80,consumableHour:10};
export const PRODUCTS={
 table:{name:'Игровой стол',price:1600,w:2,h:2,kind:'table'},
 wideTable:{name:'Просторный стол',price:3800,w:2,h:2,kind:'table',effect:'materials'},
 chair:{name:'Простой стул',price:350,w:1,h:1,kind:'chair'},
 softChair:{name:'Мягкий стул',price:750,w:1,h:1,kind:'chair',effect:'long-seat'},
 armchair:{name:'Стул с подлокотниками',price:1100,w:1,h:1,kind:'chair',effect:'arms'},
 lamp:{name:'Светильник',price:300,w:1,h:1,kind:'light',overhead:true},
 dimmer:{name:'Регулируемый свет',price:900,hourly:2,w:1,h:1,kind:'light',overhead:true,effect:'atmosphere'},
 shelf:{name:'Книжная полка',price:450,w:1,h:1,kind:'shelf',storage:6},
 bigShelf:{name:'Большая полка',price:1000,w:2,h:1,kind:'shelf',storage:16},
 dice:{name:'Набор кубиков',price:150,w:1,h:1,kind:'accessory',overhead:true},
 mat:{name:'Игровой коврик',price:600,w:1,h:1,kind:'accessory',overhead:true,effect:'map'},
 board:{name:'Маркерная доска',price:700,w:1,h:1,kind:'accessory',overhead:true,effect:'notes'},
 miniatures:{name:'Набор миниатюр',price:1200,w:1,h:1,kind:'accessory',overhead:true,effect:'tactics'},
 screen:{name:'Ширма мастера',price:500,w:1,h:1,kind:'accessory',overhead:true,effect:'screen'},
 tablet:{name:'Планшет мастера',price:3000,hourly:3,w:1,h:1,kind:'accessory',overhead:true,effect:'rules'},
 sofa:{name:'Диван ожидания',price:1400,w:2,h:1,kind:'sofa',effect:'waiting',seats:3},
 bench:{name:'Скамья',price:600,w:2,h:1,kind:'bench',effect:'waiting',seats:3},
 coatRack:{name:'Вешалка',price:250,w:1,h:1,kind:'rack'},
 bin:{name:'Урна',price:180,w:1,h:1,kind:'bin'},
 plant:{name:'Растение',price:200,w:1,h:1,kind:'plant'},
 poster:{name:'Постер на стене',price:150,w:1,h:1,kind:'picture',overhead:true,wallMounted:true},
 painting:{name:'Картина на стене',price:500,w:1,h:1,kind:'picture',overhead:true,wallMounted:true},
 kitchen:{name:'Кухонная стойка',price:1800,w:2,h:1,kind:'kitchen',effect:'kitchen'},
 water:{name:'Кулер',price:1200,hourly:3,w:1,h:1,kind:'water',service:'water',unitCost:2,capacity:12},
 tea:{name:'Чайник и чай',price:700,hourly:2,w:1,h:1,kind:'tea',service:'tea',unitCost:5,capacity:8},
 coffee:{name:'Кофеварка',price:2200,hourly:5,w:1,h:1,kind:'coffee',service:'coffee',unitCost:12,salePrice:30,capacity:4},
 coffeeMachine:{name:'Кофемашина',price:6000,hourly:12,w:1,h:1,kind:'coffee',service:'coffee',unitCost:10,salePrice:30,capacity:8,noisy:true},
 cookies:{name:'Печенье',price:800,hourly:1,w:1,h:1,kind:'cookies',service:'cookie',unitCost:4,capacity:20},
 fridge:{name:'Холодильник',price:2800,hourly:8,w:1,h:1,kind:'fridge',service:'cold',unitCost:20,salePrice:35,capacity:20},
 fan:{name:'Вентилятор',price:600,hourly:4,w:1,h:1,kind:'fan',effect:'heat',noisy:true},
 aircon:{name:'Кондиционер',price:3500,hourly:18,w:1,h:1,kind:'aircon',overhead:true,effect:'heat'},
 soundproof:{name:'Звукоизоляция',price:1800,hourly:5,w:1,h:1,kind:'soundproof',overhead:true,effect:'quiet'},
};
// The free-form map is the only geometry source. Commerce names from the
// earlier simulation map to its actual footprints and layers, never vice versa.
export const COMMERCE_KINDS=Object.freeze({wideTable:'tableComfort',softChair:'chairSoft',armchair:'chairArms',lamp:'light',dimmer:'lightAdjustable',bigShelf:'shelfLarge',coatRack:'hanger',tea:'kettle',coffeeMachine:'coffeeAuto',aircon:'conditioner',board:'whiteboard'});
export const canonicalKind=type=>COMMERCE_KINDS[type]??type;
const commerceNames=Object.fromEntries(Object.entries(COMMERCE_KINDS).map(([name,kind])=>[kind,name]));
for(const [kind,item] of Object.entries(BUILD_CATALOG)){
 const old=PRODUCTS[commerceNames[kind]??kind]??{};
 const product={...old,name:item.name,price:item.price,w:item.width,h:item.height,kind:old.kind??item.family??kind,overhead:item.passable,wallMounted:item.layer==='wall',hourly:item.hourlyCost??0};
 PRODUCTS[kind]=product;if(commerceNames[kind])PRODUCTS[commerceNames[kind]]=product;
}
export const productFor=object=>PRODUCTS[object.kind??object.type];
export function commerceItems(layout){return layout.objects.map(object=>({...object,type:commerceNames[object.kind]??object.kind,price:object.price??BUILD_CATALOG[object.kind].price,enabled:object.enabled!==false,stock:object.stock??0,autoRefill:object.autoRefill===true}));}
const SIMPLE=['fate','mausritter','loop'],MEDIUM=['vaesen','trail','coriolis'];
export const GAME_SHOP=Object.entries(SYSTEMS).filter(([id])=>SESSIONS.some(s=>s.systemId===id)).map(([id,system])=>({id,name:system.name,price:SIMPLE.includes(id)?900:MEDIUM.includes(id)?1600:2400,complexity:SIMPLE.includes(id)?1:MEDIUM.includes(id)?2:3,baseAdventure:SESSIONS.find(s=>s.systemId===id).id}));
export const gameProduct=id=>GAME_SHOP.find(g=>g.id===id);
export const expansionPrice=number=>number===2?6000:number===3?9000:number===4?13000:number===5?18000:Math.round(18000*1.35**(number-5)/100)*100;
export const generalHour=count=>count>0?60+Math.floor((count-1)/2)*80:0;
