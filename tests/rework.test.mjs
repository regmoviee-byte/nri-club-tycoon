import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,encodeClub,decodeClub,startRoom,advanceClub,readyRooms,hireMaster,replenish} from '../src/model/campaign.js';
import {assignGuest,askQuestion} from '../src/model/club.js';
import {BUILD_CATALOG} from '../src/data/build-catalog.js';
import {availableMasterCandidates} from '../src/data/commerce.js';
import {createStarterLayout,quoteEdit,validateLayout,objectCells,roomReadiness,objectApproaches} from '../src/model/layout.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {ownedCells} from '../src/model/campaign-layout.js';
import {ITEM_EFFECTS,clubPrestige,prestigeNeeded,roomUpgradeBenefit} from '../src/model/upgrades.js';
import {receptionStatus} from '../src/model/reception-area.js';
import {roomEdit,rectangle} from '../src/model/studio-building.js';
import {routeToSeat,project,unproject} from '../src/ui/world.js';
import {rateCampaignGuest} from '../src/model/campaign-rating.js';
import {cleanZone} from '../src/model/operations.js';
import {findRecoveryPlan} from '../src/model/solvency.js';
import {recordMoney} from '../src/model/finances.js';
import {CAMPAIGN_RATING_VERSION} from '../src/model/campaign-rating.js';

function service(initial,{fail=false}={}){
 let club=initial,writes=0;const api=createConstructionService({getClub:()=>club,replaceClub:c=>club=c,persist:async()=>{if(fail)throw new Error('Disk failure');writes++;},economy:constructionBudgetAdapter()});
 return {api,current:()=>club,writes:()=>writes};
}
async function buy(api,edit,id='test-transaction'){const q=api.quote(edit);assert.equal(q.ok,true,q.reason);return api.commit(q.edit,{transactionId:id,baseRevision:q.baseRevision});}

