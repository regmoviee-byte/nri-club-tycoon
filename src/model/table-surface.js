import {BUILD_CATALOG} from '../data/build-catalog.js';
export const TABLETOP_HEIGHT=27;
export const SURFACE_ITEMS=Object.freeze({
 dice:{width:.36,depth:.28,height:5},miniatures:{width:.46,depth:.36,height:14},screen:{width:.98,depth:.26,height:19},tablet:{width:.56,depth:.4,height:3},mat:{width:1.36,depth:1.36,height:.35},deskLamp:{width:.64,depth:.5,height:29},
});
const rad=a=>a*Math.PI/180;
export const normalizeAngle=a=>((a%360)+360)%360;
const rotate=(x,y,a)=>({x:x*Math.cos(rad(a))-y*Math.sin(rad(a)),y:x*Math.sin(rad(a))+y*Math.cos(rad(a))});
export function tableSize(t){const s=BUILD_CATALOG[t.kind];return t.rotation%2?{width:s.height,depth:s.width}:{width:s.width,depth:s.height};}
export function surfaceWorld(table,surface){const s=BUILD_CATALOG[table.kind],q=rotate(surface.x-s.width/2,surface.y-s.height/2,table.rotation*90),size=tableSize(table);return {x:table.x+size.width/2+q.x,y:table.y+size.depth/2+q.y,angle:normalizeAngle((surface.angle??0)+table.rotation*90)};}
export function surfaceLocal(table,point,angle=0){const s=BUILD_CATALOG[table.kind],size=tableSize(table),q=rotate(point.x-table.x-size.width/2,point.y-table.y-size.depth/2,-table.rotation*90);return {tableId:table.id,x:Number((q.x+s.width/2).toFixed(6)),y:Number((q.y+s.height/2).toFixed(6)),angle:normalizeAngle(angle-table.rotation*90)};}
export function parentTable(object,layout){return layout.objects.find(t=>BUILD_CATALOG[t.kind]?.family==='table'&&(object.surface?t.id===object.surface.tableId:object.x>=t.x&&object.y>=t.y&&object.x<t.x+tableSize(t).width&&object.y<t.y+tableSize(t).depth));}
export function surfacePose(object,layout){
 const spec=SURFACE_ITEMS[object.kind],table=parentTable(object,layout);if(!spec)return null;
 if(object.surface){const world=table?surfaceWorld(table,object.surface):{x:object.surface.x,y:object.surface.y,angle:object.surface.angle??0};return {...spec,...world,table};}
 let x=object.x+.5,y=object.y+.5;const angle=object.rotation*90;
 if(object.kind==='mat'){x=object.x+1;y=object.y+1;}
 if(object.kind==='screen'){if(object.rotation===0)y=object.y+.2;else if(object.rotation===1)x=object.x+.8;else if(object.rotation===2)y=object.y+.8;else x=object.x+.2;}
 const dimensions={...spec,...(object.kind==='mat'?{width:1.88,depth:1.88}:{})};if(table){const size=tableSize(table),width=object.rotation%2?dimensions.depth:dimensions.width,depth=object.rotation%2?dimensions.width:dimensions.depth;x=Math.max(table.x+.065+width/2,Math.min(table.x+size.width-.065-width/2,x));y=Math.max(table.y+.065+depth/2,Math.min(table.y+size.depth-.065-depth/2,y));}
 return {...dimensions,x,y,angle,table};
}
export function surfacePolygon(pose,padding=0){return [[-pose.width/2-padding,-pose.depth/2-padding],[pose.width/2+padding,-pose.depth/2-padding],[pose.width/2+padding,pose.depth/2+padding],[-pose.width/2-padding,pose.depth/2+padding]].map(([x,y])=>{const p=rotate(x,y,pose.angle);return {x:p.x+pose.x,y:p.y+pose.y};});}
export function polygonsOverlap(a,b,gap=0){
 for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],axis={x:q.y-p.y,y:p.x-q.x},length=Math.hypot(axis.x,axis.y),pa=a.map(v=>(v.x*axis.x+v.y*axis.y)/length),pb=b.map(v=>(v.x*axis.x+v.y*axis.y)/length);if(Math.max(...pa)<=Math.min(...pb)+gap||Math.max(...pb)<=Math.min(...pa)+gap)return false;}return true;
}
export function polygonContains(outer,inner){return inner.every(p=>outer.every((a,i)=>{const b=outer[(i+1)%outer.length];return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)>=-1e-7;}));}
export function surfaceBaseHeight(object,layout){const pose=surfacePose(object,layout);if(!pose||object.kind==='mat')return TABLETOP_HEIGHT+.08;return TABLETOP_HEIGHT+.08+(layout.objects.some(o=>o.kind==='mat'&&o.id!==object.id&&parentTable(o,layout)?.id===pose.table?.id&&polygonContains(surfacePolygon(surfacePose(o,layout)),surfacePolygon(pose))) ? .35 : 0);}
export function surfacePlacementIssue(object,layout){
 const pose=surfacePose(object,layout),table=pose?.table;if(!table)return 'Поставьте настольный предмет на игровой стол.';
 const size=tableSize(table),polygon=surfacePolygon(pose),top=[{x:table.x+.035,y:table.y+.035},{x:table.x+size.width-.035,y:table.y+.035},{x:table.x+size.width-.035,y:table.y+size.depth-.035},{x:table.x+.035,y:table.y+size.depth-.035}];
 if(!polygonContains(top,polygon))return 'Предмет выходит за край столешницы. Передвиньте его или поверните.';
 for(const other of layout.objects){if(other.id===object.id||BUILD_CATALOG[other.kind]?.layer!=='tabletop'||parentTable(other,layout)?.id!==table.id)continue;const otherPolygon=surfacePolygon(surfacePose(other,layout));if(!polygonsOverlap(polygon,otherPolygon))continue;
  if(object.kind==='mat'&&other.kind!=='mat'){if(!polygonContains(polygon,otherPolygon))return 'Край коврика проходит под предметом. Передвиньте коврик или предмет.';continue;}
  if(other.kind==='mat'&&object.kind!=='mat'){if(!polygonContains(otherPolygon,polygon))return 'Предмет должен целиком стоять на коврике или на столешнице.';continue;}
  return 'Предмет пересекается с «'+BUILD_CATALOG[other.kind].name+'». Освободите место.';
 }return null;
}
export function validSurface(surface){return surface&&typeof surface==='object'&&!Array.isArray(surface)&&Object.keys(surface).every(k=>['tableId','x','y','angle'].includes(k))&&typeof surface.tableId==='string'&&surface.tableId.length>0&&surface.tableId.length<=128&&['x','y','angle'].every(k=>Number.isFinite(surface[k]))&&Math.abs(surface.x)<=128&&Math.abs(surface.y)<=128&&surface.angle>=0&&surface.angle<360;}
export function surfaceEditAt(layout,kind,point,angle=0){
 const tables=layout.objects.filter(o=>BUILD_CATALOG[o.kind]?.family==='table').sort((a,b)=>{const s=tableSize(a),t=tableSize(b),inside=(o,size)=>point.x>=o.x&&point.x<=o.x+size.width&&point.y>=o.y&&point.y<=o.y+size.depth;return Number(inside(b,t))-Number(inside(a,s))||Math.hypot(point.x-a.x-s.width/2,point.y-a.y-s.depth/2)-Math.hypot(point.x-b.x-t.width/2,point.y-b.y-t.depth/2);}),table=tables[0];
 return {kind,x:Math.floor(point.x),y:Math.floor(point.y),rotation:Math.floor(normalizeAngle(angle)/90),surface:table?surfaceLocal(table,point,angle):{tableId:'missing-table',x:point.x,y:point.y,angle:normalizeAngle(angle)}};
}
