import {BUILD_CATALOG} from '../data/build-catalog.js';
import {objectCells,objectApproaches,bounds,tileKey} from '../model/layout.js';
import {ownedCells} from '../model/campaign-layout.js';
import {staffRoomStatus} from '../model/staff-room.js';
import {guestWaitingStatus} from '../model/guest-waiting.js';
import {receptionStatus} from '../model/reception-area.js';
import {personArt,ADMINISTRATOR,escapeHTML as esc} from './people.js';
import {seatFrame,SEAT_HEIGHT,project,unproject} from './seat-frame.js';
import {seatedPersonArt,seatedArmFaces} from './seated-person.js';
import {transformFaces} from './model-art.js';
import {solidArt} from './isometric-solids.js';
import {chairBaseFaces} from './seat-solids.js';
import {tableFaces,tableSceneFaces,tableSceneGroups,standaloneTabletopArt} from './table-art.js';
import {detailedFurnitureArt} from './furniture-art.js';
import {TABLETOP_HEIGHT,surfacePose,surfacePolygon,surfaceBaseHeight,parentTable} from '../model/table-surface.js';
export {project,unproject,seatedPersonArt};
export {TABLETOP_HEIGHT};
const handCache=new Map();
export function seatedTableArmArt(person,seat,layout,actorKey=''){
 const table=layout.objects.find(o=>BUILD_CATALOG[o.kind]?.family==='table'&&o.roomId===seat.roomId);if(!table)return '';
 const key=JSON.stringify([person.identity?.portrait??person.portrait,seat,table,layout.objects.filter(o=>parentTable(o,layout)?.id===table.id)]);
 if(!handCache.has(key)){if(handCache.size>96)handCache.clear();const faces=transformFaces(seatedArmFaces(person,{rotation:seat.rotation,atTable:true,forearmsOnly:true}),{x:seat.x+.5,y:seat.y+.5});handCache.set(key,solidArt(faces,tableSceneFaces(table,layout)));}
 return '<g class="table-forearms" pointer-events="none" data-table-arms-for="'+esc(actorKey)+'">'+handCache.get(key)+'</g>';
}
const tableCache=new Map();
function tableGroups(table,layout,state){const movingId=state.tool==='move'?state.objectId:null,key=JSON.stringify([table,layout.objects.filter(o=>BUILD_CATALOG[o.kind]?.layer==='tabletop'&&parentTable(o,layout)?.id===table.id),state.objectId,movingId]);if(!tableCache.has(key)){if(tableCache.size>64)tableCache.clear();tableCache.set(key,tableSceneGroups(table,layout,{selectedId:state.objectId,movingId}));}return tableCache.get(key);}

