import {createCampaign,updateCampaign} from './campaign.js';
import {recordMoney} from './finances.js';
import {ensureOperations} from './operations.js';
import {ensureGuestFlow} from './guest-flow.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
import {ECONOMY} from '../data/commerce.js';
export const DEFAULT_ADMINISTRATOR=Object.freeze({name:'Администратор',age:30,grammar:'masculine',role:'administrator',portrait:{skin:'#dfb399',hairColor:'#493b37',hair:'short',coat:'#426b64',trousers:'#344349',shoes:'#303b3e',accent:'#d4bd86',iris:'#536d62',outfit:'vest',bodyShape:'regular',face:2}});
export function normalizeAdministrator(value={}){
 const fallback=DEFAULT_ADMINISTRATOR,look=value.portrait??{},p={...fallback.portrait};
 for(const key of ['skin','hairColor','coat','trousers','shoes','accent','iris'])if(/^#[\da-f]{6}$/i.test(look[key]??''))p[key]=look[key];
 for(const [key,allowed]of Object.entries({hair:['short','bob','curly','long','tied','ponytail','braid','pixie','shaved'],outfit:['shirt','hoodie','cardigan','sweater','vest'],bodyShape:['regular','lean','broad','soft','compact']}))if(allowed.includes(look[key]))p[key]=look[key];
 p.face=Number.isInteger(look.face)&&look.face>=0&&look.face<=5?look.face:2;
 for(const key of ['glasses','beard','earrings','necklace','hairClip'])p[key]=look[key]===true;
 return{name:String(value.name??fallback.name).trim().slice(0,40)||fallback.name,age:30,role:'administrator',grammar:value.grammar==='feminine'?'feminine':'masculine',portrait:p};
}
// The prepared campaign factory remains available for legacy fixtures and old
// balance comparisons. Ordinary new games explicitly use this empty club.
export function createFreshCampaign(seed,administrator=DEFAULT_ADMINISTRATOR){
 const club=createCampaign(seed),desk=club.layout.objects.find(o=>o.kind==='reception');
 club.layout.objects=[desk];club.layout.rooms=[];club.layout.walls=[];club.layout.floors=[];
 club.rooms=[];club.staff=[];club.personnelArchive=[];club.staffRoomLegacyIds=[];club.serviceStaff=[];club.library={copies:[],adventures:[],nextId:1};
 club.guests=[];club.receptionAway=[];club.arrivals=0;club.nextRoomNumber=1;club.guestRegistry={version:1,persons:{},visits:{},requests:{},outcomes:{}};
 club.finance={cash:ECONOMY.initialBudget,ledger:[],nextId:1,settledRuns:[],serviceIds:[]};recordMoney(club,-BUILD_CATALOG.reception.price,'opening','Вход и стойка ресепшна');
 delete club.operations;delete club.inventory;delete club.guestFlow;delete club.development;
 club.waitingArea={version:1,adoptedAt:club.clock,stats:{}};club.administrator=normalizeAdministrator(administrator);club.campaign.startingSetup='reception';
 ensureOperations(club);ensureGuestFlow(club,{newCampaign:true});updateCampaign(club);return club;
}
