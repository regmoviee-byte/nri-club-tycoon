import {createCampaign,build,hireMaster,buyGame,configureRoom} from '../src/model/campaign.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {availableMasterCandidates} from '../src/data/masters-market.js';
import {prestigeNeeded,clubPrestige} from '../src/model/upgrades.js';
import {surfaceEditAt} from '../src/model/table-surface.js';
import {recordMoney} from '../src/model/finances.js';
import {roomEdit,rectangle} from '../src/model/studio-building.js';

// A labelled construction fixture, not money or progress earned by a player.
// Land, furniture, rest places, hiring and game copies use the actual paid APIs.
export async function expandedClub(count=6,{spareLand=false}={}){
 const c=createCampaign('endless-paid-construction');recordMoney(c,1000000,'fixture','Технический бюджет проверки расширения; не обычное прохождение');
 const construction=createConstructionService({getClub:()=>c,replaceClub:next=>Object.assign(c,next),persist:async()=>{},economy:constructionBudgetAdapter()});
 const check=result=>{if(!result.ok)throw Error(result.reason);return result;};
 async function purchase(edit){const q=check(construction.quote(edit));return check(await construction.commit(q.edit,{transactionId:'scale-'+c.layout.revision,baseRevision:q.baseRevision}));}
 let furnishedPrestige=false;
 async function openAdvancedHiring(){
  if(furnishedPrestige)return;furnishedPrestige=true;
  // A large technical fixture must also pay for access to senior applicants;
  // the finite opening pool of inexpensive candidates is not an endless pool.
  const tables=c.layout.objects.filter(o=>o.kind==='table').slice(0,2);
  for(const table of tables){await purchase({type:'upgrade',id:table.id,kind:'tableComfort'});for(const [kind,u,v]of [['screen',.65,.3],['tablet',1.5,1.5]])await purchase({type:'place',object:{...surfaceEditAt(c.layout,kind,{x:table.x+u,y:table.y+v}),roomId:table.roomId}});}
  for(const chair of c.layout.objects.filter(o=>o.role==='guest').slice(0,2))await purchase({type:'upgrade',id:chair.id,kind:'chairArms'});
  for(const x of [0,6])await purchase({type:'place',object:{kind:'decor',x,y:0,rotation:0}});
 }
 for(let i=1;i<count;i++){
  const x=6*i;
  await purchase({type:'buyCells',cells:rectangle({x,y:0},{x:x+5,y:7})});
  check(build(c,'wall',{x:x-1,y:6,side:'E',type:'door'}));
  check(build(c,'template',{x:x+1,y:0}));
  await purchase(roomEdit(c.layout,rectangle({x:x+4,y:5},{x:x+5,y:7}),{purpose:'staff',furnished:true}));
  check(build(c,'item',{type:'shelf',x:x+5,y:4}));
  let candidate=availableMasterCandidates(c).find(m=>prestigeNeeded(m)<=clubPrestige(c).value);
  if(!candidate){await openAdvancedHiring();candidate=availableMasterCandidates(c).find(m=>prestigeNeeded(m)<=clubPrestige(c).value);}
  if(!candidate)throw Error('No qualified candidate after paid prestige investments in construction fixture');
  check(hireMaster(c,candidate.id));const room=c.rooms.at(-1),system=candidate.known[0],bought=check(buyGame(c,system));
  check(configureRoom(c,room.id,{masterId:candidate.id,kitId:bought.kit.id}));
 }
 if(spareLand){const x=6*count;await purchase({type:'buyCells',cells:rectangle({x,y:0},{x:x+5,y:7})});check(build(c,'wall',{x:x-1,y:6,side:'E',type:'door'}));}
 return c;
}