test('New campaign has one ready room, six guests, reachable reception and a visible physical rest place',()=>{
 const c=createCampaign('new-start');assert.equal(c.rooms.length,1);assert.equal(c.rooms[0].operational,true);assert.equal(c.guests.length,6);assert.equal(c.finance.cash,4050);assert.equal(receptionStatus(c).ready,true);assert.equal(validateLayout(c.layout).ok,true);
});
test('Arrival depends on the physical reception; existing guests are never erased',()=>{
 const c=createCampaign('reception');c.layout.objects=c.layout.objects.filter(o=>o.kind!=='reception');const kept=c.guests.slice(0,2);c.guests=kept;replenish(c);assert.equal(c.guests.length,2);assert.deepEqual(c.guests,kept);c.layout.objects.push({id:'desk',kind:'reception',x:1,y:6,rotation:0});replenish(c);assert.equal(c.guests.length,2);assert.deepEqual(c.guests,kept,'Reopening the desk cannot create visits without elapsed game time');
});
test('Three hand-picked cells cost exactly 375 rubles; durable receipt replays without a second debit',async()=>{
 const s=service(createCampaign('land')),before=s.current().finance.cash,edit={type:'buyCells',cells:[{x:-1,y:6},{x:-1,y:7},{x:-2,y:7}]},q=s.api.quote(edit);
 assert.equal(q.ok,true,q.reason);assert.equal(q.cost,375);const result=await s.api.commit(q.edit,{transactionId:'land-three',baseRevision:q.baseRevision});assert.equal(result.ok,true,result.reason);
 assert.equal(s.current().finance.cash,before-375);assert.equal(ownedCells(s.current().layout).size,51);
 const replay=await s.api.commit(q.edit,{transactionId:'land-three',baseRevision:q.baseRevision});assert.equal(replay.replayed,true);assert.equal(s.writes(),1);
 assert.deepEqual(decodeClub(encodeClub(s.current())).layout,s.current().layout);
});
test('Disconnected land, duplicate cells and occupied cells are rejected without mutations',()=>{
 const c=createCampaign('invalid-land'),raw=encodeClub(c);for(const cells of [[{x:50,y:50}],[{x:-1,y:7},{x:-1,y:7}],[{x:0,y:7}]])assert.equal(quoteEdit(c.layout,{type:'buyCells',cells}).ok,false);assert.equal(encodeClub(c),raw);
});
test('Cleaning common space uses the actual purchased area, not 48 cells per small parcel',()=>{
 const c=createCampaign('clean-area');c.layout=quoteEdit(c.layout,{type:'buyCells',cells:[{x:-1,y:6},{x:-1,y:7},{x:-2,y:7}]}).next;c.operations.zones.common.cleanliness=50;
 const result=cleanZone(c,'common');assert.equal(result.ok,true,result.reason);assert.equal(result.cost,40);assert.equal(result.task.sections,1);
});
test('A financial recovery plan preserves a reachable reception and can still receive guests',()=>{
 const c=createCampaign('recover-desk');recordMoney(c,-4200,'fixture','Technical debt fixture');const plan=findRecoveryPlan(c);assert.ok(plan,'A small debt should have a concrete recovery plan');assert.equal(receptionStatus({...c,layout:plan.layout}).ready,true);assert.ok(plan.layout.objects.some(o=>o.kind==='reception'));assert.equal(plan.items.some(i=>i.name==='Стойка ресепшна'&&i.action==='sell'),false);
});
test('Failed persistence keeps both geometry and money exactly unchanged',async()=>{
 const initial=createCampaign('save-failure'),raw=encodeClub(initial),s=service(initial,{fail:true}),q=s.api.quote({type:'buyCells',cells:[{x:-1,y:7}]});
 assert.equal(q.ok,true,q.reason);const result=await s.api.commit(q.edit,{transactionId:'failed',baseRevision:q.baseRevision});assert.equal(result.ok,false);assert.equal(encodeClub(s.current()),raw);
});
test('A stale construction quote cannot debit the current club',async()=>{
 const s=service(createCampaign('stale')),q=s.api.quote({type:'buyCells',cells:[{x:-1,y:7}]});s.current().layout.revision++;const before=encodeClub(s.current());assert.equal((await s.api.commit(q.edit,{transactionId:'stale',baseRevision:q.baseRevision})).ok,false);assert.equal(encodeClub(s.current()),before);
});
for(const item of Object.values(BUILD_CATALOG))test('Catalog geometry and effect: '+item.kind,()=>{
 assert.equal(typeof ITEM_EFFECTS[item.kind]?.[0],'string');assert.ok(ITEM_EFFECTS[item.kind][0].length>20);
 for(const rotation of [0,1,2,3]){
  const layout=createStarterLayout();let result;
  for(let y=0;y<8&&!result;y++)for(let x=0;x<6&&!result;x++){const q=quoteEdit(layout,{type:'place',object:{id:'tested-item',kind:item.kind,x,y,rotation}});if(q.ok)result=q;}
  assert.ok(result,item.kind+' rotation '+rotation+' has no legal placement');assert.equal(validateLayout(result.next).ok,true);const object=result.next.objects.find(o=>o.id==='tested-item');assert.equal(objectCells(object).length,item.width*item.height);assert.equal(result.cost,item.price);
 }
});
test('A full-size mat supports all four distinct accessories without false collisions',()=>{
 let layout=createStarterLayout();
 for(const [kind,x,y]of [['mat',2,1],['screen',2,1],['dice',3,1],['miniatures',2,2],['tablet',3,2]]){const q=quoteEdit(layout,{type:'place',object:{id:'accessory-'+kind,kind,x,y,rotation:0}});assert.equal(q.ok,true,kind+': '+q.reason);layout=q.next;}
 assert.equal(layout.objects.filter(o=>BUILD_CATALOG[o.kind].layer==='tabletop').length,5);
});
test('Hand-drawn furnished room has valid access, walls, door and five seats',()=>{
 let layout=createCampaign('room-preset').layout;
 let q=quoteEdit(layout,{type:'buyCells',cells:rectangle({x:6,y:0},{x:11,y:7})});assert.equal(q.ok,true,q.reason);layout=q.next;
 q=quoteEdit(layout,{type:'wall',edge:{axis:'v',x:6,y:6},kind:'door'});assert.equal(q.ok,true,q.reason);layout=q.next;
 const edit=roomEdit(layout,rectangle({x:7,y:0},{x:11,y:4}),{furnished:true});q=quoteEdit(layout,edit);assert.equal(q.ok,true,q.reason);const room=q.next.rooms.at(-1);assert.equal(roomReadiness(q.next,room.id).ok,true);
});
test('Prestige is physical, capped at two per item kind, and gates expensive hires',()=>{
 const c=createCampaign('prestige');c.finance.cash=20000;const candidate=availableMasterCandidates(c).find(m=>prestigeNeeded(m)>0);assert.ok(candidate);assert.equal(hireMaster(c,candidate.id).ok,false);
 c.layout=quoteEdit(c.layout,{type:'buyCells',cells:[{x:-1,y:5},{x:-1,y:6},{x:-1,y:7}]}).next;
 for(let i=0;i<3;i++)c.layout.objects.push({id:'plant-'+i,kind:'plant',x:-1,y:5+i,rotation:0});assert.equal(clubPrestige(c).sources.filter(s=>s.name==='Растение').length,2);assert.equal(clubPrestige(c).value,2.5);
 c.layout.objects.find(o=>o.id==='plant-0').enabled=false;assert.equal(clubPrestige(c).value,2.5);c.layout.objects.find(o=>o.id==='plant-1').enabled=false;assert.equal(clubPrestige(c).value,2);
});
test('Gear has explicit bounded effects and cannot override time or topic violations',()=>{
 const c=createCampaign('gear');c.finance.cash=20000;const r=c.rooms[0];for(const [seat,g]of c.guests.slice(0,4).entries())assert.equal(assignGuest(c,g.id,r.id,seat).ok,true);assert.equal(startRoom(c,r.id).ok,true);
 const run=structuredClone(r.run),guest=run.guests[0];run.room.equipment.push(...['dice','mat','miniatures','screen','tableComfort'].map(kind=>({id:'bonus-'+kind,kind,type:kind,enabled:true})));
 guest.preferences.knowledge[run.room.session.systemId]=0;guest.preferences.scenes.combat=1;guest.preferences.tone='serious';
 const benefit=roomUpgradeBenefit(run,guest);assert.equal(benefit.bonus,.6);assert.equal(benefit.effects.length,5);
 guest.schedule.leaveAt=run.startedAt+1;const review=rateCampaignGuest(run,guest);assert.ok(review.score<=4);assert.ok(review.violations.length);
});
test('Two sessions complete without the rejected 15-minute preparation phase; old contracts keep their rating version',()=>{
 const c=createCampaign('session-clock');c.finance.cash=20000;
 for(let turn=0;turn<2;turn++){
  const room=c.rooms[0],guests=c.guests.filter(g=>!g.roomId&&g.schedule.leaveAt>=c.clock+2).slice(0,4);assert.equal(guests.length,4);
  guests.forEach((g,seat)=>{askQuestion(c,g.id,'time');assert.equal(assignGuest(c,g.id,room.id,seat).ok,true);});
  assert.ok(readyRooms(c).length);const before=c.clock;assert.equal(startRoom(c,room.id).ok,true);assert.equal(room.run.ratingVersion,CAMPAIGN_RATING_VERSION);
  const saved=decodeClub(encodeClub(c));assert.equal(saved.rooms[0].status,'running');assert.equal(advanceClub(c).ok,true);assert.equal(c.clock,before+2);
  assert.equal(c.rooms[0].tablePreparation,null);assert.equal(c.library.copies[0].preparingUntil,null);assert.ok(c.lastReport.completed[0].reviews.every(r=>!r.violations.some(v=>v.includes('раньше'))));
 }
 assert.equal(c.rating.count,8);assert.equal(new Set(c.reviewIds).size,8);assert.equal(c.finance.settledRuns.length,2);assert.equal(decodeClub(encodeClub(c)).rating.count,8);
});
test('Projection is invertible and a route from reception reaches each seat only through passable tiles and doors',()=>{
 const c=createCampaign('routes'),desk=receptionStatus(c).desk,start={x:desk.x+1,y:desk.y+1.45};
 for(const target of c.layout.objects.filter(o=>o.role==='guest')){
  const path=routeToSeat(c.layout,start,target);assert.ok(path.length>1);for(let i=1;i<path.length-1;i++){const a=path[i-1],b=path[i];assert.ok(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1.01);const wall=c.layout.walls.find(w=>w.axis===(a.x===b.x?'h':'v')&&w.x===(a.x===b.x?Math.floor(a.x):Math.floor(Math.max(a.x,b.x)))&&w.y===(a.x===b.x?Math.floor(Math.max(a.y,b.y)):Math.floor(a.y)));if(wall)assert.ok(['door','wideDoor'].includes(wall.kind));}
 }
 for(const p of [{x:-3.2,y:9.1},{x:1,y:2},{x:0,y:0}]){const screen=project(p.x,p.y),back=unproject(screen.x,screen.y);assert.ok(Math.abs(back.x-p.x)<1e-9&&Math.abs(back.y-p.y)<1e-9);}
});
