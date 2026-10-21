import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,executeCampaignAction,startRoom,advanceClub,waitForGuests,dismissGuest,decodeClub,encodeClub} from '../src/model/campaign.js';
import {assignGuest} from '../src/model/club.js';
import {clubDirectionStatus} from '../src/model/club-direction.js';
import {hourlyCosts,reserveRequired} from '../src/model/finances.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {rectangle,roomEdit,demolishRoomEdit} from '../src/model/studio-building.js';
import {cleaningPolicyStatus} from '../src/model/operations.js';
const ok=r=>{assert.equal(r.ok,true,r.reason);return r;};
const action=(c,a)=>ok(executeCampaignAction(c,a));
function construction(c){let n=0;const service=createConstructionService({getClub:()=>c,replaceClub:next=>Object.assign(c,next),persist:async()=>{},economy:constructionBudgetAdapter()});return async edit=>{const q=ok(service.quote(edit));return ok(await service.commit(q.edit,{transactionId:'fix-'+(++n),baseRevision:q.baseRevision}));};}
function start(c){c.guests.slice(0,4).forEach((g,i)=>ok(assignGuest(c,g.id,c.rooms[0].id,i)));ok(startRoom(c,c.rooms[0].id));}

test('school can stop expenses below reserve; the following actual ledger excludes its charge',async()=>{
 const c=createCampaign('recheck-school-reserve');action(c,{type:'setClubDirection',direction:'beginners'});start(c);
 await construction(c)({type:'buyCells',cells:rectangle({x:6,y:0},{x:18,y:1})});assert.equal(c.finance.cash,500);assert.ok(reserveRequired(c)>500);
 action(c,{type:'setClubDirection',direction:'general'});assert.equal(c.clubDirection.id,'general');const from=c.clock,base=hourlyCosts(c).general,first=c.finance.ledger.length;
 ok(advanceClub(c));const charged=c.finance.ledger.slice(first).filter(e=>e.kind==='operations').reduce((n,e)=>n+e.details.general,0);assert.equal(charged,base*(c.clock-from));
});
test('school activation validates its new reserve atomically and never duplicates its activation fee',async()=>{
 const c=createCampaign('recheck-school-activation-reserve');start(c);const buy=construction(c);await buy({type:'buyCells',cells:rectangle({x:6,y:0},{x:17,y:1})});await buy({type:'floor',cells:[{x:6,y:0},{x:7,y:0}],finish:'wood'});
 assert.equal(c.finance.cash,990);assert.equal(reserveRequired(c),680);const before=encodeClub(c);assert.equal(executeCampaignAction(c,{type:'setClubDirection',direction:'beginners'}).ok,false);assert.equal(encodeClub(c),before);
 const fresh=createCampaign('school-fee-fix'),cash=fresh.finance.cash;action(fresh,{type:'setClubDirection',direction:'beginners'});action(fresh,{type:'setClubDirection',direction:'beginners'});assert.equal(fresh.finance.cash,cash-300);
});
test('a real second-visit lesson is not counted as a post-lesson return, including after reload',()=>{
 const c=createCampaign('recheck-retention-1'),personId=c.guests[0].personId;action(c,{type:'setClubDirection',direction:'beginners'});ok(dismissGuest(c,c.guests[0].id));let returned;
 for(let step=0;step<24&&!returned;step++){for(const g of [...c.guests])if(g.personId!==personId)ok(dismissGuest(c,g.id));ok(waitForGuests(c));returned=c.guests.find(g=>g.personId===personId);}
 assert.ok(returned);const others=c.guests.filter(g=>g.id!==returned.id&&g.schedule.leaveAt>=c.clock+2);
 for(let step=0;others.length<2&&step<5;step++){ok(waitForGuests(c));for(const g of c.guests)if(g.id!==returned.id&&g.schedule.leaveAt>=c.clock+2&&!others.some(o=>o.id===g.id))others.push(g);}
 assert.ok(others.length>=2);[returned,...others.slice(0,2)].forEach((g,i)=>ok(assignGuest(c,g.id,c.rooms[0].id,i)));ok(startRoom(c,c.rooms[0].id));for(let i=0;c.rooms.some(r=>r.status==='running')&&i<20;i++)ok(advanceClub(c));
 const person=c.guestRegistry.persons[personId];assert.equal(person.visits,2);assert.equal(person.introductions.fate.at,22);assert.equal(person.introductions.fate.visitId,returned.visitId);assert.equal(clubDirectionStatus(c).progress.returningLearners,0);assert.equal(clubDirectionStatus(decodeClub(encodeClub(c))).progress.returningLearners,0);
});
test('retention uses actual arrivals and supports old dated lessons plus new same-hour event identity',()=>{
 const c=createCampaign('retention-timeline'),p=Object.values(c.guestRegistry.persons)[0],visits=c.guestRegistry.visits;
 p.introductions={fate:{at:20,visitId:p.lastVisitId}};assert.equal(clubDirectionStatus(c).progress.returningLearners,0);
 visits['after-lesson']={id:'after-lesson',personId:p.id,arrivedAt:20,status:'completed'};assert.equal(clubDirectionStatus(c).progress.returningLearners,1);
 delete p.introductions.fate.visitId;assert.equal(clubDirectionStatus(c).progress.returningLearners,0);visits['after-lesson'].arrivedAt=21;assert.equal(clubDirectionStatus(c).progress.returningLearners,1);
 p.introductions.fate.at=null;assert.equal(clubDirectionStatus(c).progress.returningLearners,0);
});
test('demolishing the only cleaning target pauses the policy, preserves history and never stops the chosen shift',async()=>{
 const c=createCampaign('recheck-clean-demolition'),buy=construction(c);await buy({type:'buyCells',cells:rectangle({x:6,y:5},{x:7,y:7})});await buy(roomEdit(c.layout,rectangle({x:6,y:5},{x:7,y:7}),{purpose:'staff',furnished:false}));
 const id=c.layout.rooms.at(-1).id;action(c,{type:'hireServiceStaff'});action(c,{type:'setCleaningPolicy',policy:{enabled:true,zoneIds:[id],maxSpend:100}});action(c,{type:'setServiceShift',active:true});const orders=structuredClone(c.operations.cleaningPolicy.orders);
 await buy(demolishRoomEdit(c.layout,id,{removeBoundary:true,removeFinishes:true}));let status=cleaningPolicyStatus(c);assert.equal(status.enabled,false);assert.deepEqual(status.zoneIds,[]);assert.match(status.reason,/удалены/);assert.deepEqual(c.operations.cleaningPolicy.orders,orders);assert.ok(c.serviceStaff.some(p=>p.onShift));assert.equal(c.operations.tasks.length,0);
 const reload=decodeClub(encodeClub(c));assert.match(cleaningPolicyStatus(reload).reason,/удалены/);assert.equal(executeCampaignAction(reload,{type:'setCleaningPolicy',policy:{enabled:true,zoneIds:[id]}}).ok,false);
 action(reload,{type:'setCleaningPolicy',policy:{enabled:true,zoneIds:['common']}});status=cleaningPolicyStatus(reload);assert.equal(status.enabled,true);assert.doesNotMatch(status.reason,/удалены/);
});
