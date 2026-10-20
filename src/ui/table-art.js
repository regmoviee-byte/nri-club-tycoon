import {surfacePose,parentTable,surfaceBaseHeight,TABLETOP_HEIGHT} from '../model/table-surface.js';
import {block,cylinder,flat,disk,tapered,lineOnTop,transformFaces,shade} from './model-art.js';
import {visibleSolidFaces,solidArt} from './isometric-solids.js';
import {escapeHTML as esc} from './people.js';

export function tableFaces(table){
 const comfort=table.kind==='tableComfort',wood=comfort?'#8b6650':'#b58b60',w=2,d=2,faces=[];
 for(const x of [-.81,.81])for(const y of [-.81,.81]){faces.push(...tapered(x,y,.5,.085,.085,.12,.12,24,comfort?'#3f5152':'#785943','table-leg'));faces.push(...block(x,y,0,.09,.09,.8,'#4c4b42','table-foot'));}
 for(const y of [-.8,.8])faces.push(...block(0,y,21.5,1.6,.065,3.2,wood,'table-rail'));
 for(const x of [-.8,.8])faces.push(...block(x,0,21.5,.065,1.6,3.2,wood,'table-rail'));
 faces.push(...block(0,0,24.1,w-.035,d-.035,2.1,wood,'table-edge'));
 faces.push(...tapered(0,0,26.2,w-.035,d-.035,w-.09,d-.09,.8,comfort?'#d0ab75':'#d3ad79','tabletop'));
 if(comfort){faces.push(flat([[-.88,-.88,27.02],[.88,-.88,27.02],[.88,.88,27.02],[-.88,.88,27.02]],'#718b7c','table-inlay'));for(const y of [-.9,.9])faces.push(lineOnTop([-.9,y],[.9,y],.012,27.03,'#e6c78f','table-trim'));for(const x of [-.9,.9])faces.push(lineOnTop([x,-.9],[x,.9],.012,27.03,'#e6c78f','table-trim'));}
 else for(const [x,y,length]of [[-.56,-.5,.65],[-.2,.23,.9],[.48,-.1,.42],[-.35,.66,.4]])faces.push(lineOnTop([x-length/2,y],[x+length/2,y+.012],.006,27.015,'#c29a68','wood-grain'));
 return transformFaces(faces,{x:table.x+1,y:table.y+1,angle:table.rotation*90});
}