const points=list=>list.map(p=>p.x+','+p.y).join(' ');
const polygon=(list,fill,stroke='#43505b',extra='')=>'<polygon points="'+points(list)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width=".7" '+extra+'/>';
const diamond=(x,y,w=1,h=1,z=0)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b])=>project(a,b,z));
function box(x,y,w,h,height,top,side='#ac8b65'){
 const a=diamond(x,y,w,h,height),b=diamond(x,y,w,h,0);
 return polygon([a[1],a[2],b[2],b[1]],side)+polygon([a[2],a[3],b[3],b[2]],side)+polygon(a,top);
}
function chairParts(o){
 const cells=objectCells(o),w=Math.max(...cells.map(c=>c.x))-o.x+1,h=Math.max(...cells.map(c=>c.y))-o.y+1,cushioned=/Soft|Arms|Sofa|sofa/.test(o.kind),color=cushioned?'#66808a':'#c2a16e';
 const corners=diamond(o.x+.18,o.y+.18,w-.36,h-.36,SEAT_HEIGHT);
 const center=project(o.x+w/2,o.y+h/2);let base='<g class="chair-base" transform="translate('+center.x+' '+center.y+')">'+solidArt(chairBaseFaces(w,h,o.kind,o.rotation))+'</g>';
 const index=seatFrame(o.rotation).backEdge,edges=[corners[index],corners[(index+1)%4]],top=[{x:edges[0].x,y:edges[0].y-20},{x:edges[1].x,y:edges[1].y-20}];
 const B=(t,z)=>({x:edges[0].x+(edges[1].x-edges[0].x)*t,y:edges[0].y+(edges[1].y-edges[0].y)*t-z}),pair=p=>p.x+' '+p.y;
 const panel=(left,right,bottom,height,fill)=>'<path d="M'+pair(B(left,bottom))+'L'+pair(B(left,height-2))+'Q'+pair(B(left,height+1))+' '+pair(B(left+.07,height+1))+'L'+pair(B(right-.07,height+1))+'Q'+pair(B(right,height+1))+' '+pair(B(right,height-2))+'L'+pair(B(right,bottom))+'Z" fill="'+fill+'" stroke="#667364" stroke-width=".55"/>';
 let back='<path d="M'+pair(B(.035,-1.5))+'L'+pair(B(.035,18))+'M'+pair(B(.965,-1.5))+'L'+pair(B(.965,18))+'" stroke="'+(cushioned?'#526e73':'#92704d')+'" stroke-width="2.1"/>'+panel(0,1,1,20,cushioned?'#526e73':'#b28e5d')+panel(.065,.935,3,18,cushioned?'#78938f':'#d0ad78');
 if(cushioned){const center=B(.5,11);back+='<circle cx="'+center.x+'" cy="'+center.y+'" r=".75" fill="#4d6d6d"/>'+'<path d="M'+pair(B(.09,5))+'L'+pair(B(.09,16))+'M'+pair(B(.91,5))+'L'+pair(B(.91,16))+'" stroke="#b1c2aa" stroke-width=".5" opacity=".65"/>';}
 else back+='<path d="M'+pair(B(.17,6))+'Q'+pair(B(.21,11))+' '+pair(B(.18,16))+'M'+pair(B(.73,5))+'Q'+pair(B(.7,11))+' '+pair(B(.77,17))+'" fill="none" stroke="#b89664" stroke-width=".5"/>';
 if(cushioned&&w*h>1)for(let i=1;i<Math.max(w,h);i++){const t=i/Math.max(w,h);back+='<path d="M'+pair(B(t,4))+'Q'+pair(B(t-.012,10))+' '+pair(B(t,17))+'" fill="none" stroke="#567776" stroke-width=".65"/>';}
 if(w*h>1)for(let i=1;i<Math.max(w,h);i++){const q=project(o.x+(w>h?i:.5),o.y+(h>w?i:.5),14);base+='<path d="M'+(q.x-7)+' '+q.y+'l14 7" stroke="#91a69d" stroke-width="1.2"/>';}
 return {base,back,front:seatFrame(o.rotation).backNear};
}
export function seatForeground(o){const p=chairParts(o);return p.front?'<g class="seat-foreground" data-seat-front="'+esc(o.id)+'">'+p.back+'</g>':'';}
export function itemThumbnail(kind){
 const spec=BUILD_CATALOG[kind];if(!spec)return '';
 const w=spec.width,h=spec.height,height=spec.family==='reception'?90:spec.family==='table'?30:['chair','staffSeat','waitingSeat'].includes(spec.family)?36:spec.family==='shelf'?56:spec.layer==='wall'?52:spec.layer==='ceiling'?105:kind==='plant'?64:kind==='hanger'?52:kind==='fridge'?58:kind==='fan'?58:spec.layer==='tabletop'?60:60,minY=(w+h)*9-height-7,view=[-h*36-8,minY,(w+h)*36+16,(w+h)*18+7-minY].join(' ');
 return '<svg class="item-art" data-item-icon="'+kind+'" viewBox="'+view+'" aria-hidden="true">'+furnitureArt({kind,id:'icon-'+kind,x:0,y:0,rotation:0,...(spec.layer==='tabletop'?{surface:{tableId:'icon',x:.5,y:.5,angle:0}}:{})},{objects:[]})+'</svg>';
}
export function furnitureArt(o,layout,{selected=false,ghost=false,occupied=false}={}){
 const item=BUILD_CATALOG[o.kind];if(!item)return '';if(item.layer==='tabletop')return standaloneTabletopArt(o,layout,{ghost});const cells=objectCells(o);if(!cells.length)return '';
 const w=Math.max(...cells.map(c=>c.x))-o.x+1,h=Math.max(...cells.map(c=>c.y))-o.y+1,p=project(o.x+w/2,o.y+h/2);
 const table=layout.objects.find(t=>BUILD_CATALOG[t.kind].family==='table'&&t.roomId===o.roomId),towards=table?project(table.x+1,table.y+1):null;
 const mirrored=towards&&towards.x<p.x?-1:1;
 const group=inner=>'<g data-object="'+esc(o.id??'preview')+'" class="world-object '+(selected?'selected':'')+'" opacity="'+(ghost?.6:1)+'"><title>'+esc(item.name)+'</title>'+inner+'</g>';
 const at=inner=>'<g transform="translate('+p.x+' '+p.y+')">'+inner+'</g>';
 const crafted=detailedFurnitureArt(o);if(crafted&&item.family!=='reception')return group(crafted);
 if(item.family==='reception'){
  const top=project(o.x+w/2,o.y+h/2,40);
  // The far edge of the solid counter occludes the legs, never the head.
  // This also keeps the administrator readable with the two rotated footprints.
  const station=o.rotation%2?[.04,.5]:[.5,.04],a=project(o.x+w*station[0],o.y+h*station[1]);
  const administrator=o.enabled===false?'':'<g data-administrator="'+esc(o.id??'preview')+'" role="img" aria-label="Администратор за стойкой" transform="translate('+a.x+' '+a.y+') scale(.64)"><title>Администратор клуба</title>'+personArt(ADMINISTRATOR,{reception:true,back:o.rotation===2||o.rotation===3})+'</g>';
  return group(administrator+(crafted??box(o.x+.04,o.y+.04,w-.08,h-.08,37,'#b48c5e','#796951'))+'<g transform="translate('+top.x+' '+top.y+')"><path d="M-20-2l16-8 13 7-16 8Z" fill="#eee0ba" stroke="#9f845a"/><path d="M10-2v-13h12v13Z" fill="#4a6162" stroke="#354c4d"/><path d="M12-11h8" stroke="#b7c6ad" stroke-width="3"/><circle cx="-23" cy="4" r="4" fill="#e5bf6c"/></g>');
 }
 if(item.family==='table'){
  return group(solidArt(tableFaces(o)));
 }
 if(item.family==='chair'||item.family==='staffSeat'||item.family==='waitingSeat'){
  const p=chairParts(o);return group(p.base+(!occupied||!p.front?p.back:''));
 }
 if(item.family==='light')return group(at('<ellipse cy="0" rx="23" ry="10" fill="#f1d180" opacity=".16"/><path d="M0-64v16" stroke="#7a7463" stroke-width="1.5"/><path d="M-10-47l6-12h8l6 12Z" fill="#dfb96d" stroke="#998354"/><ellipse cy="-47" rx="10" ry="4" fill="#f4df9b"/>'));
 if(item.family==='shelf'){
  let a=box(o.x+.08,o.y+.08,w-.16,h-.16,52,'#bea17a','#8b735a');
  const q=project(o.x+w,o.y+h,47);
  a+='<g transform="translate('+q.x+' '+q.y+')"><path d="M-21 2l17 9v28l-17-9Z" fill="#554e48"/>';
  for(let i=0;i<5;i++)a+='<path d="M'+(-19+i*3.2)+' '+(4+i*1.65)+'v24" stroke="'+['#aa6558','#859596','#ccad73','#c8bea4','#7f7a94'][i]+'" stroke-width="2.3"/>';
  return group(a+'</g>');
 }
 if(item.layer==='wall'){
  const edge=[{x:o.x+.5,y:o.y},{x:o.x+1,y:o.y+.5},{x:o.x+.5,y:o.y+1},{x:o.x,y:o.y+.5}][o.rotation],q=project(edge.x,edge.y,34),flip=o.rotation%2?-1:1;
  const color=o.kind==='whiteboard'?'#eee9d7':o.kind==='conditioner'?'#d5ddd7':o.kind==='soundproof'?'#717d85':o.kind==='poster'?'#b57256':'#a59675';
  return group('<g transform="translate('+q.x+' '+q.y+') scale('+flip+' 1)"><path d="M-13-10l26 13v19l-26-13Z" fill="'+color+'" stroke="#746e60"/><path d="M-8-3L7 5M-8 1L3 7" stroke="#f1e2bf" stroke-width="2"/></g>');
 }
 if(o.kind==='fan')return group(at('<path d="M-9 4h18M0 4v-25" stroke="#6c7b76" stroke-width="3"/><ellipse cx="'+(o.rotation<2?3:-3)+'" cy="-32" rx="'+(o.rotation%2?8:11)+'" ry="11" fill="#b4c0b1" stroke="#637b76"/><path d="M-4-36l11 8M7-37l-11 10" stroke="#78908a" stroke-width="3"/>'));
 if(o.kind==='plant')return group(at('<path d="M-7-4l2 12h10L7-4Z" fill="#be7960" stroke="#8d5c4e"/><path d="M0-2v-23" stroke="#627757" stroke-width="2"/><path d="M0-9Q-22-20-12-26Q1-25 0-9M0-16Q18-34 19-19Q15-8 0-16M0-21Q-8-37 1-36Q12-32 0-21" fill="#6e8966" stroke="#526a51"/>'));
 if(o.kind==='hanger')return group(at('<path d="M0 4v-47M-8 9L0 4l9 3M0-35l-10-6M0-32l11-5" stroke="#745e48" stroke-width="3"/><path d="M-13-39l7-4 6 9-4 19-10-3Z" fill="#8e9c92"/>'));
 if(o.kind==='bin')return group(at('<path d="M-8-14l2 20h12l2-20Z" fill="#8a9390" stroke="#596b6b"/><ellipse cy="-14" rx="8" ry="4" fill="#596b6b"/>'));
 const service=['water','kettle','coffee','coffeeAuto','cookies','fridge','kitchen'].includes(o.kind);
 let body=box(o.x+.12,o.y+.12,w-.24,h-.24,o.kind==='fridge'?47:service?31:20,service?'#d6d6bb':'#a7a08b',service?'#7e9693':'#817b6b');
 if(service){const q=project(o.x+w/2,o.y+h/2,33);body+='<g transform="translate('+q.x+' '+q.y+')">'+(o.kind==='water'?'<path d="M-5 0v-17q5-5 10 0V0Z" fill="#9dbbbb" stroke="#6c8b8d"/><path d="M0 2v5" stroke="#4d6c70" stroke-width="2"/>':o.kind==='kettle'?'<path d="M-6-1v-9h11v9Z" fill="#d7c5a2" stroke="#82765e"/><path d="M5-8q9-2 7 5" fill="none" stroke="#82765e"/>':o.kind==='cookies'?'<path d="M-9 0v-14h18V0Z" fill="#ddc593" stroke="#a28a62"/><circle cy="-7" r="4" fill="#af8053"/>':'<path d="M-9 2v-15h18V2Z" fill="#4d6068" stroke="#344b55"/><path d="M-4-8h8" stroke="#d3ad72" stroke-width="2"/><path d="M-3-2h6v5h-6Z" fill="#ead8b4"/>')+'</g>';}
 return group(body);
}

