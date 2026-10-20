import {objectApproaches} from './layout.js';
export function receptionStatus(club){
 const desks=club.layout.objects.filter(o=>o.kind==='reception'&&o.enabled!==false);
 const desk=desks.find(o=>objectApproaches(club.layout,o).length);
 return {ready:Boolean(desk),desk:desk??null,waiting:club.guests.filter(g=>!g.roomId).length,reason:desk?'':desks.length?'Освободите проход от входа к ресепшну.':'Поставьте стойку ресепшна у входа: новые гости приходят к ней.'};
}
