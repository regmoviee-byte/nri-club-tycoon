import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,startRoom,advanceIdle,advanceClub,decodeClub,encodeClub,executeCampaignAction} from '../src/model/campaign.js';
import {assignGuest} from '../src/model/club.js';

function runningClub(seed){
 const c=createCampaign(seed),r=c.rooms[0];
 for(const [seat,g] of c.guests.slice(0,2).entries())assert.equal(assignGuest(c,g.id,r.id,seat).ok,true);
 assert.equal(startRoom(c,r.id).ok,true);
 return c;
}
test('one hour during a party preserves its contract and reload; the next hour settles exactly once',()=>{
 const c=runningClub('hour-during-play'),runId=c.rooms[0].run.id,endsAt=c.rooms[0].run.endsAt;
 assert.equal(endsAt,14);
 assert.equal(advanceIdle(c).ok,true);assert.equal(c.clock,13);
 assert.equal(c.rooms[0].run.id,runId);assert.equal(c.sessionJournal.entries.length,0);
 const loaded=decodeClub(encodeClub(c));assert.equal(loaded.rooms[0].run.endsAt,endsAt);
 assert.equal(advanceIdle(loaded).ok,true);assert.equal(loaded.clock,14);
 assert.equal(loaded.sessionJournal.entries.length,1);assert.equal(loaded.rooms[0].run,null);
 const settlement=loaded.finance.ledger.filter(e=>e.id.includes(runId));
 assert.equal(advanceIdle(loaded).ok,true);
 assert.deepEqual(loaded.finance.ledger.filter(e=>e.id.includes(runId)),settlement);
});
test('hourly and direct completion use the same event clock and financial settlement',()=>{
 const direct=runningClub('hour-financial-equality'),hourly=decodeClub(encodeClub(direct));
 assert.equal(advanceClub(direct).ok,true);
 assert.equal(advanceIdle(hourly).ok,true);assert.equal(advanceIdle(hourly).ok,true);
 assert.equal(hourly.clock,direct.clock);assert.equal(hourly.finance.cash,direct.finance.cash);
 assert.deepEqual(hourly.sessionJournal.entries,direct.sessionJournal.entries);
 assert.deepEqual(hourly.finance.ledger,direct.finance.ledger);
});
test('retrying an hourly transaction during play cannot charge or advance twice',()=>{
 const c=runningClub('hour-transaction-retry'),action={type:'advanceIdle',transactionId:'one-hour-only'};
 assert.equal(executeCampaignAction(c,action).ok,true);const snapshot=encodeClub(c);
 assert.equal(executeCampaignAction(c,action).ok,true);assert.equal(encodeClub(c),snapshot);
});
