import {createCampaign,build,hireMaster,buyGame,configureRoom} from '../src/model/campaign.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {availableMasterCandidates} from '../src/data/masters-market.js';
import {prestigeNeeded} from '../src/model/upgrades.js';
import {recordMoney} from '../src/model/finances.js';
import {roomEdit,rectangle} from '../src/model/studio-building.js';

// A labelled construction fixture, not money or progress earned by a player.
// Land, furniture, rest places, hiring and game copies use the actual paid APIs.
export async function expandedClub(count=6,{spareLand=false}={}){
 const c=createCampaign('endless-paid-construction');recordMoney(c,1000000,'fixture','Технический бюджет проверки расширения; не обычное прохождение');
 const construction=createConstructionService({getClub:()=>c,replaceClub:next=>Object.assign(c,next),persist:async()=>{},economy:constructionBudgetAdapter()});
 const check=result=>{if(!result.ok)throw Error(result.reason);return result;};
 async function purchase(edit){const q=check(construction.quote(edit));return check(await construction.commit(q.edit,{transactionId:'scale-'+c.layout.revision,baseRevision:q.baseRevision}));}
 for(let i=1;i<count;i++){
  const x=6*i;
  await purchase({type:'buyCells',cells:rectangle({x,y:0},{x:x+5,y:7})});
  check(build(c,'wall',{x:x-1,y:6,side:'E',type:'door'}));
  check(build(c,'template',{x:x+1,y:0}));
  await purchase(roomEdit(c.layout,rectangle({x:x+4,y:5},{x:x+5,y:7}),{purpose:'staff',furnished:true}));
  check(build(c,'item',{type:'shelf',x:x+5,y:4}));
  const candidate=availableMasterCandidates(c).find(m=>prestigeNeeded(m)===0);if(!candidate)throw Error('No entry-level candidate in construction fixture');
  check(hireMaster(c,candidate.id));const room=c.rooms.at(-1),system=candidate.known[0],bought=check(buyGame(c,system));
  check(configureRoom(c,room.id,{masterId:candidate.id,kitId:bought.kit.id}));
 }
 if(spareLand){const x=6*count;await purchase({type:'buyCells',cells:rectangle({x,y:0},{x:x+5,y:7})});check(build(c,'wall',{x:x-1,y:6,side:'E',type:'door'}));}
 return c;
}
