import {BUILD_CATALOG} from '../data/build-catalog.js';
import {objectCells,objectApproaches,roomPurpose} from './layout.js';
import {zoneCleaning} from './operations.js';

const same=(a,b)=>a.x===b.x&&a.y===b.y;
const hours=(club,guest)=>Math.max(0,club.clock-(guest.schedule?.arrivalAt??club.clock));
const active=club=>club.guests.filter(g=>!club.rooms.some(r=>r.status==='running'&&r.id===g.roomId));

// One reachable cushion is one place. Furniture in staff rooms, closed game
// rooms or a zone being cleaned cannot accommodate the public waiting queue.
export function guestWaitingStatus(club){
 const seats=[];
 for(const object of club.layout.objects){
  const item=BUILD_CATALOG[object.kind];
  if(item?.family!=='waitingSeat'||object.enabled===false)continue;
  const physical=club.layout.rooms.find(r=>r.id===object.roomId),room=club.rooms.find(r=>r.id===object.roomId);
  if(physical&&(roomPurpose(physical)==='staff'||!room?.operational||room.status==='running'))continue;
  if(zoneCleaning(club,object.roomId??'common'))continue;
  const approaches=objectApproaches(club.layout,object),cells=objectCells(object);
  if(object.rotation===2||object.rotation===3)cells.reverse();
  for(const [seatIndex,cell] of cells.slice(0,item.capacity).entries()){
   if(approaches.some(a=>same(a.destination,cell)))seats.push({objectId:object.id,seatIndex,roomId:object.roomId??null,...cell,rotation:object.rotation});
  }
 }
 const queue=active(club).filter(g=>!g.roomId).map((guest,index)=>({guest,index})).sort((a,b)=>(a.guest.schedule?.arrivalAt??club.clock)-(b.guest.schedule?.arrivalAt??club.clock)||a.index-b.index);
 const assignments=queue.map(({guest},index)=>({guestId:guest.id,seat:seats[index]??null}));
 return{capacity:seats.length,occupied:Math.min(queue.length,seats.length),standing:Math.max(0,queue.length-seats.length),seats,assignments};
}

function gameChair(club,guest){
 const room=club.rooms.find(r=>r.id===guest.roomId);
 if(!room?.operational||room.status!=='seating'||zoneCleaning(club,room.id))return null;
 const object=club.layout.objects.find(o=>o.id===room.chairIds?.[guest.seat]);
 return object&&object.enabled!==false&&objectApproaches(club.layout,object).length?{objectId:object.id,seatIndex:guest.seat,roomId:room.id,x:object.x,y:object.y,gameChair:true}:null;
}

function priorRecord(club,guest){
 // Old saves contain no physical seating history. Preserve the old rule for
 // that elapsed period only; all time after adoption uses actual occupancy.
 const elapsed=hours(club,guest),legacySeat=club.layout.objects.some(o=>['sofa','bench'].includes(o.kind)&&o.enabled!==false);
 return{totalHours:elapsed,seatedHours:legacySeat?elapsed:0,legacyHours:elapsed};
}

export function adoptGuestWaiting(club){
 if(club.waitingArea!==undefined)return;
 club.waitingArea={version:1,adoptedAt:club.clock,stats:Object.fromEntries(active(club).map(g=>[g.id,priorRecord(club,g)]))};
}

export function syncGuestWaiting(club){
 if(!club.waitingArea)return;
 const ids=new Set(active(club).map(g=>g.id));
 for(const id of Object.keys(club.waitingArea.stats))if(!ids.has(id))delete club.waitingArea.stats[id];
 for(const guest of active(club))club.waitingArea.stats[guest.id]??={totalHours:hours(club,guest),seatedHours:0,legacyHours:0};
}

export function trackGuestWaiting(club,from,to){
 if(!(to>from))return;
 adoptGuestWaiting(club);
 syncGuestWaiting(club);
 const status=guestWaitingStatus(club),seated=new Set(status.assignments.filter(a=>a.seat).map(a=>a.guestId));
 for(const guest of active(club)){
  const record=club.waitingArea.stats[guest.id],duration=Math.max(0,to-Math.max(from,guest.schedule?.arrivalAt??from));
  record.totalHours+=duration;
  if(seated.has(guest.id)||gameChair(club,guest))record.seatedHours+=duration;
 }
}

export function guestWaitingSummary(club,guest,status=guestWaitingStatus(club)){
 const run=club.rooms.find(r=>r.status==='running'&&r.id===guest.roomId)?.run;
 const running=run?.guests.find(g=>g.id===guest.id);
 if(running?.waiting)return{...running.waiting,seat:null,inGame:true};
 if(running){
  const elapsed=Math.max(0,run.startedAt-(running.schedule?.arrivalAt??run.startedAt));
  return{totalHours:elapsed,seatedHours:0,standingHours:elapsed,legacyHours:elapsed,seat:null,inGame:true};
 }
 const record=club.waitingArea?.stats?.[guest.id]??priorRecord(club,guest);
 const seat=guest.roomId?gameChair(club,guest):status.assignments.find(a=>a.guestId===guest.id)?.seat??null;
 return{...record,standingHours:Math.max(0,record.totalHours-record.seatedHours),seat};
}

export function validateGuestWaiting(club){
 const valid=record=>record&&['totalHours','seatedHours','legacyHours'].every(k=>Number.isFinite(record[k])&&record[k]>=0)&&record.seatedHours<=record.totalHours+1e-7&&record.legacyHours<=record.totalHours+1e-7;
 const area=club.waitingArea;
 if(area!==undefined){
  if(!area||area.version!==1||!Number.isFinite(area.adoptedAt)||area.adoptedAt>club.clock||!area.stats||typeof area.stats!=='object'||Array.isArray(area.stats))throw new Error('Повреждён учёт мест ожидания.');
  for(const record of Object.values(area.stats))if(!valid(record))throw new Error('Повреждено время ожидания гостя.');
  for(const guest of active(club)){
   const record=area.stats[guest.id];
   if(!valid(record)||Number.isFinite(guest.schedule?.arrivalAt)&&record.totalHours>hours(club,guest)+1e-7)throw new Error('Повреждена история ожидания присутствующего гостя.');
  }
 }
 for(const room of club.rooms.filter(r=>r.run?.ratingVersion>=6))for(const guest of room.run.guests){
  if(!valid(guest.waiting)||!Number.isFinite(guest.waiting.standingHours)||Math.abs(guest.waiting.standingHours-guest.waiting.totalHours+guest.waiting.seatedHours)>1e-7)throw new Error('Повреждён учёт ожидания начатой партии.');
 }
}
