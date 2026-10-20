import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,configureRoom,buyAdventure,buyGame,syncRooms,startRoom,encodeClub,decodeClub} from '../src/model/campaign.js';
import {assignGuest} from '../src/model/club.js';
import {SESSIONS} from '../src/data/club.js';
import {ECONOMY} from '../src/data/commerce.js';
import {sessionDurationRange} from '../src/model/preferences.js';
import {sessionForecast,chargeInterval,settleRun,settlementFor} from '../src/model/finances.js';
import {startQuote} from '../src/model/campaign-view.js';

function campaign(hours=2){
 const c=createCampaign('duration-and-economy-'+hours);c.finance.cash=50000;
 const system=hours===6?'dnd5':'fate',adventureId=hours===6?'club-family-debt':hours===4?'club-last-orbit':'dark';
 if(system!=='fate'){c.staff[0].known.push(system);c.staff[0].systemSkills[system]=90;assert.equal(buyGame(c,system).ok,true);}
 if(!c.library.adventures.includes(adventureId))assert.equal(buyAdventure(c,adventureId).ok,true);
 const kit=c.library.copies.find(k=>k.systemId===system),r=c.rooms[0];assert.equal(configureRoom(c,r.id,{kitId:kit.id,adventureId}).ok,true);return c;
}

test('Every adventure has one fixed duration from its authored minutes',()=>{
 const durations=new Set();for(const a of SESSIONS){const h=a.minutes/60;assert.ok(Number.isInteger(h)&&h>=2&&h<=6,a.id);assert.deepEqual(sessionDurationRange(a),[h,h]);durations.add(h);}assert.deepEqual([...durations].sort(),[2,3,4,5,6]);
});
test('Buying a different adventure changes the room and session duration together',()=>{
 const c=campaign(),r=c.rooms[0];assert.equal(buyAdventure(c,'club-last-orbit').ok,true);assert.equal(configureRoom(c,r.id,{adventureId:'club-last-orbit'}).ok,true);assert.equal(r.hours,4);assert.equal(r.session.minutes,240);assert.equal(sessionForecast(c,r.id).guestPrice,800);
});
test('A manual duration override is rejected without changing the campaign',()=>{
 const c=campaign(4),r=c.rooms[0],before=encodeClub(c);assert.equal(configureRoom(c,r.id,{hours:2}).ok,false);assert.equal(encodeClub(c),before);r.hours=2;syncRooms(c);assert.equal(r.hours,4);assert.equal(r.session.minutes,240);
});
test('Unowned adventures cannot be assigned to obtain a different duration',()=>{
 const c=campaign(),before=encodeClub(c);assert.equal(configureRoom(c,c.rooms[0].id,{adventureId:'club-last-orbit'}).ok,false);assert.equal(encodeClub(c),before);
});
test('Loading an idle old room normalizes its hours to the chosen adventure',()=>{
 const c=campaign(4);c.rooms[0].hours=2;c.rooms[0].session.minutes=120;const loaded=decodeClub(JSON.stringify(c));assert.equal(loaded.rooms[0].hours,4);assert.equal(loaded.rooms[0].session.minutes,240);
});
test('An already running legacy contract retains its agreed duration and price',()=>{
 const c=campaign(),r=c.rooms[0];c.guests.slice(0,4).forEach((g,seat)=>assert.equal(assignGuest(c,g.id,r.id,seat).ok,true));assert.equal(startRoom(c,r.id).ok,true);
 const run=structuredClone(r.run);delete run.contract.forecast;delete run.contract.pricingVersion;delete run.contract.hourlyRate;run.endsAt=run.startedAt+3;run.room.session.minutes=180;run.contract.guestPrice=450;run.contract.wageTotal=480;r.run=run;r.hours=3;
 const loaded=decodeClub(encodeClub(c)),kept=loaded.rooms[0].run;assert.equal(kept.endsAt-kept.startedAt,3);assert.equal(kept.contract.guestPrice,450);assert.equal(settlementFor(kept,{score:10,guestId:kept.guests[0].id}).payment,450);
});
for(const hours of [2,4,6])test(hours+'-hour adventure: quote, frozen contract and four payments agree; full table is profitable',()=>{
 const c=campaign(hours),r=c.rooms[0];c.guests.slice(0,4).forEach((g,seat)=>assert.equal(assignGuest(c,g.id,r.id,seat).ok,true));
 const quote=startQuote(c,r.id);assert.equal(quote.ok,true);assert.equal(quote.guestPrice,hours*ECONOMY.guestHour);assert.equal(quote.income,4*hours*200);assert.ok(quote.profitIfAllPay>0);
 assert.equal(startRoom(c,r.id).ok,true);const run=structuredClone(r.run),before=c.finance.cash;assert.equal(run.endsAt-run.startedAt,hours);assert.equal(run.contract.guestPrice,quote.guestPrice);run.contract.tipRolls=Object.fromEntries(run.guests.map(g=>[g.id,1]));
 chargeInterval(c,run.startedAt,run.endsAt);const result=settleRun(c,run,run.guests.map(g=>({guestId:g.id,score:10})));assert.equal(result.payments,quote.income);assert.equal(result.wages,quote.masterCost);assert.equal(c.finance.cash-before,quote.profitIfAllPay);assert.equal(settleRun(c,run,[]),null);
});
test('The forecast stops sharing overhead when the other table ends',()=>{
 const c=campaign(6),r=c.rooms[0];c.rooms.push({...structuredClone(r),id:'technical-other-table',status:'running',run:{endsAt:c.clock+2,guests:[{},{},{},{}]}});
 const plan=sessionForecast(c,r.id);assert.equal(plan.operatingCost,1340);assert.equal(plan.guestPrice,1200);assert.equal(plan.profitIfAllPay,2500);
});
