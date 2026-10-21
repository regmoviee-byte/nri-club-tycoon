import {boxFaces,solidArt} from './isometric-solids.js';
import {transformFaces} from './model-art.js';
import {project} from './seat-frame.js';
const wood=['#8d684c','#997251','#aa815b','#9d7653','#896749','#c29a6a'];
const cache=new Map();
export const doorKey=wall=>wall.id??wall.axis+':'+wall.x+','+wall.y;
export function doorCrossings(path,walls){
 const result=[];for(const wall of walls.filter(w=>['door','wideDoor'].includes(w.kind)))for(let i=0;i<path.length-1;i++){
  const a=path[i],b=path[i+1],horizontal=wall.axis==='h',start=horizontal?a.y:a.x,end=horizontal?b.y:b.x,line=horizontal?wall.y:wall.x;
  if(Math.abs(end-start)<1e-8)continue;const t=(line-start)/(end-start);if(t<0||t>1)continue;
  const along=horizontal?a.x+(b.x-a.x)*t:a.y+(b.y-a.y)*t,min=horizontal?wall.x:wall.y;if(along<min+.02||along>min+.98)continue;
  result.push({id:doorKey(wall),step:i+t});
 }return result;
}
export function doorLeafArt(wall,height,open=0,swing=1){
 const angle=Math.round(Math.max(0,Math.min(1,open))*90/3)*3,key=[wall.axis,height,angle,swing,wall.kind].join(':');if(cache.has(key))return cache.get(key);
 const h=wall.axis==='h',padding=wall.kind==='wideDoor'?.045:.075,faces=boxFaces(padding,-.027,1,1-padding,.027,height,wood,'door-leaf'),rotated=transformFaces(faces,{angle:(h?0:90)+swing*angle}),knobAngle=((h?0:90)+swing*angle)*Math.PI/180,p=project((1-padding-.12)*Math.cos(knobAngle)-.035*Math.sin(knobAngle),(1-padding-.12)*Math.sin(knobAngle)+.035*Math.cos(knobAngle),height*.45);
 const art=solidArt(rotated)+'<circle cx="'+p.x+'" cy="'+p.y+'" r="1.25" fill="#e6c47d" pointer-events="none"/>';cache.set(key,art);return art;
}
export function doorArt(wall,height,open=0,swing=1){
 const axis=wall.axis==='h'?0:90,colors=['#bca47b','#cbb78d','#b3a27c','#bca77f','#ac9a75','#e8d9b7'],frame=[...boxFaces(0,-.055,0,.055,.055,height+2,colors,'door-frame'),...boxFaces(.945,-.055,0,1,.055,height+2,colors,'door-frame')];
 if(height>=35)frame.push(...boxFaces(0,-.055,height,1,.055,height+2.5,colors,'door-frame'));
 const p=project(wall.x,wall.y),id=doorKey(wall).replace(/[&<>"']/g,'');return '<g class="moving-door" data-door="'+id+'" data-open="'+open.toFixed(2)+'" transform="translate('+p.x+' '+p.y+')">'+solidArt(transformFaces(frame,{angle:axis}))+'<g class="door-leaf">'+doorLeafArt(wall,height,open,swing)+'</g></g>';
}
