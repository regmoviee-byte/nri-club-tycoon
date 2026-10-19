import {actorById} from './club.js';

export function nextWaitingGuest(club,afterId=club.selectedId){
 const start=club.guests.findIndex(g=>g.id===afterId),count=club.guests.length;
 for(let offset=1;offset<=count;offset++){const g=club.guests[(start+offset)%count];if(!g.roomId)return g;}
 return null;
}
export function seatingIntent(club,guestId=club.selectedId){
 const guest=actorById(club,guestId);
 return guest?{guestId,wasWaiting:!guest.roomId,selectedId:club.selectedId}:null;
}
export function finishSeating(club,intent,success=true){
 if(!success||!intent?.wasWaiting||intent.selectedId!==intent.guestId||club.selectedId!==intent.guestId||!actorById(club,intent.guestId)?.roomId)return false;
 club.selectedId=nextWaitingGuest(club,intent.guestId)?.id??null;
 return true;
}
