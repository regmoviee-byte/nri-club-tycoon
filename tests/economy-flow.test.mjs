import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,configureRoom,replenish,dismissGuest,encodeClub,decodeClub,advanceIdle,startRoom,advanceClub,waitForGuests,guestFlowStatus,executeCampaignAction,build,buyGame,hireMaster} from '../src/model/campaign.js';
import {assignGuest} from '../src/model/club.js';
import {settlementFor,settleRun} from '../src/model/finances.js';

test('Dismissal, redraw, configuration and save/load never generate another visit',()=>{
 const c=createCampaign('finite-dismissals'),guest=c.guests[0],before={cash:c.finance.cash,clock:c.clock,arrivals:c.arrivals,rating:structuredClone(c.rating)};
 assert.equal(c.guests.length,6);assert.equal(dismissGuest(c,guest.id).ok,true);
 for(let i=0;i<12;i++){replenish(c);replenish(c,{opening:true});assert.equal(configureRoom(c,c.rooms[0].id,{}).ok,true);}
 assert.equal(c.guests.length,5);assert.equal(c.arrivals,before.arrivals);assert.equal(c.finance.cash,before.cash);assert.equal(c.clock,before.clock);assert.deepEqual(c.rating,before.rating);
 const loaded=decodeClub(encodeClub(c));assert.equal(loaded.guests.length,5);assert.equal(loaded.arrivals,before.arrivals);assert.deepEqual(loaded.guestFlow,c.guestFlow);
});
test('A new finite queue takes time and shows its precise affordable cost',()=>{
 const c=createCampaign('three-per-hour');for(const g of [...c.guests])assert.equal(dismissGuest(c,g.id).ok,true);
 const before=c.finance.cash,quote=guestFlowStatus(c);assert.equal(quote.hoursUntil,.5);assert.equal(quote.expectedArrivals,1);assert.equal(quote.waitingCost,70);
 assert.equal(waitForGuests(c).ok,true);assert.equal(c.clock,12.5);assert.equal(c.guests.length,1);
 assert.equal(waitForGuests(c).ok,true);assert.equal(c.clock,13);assert.equal(c.guests.length,3);
 assert.equal(waitForGuests(c).ok,true);assert.equal(c.clock,13.5);assert.equal(c.guests.length,4);assert.equal(c.finance.cash,before-210);
 assert.ok(c.guests.every(g=>g.roomId===null),'No arrival is automatically seated');
});
test('Earned visit bank is capped and cannot be spent by a dismissal',()=>{
 const c=createCampaign('credit-cap');assert.equal(advanceIdle(c).ok,true);assert.equal(advanceIdle(c).ok,true);
 assert.equal(c.guestFlow.credits,6);const arrivals=c.arrivals;assert.equal(dismissGuest(c,c.guests[0].id).ok,true);assert.equal(c.arrivals,arrivals);assert.equal(c.guests.length,5);
 assert.equal(waitForGuests(c).ok,true);assert.equal(c.arrivals,arrivals+1);assert.equal(c.guests.length,6);assert.ok(c.guestFlow.credits<=6);
});
test('Expired waiting visitors leave automatically without a negative review',()=>{
 const c=createCampaign('automatic-departure'),g=c.guests[0];g.schedule.leaveAt=c.clock+.25;
 assert.equal(advanceIdle(c).ok,true);assert.ok(!c.guests.some(v=>v.id===g.id));assert.equal(c.rating.count,0);
 const visit=c.guestRegistry.visits[g.id];assert.equal(visit.status,'dismissed');assert.equal(visit.expired,true);
});
test('Legacy flow adoption preserves the finite existing audience and grants no historic credit',()=>{
 const c=createCampaign('flow-migration');delete c.guestFlow;const ids=c.guests.map(g=>g.id),arrivals=c.arrivals;
 const loaded=decodeClub(encodeClub(c));assert.deepEqual(loaded.guests.map(g=>g.id),ids);assert.equal(loaded.arrivals,arrivals);assert.equal(loaded.guestFlow.credits,0);assert.equal(loaded.guestFlow.nextAt,c.clock+.5);
 const twice=decodeClub(encodeClub(loaded));assert.deepEqual(twice.guestFlow,loaded.guestFlow);assert.equal(twice.arrivals,arrivals);
});
test('Insufficient waiting funds reject atomically and a repeated waiting transaction is idempotent',()=>{
 const c=createCampaign('affordable-wait');for(const g of [...c.guests])dismissGuest(c,g.id);c.finance.cash=69;
 const before=encodeClub(c),rejected=waitForGuests(c);assert.equal(rejected.ok,false);assert.equal(encodeClub(c),before);
 c.finance.cash=1000;const action={type:'waitForGuests',transactionId:'one-finite-wait'},first=executeCampaignAction(c,action);assert.equal(first.ok,true);const after=encodeClub(c);assert.equal(executeCampaignAction(c,action).replayed,true);assert.equal(encodeClub(c),after);
});
test('Debt never advances an unattended waiting loop and a corrupt future arrival is rejected',()=>{
 const c=createCampaign('debt-wait');for(const g of [...c.guests])dismissGuest(c,g.id);c.finance.cash=-1;
 const before=encodeClub(c);assert.equal(waitForGuests(c).ok,false);assert.equal(encodeClub(c),before);
 c.finance.cash=1000;c.guestFlow.nextAt=c.clock+100;assert.throws(()=>decodeClub(encodeClub(c)),/поток посетителей/);
});
test('New contracts preserve their continuous curve through save/load and settle only once',()=>{
 const c=createCampaign('new-contract-curve'),room=c.rooms[0];c.guests.slice(0,4).forEach((g,seat)=>assert.equal(assignGuest(c,g.id,room.id,seat).ok,true));assert.equal(startRoom(c,room.id).ok,true);
 const loaded=decodeClub(encodeClub(c)),run=loaded.rooms[0].run;assert.equal(run.contract.pricingVersion,3);assert.equal(run.contract.paymentCurve,3);assert.ok(Object.isFrozen(run));
 const result=settleRun(loaded,run,run.guests.map(g=>({guestId:g.id,score:6,satisfactionValue:6,violations:[]})));assert.equal(result.payments,1200);assert.equal(settleRun(loaded,run,[]),null);
});
test('The new payment curve is continuous and an explicit hard violation refunds the ticket',()=>{
 const run={startedAt:0,endsAt:2,contract:{pricingVersion:3,paymentCurve:3,guestPrice:400,tipRolls:{}}};
 for(const [s,amount]of [[3,0],[4,100],[5,200],[6,300],[6.99,399],[7,400],[10,400]])assert.equal(settlementFor(run,{score:Math.round(s),satisfactionValue:s,guestId:'g',violations:[]}).payment,amount);
 assert.equal(settlementFor(run,{score:10,satisfactionValue:10,guestId:'g',violations:['Игра окончилась после оговорённого ухода.']}).payment,0);
 const tiny=settlementFor(run,{score:6,satisfactionValue:5.61,guestId:'g',violations:[]}),base=settlementFor(run,{score:5,satisfactionValue:5.49,guestId:'g',violations:[]});assert.equal(tiny.payment-base.payment,12);
});
test('Previously accepted contracts retain their old full-payment threshold even with new evidence',()=>{
 const run={startedAt:0,endsAt:2,contract:{pricingVersion:2,guestPrice:400,tipRolls:{}}};
 assert.equal(settlementFor(run,{score:5,satisfactionValue:6.99,guestId:'g',violations:[]}).payment,0);
 assert.equal(settlementFor(run,{score:6,satisfactionValue:5.51,guestId:'g',violations:[]}).payment,400);
});
test('Full, partial and refunded tickets remain distinct in the session statement',()=>{
 const c=createCampaign('statement'),room=c.rooms[0];c.guests.slice(0,4).forEach((g,seat)=>assignGuest(c,g.id,room.id,seat));assert.equal(startRoom(c,room.id).ok,true);
 const scores=[8,6,5,2],result=settleRun(c,room.run,room.run.guests.map((g,i)=>({guestId:g.id,score:scores[i],satisfactionValue:scores[i],violations:[]})));
 assert.equal(result.fullPaidCount,1);assert.equal(result.partialPaidCount,2);assert.equal(result.paidCount,3);assert.equal(result.refunds,700);assert.equal(result.payments,900);
});
test('Arrival quote accounts for a visitor whose agreed departure is at the next tick',()=>{
 const c=createCampaign('departure-quote');c.guests[0].schedule.leaveAt=c.clock+.5;
 assert.equal(guestFlowStatus(c).expectedArrivals,1);assert.equal(waitForGuests(c).ok,true);assert.equal(c.guests.length,6);assert.equal(c.arrivals,7);
});
test('A second genuinely purchased room increases capacity without manufacturing its own audience',()=>{
 const c=createCampaign('two-room-flow');c.finance.cash=30000; // Explicit technical construction fixture; not progression evidence.
 assert.equal(build(c,'plot',{plotId:c.layout.plots[0].id,side:'E'}).ok,true);
 assert.equal(build(c,'wall',{x:5,y:3,side:'E',type:'door'}).ok,true);
 assert.equal(build(c,'template',{x:7,y:0}).ok,true);
 assert.equal(buyGame(c,'fate').ok,true);assert.equal(hireMaster(c,'hire-7').ok,true);
 assert.equal(c.rooms.filter(r=>r.operational).length,2);assert.equal(c.arrivals,6);assert.equal(c.guests.length,6);assert.equal(guestFlowStatus(c).rate,3);assert.equal(guestFlowStatus(c).capacity,12);
 assert.equal(waitForGuests(c).ok,true);assert.equal(c.clock,12.5);assert.equal(c.guests.length,7);assert.equal(waitForGuests(c).ok,true);assert.equal(c.guests.length,9);
 assert.equal(configureRoom(c,c.rooms[1].id,{enabled:false}).ok,true);assert.equal(configureRoom(c,c.rooms[1].id,{enabled:true}).ok,true);assert.equal(c.arrivals,9);assert.equal(c.guests.length,9);
 const loaded=decodeClub(encodeClub(c));assert.equal(loaded.arrivals,9);assert.equal(loaded.guestFlow.issued,3);
});
test('Waiting during a running session stops on a future event and preserves its manual assignments',()=>{
 const c=createCampaign('wait-running'),room=c.rooms[0];c.guests.slice(0,4).forEach((g,seat)=>assignGuest(c,g.id,room.id,seat));assert.equal(startRoom(c,room.id).ok,true);
 const ids=room.run.guests.map(g=>g.id);assert.equal(waitForGuests(c).ok,true);assert.equal(c.clock,12.5);assert.equal(room.status,'running');assert.deepEqual(room.run.guests.map(g=>g.id),ids);
 for(let i=0;c.rooms.some(r=>r.status==='running')&&i<20;i++)assert.equal(advanceClub(c).ok,true);
 assert.equal(c.finance.settledRuns.length,1);assert.ok(c.guests.length<=6);assert.ok(c.guestFlow.credits<=6);assert.ok(c.guests.every(g=>g.roomId===null));
});
