import {BUILD_CATALOG,WALL_PRICES,FLOOR_PRICES} from '../data/build-catalog.js';
import {canonicalKind,commerceItems} from '../data/commerce.js';
import {createStarterLayout,roomReadiness,roomPurpose,objectCells,reachableTiles,quoteEdit,validateLayout as inspectLayout,edgeKey as canonicalEdgeKey} from './layout.js';

export const cellKey=(x,y)=>`${x},${y}`;
export const edgeKey=(x,y,side)=>side==='N'?`h:${x},${y}`:side==='S'?`h:${x},${y+1}`:side==='W'?`v:${x},${y}`:`v:${x+1},${y}`;
export const adjacentCells=edge=>{const [axis,key]=edge.split(':'),[x,y]=key.split(',').map(Number);return axis==='h'?[[x,y-1],[x,y]]:[[x-1,y],[x,y]];};
const parseEdge=edge=>{const [axis,key]=edge.split(':'),[x,y]=key.split(',').map(Number);return {axis,x,y};};
export const ownedCells=layout=>new Set(layout.plots.flatMap(p=>Array.from({length:p.w*p.h},(_,i)=>cellKey(p.x+i%p.w,p.y+Math.floor(i/p.w)))));
export const equipmentItems=commerceItems;
export const footprint=item=>objectCells({...item,kind:item.kind??canonicalKind(item.type)}).map(c=>cellKey(c.x,c.y));
export const physical=item=>!BUILD_CATALOG[item.kind??canonicalKind(item.type)]?.passable;
export const reachable=layout=>new Set(reachableTiles(layout));
export function inspectRooms(layout){
 return layout.rooms.filter(zone=>roomPurpose(zone)==='game').map(zone=>{
  const ready=roomReadiness(layout,zone.id),items=layout.objects.filter(o=>o.roomId===zone.id),table=items.find(o=>BUILD_CATALOG[o.kind].family==='table');
  const errors=ready.reasons.map(text=>({text,x:zone.cells[0]?.x??0,y:zone.cells[0]?.y??0}));
  return {id:zone.id,tableId:table?.id??null,cells:zone.cells.map(c=>cellKey(c.x,c.y)),chairIds:ready.seats.reduce((ids,o)=>{ids[o.seat]=o.id;return ids;},[]),masterChairId:ready.master?.id??null,items:items.map(o=>o.id),valid:errors.length===0,errors};
 });
}
function commit(layout,edit,options){const result=quoteEdit(layout,edit,options);if(result.ok)Object.assign(layout,result.next);return result;}
function placeSpec(layout,type,x,y,{rotation=0,role='guest',id}={}){
 const kind=canonicalKind(type);if(!BUILD_CATALOG[kind])return null;
 const object={id:id??`item-${layout.revision+1}-${layout.objects.length+1}`,kind,x,y,rotation,price:BUILD_CATALOG[kind].price,enabled:true,stock:0,autoRefill:false};
 const cells=objectCells(object),zone=layout.rooms.find(r=>cells.every(c=>r.cells.some(p=>p.x===c.x&&p.y===c.y)));
 if(zone)object.roomId=zone.id;
 if(BUILD_CATALOG[kind].family==='chair'&&zone&&roomPurpose(zone)==='game'){object.role=layout.objects.some(o=>o.roomId===zone.id&&o.role==='master')?'guest':'master';if(object.role==='guest'){object.seat=0;while(layout.objects.some(o=>o.roomId===zone.id&&o.role==='guest'&&o.seat===object.seat))object.seat++;}}
 return object;
}
export function canPlace(layout,type,x,y,rotation=0,ignoreId=null){
 const object=placeSpec(layout,type,x,y,{rotation,id:ignoreId??undefined});if(!object)return {ok:false,reason:'Предмет не поддерживается этой планировкой.'};
 return quoteEdit(layout,ignoreId?{type:'move',id:ignoreId,x,y,rotation}:{type:'place',object});
}
export function addItem(layout,type,x,y,options={}){const object=placeSpec(layout,type,x,y,options);if(!object)return {ok:false,reason:'Выберите предмет из каталога.'};const result=commit(layout,{type:'place',object});return {...result,item:result.ok?layout.objects.find(o=>o.id===object.id):null};}
export function moveItem(layout,id,x,y,rotation){return commit(layout,{type:'move',id,x,y,rotation});}
export function setWall(layout,x,y,side,type='wall'){return commit(layout,{type:'wall',edge:parseEdge(edgeKey(x,y,side)),kind:type});}
export function addPlot(layout,plotId,side){const result=commit(layout,{type:'expand',plotId,direction:{N:'north',S:'south',E:'east',W:'west'}[side]});return {...result,plot:result.ok?layout.plots.at(-1):null};}
export function starterLayout({plots=1}={}){
 const layout=createStarterLayout('room-1');
 for(let i=1;i<plots;i++)layout.plots.push({id:`plot-${i+1}`,x:i*6,y:0,w:6,h:8});
 layout.objects.push({id:'starter-shelf',kind:'shelf',x:5,y:4,rotation:0,roomId:'room-1'});
 addStarterStaffRoom(layout);
 layout.objects.push({id:'starter-reception',kind:'reception',x:1,y:6,rotation:0});
 for(const object of layout.objects)Object.assign(object,{price:BUILD_CATALOG[object.kind].price,enabled:true,stock:0,autoRefill:false});return layout;
}
// Applied only to a new campaign. Loading old geometry never calls this helper.
export function addStarterStaffRoom(layout){
 const id='staff-room-1',cells=Array.from({length:6},(_,i)=>({x:4+i%2,y:5+Math.floor(i/2)}));
 const edges=[...Array.from({length:3},(_,i)=>({axis:'v',x:4,y:5+i})),...Array.from({length:3},(_,i)=>({axis:'v',x:6,y:5+i})),{axis:'h',x:4,y:8},{axis:'h',x:5,y:8}];
 const edits=[{type:'room',id,number:1,name:'Отдых мастеров',purpose:'staff',cells},{type:'floor',cells,finish:'wood'},...edges.map(edge=>({type:'wall',edge,kind:edge.axis==='v'&&edge.x===4&&edge.y===6?'door':'wall'})),
  {type:'place',object:{id:'starter-staff-chair-1',kind:'staffChair',x:5,y:5,rotation:3,roomId:id}},
  {type:'place',object:{id:'starter-staff-chair-2',kind:'staffChair',x:5,y:7,rotation:3,roomId:id}},
  {type:'place',object:{id:'starter-staff-light',kind:'light',x:4,y:6,rotation:0,roomId:id}}];
 const result=quoteEdit(layout,{type:'batch',edits});
 if(!result.ok)throw new Error(result.reason);
 Object.assign(layout,result.next);return result;
}
export function buildRoomTemplate(layout,x,y,options){
 const number=Math.max(0,...layout.rooms.filter(r=>roomPurpose(r)==='game').map(r=>r.number))+1,ids=new Set([...layout.rooms,...layout.objects,...layout.walls,...layout.plots].map(o=>o.id));let id=`room-${number}`,suffix=0;while(ids.has(id))id=`room-${number}-${++suffix}`;
 const part=createStarterLayout(id),dx=x-1,dy=y;
 const cells=part.rooms[0].cells.map(c=>({x:c.x+dx,y:c.y+dy})),edits=[{type:'room',id,number,cells},{type:'floor',cells,finish:'wood'}];
 edits.push(...part.walls.map(w=>({type:'wall',edge:{x:w.x+dx,y:w.y+dy,axis:w.axis},kind:w.kind})));
 edits.push(...part.objects.map(o=>({type:'place',object:{...o,x:o.x+dx,y:o.y+dy,price:BUILD_CATALOG[o.kind].price,enabled:true,stock:0,autoRefill:false}})));
 const result=commit(layout,{type:'batch',edits},options);return {...result,room:result.ok?inspectRooms(layout).find(r=>r.id===id):null};
}
export function validateLayout(layout){const result=inspectLayout(layout);if(!result.ok)throw new Error(result.reason);return true;}

