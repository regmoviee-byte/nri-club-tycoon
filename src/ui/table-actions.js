import {BUILD_CATALOG} from '../data/build-catalog.js';
import {parentTable,surfacePose,surfacePolygon,polygonsOverlap} from '../model/table-surface.js';
import {seatFrame} from './seat-frame.js';

// Reserve a conservative whole reach, not just the palm. A nearby lamp,
// screen or dice retracts that hand to the lap in BOTH rendered arm layers.
export function seatReachPolygons(seat){const frame=seatFrame(seat.rotation);return [-1,1].map(side=>[[.055*side,.22],[.37*side,.22],[.37*side,.82],[.055*side,.82]].map(([u,v])=>{const p=frame.world(u,v,0);return {x:p.x+seat.x+.5,y:p.y+seat.y+.5};}));}
export function blockedArmsForSeat(seat,layout){
 const table=layout.objects.find(o=>BUILD_CATALOG[o.kind]?.family==='table'&&o.roomId===seat.roomId);if(!table)return [-1,1];
 const items=layout.objects.filter(o=>o.kind!=='mat'&&BUILD_CATALOG[o.kind]?.layer==='tabletop'&&parentTable(o,layout)?.id===table.id),blocked=[],reach=seatReachPolygons(seat);
 for(const side of [-1,1]){
  const polygon=reach[side===-1?0:1];
  if(items.some(o=>polygonsOverlap(polygon,surfacePolygon(surfacePose(o,layout)))))blocked.push(side);
 }return blocked;
}
export function actorPoseDelay(person){const name=person?.identity?.name??person?.profile?.name??person?.name??'';return -([...name].reduce((n,c)=>n*17+c.charCodeAt(0),0)>>>0)%72/10;}
export function poseFrames(art,{playing=false,person}={}){
 if(!playing)return art(0);
 const delay=actorPoseDelay(person);return [0,1].map(frame=>'<g class="table-activity-frame frame-'+frame+'" data-action-frame="'+frame+'" style="--pose-delay:'+delay+'s">'+art(frame)+'</g>').join('');
}
