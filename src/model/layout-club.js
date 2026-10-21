import {createStarterLayout,roomReadiness,roomPurpose,validateLayout,objectApproaches} from './layout.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
import {validateStaffCapacity} from './staff-room.js';
import {SESSIONS,MASTERS} from '../data/club.js';
import {hash} from './generator.js';

// Existing saves keep every room, guest and running-session snapshot. Only their
// formerly implicit furniture acquires physical coordinates on adjacent plots.
export function layoutForRooms(rooms) {
  let layout;
  for (const [index,room] of rooms.entries()) {
    const part=createStarterLayout(room.id),dx=index*6;
    const prefix=`legacy-${room.id}-`;
    const translated={
      ...part,
      plots:part.plots.map(p=>({...p,id:prefix+p.id,x:p.x+dx})),
      floors:part.floors.map(p=>({...p,x:p.x+dx})),
      walls:part.walls.map(p=>({...p,id:prefix+p.id,x:p.x+dx})),
      rooms:part.rooms.map(p=>({...p,id:room.id,number:room.number,name:`Комната ${room.number}`,cells:p.cells.map(c=>({...c,x:c.x+dx}))})),
      objects:part.objects.map(p=>({...p,id:prefix+p.id,x:p.x+dx,roomId:p.roomId?room.id:undefined})),
    };
    if(!layout)layout=translated;
    else for(const key of ['plots','floors','walls','rooms','objects'])layout[key].push(...translated[key]);
  }
  return layout;
}

export const roomOperational=(club,id)=>club.finance?Boolean(club.rooms.find(r=>r.id===id)?.operational):!club.layout||roomReadiness(club.layout,id).ok;
export const constructionLockedRoomIds=club=>club.rooms.filter(r=>r.status==='running'||r.tablePreparation?.endsAt>club.clock).map(r=>r.id);

export function syncLayoutRooms(club) {
  const zones=club.layout.rooms.filter(r=>roomPurpose(r)==='game'),zoneIds=new Set(zones.map(r=>r.id));
  for(const room of club.rooms)if(!zoneIds.has(room.id)) {
    if(room.status==='running'||club.guests.some(g=>g.roomId===room.id))throw new Error('Сначала освободите комнату.');
  }
  const existing=new Map(club.rooms.map(r=>[r.id,r]));
  club.rooms=zones.map(zone=>{
    if(existing.has(zone.id))return {...existing.get(zone.id),number:zone.number};
    const key=`${club.seed}|layout-room|${zone.id}`;
    const session=structuredClone(SESSIONS[hash(key+'|game')%SESSIONS.length]);
    session.minutes=(2+hash(key+'|duration')%5)*60;
    return {id:zone.id,number:zone.number,capacity:4,session,
      master:structuredClone(MASTERS[hash(key+'|master')%MASTERS.length]),
      status:'seating',turn:0,run:null,reviewAt:club.clock};
  });
  return club;
}

const storageShelves=layout=>layout.objects.filter(o=>BUILD_CATALOG[o.kind]?.family==='shelf').map(o=>({id:o.id,capacity:BUILD_CATALOG[o.kind].capacity,accessible:objectApproaches(layout,o).length>0}));
export const shelfCapacity=layout=>storageShelves(layout).reduce((sum,shelf)=>sum+(shelf.accessible?shelf.capacity:0),0);
export function libraryStorageStatus(club){
  const shelves=storageShelves(club.layout),capacity=shelves.reduce((sum,shelf)=>sum+(shelf.accessible?shelf.capacity:0),0),used=club.library?.copies?.length??0,deficit=Math.max(0,used-capacity);
  return {capacity,used,copies:used,free:Math.max(0,capacity-used),deficit,overCapacity:deficit>0,shelves,reason:deficit?'Старые игры сохранены. Для новых покупок добавьте доступные полки.':capacity?'':'Поставьте полку и оставьте к ней проход от входа.'};
}

export function validateClubLayout(club,{previousLayout=null}={}) {
  const result=validateLayout(club.layout);
  if(!result.ok)throw new Error(result.reason||'Повреждена планировка.');
  const ids=new Set(club.rooms.map(r=>r.id));
  const gameZones=club.layout.rooms.filter(r=>roomPurpose(r)==='game');
  if(ids.size!==gameZones.length||gameZones.some(r=>!ids.has(r.id)))throw new Error('Комнаты и планировка не совпадают.');
  for(const room of club.rooms)if((room.status==='running'||club.guests.some(g=>g.roomId===room.id))&&!roomOperational(club,room.id))throw new Error('Нет доступа к занятой комнате.');
  const staff=validateStaffCapacity(club);if(!staff.ok)throw new Error(staff.reason);
  if(club.library?.copies){
    const capacity=shelfCapacity(club.layout),required=club.library.copies.length;
    // Old saves could legally sell their last shelf. Let them add storage in
    // steps or make neutral repairs, without letting construction worsen that
    // inherited deficit. Buying more games retains its separate hard limit.
    if(capacity<required&&(!previousLayout||capacity<shelfCapacity(previousLayout)))throw new Error(`На полках ${capacity} мест, куплено игр ${required}. Сначала добавьте хранение; уменьшать его сейчас нельзя.`);
  }
  return club;
}

// Run before campaign synchronization, which may otherwise silently unseat
// guests when a room becomes incomplete. Occupied physical seats stay put.
export function validateOccupiedLayout(before,nextLayout){
  for(const room of before.rooms??[]){
    if(!(room.tablePreparation?.endsAt>before.clock))continue;
    if(!roomReadiness(nextLayout,room.id).ok)throw new Error('Дождитесь подготовки стола: управляющему нужны комната, стол, места и проходы.');
  }
  for(const guest of before.guests??[]){
    if(!guest.roomId)continue;
    const old=before.layout.objects.find(o=>o.roomId===guest.roomId&&o.role==='guest'&&o.seat===guest.seat);
    const next=old&&nextLayout.objects.find(o=>o.id===old.id);
    if(!old||!next||['kind','x','y','rotation','roomId','role','seat'].some(k=>old[k]!==next[k]))throw new Error('Сначала пересадите гостя или верните его к стойке: занятый стул менять нельзя.');
    if(!roomReadiness(nextLayout,guest.roomId).ok)throw new Error('Сначала освободите комнату: гостям нужны стол, места и проходы.');
  }
}