// This migration never keeps a second authoritative geometry. Old items retain
// their paid price and service state; incompatible old overlaps are rejected
// with a useful message, leaving the source save untouched by the caller.
export function convertRecoveryLayout(old,rooms=[]){
 if(Array.isArray(old?.objects)){validateLayout(old);return structuredClone(old);}
 if(!old||!Array.isArray(old.items)||!Array.isArray(old.plots))throw new Error('Не найдена старая планировка.');
 const zones=rooms.map((r,i)=>({id:r.id,number:r.number??i+1,name:`Комната ${r.number??i+1}`,cells:(r.layout?.cells??[]).map(k=>{const [x,y]=k.split(',').map(Number);return {x,y};})}));
 if(zones.some(z=>!z.cells.length))throw new Error('В старой записи не сохранены границы комнат.');
 const layout={version:1,revision:0,plots:old.plots.map(p=>({...p,w:6,h:8})),entry:structuredClone(old.entrance),floors:Object.keys(old.floors).map(k=>{const [x,y]=k.split(',').map(Number);return {x,y,finish:'wood'};}),walls:Object.entries(old.walls).map(([key,w],i)=>({...parseEdge(key),id:`migrated-wall-${i}`,kind:w.type})),rooms:zones,objects:[]};
 for(const item of old.items){
  const kind=item.type==='painting'?'poster':canonicalKind(item.type);
  if(!BUILD_CATALOG[kind])throw new Error(`Старая планировка содержит неподдерживаемый предмет «${item.type}». Исходное сохранение оставлено без изменений.`);
  const object={id:item.id,kind,x:item.x,y:item.y,rotation:item.rotation??0,price:item.price,enabled:item.enabled!==false,stock:item.stock??0,autoRefill:item.autoRefill===true};
  const room=rooms.find(r=>r.layout?.items?.includes(item.id));if(room)object.roomId=room.id;
  if(BUILD_CATALOG[kind].family==='chair'&&room){object.role=item.id===room.masterChairId?'master':'guest';if(object.role==='guest')object.seat=room.chairIds.indexOf(item.id);}
  layout.objects.push(object);
 }
 const result=inspectLayout(layout);if(!result.ok)throw new Error(`Старые размеры мебели не подходят новой карте: ${result.reason} Исходное сохранение оставлено без изменений.`);
 return layout;
}
