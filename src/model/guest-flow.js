import {receptionStatus} from './reception-area.js';
import {hourlyCosts} from './finances.js';

// Real game time produces a finite reception queue. UI redraw, configuration,
// dismissal and loading cannot manufacture visits or advance this clock.
export const GUEST_FLOW=Object.freeze({version:1,perRoomHour:3,tickHours:.5,capacityPerRoom:6});
const rooms=club=>(club.rooms??[]).filter(r=>r.operational||r.status==='running').length;
const round=value=>Math.round(value*1e8)/1e8;
const fresh=club=>({version:1,adoptedAt:club.clock,nextAt:club.clock+GUEST_FLOW.tickHours,credits:0,issued:0,openingIssued:true});
export function ensureGuestFlow(club,{newCampaign=false}={}){
 if(!club.guestFlow)club.guestFlow={...fresh(club),openingIssued:!newCampaign};
 return club.guestFlow;
}
export function validateGuestFlow(club){
 const flow=club.guestFlow;if(!flow)return true;
 if(flow.version!==1||!Number.isFinite(flow.adoptedAt)||flow.adoptedAt>club.clock||!Number.isFinite(flow.nextAt)||flow.nextAt<=club.clock-1e-8||flow.nextAt>club.clock+GUEST_FLOW.tickHours+1e-8||!Number.isFinite(flow.credits)||flow.credits<0||flow.credits>100000||!Number.isSafeInteger(flow.issued)||flow.issued<0||typeof flow.openingIssued!=='boolean')throw Error('Повреждён поток посетителей.');
 return true;
}
export function accrueGuestFlow(club,from,to){
 const flow=ensureGuestFlow(club),count=rooms(club),capacity=count*GUEST_FLOW.capacityPerRoom;
 // No time or room means no new credit. A temporarily closed desk cannot
 // accumulate a hidden audience which appears as soon as it is switched on.
 if(to>from&&count&&receptionStatus(club).ready)flow.credits=round(Math.min(capacity,flow.credits+(to-from)*count*GUEST_FLOW.perRoomHour));
 else if(!count)flow.credits=0;
 return flow;
}
export function guestFlowBoundary(club){
 if(!club.guestFlow||!rooms(club)||!receptionStatus(club).ready)return null;
 return club.guestFlow.nextAt;
}
export function guestFlowRelease(club,{completed=false}={}){
 const flow=ensureGuestFlow(club),tick=club.clock+1e-8>=flow.nextAt;
 if(tick){const steps=Math.floor((club.clock-flow.nextAt+1e-8)/GUEST_FLOW.tickHours)+1;flow.nextAt=round(flow.nextAt+steps*GUEST_FLOW.tickHours);}
 return (tick||completed)&&receptionStatus(club).ready?Math.floor(flow.credits+1e-8):0;
}
export function issueGuestCredit(club){
 const flow=ensureGuestFlow(club);if(flow.credits+1e-8<1)return false;
 flow.credits=round(Math.max(0,flow.credits-1));flow.issued++;return true;
}
export function guestFlowStatus(club){
 const flow=club.guestFlow??fresh(club),count=rooms(club),ready=receptionStatus(club).ready;
 const nextAt=flow.nextAt>club.clock+1e-8?flow.nextAt:round(club.clock+GUEST_FLOW.tickHours),hoursUntil=nextAt-club.clock;
 const capacity=count*GUEST_FLOW.capacityPerRoom;
 const presentAtArrival=club.guests.filter(guest=>{
  const run=club.rooms.find(r=>r.id===guest.roomId&&r.status==='running')?.run;
  return run?run.endsAt>nextAt+1e-8:guest.schedule.leaveAt>nextAt+1e-8;
 }).length;
 const space=Math.max(0,capacity-presentAtArrival);
 const expectedArrivals=ready&&count?Math.min(space,Math.floor(Math.min(capacity,flow.credits+hoursUntil*count*GUEST_FLOW.perRoomHour)+1e-8)):0;
 const hourly=Object.values(hourlyCosts(club)).reduce((n,value)=>n+value,0);
 // Running contracts may settle before the next visit. Show that earlier
 // boundary so a waiting command cannot skip a result or start another table.
 const ending=(club.rooms??[]).filter(r=>r.status==='running').map(r=>r.run.endsAt).filter(t=>t>club.clock);
 const until=Math.min(nextAt,...ending),duration=until-club.clock;
 return {enabled:ready&&count>0,nextAt:ready&&count?nextAt:null,hoursUntil:ready&&count?hoursUntil:null,expectedArrivals,waitingCost:Math.ceil(hourly*duration),waitingUntil:until,waitingLimit:GUEST_FLOW.tickHours,bank:Math.floor(flow.credits+1e-8),rate:count*GUEST_FLOW.perRoomHour,capacity,reason:!ready?receptionStatus(club).reason:!count?'Подготовьте и откройте хотя бы одну игровую комнату.':space===0?'У стойки достаточно гостей. Поговорите с ними и рассадите по комнатам.':''};
}
