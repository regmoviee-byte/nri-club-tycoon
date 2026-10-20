import {ownedCells} from './campaign-layout.js';
export const wallMountHeight=kind=>kind==='conditioner'?43:37;
export function wallPlacementAt(layout,point,preferred=0){
 const owned=ownedCells(layout),zone=(x,y)=>layout.rooms.some(r=>r.cells.some(c=>c.x===x&&c.y===y)),candidates=[];
 for(const wall of layout.walls.filter(w=>w.kind==='wall')){
  const choices=wall.axis==='h'?[{x:wall.x,y:wall.y,rotation:0},{x:wall.x,y:wall.y-1,rotation:2}]:[{x:wall.x,y:wall.y,rotation:3},{x:wall.x-1,y:wall.y,rotation:1}];
  const available=choices.filter(c=>owned.has(c.x+','+c.y)).sort((a,b)=>Number(zone(b.x,b.y))-Number(zone(a.x,a.y))),chosen=available.find(c=>c.rotation===preferred)??available[0];if(!chosen)continue;
  const along=wall.axis==='h'?Math.max(wall.x,Math.min(wall.x+1,point.x)):Math.max(wall.y,Math.min(wall.y+1,point.y)),dx=point.x-(wall.axis==='h'?along:wall.x),dy=point.y-(wall.axis==='v'?along:wall.y);candidates.push({...chosen,distance:Math.hypot(dx,dy)});
 }candidates.sort((a,b)=>a.distance-b.distance);const best=candidates[0];return best&&best.distance<1?{x:best.x,y:best.y,rotation:best.rotation}:{x:Math.floor(point.x),y:Math.floor(point.y),rotation:preferred};
}