export function routeToSeat(layout,start,target){
 const approach=objectApproaches(layout,target)[0];if(!approach)return [];
 const owned=ownedCells(layout),blocked=new Set(layout.objects.filter(o=>!BUILD_CATALOG[o.kind].passable).flatMap(objectCells).map(c=>tileKey(c.x,c.y)));
 const walls=new Map(layout.walls.map(w=>[w.axis+':'+w.x+','+w.y,w.kind])),s={x:Math.floor(start.x),y:Math.floor(start.y)},goal=tileKey(approach.cell.x,approach.cell.y),parents=new Map([[tileKey(s.x,s.y),null]]),queue=[s];
 for(let i=0;i<queue.length;i++){const c=queue[i];if(tileKey(c.x,c.y)===goal)break;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:c.x+dx,y:c.y+dy},key=tileKey(n.x,n.y),edge=dx?'v:'+Math.max(c.x,n.x)+','+c.y:'h:'+c.x+','+Math.max(c.y,n.y),wall=walls.get(edge);if(!owned.has(key)||blocked.has(key)||parents.has(key)||wall&&!['door','wideDoor'].includes(wall))continue;parents.set(key,tileKey(c.x,c.y));queue.push(n);}}
 if(!parents.has(goal))return [];const path=[];let key=goal;while(key){const [x,y]=key.split(',').map(Number);path.unshift({x:x+.5,y:y+.5});key=parents.get(key);}return [...path,{x:target.x+.5,y:target.y+.5}];
}

