import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign} from '../src/model/campaign.js';
import {tablePlan,quickInterview,QUICK_INTERVIEW_QUESTIONS} from '../src/model/table-plan.js';
import {marketCandidates} from '../src/data/masters-market.js';
import {SESSIONS} from '../src/data/club.js';
const setup=()=>{const club=createCampaign('table-plan-privacy');club.guests.slice(0,4).forEach((g,seat)=>{g.roomId=club.rooms[0].id;g.seat=seat;});return club;};
const at=(club,id)=>tablePlan(club,club.rooms[0].id).rows.find(r=>r.guestId===id);

test('planning never reveals unanswered time, preferences, needs or relationships',()=>{
 const club=setup(),before=structuredClone(club),plan=tablePlan(club,club.rooms[0].id);
 for(const guest of club.guests){
  guest.schedule.leaveAt=club.clock+.1;guest.schedule.preferred=[6,6];guest.profile.genres=[{id:'tactics'}];guest.profile.boundaries=[{id:'control'}];guest.profile.traits.rules.id='light';guest.profile.traits.pace.id='brisk';
  guest.preferences={knowledge:{fate:0},learning:'describe',giveHelp:'offers',receiveHelp:'none',asksBeforeHelping:false,respectsNo:false,interrupts:true,spotlight:'invited',tone:'comic',stakes:'lethal',format:'campaign',breaks:'regular',rulesPolicy:'raw',disputes:'check'};guest.avoidGenres=['horror'];
 }
 assert.deepEqual(tablePlan(club,club.rooms[0].id),plan);
 assert.equal(plan.unknownCount,4);assert.equal(plan.rows.length,4);
 assert.deepEqual(tablePlan(before,before.rooms[0].id),plan);
});

test('heard deadlines and boundaries identify concrete risks without a score or automatic assignment',()=>{
 const club=setup(),guest=club.guests[0];guest.asked=['time','boundaries'];guest.schedule.leaveAt=club.clock+1;guest.profile.boundaries=[{id:'control'}];club.rooms[0].session.requiredTopics=['control'];
 const before=JSON.stringify(club),plan=tablePlan(club,club.rooms[0].id),row=plan.rows[0];
 assert.equal(row.tone,'warning');assert.ok(row.notes.some(n=>n.code==='deadline'));assert.ok(row.notes.some(n=>n.code==='boundaries'));assert.equal('score' in row,false);assert.equal(JSON.stringify(club),before);
});

test('learning forecast counts heard system knowledge and learning method only',()=>{
 const club=setup(),[one,two]=club.guests;one.asked=['knowledge','learning'];one.preferences.knowledge.fate=0;one.preferences.learning='describe';
 const first=tablePlan(club,club.rooms[0].id);two.preferences.knowledge.fate=0;two.preferences.learning='describe';assert.deepEqual(tablePlan(club,club.rooms[0].id),first);
 two.asked=['knowledge','learning'];const second=tablePlan(club,club.rooms[0].id);assert.ok(second.summary.find(n=>n.code==='teaching').text.startsWith('2 гостям'));
});

test('pair conflicts require relevant answers from both guests and show master mitigation',()=>{
 const club=setup(),[one,two]=club.guests;one.asked=['habits'];one.preferences.receiveHelp='none';two.preferences.giveHelp='offers';two.preferences.asksBeforeHelping=false;two.preferences.respectsNo=false;
 assert.ok(!at(club,one.id).notes.some(n=>n.code==='help-boundary'));
 two.asked=['helpOthers'];club.rooms[0].master.protectsChoices=false;assert.ok(at(club,one.id).notes.some(n=>n.code==='help-boundary'&&n.tone==='warning'));
 club.rooms[0].master.protectsChoices=true;assert.ok(at(club,one.id).notes.some(n=>n.code==='help-boundary'&&n.tone==='good'));
});

test('a story answer reveals its main interest without revealing unasked secondary tastes',()=>{
 const club=setup(),guest=club.guests[0];guest.asked=['stories'];guest.profile.genres=[{id:'tactics'},{id:'heist'}];const first=at(club,guest.id);guest.profile.genres[1]={id:'comedy'};assert.deepEqual(at(club,guest.id),first);
});

test('running tables are planned from the contract snapshot and do not follow edited waiting guests',()=>{
 const club=setup(),room=club.rooms[0],snapshot=structuredClone(room);room.status='running';room.run={room:snapshot,guests:structuredClone(club.guests.slice(0,4)),endsAt:club.clock+room.hours};
 const plan=tablePlan(club,room.id);club.guests=[];assert.deepEqual(tablePlan(club,room.id),plan);assert.equal(tablePlan(club,'missing').count,0);
});

test('quick interview asks real questions once and never seats or configures anyone',()=>{
 const club=setup(),guest=club.guests[0],clock=club.clock,seats=club.guests.map(g=>[g.id,g.roomId,g.seat]),rooms=JSON.stringify(club.rooms);
 const result=quickInterview(club,guest.id);
 assert.equal(result.ok,true);assert.deepEqual(result.asked,[...QUICK_INTERVIEW_QUESTIONS]);assert.equal(result.answers.length,8);
 assert.ok(QUICK_INTERVIEW_QUESTIONS.every(id=>guest.asked.includes(id)&&guest.dialogue.some(a=>a.questionId===id)));
 assert.equal(at(club,guest.id).notes.some(n=>n.code==='unknown'),false);
 assert.equal(club.clock,clock);assert.deepEqual(club.guests.map(g=>[g.id,g.roomId,g.seat]),seats);assert.equal(JSON.stringify(club.rooms),rooms);
 const before=JSON.stringify(club),again=quickInterview(club,guest.id);assert.equal(again.ok,true);assert.deepEqual(again.asked,[]);assert.equal(JSON.stringify(club),before);
 assert.equal(guest.asked.includes('houseRules'),false);assert.equal(guest.asked.includes('helpOthers'),false);
});

test('quick interview cannot interview playing or absent guests and preserves their state',()=>{
 const club=setup(),guest=club.guests[0];club.rooms[0].status='running';const before=JSON.stringify(club);
 assert.equal(quickInterview(club,guest.id).ok,false);assert.equal(quickInterview(club,'missing').ok,false);assert.equal(JSON.stringify(club),before);
});

test('the new learning forecast uses the V8 workload while an accepted V7 table keeps its old workload',()=>{
 const club=setup(),room=club.rooms[0];room.master=marketCandidates().find(m=>m.name==='Алина');room.session=structuredClone(SESSIONS.find(s=>s.id==='dragon'));
 for(const guest of club.guests.filter(g=>g.roomId===room.id)){guest.asked=[...QUICK_INTERVIEW_QUESTIONS];guest.preferences.knowledge.dnd5=0;guest.preferences.learning='table';}
 assert.ok(tablePlan(club,room.id).summary.find(n=>n.code==='teaching').text.includes('обычно справляется'));
 room.status='running';room.run={room:structuredClone(room),guests:structuredClone(club.guests.filter(g=>g.roomId===room.id)),endsAt:club.clock+3,ratingVersion:7};
 assert.equal(tablePlan(club,room.id).summary.find(n=>n.code==='teaching').tone,'warning');
});