export function tabletopFaces(object,layout){
 const pose=surfacePose(object,layout);if(!pose)return [];const faces=[],part=object.kind,base=surfaceBaseHeight(object,layout),add=(...fs)=>faces.push(...fs);
 if(object.kind==='mat'){
  add(...block(0,0,0,pose.width,pose.depth,.28,'#53766c',part));const a=pose.width/2-.04,b=pose.depth/2-.04;
  for(const y of [-b,b])add(lineOnTop([-a,y],[a,y],.011,.32,'#c0c5a0','mat-binding'));for(const x of [-a,a])add(lineOnTop([x,-b],[x,b],.011,.32,'#c0c5a0','mat-binding'));
  const coast=[[-.45,.19],[-.25,.06],[-.33,-.18],[-.1,-.33],[.08,-.24],[.16,-.38],[.4,-.19],[.29,.04],[.43,.19]];for(let i=1;i<coast.length;i++)add(lineOnTop(coast[i-1],coast[i],.009,.33,'#77978a','mat-map'));
  add(lineOnTop([.34,.32],[.34,.49],.008,.33,'#aab99b','mat-compass'),lineOnTop([.26,.405],[.42,.405],.008,.33,'#aab99b','mat-compass'));
 }else if(object.kind==='dice'){
  for(const [x,y,size,color,spots]of [[-.075,-.025,.16,'#b95c4c',3],[.105,.055,.125,'#dfc992',1]]){
   add(...block(x,y,0,size,size,size*30,color,part));for(const [u,v]of spots===3?[[-.035,-.035],[0,0],[.035,.035]]:[[0,0]])add(disk(x+u,y+v,size*30+.015,.012,.012,'#fff3d6','dice-pip',8));
   for(const z of [1.3,3])add(flat([[x+size/2+.002,y-.012,z-.4],[x+size/2+.002,y+.012,z-.4],[x+size/2+.002,y+.012,z+.4],[x+size/2+.002,y-.012,z+.4]],'#eadfbd','dice-pip'));
  }
 }else if(object.kind==='tablet'){
  add(...tapered(0,0,0,.54,.38,.56,.4,1.2,'#344449',part),...block(0,0,1.2,.54,.38,1,'#40575c',part));add(flat([[-.235,-.16,2.22],[.235,-.16,2.22],[.235,.12,2.22],[-.235,.12,2.22]],'#9cbfb0','tablet-screen'));
  for(let i=0;i<4;i++)add(lineOnTop([-.17,-.1+i*.05],[.12-(i%2)*.07,-.1+i*.05],.008,2.23,'#547c73','tablet-rules'));add(disk(0,.155,2.23,.018,.018,'#acb9b1','tablet-button'));
 }else if(object.kind==='screen'){
  for(const [a,b]of [[[-.235,0],[.235,0]],[[-.47,.105],[-.235,0]],[[.235,0],[.47,.105]]]){
   const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI,cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
   const panel=block(0,0,0,len,.026,19,'#526c62',part);panel.push(...block(0,0,18.5,len,.035,.65,'#c9ac73','screen-binding'));
   for(const z of [4,8,12,15])panel.push(flat([[-len*.38,.014,z],[-len*.38,.014,z+.3],[len*.35,.014,z+.3],[len*.35,.014,z]],'#c6c7a4','screen-notes'));
   for(const z of [5,10,15])panel.push(flat([[-.055,-.014,z],[0,-.014,z+1.6],[.055,-.014,z],[0,-.014,z-1.6]],'#c4a967','screen-emblem'));
   add(...transformFaces(panel,{x:cx,y:cy,angle}));
  }
 }else if(object.kind==='miniatures'){
  for(const [x,y,color,helmet]of [[-.12,-.055,'#906b79',false],[.12,.07,'#607c79',true]]){
   add(...cylinder(x,y,0,.075,.075,1.1,'#5e6252',10,part),...cylinder(x,y,1.1,.062,.028,6,color,8,part),...block(x,y,6.1,.05,.05,3,color,part),...cylinder(x,y,9.1,.037,.032,3,'#d1ad86',8,part));
   add(flat([[x-.047,y+.025,7.5],[x+.047,y+.025,7.5],[x+.07,y+.06,1.8],[x-.07,y+.06,1.8]],shade(color,-15),'miniature-cloak'));
   if(helmet)add(...cylinder(x,y,11.2,.042,.029,1.7,'#9aa8a1',8,'miniature-helmet'));else add(...cylinder(x+.065,y-.015,1.1,.008,.008,12,'#b7ac8c',6,'miniature-staff'));
  }
 }else if(object.kind==='deskLamp'){
  add(...cylinder(0,0,0,.145,.14,1.4,'#47675f',16,part),...cylinder(0,0,1.4,.025,.025,17,'#b99b68',8,part));
  add(...transformFaces(block(0,0,17,.18,.045,1.3,'#b99b68',part),{x:.055}));
  add(...cylinder(.09,0,18.3,.22,.105,9.2,'#e1c98d',16,part),disk(.09,0,18.25,.2,.2,'#f5e4ad','lamp-diffuser',16),...cylinder(.09,0,27.5,.055,.035,1.1,'#b59a66',10,part),disk(-.07,.05,1.45,.018,.018,'#d0b478','lamp-switch'));
 }
 return transformFaces(faces,{x:pose.x,y:pose.y,z:base,angle:pose.angle});
}
export function tableSceneFaces(table,layout){const faces=tableFaces(table).map(f=>({...f,owner:table.id}));for(const object of layout.objects.filter(o=>parentTable(o,layout)?.id===table.id))faces.push(...tabletopFaces(object,layout).map(f=>({...f,owner:object.id})));return faces;}
export function tableSceneGroups(table,layout,{selectedId=null,movingId=null}={}){
 const faces=tableSceneFaces(table,layout),visible=visibleSolidFaces(faces),groups=new Map();for(const f of visible){const id=f.owner;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(f);}
 return [...groups].map(([id,fs])=>{const object=id===table.id?table:layout.objects.find(o=>o.id===id),paths=new Map();for(const f of fs){const k=f.fill+f.part;if(!paths.has(k))paths.set(k,{fill:f.fill,part:f.part,d:[]});paths.get(k).d.push('M'+f.points.map(p=>p.x.toFixed(5)+','+p.y.toFixed(5)).join('L')+'Z');}const art=[...paths.values()].map(p=>'<path data-model-part="'+esc(p.part)+'" d="'+p.d.join('')+'" fill="'+p.fill+'" shape-rendering="crispEdges"/>').join(''),pose=object===table?{x:table.x+1,y:table.y+1}:surfacePose(object,layout);return {id,depth:pose.x+pose.y,art:'<g data-object="'+esc(id)+'" class="world-object '+(id===selectedId?'selected':'')+'" opacity="'+(id===movingId?.25:1)+'">'+art+'</g>'};});
}
export function standaloneTabletopArt(object,layout,{ghost=false}={}){const own=tabletopFaces(object,layout),table=parentTable(object,layout),occluders=table?tableSceneFaces(table,{...layout,objects:layout.objects.filter(o=>o.id!==object.id)}):[];return '<g data-object="'+esc(object.id??'preview')+'" class="world-object" opacity="'+(ghost?.65:1)+'">'+solidArt(own,occluders)+'</g>';}
