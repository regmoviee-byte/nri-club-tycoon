import test from 'node:test';
import assert from 'node:assert/strict';
import {createFreshCampaign,normalizeAdministrator} from '../src/model/new-club.js';
import {createCampaign,decodeClub,encodeClub,build,hireMaster,buyGame,waitForGuests,startRoom,advanceClub} from '../src/model/campaign.js';
import {assignGuest} from '../src/model/club.js';
import {rateCampaignGuest} from '../src/model/campaign-rating.js';
import {roomReadiness} from '../src/model/layout.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {rectangle,roomEdit} from '../src/model/studio-building.js';
import {availableMasterCandidates} from '../src/data/masters-market.js';
import {ECONOMY} from '../src/data/commerce.js';
import {BUILD_CATALOG} from '../src/data/build-catalog.js';
import {reviewFeedback} from '../src/model/review-feedback.js';
import {doorCrossings,doorArt} from '../src/ui/door-art.js';
import {seatedTorsoFaces} from '../src/ui/seated-person.js';
const ok=result=>{assert.equal(result.ok,true,result.reason);return result;};
test('ordinary new clubs contain only reception and do not charge for rooms, masters or a library',()=>{
 const c=createFreshCampaign('fresh-empty');assert.equal(c.rooms.length,0);assert.equal(c.layout.rooms.length,0);assert.deepEqual(c.layout.objects.map(o=>o.kind),['reception']);assert.equal(c.staff.length,0);assert.equal(c.library.copies.length,0);assert.equal(c.finance.cash,ECONOMY.initialBudget-BUILD_CATALOG.reception.price);assert.equal(c.finance.ledger.length,1);assert.doesNotMatch(c.finance.ledger[0].text,/мастер|игровая/i);assert.ok(decodeClub(encodeClub(c)));
});
test('a player can pay for a first game room, rest, shelf, master and system without a construction grant',async()=>{
 const c=createFreshCampaign('fresh-build'),service=createConstructionService({getClub:()=>c,replaceClub:n=>Object.assign(c,n),persist:async()=>{},economy:constructionBudgetAdapter()});let id=0;
 async function buy(edit){const q=ok(service.quote(edit));return ok(await service.commit(q.edit,{baseRevision:q.baseRevision,transactionId:'fresh-'+(++id)}));}
 await buy(roomEdit(c.layout,rectangle({x:1,y:0},{x:5,y:4}),{purpose:'game',furnished:true}));await buy(roomEdit(c.layout,rectangle({x:4,y:5},{x:5,y:7}),{purpose:'staff',furnished:true}));ok(build(c,'item',{type:'shelf',x:5,y:4}));ok(hireMaster(c,availableMasterCandidates(c)[0].id));ok(buyGame(c,'fate'));
 assert.equal(c.rooms.filter(r=>r.operational).length,1);assert.ok(c.finance.cash>0);for(let i=0;i<4&&c.guests.length<3;i++)ok(waitForGuests(c));assert.ok(c.guests.length>=3);assert.ok(decodeClub(encodeClub(c)));
});
test('administrator choices are normalized and persist through the normal save format',()=>{
 const administrator=normalizeAdministrator({name:'Алиса',grammar:'feminine',portrait:{hair:'braid',coat:'#824c75',outfit:'hoodie',glasses:true,earrings:true,necklace:true,hairClip:true}}),c=createFreshCampaign('admin-save',administrator);assert.deepEqual(decodeClub(encodeClub(c)).administrator,administrator);assert.equal(normalizeAdministrator({portrait:{coat:'url(evil)',hair:'invalid'}}).portrait.coat,'#426b64');
});
test('displayed tens only give positive feedback and lower scores explain the actual reason and next action',()=>{
 assert.equal(reviewFeedback({score:10,text:'Мне не хватило времени',evidence:{duration:[{fit:.6,text:'Мне удобно5ч, игра длилась2ч',code:'duration'}]}}).advice,null);assert.doesNotMatch(reviewFeedback({score:10}).text,/не хватило|но |иначе/);
 const lower=reviewFeedback({score:6,evidence:{duration:[{fit:.4,text:'Мне удобно5ч, игра длилась2ч',code:'duration'}]},weights:{duration:5}});assert.match(lower.text,/2ч/);assert.match(lower.advice,/длительности/);
 const resolved=reviewFeedback({score:9,evidence:{game:[{fit:.85,text:'В игре хватило любимых сцен',code:'scenes'}]},weights:{game:5}});assert.match(resolved.text,/меньше/);assert.match(resolved.advice,/соотношением/);
});
test('door crossings are identified for horizontal and vertical routes, not nearby parallel walking',()=>{
 const h={id:'h',axis:'h',x:0,y:1,kind:'door'},v={id:'v',axis:'v',x:1,y:0,kind:'wideDoor'};assert.deepEqual(doorCrossings([{x:.5,y:.5},{x:.5,y:1.5}],[h]),[{id:'h',step:.5}]);assert.deepEqual(doorCrossings([{x:.5,y:.5},{x:1.5,y:.5}],[v]),[{id:'v',step:.5}]);assert.deepEqual(doorCrossings([{x:.5,y:.5},{x:1.5,y:.5}],[h]),[]);assert.notEqual(doorArt(h,42,0),doorArt(h,42,1));
});
test('seated torsos have rounded depth in every seat direction without changing chair support height',()=>{
 for(const rotation of [0,1,2,3]){const faces=seatedTorsoFaces({portrait:{coat:'#627f84'}},{rotation,atTable:true}),points=faces.flatMap(f=>f.points);assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)));assert.ok(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>.25);assert.ok(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))>.25);assert.equal(Math.min(...points.map(p=>p.z)),16);}
});
test('chairs bind the first master seat and every later physical guest seat beyond four, including save reload',async()=>{
 const c=createFreshCampaign('chairs-grow');c.finance.cash+=50000;
 const service=createConstructionService({getClub:()=>c,replaceClub:n=>Object.assign(c,n),persist:async()=>{},economy:constructionBudgetAdapter()});let serial=0;
 async function place(edit){const q=ok(service.quote(edit));return ok(await service.commit(q.edit,{baseRevision:q.baseRevision,transactionId:'chairs-'+(++serial)}));}
 await place({type:'buyCells',cells:rectangle({x:6,y:0},{x:7,y:7})});await place(roomEdit(c.layout,rectangle({x:1,y:0},{x:7,y:5}),{purpose:'game',furnished:false}));
 await place({type:'place',object:{kind:'table',x:3,y:2,rotation:0}});await place({type:'place',object:{kind:'light',x:3,y:2,rotation:0}});
 for(const [i,[x,y,rotation]]of [[2,2,1],[2,3,1],[5,2,3],[5,3,3],[3,4,0],[4,4,0],[3,1,2],[4,1,2]].entries()){
  await place({type:'place',object:{kind:'chair',x,y,rotation}});const chair=c.layout.objects.at(-1);assert.equal(chair.role,i?'guest':'master');if(i)assert.equal(chair.seat,i-1);assert.equal(c.rooms[0].capacity,i);
 }
 assert.equal(roomReadiness(c.layout,c.rooms[0].id).ok,true);assert.equal(decodeClub(encodeClub(c)).rooms[0].capacity,7);
 await place({type:'remove',id:c.rooms[0].chairIds[1]});assert.equal(c.rooms[0].capacity,6);assert.equal(decodeClub(encodeClub(c)).rooms[0].capacity,6);
});
test('two guests can start below full capacity and pay exactly two contracts',()=>{
 const c=createCampaign('two-guests'),r=c.rooms[0];for(let seat=0;seat<2;seat++)ok(assignGuest(c,c.guests[seat].id,r.id,seat));ok(startRoom(c,r.id,{acceptRisk:true}));assert.equal(r.run.ratingVersion,10);assert.equal(r.run.guests.length,2);const copy=decodeClub(encodeClub(c));ok(advanceClub(copy));assert.equal(copy.sessionJournal.entries[0].reviews.length,2);
});
test('exceeding a master group limit worsens new reviews while accepted V9 arithmetic is preserved',()=>{
 const c=createCampaign('master-size'),r=c.rooms[0];for(let seat=0;seat<4;seat++)ok(assignGuest(c,c.guests[seat].id,r.id,seat));ok(startRoom(c,r.id,{acceptRisk:true}));const run=structuredClone(r.run),g=run.guests[0];run.room.master.maxPlayers=4;const normal=rateCampaignGuest(run,g);run.room.master.maxPlayers=2;const overloaded=rateCampaignGuest(run,g);assert.ok(Math.abs(overloaded.overloadPenalty-1.7)<1e-10);assert.ok(overloaded.satisfactionValue<normal.satisfactionValue);assert.match(reviewFeedback({...overloaded,score:8,evidence:{},comfort:{}}).advice,/мастера/);
 run.ratingVersion=9;const old=rateCampaignGuest(run,g);run.room.master.maxPlayers=6;assert.deepEqual(rateCampaignGuest(run,g),old);
});
