import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,decodeClub,encodeClub,updateCampaign,campaignStatus,advanceIdle,executeCampaignAction,startRoom,advanceClub,hireMaster} from '../src/model/campaign.js';
import {assignGuest} from '../src/model/club.js';
import {updateDevelopment,developmentStatus} from '../src/model/development.js';
import {availableMasterCandidates,marketCandidates,masterCandidate,MASTER_MARKET_COUNT} from '../src/data/masters-market.js';
import {expandedClub} from '../tools/endless-fixture.js';
import {prestigeNeeded} from '../src/model/upgrades.js';

test('New club starts directly in endless play without a victory gate',()=>{
 const c=createCampaign('endless');assert.equal(c.campaign.mode,'endless');assert.equal(c.campaign.goal,undefined);assert.equal(c.campaign.won,undefined);assert.equal(campaignStatus(c).state,'active');
 assert.equal(advanceIdle(c).ok,true);assert.equal(c.clock,13);
});
test('Development keeps extending beyond five and one hundred rooms without giving money or controlling play',()=>{
 const c=createCampaign('milestones'),before=c.finance.cash;
 for(const rooms of [5,6,50,100,200,1000]){
  const progress={rooms,participations:rooms*4,reserve:rooms*8000,systems:4,rating:9};updateDevelopment(c,progress);
  const d=developmentStatus(c,progress);assert.ok(d.tracks.find(t=>t.id==='rooms').next>rooms);assert.equal(c.campaign.won,undefined);assert.equal(c.campaign.mode,'endless');
 }
 assert.equal(c.finance.cash,before);const earned=structuredClone(c.campaign.development.earned);
 updateDevelopment(c,{rooms:1,participations:0,reserve:0,systems:1,rating:0});assert.deepEqual(c.campaign.development.earned,earned);assert.equal(c.campaign.development.records.rooms,1000);
});
test('Old winning save becomes endless without changing money, furniture, guests, clock or history',()=>{
 const c=createCampaign('old-victory');delete c.campaign.development;delete c.campaign.mode;c.campaign.goal={rooms:5,participations:100,rating:8,reserve:8000,systems:4};c.campaign.won=true;c.campaign.wonAt=12;
 const before=structuredClone(c),loaded=decodeClub(encodeClub(c));assert.equal(loaded.campaign.mode,'endless');assert.equal(campaignStatus(loaded).state,'active');assert.equal(loaded.campaign.previousVictory.clock,12);
 for(const key of ['finance','layout','guests','clock','rating','reviewIds'])assert.deepEqual(loaded[key],before[key]);
 assert.equal(executeCampaignAction(loaded,{type:'continueSandbox'}).ok,true);assert.equal(loaded.campaign.continued,undefined);assert.deepEqual(decodeClub(encodeClub(loaded)),loaded);
});
test('A running legacy contract survives the change and still pays once',()=>{
 const c=createCampaign('old-running'),r=c.rooms[0];c.guests.slice(0,4).forEach((g,seat)=>assignGuest(c,g.id,r.id,seat));assert.equal(startRoom(c,r.id).ok,true);const run=structuredClone(r.run);
 c.campaign.won=true;c.campaign.goal={rooms:5};const loaded=decodeClub(encodeClub(c));assert.deepEqual(loaded.rooms[0].run,run);assert.equal(advanceClub(loaded).ok,true);assert.equal(loaded.finance.settledRuns.filter(id=>id===run.id).length,1);assert.equal(campaignStatus(loaded).state,'active');
});
test('Reaching every old target cannot trigger victory',()=>{
 const c=createCampaign('no-finish');c.campaign.goal={rooms:1,participations:0,rating:0,reserve:0,systems:1};updateCampaign(c);
 assert.equal(c.campaign.won,undefined);assert.equal(c.campaign.goal,undefined);assert.equal(campaignStatus(c).state,'active');
});
test('Growing hiring shortlist extends after the authored roster; offers and returning skills stay stable',()=>{
 const c={staff:marketCandidates(),personnelArchive:[]},first=availableMasterCandidates(c);assert.ok(first.length>=8);assert.ok(first.every(p=>Number(p.id.slice(5))>=MASTER_MARKET_COUNT));assert.deepEqual(availableMasterCandidates(c),first);
 const hired=first[0];hired.systemSkills[hired.known[0]]=99;hired.hoursWorked=12;c.staff.push(hired);
 const next=availableMasterCandidates(c);assert.ok(!next.some(p=>p.id===hired.id));assert.ok(next.some(p=>!first.some(old=>old.id===p.id)));
 c.staff=c.staff.filter(p=>p.id!==hired.id);c.personnelArchive.push(hired);assert.equal(availableMasterCandidates(c).find(p=>p.id===hired.id).systemSkills[hired.known[0]],99);
 for(const index of [MASTER_MARKET_COUNT,100,1000,100000]){const p=masterCandidate(index);assert.equal(p.id,'hire-'+index);assert.ok(p.known.length);assert.ok(p.hourlyWage>=160);assert.deepEqual(masterCandidate(index),p);}
 assert.equal(masterCandidate(-1),null);assert.equal(masterCandidate(Infinity),null);
});
test('Six complete rooms are bought, staffed, stocked and preserved through a real save reload',async()=>{
 const c=await expandedClub(6);assert.equal(c.rooms.length,6);assert.equal(c.rooms.filter(r=>r.operational).length,6);assert.equal(c.staff.length,6);assert.equal(c.library.copies.length,6);assert.equal(c.campaign.mode,'endless');assert.equal(c.campaign.won,undefined);assert.equal(c.guests.length,6,'Construction must not create free visitors');
 const loaded=decodeClub(encodeClub(c));assert.equal(loaded.rooms.filter(r=>r.operational).length,6);assert.equal(campaignStatus(loaded).state,'active');assert.equal(advanceIdle(loaded).ok,true);assert.equal(loaded.clock,13);assert.ok(loaded.guests.length>6);
});
test('A generated returning master is hired at the quoted price and retains identity, skills and history in a valid save',()=>{
 const c=createCampaign('generated-rehire');let person;
 for(let i=MASTER_MARKET_COUNT;i<MASTER_MARKET_COUNT+100&&!person;i++){const candidate=masterCandidate(i);if(prestigeNeeded(candidate)===0)person=candidate;}
 assert.ok(person);person.hoursWorked=16;person.systemSkills[person.known[0]]=97;c.personnelArchive=[person];
 const before=c.finance.cash;assert.equal(hireMaster(c,person.id).ok,true);assert.equal(c.finance.cash,before-person.fee);assert.equal(c.personnelArchive.length,0);
 const loaded=decodeClub(encodeClub(c)),kept=loaded.staff.find(m=>m.id===person.id);assert.deepEqual(kept.identity,person.identity);assert.equal(kept.hoursWorked,16);assert.equal(kept.systemSkills[person.known[0]],97);assert.equal(hireMaster(loaded,person.id).ok,false);
});
