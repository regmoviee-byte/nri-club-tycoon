export const guestSeatNumbers=room=>Array.isArray(room.chairIds)?room.chairIds.flatMap((id,i)=>id?[i]:[]):Array.from({length:room.capacity??4},(_,i)=>i);
export function groupLimits(room){
 const running=room.run;
 if(running&&(running.ratingVersion??1)<9)return{minimum:4,maximum:4};
 if(!running||(running.ratingVersion??1)>=10)return{minimum:2,maximum:room.capacity??room.chairIds?.length??4};
 const session=running?.room?.session??room.session??{},program=running?.room?.program??room.program??session.program??{};
 const maximum=Math.min(room.capacity??4,session.maxPlayers??program.maxPlayers??4),minimum=Math.min(maximum,session.minPlayers??program.minPlayers??3);
 return{minimum,maximum};
}
export function plannedGuestCount(club,room){return room.status==='running'?room.run.guests.length:(club.guests.filter(g=>g.roomId===room.id).length||groupLimits(room).maximum);}
