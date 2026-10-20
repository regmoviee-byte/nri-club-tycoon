import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,decodeClub,encodeClub,startRoom,advanceClub,readyRooms,executeCampaignAction,makeGuest,advanceIdle,trainMaster,hireMaster} from '../src/model/campaign.js';
import {expandedClub} from '../tools/endless-fixture.js';
import {availableMasterCandidates} from '../src/data/masters-market.js';
import {prestigeNeeded} from '../src/model/upgrades.js';
import {assignGuest,askQuestion} from '../src/model/club.js';
import {rateCampaignGuest,tableWorkloadV9} from '../src/model/campaign-rating.js';
import {roomUpgradeBenefitV8,roomUpgradeBenefitV9} from '../src/model/upgrades.js';
import {sessionProgram} from '../src/model/preferences.js';
import {SESSIONS} from '../src/data/club.js';
import {visibleDemand,recordGuestOutcome,returningGuest} from '../src/model/guests-history.js';
import {recordSessionJournal} from '../src/model/session-journal.js';
import {tablePlan,quickInterview} from '../src/model/table-plan.js';
import {planningGuest} from '../src/model/guest-knowledge.js';
import {sessionForecast,settlementFor,hourlyCosts} from '../src/model/finances.js';
import {audienceDemand} from '../src/model/guest-flow.js';
import {clubDirectionStatus} from '../src/model/club-direction.js';
import {cleaningPolicyStatus,processCleaningPolicy} from '../src/model/operations.js';

