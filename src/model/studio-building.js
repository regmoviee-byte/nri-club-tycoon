import {tileKey} from './layout.js';
export function rectangle(a,b){
 const minX=Math.floor(Math.min(a.x,b.x)),maxX=Math.floor(Math.max(a.x,b.x)),minY=Math.floor(Math.min(a.y,b.y)),maxY=Math.floor(Math.max(a.y,b.y));
 if((maxX-minX+1)*(maxY-minY+1)>200)return [];
 return Array.from({length:(maxX-minX+1)*(maxY-minY+1)},(_,i)=>({x:minX+i%(maxX-minX+1),y:minY+Math.floor(i/(maxX-minX+1))}));
}
export function nearestEdge(p){
 const x=Math.floor(p.x),y=Math.floor(p.y),u=p.x-x,v=p.y-y,values=[{d:v,x,y,axis:'h'},{d:1-v,x,y:y+1,axis:'h'},{d:u,x,y,axis:'v'},{d:1-u,x:x+1,y,axis:'v'}];
 const {d,...edge}=values.sort((a,b)=>a.d-b.d)[0];return edge;
}
export function roomEdit(layout,cells,{purpose='game',furnished=false}={}){
 if(!cells.length)throw new Error('Нарисуйте комнату на купленной площади.');
 const keys=new Set(cells.map(c=>tileKey(c.x,c.y))),x=Math.min(...cells.map(c=>c.x)),y=Math.min(...cells.map(c=>c.y)),w=Math.max(...cells.map(c=>c.x))-x+1,h=Math.max(...cells.map(c=>c.y))-y+1;
 const number=1+Math.max(0,...layout.rooms.filter(r=>(r.purpose??'game')===purpose).map(r=>r.number)),id=(purpose==='staff'?'staff':'game')+'-studio-'+(layout.revision+1);
 const edits=[{type:'room',id,number,name:purpose==='staff'?'Отдых мастеров '+number:'Игровая '+number,purpose,cells},{type:'floor',cells,finish:'wood'}];
 const boundary=new Map();
 for(const c of cells)for(const [dx,dy,edge]of [[0,-1,{axis:'h',x:c.x,y:c.y}],[0,1,{axis:'h',x:c.x,y:c.y+1}],[-1,0,{axis:'v',x:c.x,y:c.y}],[1,0,{axis:'v',x:c.x+1,y:c.y}]]){
  if(!keys.has(tileKey(c.x+dx,c.y+dy)))boundary.set(edge.axis+':'+edge.x+','+edge.y,edge);
 }
 const door='v:'+x+','+(y+h-1);
 for(const [key,edge]of boundary)edits.push({type:'wall',edge,kind:key===door?'door':'wall'});
 if(furnished){
  if(purpose==='game'&&(w<5||h<5))throw new Error('Для комнаты с готовой мебелью выделите минимум 5×5 клеток. Без комплекта можно строить свободно.');
  if(purpose==='staff'&&(w<2||h<3))throw new Error('Для отдыха с мебелью выделите минимум 2×3 клетки.');
  const objects=purpose==='staff'?[{kind:'staffChair',x:x+w-1,y},{kind:'staffChair',x:x+w-1,y:y+h-1},{kind:'light',x,y:y+1}]:[
   {kind:'table',x:x+1,y:y+1},{kind:'chair',x,y:y+1,role:'guest',seat:0,rotation:1},{kind:'chair',x,y:y+2,role:'guest',seat:1,rotation:1},
   {kind:'chair',x:x+3,y:y+1,role:'guest',seat:2,rotation:3},{kind:'chair',x:x+3,y:y+2,role:'guest',seat:3,rotation:3},
   {kind:'chair',x:x+1,y:y+3,role:'master'},{kind:'light',x:x+2,y:y+2},
  ];
  objects.forEach((o,i)=>edits.push({type:'place',object:{rotation:0,...o,id:id+'-item-'+i,roomId:id}}));
 }
 return {type:'batch',edits};
}
