export function groupLimits(room){
 const running=room.run;
 if(running&&(running.ratingVersion??1)<9)return{minimum:4,maximum:4};
 const session=running?.room?.session??room.session??{},program=running?.room?.program??room.program??session.program??{};
 const maximum=Math.min(room.capacity??4,session.maxPlayers??program.maxPlayers??4),minimum=Math.min(maximum,session.minPlayers??program.minPlayers??3);
 return{minimum,maximum};
}
export function plannedGuestCount(club,room){return room.status==='running'?room.run.guests.length:(club.guests.filter(g=>g.roomId===room.id).length||groupLimits(room).maximum);}