const seated=(count=4)=>{const c=createCampaign('design-model'),room=c.rooms[0];c.guests.slice(0,count).forEach((g,i)=>assert.equal(assignGuest(c,g.id,room.id,i).ok,true));return c;};
const finish=c=>{for(let i=0;c.rooms.some(r=>r.status==='running')&&i<50;i++)assert.equal(advanceClub(c).ok,true);assert.ok(!c.rooms.some(r=>r.status==='running'));};
test('Actual partial payments enter demand statistics; old scores remain financially unknown',()=>{
 const c=seated();assert.equal(startRoom(c,c.rooms[0].id).ok,true);const run=c.rooms[0].run,g=run.guests[0],financial=settlementFor(run,{guestId:g.id,score:5,satisfactionValue:5,violations:[]});
 recordGuestOutcome(c,run,[{reviewId:'partial-test',guestId:g.id,score:5,text:'test',financial}]);c.guestRegistry.outcomes.old={reviewId:'old',systemId:'fate',score:10};
 const row=visibleDemand(c).played[0];assert.equal(row.revenue,200);assert.equal(row.paid,1);assert.equal(row.partialPaidCount,1);assert.equal(row.unknownPayments,1);assert.equal(row.collectionRate,.5);
});
test('New three-person contracts retain actual count through save/reload and settle exactly three reviews',()=>{
 const c=seated(3),r=c.rooms[0],three=sessionForecast(c,r.id);assert.ok(readyRooms(c).includes(r));assert.equal(three.guestCount,3);assert.equal(three.income,1200);
 const fourth=c.guests[3];assert.equal(assignGuest(c,fourth.id,r.id,3).ok,true);const four=sessionForecast(c,r.id);fourth.roomId=null;fourth.seat=null;assert.equal(four.masterCost,three.masterCost);assert.equal(four.operatingCost-three.operatingCost,20);
 assert.equal(startRoom(c,r.id).ok,true);assert.equal(r.run.ratingVersion,9);assert.equal(r.run.contract.guestCount,3);const copy=decodeClub(encodeClub(c));assert.deepEqual(copy.rooms[0].run,r.run);finish(copy);
 assert.equal(copy.rating.count,3);assert.equal(copy.finance.settledRuns.length,1);assert.equal(copy.sessionJournal.entries[0].reviews.length,3);assert.equal(copy.guests.some(g=>g.id===fourth.id),true);
 const loaded=decodeClub(encodeClub(copy));assert.deepEqual(loaded.sessionJournal,copy.sessionJournal);
});
test('An accepted V8 quartet retains its frozen rating arithmetic and contract after reload',()=>{
 const c=seated(),r=c.rooms[0];assert.equal(startRoom(c,r.id).ok,true);const old=structuredClone(r.run);old.ratingVersion=8;delete old.contract.guestCount;r.run=old;
 const reviews=old.guests.map(g=>rateCampaignGuest(old,g));const loaded=decodeClub(encodeClub(c));assert.deepEqual(loaded.rooms[0].run,old);assert.deepEqual(loaded.rooms[0].run.guests.map(g=>rateCampaignGuest(loaded.rooms[0].run,g)),reviews);finish(loaded);assert.deepEqual(loaded.sessionJournal.entries[0].reviews.map(r=>r.score),reviews.map(r=>r.score));
});
test('The journal retains only the most recent hundred real outcomes and does not invent an archive',()=>{
 const c=createCampaign('journal'),entry={sessionId:'base',startedAt:1,endsAt:2,payments:200,tips:0,wages:100,reviews:[{financial:{price:400,payment:200,tips:0}}]};
 for(let i=0;i<105;i++)recordSessionJournal(c,{...entry,sessionId:'entry-'+i});assert.equal(c.sessionJournal.entries.length,100);assert.equal(c.sessionJournal.entries[0].sessionId,'entry-5');assert.equal(recordSessionJournal(c,{...entry,sessionId:'entry-104'}),false);
 delete c.sessionJournal;const loaded=decodeClub(encodeClub(c));assert.deepEqual(loaded.sessionJournal.entries,[]);assert.equal(loaded.finance.cash,c.finance.cash);
});
test('V9 tactical bonuses use the story, while an accepted V8 bonus remains identical',()=>{
 const c=seated(),guest=c.guests[0],session=SESSIONS.find(s=>s.id==='club-alien-radio');guest.preferences.scenes.combat=1;
 const run={startedAt:12,endsAt:14,room:{session,program:sessionProgram(session),equipment:[{kind:'mat'},{kind:'miniatures'}]}};
 assert.equal(roomUpgradeBenefitV8(run,guest).bonus,.6);assert.ok(Math.abs(roomUpgradeBenefitV9(run,guest).bonus-.03)<1e-9);
});
test('Planning and the V9 learning calculation use the same miniature context',()=>{
 const c=seated(),room=c.rooms[0],session=SESSIONS.find(s=>s.id==='club-alien-radio');room.session=structuredClone(session);room.program=sessionProgram(session);room.hours=2;room.master.teachingCapacity=0;room.master.teachingSkill=0;
 const mini={id:'context-mini',kind:'miniatures',enabled:true};c.layout.objects.push(mini);room.layout.items.push(mini.id);
 for(const g of c.guests.filter(g=>g.roomId)){g.preferences.knowledge.loop=0;g.preferences.learning='describe';g.preferences.scenes.combat=1;g.asked=['knowledge','learning'];}
 const run={ratingVersion:9,room:{...room,equipment:[mini]},guests:c.guests.filter(g=>g.roomId)},work=tableWorkloadV9(run),plan=tablePlan(c,room.id);
 assert.ok(Math.abs(work.materialsById[run.guests[0].id]-.0075)<1e-9);assert.ok(plan.summary.some(n=>n.code==='teaching'&&n.tone==='warning'));
});
test('Returning stable answers are dated, hidden new facts cannot rewrite them and current boundaries remain unknown',()=>{
 const c=seated(),g=c.guests[0];quickInterview(c,g.id);const person=c.guestRegistry.persons[g.personId],oldVisit=g.visitId,genre=structuredClone(g.profile.genres.slice(0,1));
 g.visitId='another';g.id='another';g.asked=[];g.dialogue=[];g.profile.genres=[{id:'tactics'}];g.profile.boundaries=[{id:'loss'}];
 const planned=planningGuest(c,g);assert.deepEqual(planned.profile.genres,genre);assert.ok(planned.planningMemory.some(a=>a.questionId==='stories'&&a.at===12&&a.visitId===oldVisit));assert.ok(!planned.asked.includes('boundaries'));assert.ok(!planned.asked.includes('knowledge'));assert.ok(!planned.asked.includes('time'));assert.ok(person.knownAnswers['stories|0'].facts);
 for(const answer of Object.values(person.knownAnswers))delete answer.facts;const legacy=planningGuest(c,g);assert.deepEqual(legacy.profile.genres,genre);assert.ok(legacy.planningMemory.some(a=>a.questionId==='stories'));
 const fresh=quickInterview(c,g.id);assert.deepEqual(fresh.asked,['time','boundaries','avoidGenres','knowledge']);
});
test('Delegated cleaning respects selected empty zones, a real shift and the materials-plus-work budget',()=>{
 const c=createCampaign('delegation'),zone=c.layout.rooms.find(r=>r.purpose==='staff').id;c.operations.zones[zone].cleanliness=30;
 assert.equal(executeCampaignAction(c,{type:'hireServiceStaff'}).ok,true);assert.equal(executeCampaignAction(c,{type:'setCleaningPolicy',policy:{enabled:true,zoneIds:[zone],cleanlinessBelow:50,maxSpend:16,windowHours:8}}).ok,true);assert.equal(c.operations.tasks.length,0);
 assert.equal(executeCampaignAction(c,{type:'setServiceShift',active:true}).ok,true);assert.equal(processCleaningPolicy(c),false,'Insufficient 16.25 budget cannot start work');
 assert.equal(executeCampaignAction(c,{type:'setCleaningPolicy',policy:{maxSpend:17}}).ok,true);assert.equal(c.operations.tasks.filter(t=>t.delegated).length,1);assert.equal(cleaningPolicyStatus(c).spent,16.25);assert.equal(processCleaningPolicy(c),false);assert.equal(c.rooms.some(r=>r.status==='running'),false);assert.deepEqual(decodeClub(encodeClub(c)).operations.cleaningPolicy,c.operations.cleaningPolicy);
});
test('The audience grows from distinct satisfied people, not duplicated reviews or more empty rooms',()=>{
 const c=createCampaign('organic-demand'),before=audienceDemand(c);c.rooms.push({...structuredClone(c.rooms[0]),id:'technical-capacity-only'});assert.equal(audienceDemand(c).rate,before.rate);
 const person=Object.values(c.guestRegistry.persons)[0];person.history=[{at:c.clock,score:8},{at:c.clock,score:8}];assert.equal(audienceDemand(c).recentSatisfied,1);assert.equal(audienceDemand(c).rate,3.16);
 c.clock+=97;assert.equal(audienceDemand(c).recentSatisfied,0);assert.equal(audienceDemand(c).rate,3);
 for(let i=0;i<200;i++)c.guestRegistry.persons['technical-'+i]={history:[{at:c.clock,score:8}]};const large=audienceDemand(c).rate;assert.ok(large>30);for(let i=200;i<400;i++)c.guestRegistry.persons['technical-'+i]={history:[{at:c.clock,score:8}]};assert.ok(audienceDemand(c).rate>large,'Demand keeps growing beyond the knee');
});
test('The optional school pays for outreach and attracts new learners without changing existing people or granting a quality bonus',()=>{
 const c=createCampaign('school-choice'),existing=structuredClone(c.guests),cash=c.finance.cash,costs=hourlyCosts(c);assert.equal(executeCampaignAction(c,{type:'setClubDirection',direction:'beginners'}).ok,true);assert.equal(c.finance.cash,cash-300);assert.equal(hourlyCosts(c).general,costs.general+15);assert.deepEqual(c.guests,existing);assert.equal(audienceDemand(c).directionRate,1.5);
 assert.equal(executeCampaignAction(c,{type:'setClubDirection',direction:'beginners'}).cost,undefined);assert.equal(c.finance.cash,cash-300);
 const newcomers=Array.from({length:20},()=>makeGuest(c)).filter(g=>g.schoolVisitor);assert.ok(newcomers.length>=7&&newcomers.length<=19);for(const g of newcomers)assert.equal(g.preferences.knowledge.fate,0);
 assert.equal(clubDirectionStatus(c).progress.introduced,0);assert.equal(executeCampaignAction(c,{type:'setClubDirection',direction:'general'}).ok,true);assert.equal(hourlyCosts(c).general,costs.general);assert.equal(audienceDemand(c).directionRate,0);assert.equal(c.finance.cash,cash-300);
 assert.equal(decodeClub(encodeClub(c)).clubDirection.id,'general');
});
test('A school can retain an available successfully taught learner but cannot fabricate or duplicate that person',()=>{
 const c=createCampaign('school-retention'),g=c.guests[0],person=c.guestRegistry.persons[g.personId];c.guests=c.guests.filter(guest=>guest.id!==g.id);c.guestRegistry.visits[g.id].status='completed';person.availableAfter=c.clock;person.introductions={fate:{at:c.clock,title:'learned'}};person.history=[{at:c.clock,score:8}];
 const general=Array.from({length:100},(_,i)=>returningGuest(c,100+i)).filter(Boolean).length;c.clubDirection.id='beginners';const school=Array.from({length:100},(_,i)=>returningGuest(c,100+i)).filter(Boolean).length;assert.ok(school>general+10);assert.ok(school<100);
 person.availableAfter=c.clock+1;assert.equal(returningGuest(c,200),null);person.availableAfter=c.clock;c.guests.push(g);assert.equal(returningGuest(c,200),null);
});
test('A course preserves the chosen room assignment instead of letting a new hire silently replace its master',async()=>{
 const c=await expandedClub(2),master=c.staff[0],room=c.rooms.find(r=>r.masterId===master.id);assert.equal(trainMaster(c,master.id,'teaching').ok,true);assert.equal(room.masterId,master.id);assert.equal(room.operational,false);
 const candidate=availableMasterCandidates(c).find(m=>prestigeNeeded(m)===0);assert.equal(hireMaster(c,candidate.id).ok,true);assert.equal(c.rooms.find(r=>r.id===room.id).masterId,master.id);assert.equal(c.rooms.some(r=>r.masterId===candidate.id),false);assert.equal(decodeClub(encodeClub(c)).rooms.find(r=>r.id===room.id).masterId,master.id);
});