export function createWorld(host,callbacks={}){
 host.innerHTML='<svg class="world-svg" role="application" aria-label="Карта клуба. Колесо — масштаб, перетаскивание — камера, Home — весь клуб." tabindex="0"><defs><pattern id="ground" width="72" height="36" patternUnits="userSpaceOnUse"><path d="M0 18L36 0 72 18 36 36Z" fill="none" stroke="#9ca9a4" stroke-opacity=".22" stroke-width=".7"/></pattern><filter id="club-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="8" flood-color="#172b32" flood-opacity=".2"/></filter></defs><g class="camera"><g class="scene"></g><g class="preview"></g></g></svg>';
 const svg=host.querySelector('svg'),cameraNode=host.querySelector('.camera'),scene=host.querySelector('.scene'),preview=host.querySelector('.preview');
 const camera={x:0,y:0,zoom:1},pointers=new Map(),positions=new Map(),motions=new Map();let lastSeed=null,narrow=innerWidth<=640;let club=null,view={},gesture=null,width=0,height=0,space=false,pinch=null,animation=0;
 const transform=()=>{cameraNode.setAttribute('transform','translate('+camera.x+' '+camera.y+') scale('+camera.zoom+')');callbacks.onCamera?.(camera);};
 const local=e=>{const r=svg.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const world=e=>{const p=local(e);return unproject((p.x-camera.x)/camera.zoom,(p.y-camera.y)/camera.zoom);};
 const zoomAt=(factor,p)=>{const z=Math.max(Math.min(.35,overviewZoom()),Math.min(3,camera.zoom*factor)),ratio=z/camera.zoom;camera.x=p.x-(p.x-camera.x)*ratio;camera.y=p.y-(p.y-camera.y)*ratio;camera.zoom=z;transform();};
 function overviewBounds(){const b=bounds(club.layout),corners=diamond(b.x,b.y,b.w,b.h);return{minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minY:Math.min(...corners.map(p=>p.y))-110,maxY:Math.max(...corners.map(p=>p.y))+15};}
 function overviewZoom(){if(!club||!width||!height)return .35;const b=overviewBounds();return Math.max(Number.EPSILON,Math.min(1.65,(width-100)/(b.maxX-b.minX),(height-95)/(b.maxY-b.minY)));}
 function fit(){if(!club||!width||!height)return;const b=overviewBounds();camera.zoom=overviewZoom();camera.x=width/2-(b.minX+b.maxX)/2*camera.zoom;camera.y=height/2-(b.minY+b.maxY)/2*camera.zoom;transform();}
 const resize=new ResizeObserver(entries=>{const r=entries[0].contentRect,first=!width;camera.x+=(r.width-width)/2;camera.y+=(r.height-height)/2;width=r.width;height=r.height;svg.setAttribute('viewBox','0 0 '+width+' '+height);if(first||narrow!==(innerWidth<=640)){narrow=innerWidth<=640;fit();}else transform();});resize.observe(host);
 function render(next,state={}){
  club=next;view=state;cancelAnimationFrame(animation);if(lastSeed!==club.seed){positions.clear();motions.clear();lastSeed=club.seed;}const actors=[];const layout=club.layout,b=bounds(layout),owned=ownedCells(layout),floors=new Map(layout.floors.map(f=>[tileKey(f.x,f.y),f.finish])),zones=new Map(layout.rooms.flatMap(r=>r.cells.map(c=>[tileKey(c.x,c.y),r])));let floor='',entities=[];
  const margin=state.tool==='land'?5:2,waitingStatus=guestWaitingStatus(club);
  const restingByObject=new Map(),mastersById=new Map(club.staff.map(m=>[m.id,m]));
  for(const {masterId,seat} of staffRoomStatus(club).assignments){const person=mastersById.get(masterId);if(!seat||!person||club.rooms.some(r=>r.status==='running'&&r.masterId===masterId))continue;const people=restingByObject.get(seat.objectId)??[];people.push({person,seat});restingByObject.set(seat.objectId,people);}
  for(let y=b.minY-margin;y<b.maxY+margin;y++)for(let x=b.minX-margin;x<b.maxX+margin;x++){
   const key=tileKey(x,y),isOwned=owned.has(key),zone=zones.get(key),color=!isOwned?'#9baaa2':floors.has(key)?zone?.purpose==='staff'?'#b9bbb0':'#c5ad84':'#b2bab2';
   floor+=polygon(diamond(x,y),color,isOwned?'#9d9e8c':'#a0afa7','data-cell="'+x+','+y+'" class="'+(isOwned?'owned-cell':'outside-cell')+'"');
   if(floors.has(key)){const a=project(x+.5,y),c=project(x+.5,y+1);floor+='<path d="M'+a.x+' '+a.y+'L'+c.x+' '+c.y+'" stroke="#8d795e" opacity=".18" stroke-width=".65"/>';}
  }
  for(const wall of layout.walls){
   const room=layout.rooms.find(r=>r.cells.some(c=>wall.axis==='h'?c.x===wall.x&&(c.y===wall.y||c.y+1===wall.y):c.y===wall.y&&(c.x===wall.x||c.x+1===wall.x))),running=club.rooms.some(r=>r.id===room?.id&&r.status==='running'),door=['door','wideDoor'].includes(wall.kind),front=room&&room.cells.some(c=>wall.axis==='h'?c.x===wall.x&&c.y+1===wall.y:c.y===wall.y&&c.x+1===wall.x),cut=state.walls==='hidden'?0:state.walls==='full'?52:front?10:52,high=door?(running?42:8):cut;
   if(!high)continue;const a=project(wall.x,wall.y),end=wall.axis==='h'?{x:wall.x+1,y:wall.y}:{x:wall.x,y:wall.y+1},d=project(end.x,end.y),aTop={x:a.x,y:a.y-high},dTop={x:d.x,y:d.y-high};
   let art=polygon([a,aTop,dTop,d],door?'#997251':wall.kind==='window'?'#b2c9c2':'#e0d6b8','#a69c83','class="world-wall"');
   art+='<path d="M'+aTop.x+' '+aTop.y+'L'+dTop.x+' '+dTop.y+'" stroke="#f4ecd3" stroke-width="2"/>';
   if(door&&running)art+='<circle cx="'+((a.x+d.x)/2)+'" cy="'+((a.y+d.y)/2-17)+'" r="1.4" fill="#e6c47d"/>';
   entities.push({depth:wall.x+wall.y+(front?1.1:-.05),art});
  }
  for(const object of layout.objects){
   const spec=BUILD_CATALOG[object.kind];if(spec.layer==='tabletop')continue;
   if(spec.family==='table'){entities.push(...tableGroups(object,layout,state));continue;}
   const cells=objectCells(object),w=spec.width,h=spec.height,depth=object.x+object.y+(w+h)/2;
   let art=furnitureArt(object,layout,{selected:state.objectId===object.id});
   const room=club.rooms.find(r=>r.id===object.roomId),guest=object.role==='guest'?club.guests.find(g=>g.roomId===object.roomId&&g.seat===object.seat):null;
   const master=object.role==='master'&&room?.status==='running'?club.staff.find(m=>m.id===room.masterId):null;
   const people=[];if(guest)people.push({person:guest,master:false,x:object.x+.5,y:object.y+.5});if(master)people.push({person:master,master:true,x:object.x+.5,y:object.y+.5});
   for(const {person:m,seat} of restingByObject.get(object.id)??[])people.push({person:m,master:true,x:seat.x+.5,y:seat.y+.5});
   for(const assignment of waitingStatus.assignments.filter(a=>a.seat?.objectId===object.id&&a.guestId!==state.selectedGuest)){const g=club.guests.find(g=>g.id===assignment.guestId);if(g)people.push({person:g,master:false,x:assignment.seat.x+.5,y:assignment.seat.y+.5});}
   if(people.length)art=furnitureArt(object,layout,{selected:state.objectId===object.id,occupied:true});
   for(const actor of people){const back=seatFrame(object.rotation).backNear;
    Object.assign(actor,{key:(actor.master?'m:':'g:')+actor.person.id,seated:true,back,scale:1,walkScale:.62,z:0,seatRotation:object.rotation,seatOptions:{atTable:object.role==='guest'||object.role==='master',rotation:object.rotation,kind:object.kind,width:Math.max(...cells.map(c=>c.x))-object.x+1,height:Math.max(...cells.map(c=>c.y))-object.y+1,offsetX:object.x+(Math.max(...cells.map(c=>c.x))-object.x+1)/2-actor.x,offsetY:object.y+(Math.max(...cells.map(c=>c.y))-object.y+1)/2-actor.y},target:object});actors.push(actor);const p=project(actor.x,actor.y,actor.z??0);
    art+='<g data-actor="'+esc(actor.key)+'" data-seat-object="'+esc(object.id)+'" class="map-person '+(room?.status==='running'?'playing':'')+'" '+(actor.master?'data-master-id="':'data-guest-id="')+esc(actor.person.id)+'" transform="translate('+p.x+' '+p.y+') scale(1)"><title>'+esc(actor.person.profile?.name??actor.person.name)+'</title>'+seatedPersonArt(actor.person,actor.seatOptions)+'</g>';
   }
   for(const actor of people)if(actor.seatOptions.atTable){const table=layout.objects.find(o=>BUILD_CATALOG[o.kind]?.family==='table'&&o.roomId===object.roomId);if(table)entities.push({depth:table.x+table.y+2.005,art:seatedTableArmArt(actor.person,object,layout,actor.key)});}
   if(people.length)art+=seatForeground(object);
   if(spec.family==='chair'&&object.role==='guest'&&!guest&&room?.status!=='running'){const p=project(object.x+.5,object.y+.5,19);art+='<g data-seat="'+esc(object.id)+'" class="empty-seat"><circle cx="'+p.x+'" cy="'+p.y+'" r="7" fill="#f4e9cc" stroke="#a28c64"/><path d="M'+(p.x-3)+' '+p.y+'h6M'+p.x+' '+(p.y-3)+'v6" stroke="#9a805c"/></g>';}
   entities.push({depth,art});
  }
  const waiting=club.guests.filter(g=>!g.roomId),desk=receptionStatus(club).desk;
  waiting.slice(0,12).forEach((g,i)=>{const selected=g.id===state.selectedGuest,seat=waitingStatus.assignments.find(a=>a.guestId===g.id)?.seat;if(seat&&!selected)return;
   const x=selected&&desk?desk.x+1:seat?seat.x+.5:layout.entry.x+.3+(i%3)*.38,y=selected&&desk?desk.y+1.45:seat?seat.y+.5:layout.entry.y+.25+Math.floor(i/3)*.36;
   const actor={key:'g:'+g.id,person:g,x,y,seated:Boolean(seat&&!selected),back:false,master:false,scale:.56,target:seat?layout.objects.find(o=>o.id===seat.objectId):null};actors.push(actor);
   const p=project(x,y,0);entities.push({depth:x+y+.1,art:'<g data-actor="'+esc(actor.key)+'" data-guest-id="'+esc(g.id)+'" class="map-person waiting-person" transform="translate('+p.x+' '+p.y+') scale('+actor.scale+')"><title>'+esc(g.profile.name)+'</title>'+personArt(g,{seated:actor.seated})+'</g>'});});
  const labels=layout.rooms.map(zone=>{const room=club.rooms.find(r=>r.id===zone.id),center=zone.cells.reduce((p,c)=>({x:p.x+c.x/zone.cells.length,y:p.y+c.y/zone.cells.length}),{x:0,y:0}),frontCell=zone.cells.toSorted((a,b)=>(b.x+b.y)-(a.x+a.y))[0],p=project(frontCell.x+.5,frontCell.y+.5,-34),count=club.guests.filter(g=>g.roomId===zone.id).length,name=zone.purpose==='staff'?'Отдых мастеров':zone.name,detail=zone.purpose==='staff'?'Штат и восстановление':room?.status==='running'?'Партия до '+String(Math.floor(room.run.endsAt%24)).padStart(2,'0')+':00':count+'/4 · '+(room?.master?.name??'назначьте мастера');
   return '<g data-room="'+esc(zone.id)+'" class="room-label" transform="translate('+p.x+' '+p.y+')"><rect x="-65" y="-12" width="130" height="36" rx="2" fill="'+(room?.status==='running'?'#46675b':'#eee3c5')+'" stroke="#8e927d"/><text text-anchor="middle" y="1" fill="'+(room?.status==='running'?'#f6efd9':'#3c474a')+'">'+esc(name)+'</text><text text-anchor="middle" y="15" class="label-sub" fill="'+(room?.status==='running'?'#d6e4cc':'#6d7469')+'">'+esc(detail)+'</text></g>';
  }).join('');
  scene.innerHTML='<ellipse cx="0" cy="'+((b.w+b.h)*10)+'" rx="'+(b.w*36)+'" ry="'+(b.h*20)+'" fill="#667e75" opacity=".13"/><g filter="url(#club-shadow)">'+floor+entities.sort((a,b)=>a.depth-b.depth).map(e=>e.art).join('')+'</g>'+labels;drawPreview(state.cells??[],state.preview);if(!camera.x&&!camera.y)fit();transform();animateActors(actors);
 }
 function animateActors(actors){
  const now=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,keys=new Set(actors.map(a=>a.key));
  for(const actor of actors){const prev=positions.get(actor.key),same=prev&&Math.hypot(prev.x-actor.x,prev.y-actor.y)<.1;
   if(!reduced&&prev&&!same){
    let target=actor.target??{kind:'chair',x:Math.floor(actor.x),y:Math.floor(actor.y),rotation:0};
    let path=routeToSeat(club.layout,prev,target);
    if(actor.master&&club.rooms.some(r=>r.status==='running'&&r.masterId===actor.person.id)){
     const shelf=club.layout.objects.find(o=>BUILD_CATALOG[o.kind].family==='shelf'),fetch=shelf?routeToSeat(club.layout,prev,shelf).slice(0,-1):[];
     if(fetch.length){const onward=routeToSeat(club.layout,fetch.at(-1),target);if(onward.length)path=[...fetch,...onward];}
    }
    if(path.length){path[0]={x:prev.x,y:prev.y};path[path.length-1]={x:actor.x,y:actor.y};motions.set(actor.key,{actor,path,start:now,duration:Math.max(450,Math.min(3200,path.length*130))});}
   }
   positions.set(actor.key,actor);if(motions.has(actor.key))motions.get(actor.key).actor=actor;
  }
  for(const key of positions.keys())if(!keys.has(key)){positions.delete(key);motions.delete(key);}
  function frame(time){for(const [key,motion]of motions){const node=scene.querySelector('[data-actor="'+CSS.escape(key)+'"]');if(!node){motions.delete(key);continue;}
    const t=Math.max(0,Math.min(1,(time-motion.start)/motion.duration)),actor=motion.actor;
    if(t>=1){const arms=scene.querySelector('[data-table-arms-for="'+CSS.escape(key)+'"]');if(arms)arms.style.visibility='';const p=project(actor.x,actor.y,actor.z??0);node.innerHTML=actor.seated&&actor.seatRotation!==undefined?seatedPersonArt(actor.person,actor.seatOptions):personArt(actor.person,{seated:actor.seated,back:actor.back});node.setAttribute('transform','translate('+p.x+' '+p.y+') scale('+actor.scale+')');node.classList.remove('is-walking');delete node.dataset.walking;motions.delete(key);continue;}
    const arms=scene.querySelector('[data-table-arms-for="'+CSS.escape(key)+'"]');if(arms)arms.style.visibility='hidden';
    if(!node.dataset.walking){node.innerHTML=personArt(actor.person,{drag:true});node.dataset.walking='true';node.classList.add('is-walking');}
    const n=t*(motion.path.length-1),a=motion.path[Math.floor(n)],b=motion.path[Math.min(motion.path.length-1,Math.floor(n)+1)],k=n-Math.floor(n),p=project(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k);
    node.setAttribute('transform','translate('+p.x+' '+(p.y-Math.sin(t*Math.PI*14)*.8)+') scale('+(actor.walkScale??actor.scale)+')');
   }if(motions.size)animation=requestAnimationFrame(frame);}
  if(motions.size)animation=requestAnimationFrame(frame);
 }
 function seatAtClient(x,y){
  const element=document.elementFromPoint(x,y),id=element?.closest('[data-seat]')?.dataset.seat??element?.closest('[data-object]')?.dataset.object;
  const direct=club.layout.objects.find(o=>o.id===id&&o.role==='guest');if(direct)return direct;
  const r=svg.getBoundingClientRect(),c={x:x-r.left,y:y-r.top};let best=null,distance=Infinity;
  for(const o of club.layout.objects.filter(o=>o.role==='guest')){const p=project(o.x+.5,o.y+.5,19),d=Math.hypot(c.x-camera.x-p.x*camera.zoom,c.y-camera.y-p.y*camera.zoom);if(d<distance){best=o;distance=d;}}
  return distance<=Math.max(12,21*camera.zoom)?best:null;
 }
 function drawPreview(cells=[],object=null,valid=true){const tabletop=BUILD_CATALOG[object?.kind]?.layer==='tabletop',pose=tabletop?surfacePose(object,club.layout):null,color=valid?'#d6b267':'#cf7264',highlight=pose?polygon(surfacePolygon(pose).map(p=>project(p.x,p.y,surfaceBaseHeight(object,club.layout)+.02)),color,'white','data-preview-plane="tabletop" data-preview-free="true" opacity=".45"'):cells.map(c=>polygon(diamond(c.x,c.y,1,1,.6),color,'white','data-preview-plane="floor" data-preview-cell="'+c.x+','+c.y+'" opacity=".55"')).join('');preview.innerHTML=highlight+(object?furnitureArt(object,club.layout,{ghost:true}):'');}
 svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(-e.deltaY*.0015),local(e));},{passive:false});
 svg.addEventListener('contextmenu',e=>{e.preventDefault();const data=e.target.closest('[data-object],[data-seat-front],[data-guest-id],[data-master-id],[data-room]')?.dataset??{};callbacks.onInspect?.(data.seatFront?{object:data.seatFront}:data);});
 svg.addEventListener('pointerdown',e=>{
  if(e.button===2)return;pointers.set(e.pointerId,local(e));svg.setPointerCapture(e.pointerId);
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};gesture=null;callbacks.onCancel?.();return;}
  const target=e.target.closest('[data-object],[data-seat-front],[data-guest-id],[data-master-id],[data-room],[data-seat]'),guest=e.target.closest('[data-guest-id]')?.dataset.guestId;
  const objectId=target?.dataset.object??target?.dataset.seatFront,mode=e.button===1||space?'pan':view.tool&&view.tool!=='select'?'build':view.tool==='select'&&objectId?'object':guest?'guest':'pan';
  gesture={mode,start:local(e),last:local(e),point:world(e),target,objectId,guest,moved:false,pointer:e.pointerId};
  if(mode==='build')callbacks.onPaintStart?.(world(e));if(mode==='guest')callbacks.onGuestDrag?.(guest,e.clientX,e.clientY,false);svg.classList.toggle('panning',mode==='pan');
 });
 svg.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,local(e));
  if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};camera.x+=center.x-pinch.center.x;camera.y+=center.y-pinch.center.y;zoomAt(distance/Math.max(1,pinch.distance),center);pinch={distance,center};return;}
  if(!gesture){callbacks.onHover?.(world(e));return;}const p=local(e);gesture.moved||=Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>5;
  if(gesture.mode==='pan'&&gesture.moved){camera.x+=p.x-gesture.last.x;camera.y+=p.y-gesture.last.y;transform();}
  if(gesture.mode==='build')callbacks.onPaintMove?.(world(e),gesture.point);
  if(gesture.mode==='object'&&gesture.moved)callbacks.onObjectDrag?.(gesture.objectId,world(e),gesture.point,false);
  if(gesture.mode==='guest'&&gesture.moved)callbacks.onGuestDrag?.(gesture.guest,e.clientX,e.clientY,true);
  gesture.last=p;
 });
 svg.addEventListener('pointerup',e=>{
  pointers.delete(e.pointerId);if(pinch){if(pointers.size<2)pinch=null;gesture=null;return;}const g=gesture;gesture=null;svg.classList.remove('panning');if(!g)return;
  if(g.mode==='build')callbacks.onPaintEnd?.(world(e),g.point);
  else if(g.mode==='object'&&g.moved)callbacks.onObjectDrag?.(g.objectId,world(e),g.point,true);
  else if(g.mode==='guest'&&g.moved){const seat=seatAtClient(e.clientX,e.clientY);callbacks.onGuestDrop?.(g.guest,seat?.id);}
  else if(!g.moved)callbacks.onSelect?.(g.target?.dataset.seatFront?{object:g.target.dataset.seatFront}:g.target?.dataset??{},world(e));callbacks.onDragEnd?.();
 });
 svg.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;pinch=null;svg.classList.remove('panning');callbacks.onCancel?.();callbacks.onDragEnd?.();});
 const keydown=e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;if(e.code==='Escape'){gesture=null;pointers.clear();callbacks.onCancel?.();svg.classList.remove('panning');}if(e.code==='Space'){space=true;e.preventDefault();}if(e.code==='Home'){fit();e.preventDefault();}const direction={ArrowLeft:[50,0],KeyA:[50,0],ArrowRight:[-50,0],KeyD:[-50,0],ArrowUp:[0,50],KeyW:[0,50],ArrowDown:[0,-50],KeyS:[0,-50]}[e.code];if(direction){e.preventDefault();camera.x+=direction[0];camera.y+=direction[1];transform();}};
 const keyup=e=>{if(e.code==='Space')space=false;};window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',()=>{space=false;gesture=null;pointers.clear();callbacks.onCancel?.();callbacks.onDragEnd?.();});
 return {render,fit,drawPreview,camera,seatAtClient,atClient:(x,y)=>world({clientX:x,clientY:y}),zoom:factor=>zoomAt(factor,{x:width/2,y:height/2}),worldPoint:(x,y)=>{const p=project(x,y),r=svg.getBoundingClientRect();return {x:r.left+camera.x+p.x*camera.zoom,y:r.top+camera.y+p.y*camera.zoom};},destroy(){resize.disconnect();cancelAnimationFrame(animation);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);}};
}
