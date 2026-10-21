import {tileKey,edgeKey,objectCells,reachableTiles,quoteEdit} from './layout.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
export function rectangle(a,b){
 const minX=Math.floor(Math.min(a.x,b.x)),maxX=Math.floor(Math.max(a.x,b.x)),minY=Math.floor(Math.min(a.y,b.y)),maxY=Math.floor(Math.max(a.y,b.y));
 if((maxX-minX+1)*(maxY-minY+1)>200)return [];
 return Array.from({length:(maxX-minX+1)*(maxY-minY+1)},(_,i)=>({x:minX+i%(maxX-minX+1),y:minY+Math.floor(i/(maxX-minX+1))}));
}
export function nearestEdge(p){
 const x=Math.floor(p.x),y=Math.floor(p.y),u=p.x-x,v=p.y-y,values=[{d:v,x,y,axis:'h'},{d:1-v,x,y:y+1,axis:'h'},{d:u,x,y,axis:'v'},{d:1-u,x:x+1,y,axis:'v'}];
 const {d,...edge}=values.sort((a,b)=>a.d-b.d)[0];return edge;
}
export function roomEdit(layout,cells,{purpose='game',furnished=false,structure=true}={}){
 if(!cells.length)throw new Error('Нарисуйте комнату на купленной площади.');
 const keys=new Set(cells.map(c=>tileKey(c.x,c.y))),x=Math.min(...cells.map(c=>c.x)),y=Math.min(...cells.map(c=>c.y)),w=Math.max(...cells.map(c=>c.x))-x+1,h=Math.max(...cells.map(c=>c.y))-y+1;
 const number=1+Math.max(0,...layout.rooms.filter(r=>(r.purpose??'game')===purpose).map(r=>r.number)),id=(purpose==='staff'?'staff':'game')+'-studio-'+(layout.revision+1);
 if(!structure)return {type:'room',id,number,name:purpose==='staff'?'Отдых мастеров '+number:'Игровая '+number,purpose,cells};
 const edits=[{type:'room',id,number,name:purpose==='staff'?'Отдых мастеров '+number:'Игровая '+number,purpose,cells},{type:'floor',cells,finish:'wood'}];
 const boundary=new Map();
 for(const c of cells)for(const [dx,dy,edge]of [[0,-1,{axis:'h',x:c.x,y:c.y}],[0,1,{axis:'h',x:c.x,y:c.y+1}],[-1,0,{axis:'v',x:c.x,y:c.y}],[1,0,{axis:'v',x:c.x+1,y:c.y}]]){
  if(!keys.has(tileKey(c.x+dx,c.y+dy)))boundary.set(edge.axis+':'+edge.x+','+edge.y,edge);
 }
 const owned=new Set(layout.plots.flatMap(p=>Array.from({length:p.w*p.h},(_,i)=>tileKey(p.x+i%p.w,p.y+Math.floor(i/p.w))))),reachable=reachableTiles(layout),shared=otherBoundaries(layout,null);
 const choices=[...perimeter(cells)].filter(([key,{outside}])=>!shared.has(key)&&owned.has(tileKey(outside.x,outside.y))).sort((a,b)=>Number(reachable.has(tileKey(b[1].outside.x,b[1].outside.y)))-Number(reachable.has(tileKey(a[1].outside.x,a[1].outside.y)))||Math.abs(a[1].outside.x-layout.entry.x)+Math.abs(a[1].outside.y-layout.entry.y)-Math.abs(b[1].outside.x-layout.entry.x)-Math.abs(b[1].outside.y-layout.entry.y));
 const legacyDoor='v:'+x+','+(y+h-1),door=choices.some(([key,{outside}])=>key===legacyDoor&&reachable.has(tileKey(outside.x,outside.y)))?legacyDoor:choices[0]?.[0];
 for(const [key,edge]of boundary)if(!layout.walls.some(w=>edgeKey(w)===key))edits.push({type:'wall',edge,kind:key===door?'door':'wall'});
 if(furnished){
  const objects=purpose==='staff'?[{kind:'staffChair',x:x+w-1,y},{kind:'staffChair',x:x+w-1,y:y+h-1},{kind:'light',x,y:y+1}]:[
   {kind:'table',x:x+1,y:y+1},{kind:'chair',x,y:y+1,role:'guest',seat:0,rotation:1},{kind:'chair',x,y:y+2,role:'guest',seat:1,rotation:1},
   {kind:'chair',x:x+3,y:y+1,role:'guest',seat:2,rotation:3},{kind:'chair',x:x+3,y:y+2,role:'guest',seat:3,rotation:3},
   {kind:'chair',x:x+1,y:y+3,role:'master'},{kind:'light',x:x+2,y:y+2},
  ];
  // Kept for legacy fixtures. The player-facing room tools never buy furniture.
  if(objects.every(o=>objectCells({rotation:0,...o}).every(c=>keys.has(tileKey(c.x,c.y))))){
   const placements=objects.map((o,i)=>({type:'place',object:{rotation:0,...o,id:id+'-item-'+i,roomId:id}}));
   const candidate={type:'batch',edits:[...edits,...placements]};
   if(quoteEdit(layout,candidate).ok)return candidate;
  }
 }
 return {type:'batch',edits};
}

// Area designation never buys floors, boundaries or furniture.
export function paintRoomEdit(layout,cells,{roomId=null,purpose='game'}={}){
 const room=roomId?layout.rooms.find(r=>r.id===roomId):null;
 if(roomId&&!room)throw new Error('Комната не найдена. Выберите комнату для расширения.');
 if(!room)return roomEdit(layout,cells,{purpose,structure:false});
 const merged=new Map([...room.cells,...cells].map(c=>[tileKey(c.x,c.y),c]));
 return {type:'room',id:room.id,number:room.number,name:room.name,purpose:room.purpose??'game',cells:[...merged.values()]};
}

export function brushCells(a,b){
 const start={x:Math.floor(a.x),y:Math.floor(a.y)},end={x:Math.floor(b.x),y:Math.floor(b.y)},cells=[start];let{x,y}=start;
 while((x!==end.x||y!==end.y)&&cells.length<=200){
  if(x!==end.x){x+=Math.sign(end.x-x);cells.push({x,y});}
  if(y!==end.y){y+=Math.sign(end.y-y);cells.push({x,y});}
 }
 return cells;
}

function perimeter(cells){
 const keys=new Set(cells.map(c=>tileKey(c.x,c.y))),edges=new Map();
 for(const c of cells)for(const [dx,dy,edge]of [[0,-1,{axis:'h',x:c.x,y:c.y}],[0,1,{axis:'h',x:c.x,y:c.y+1}],[-1,0,{axis:'v',x:c.x,y:c.y}],[1,0,{axis:'v',x:c.x+1,y:c.y}]])if(!keys.has(tileKey(c.x+dx,c.y+dy)))edges.set(edgeKey(edge),{edge,outside:{x:c.x+dx,y:c.y+dy}});
 return edges;
}
const otherBoundaries=(layout,id)=>new Set(layout.rooms.filter(r=>r.id!==id).flatMap(r=>[...perimeter(r.cells).keys()]));

// All geometry and money still pass through the normal atomic quote/commit.
// Resizing never moves or sells a player's furniture without their choice.
export function replanRoomEdit(layout,id,cells,{name,purpose,finish=null}={}){
 const room=layout.rooms.find(r=>r.id===id);if(!room)throw new Error('Комната не найдена.');
 if(!Array.isArray(cells)||!cells.length||cells.some(c=>!Number.isSafeInteger(c?.x)||!Number.isSafeInteger(c?.y)))throw new Error('Нарисуйте новые границы комнаты.');
 const keys=new Set(cells.map(c=>tileKey(c.x,c.y)));
 const outside=layout.objects.filter(o=>o.roomId===id&&objectCells(o).some(c=>!keys.has(tileKey(c.x,c.y))));
 if(outside.length)throw new Error('Сначала перенесите внутрь новых границ: '+outside.map(o=>BUILD_CATALOG[o.kind].name).slice(0,4).join(', ')+(outside.length>4?' и другие предметы.':'.'));
 const before=perimeter(room.cells),after=perimeter(cells),shared=otherBoundaries(layout,id),walls=new Map(layout.walls.map(w=>[edgeKey(w),w]));
 const edits=[{type:'room',id,number:room.number,name:name??room.name,purpose:purpose??room.purpose??'game',cells}];
 for(const [key]of before){const wall=walls.get(key);if(wall&&!after.has(key)&&!shared.has(key))edits.push({type:'removeWall',id:wall.id});}
 const hasDoor=[...after.keys()].some(key=>['door','wideDoor'].includes(walls.get(key)?.kind));
 const owned=new Set(layout.plots.flatMap(p=>Array.from({length:p.w*p.h},(_,i)=>tileKey(p.x+i%p.w,p.y+Math.floor(i/p.w))))),reachable=reachableTiles(layout);
 const choices=[...after].filter(([key,v])=>!shared.has(key)&&owned.has(tileKey(v.outside.x,v.outside.y))).sort((a,b)=>Number(reachable.has(tileKey(b[1].outside.x,b[1].outside.y)))-Number(reachable.has(tileKey(a[1].outside.x,a[1].outside.y)))||Math.abs(a[1].outside.x-layout.entry.x)+Math.abs(a[1].outside.y-layout.entry.y)-Math.abs(b[1].outside.x-layout.entry.x)-Math.abs(b[1].outside.y-layout.entry.y)||a[0].localeCompare(b[0]));
 const door=hasDoor?null:choices[0]?.[0];
 for(const [key,{edge}]of after)if(!walls.has(key)||key===door)edits.push({type:'wall',edge,kind:key===door?'door':'wall'});
 if(finish!==null)edits.push({type:'floor',cells,finish});
 return {type:'batch',edits};
}

// Selling contents is an explicit option; shared boundaries are never removed.
export function demolishRoomEdit(layout,id,{sellContents=false,removeFinishes=false,removeBoundary=false}={}){
 const room=layout.rooms.find(r=>r.id===id);if(!room)throw new Error('Комната не найдена.');
 const edits=[],objects=layout.objects.filter(o=>o.roomId===id);
 if(objects.length&&!sellContents)throw new Error('Сначала перенесите мебель или выберите продажу содержимого комнаты.');
 if(sellContents)for(const o of objects.sort((a,b)=>Number(BUILD_CATALOG[b.kind]?.layer==='tabletop')-Number(BUILD_CATALOG[a.kind]?.layer==='tabletop')))edits.push({type:'remove',id:o.id});
 if(removeBoundary){const boundary=perimeter(room.cells),shared=otherBoundaries(layout,id);for(const wall of layout.walls)if(boundary.has(edgeKey(wall))&&!shared.has(edgeKey(wall)))edits.push({type:'removeWall',id:wall.id});}
 if(removeFinishes)edits.push({type:'floor',cells:room.cells,finish:null});
 edits.push({type:'removeRoom',id});return {type:'batch',edits};
}
