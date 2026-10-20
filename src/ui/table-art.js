import {surfacePose,parentTable,surfaceBaseHeight,TABLETOP_HEIGHT} from '../model/table-surface.js';
import {block,cylinder,flat,disk,tapered,lineOnTop,transformFaces,shade,softBlock,roundedSlab,lathe} from './model-art.js';
import {visibleSolidFaces,solidArt} from './isometric-solids.js';
import {escapeHTML as esc} from './people.js';

export function tableFaces(table){
 const comfort=table.kind==='tableComfort',wood=comfort?'#865b42':'#a8774e',top=comfort?'#bf9965':'#cda573',faces=[];
 for(const x of [-.79,.79])for(const y of [-.79,.79]){
  faces.push(...cylinder(x,y,.6,.048,.065,2.6,'#514f42',16,'table-foot'),...cylinder(x,y,3.2,.055,.07,17.4,comfort?'#475e58':'#886344',16,'turned-table-leg'),...cylinder(x,y,20.6,.07,.09,3.9,wood,16,'leg-collar'));
 }
 for(const y of [-.79,.79])faces.push(...softBlock(0,y,22.1,1.58,.075,2.2,wood,'joinery-rail',.025));
 for(const x of [-.79,.79])faces.push(...softBlock(x,0,22.1,.075,1.58,2.2,wood,'joinery-rail',.025));
 faces.push(...softBlock(0,0,24.3,1.96,1.96,1.2,shade(wood,-10),'lower-table-moulding',.14));
 faces.push(...softBlock(0,0,25.5,1.99,1.99,1.5,top,'rounded-tabletop',.15));
 const inset=comfort?.79:.90;
 if(comfort){
  faces.push(...roundedSlab(1.62,1.62,27.005,.025,.10,'#4f7667','padded-playing-surface'));
  const rim=roundedSlab(1.70,1.70,27.008,.012,.12,'#dfbd7c','brass-inlay');faces.push(...rim.filter(f=>f.points.every(p=>p.z>27.01)));
  faces.push(...roundedSlab(1.64,1.64,27.025,.015,.10,'#527b6b','felt'));
  for(const x of [-.84,.84])for(const y of [-.84,.84]){faces.push(disk(x,y,27.04,.075,.075,'#a6804d','cupholder-rim',20),disk(x,y,27.048,.057,.057,'#3e5148','cupholder-well',20));}
  for(const y of [-.73,.73])faces.push(lineOnTop([-.65,y],[.65,y],.004,27.047,'#638c79','felt-stitch'));
 }else{
  faces.push(...roundedSlab(1.87,1.87,27.004,.012,.11,'#a77f51','hardwood-inlay'),...roundedSlab(1.845,1.845,27.018,.012,.10,'#cda573','joined-wood-panel'));
  for(const x of [-.46,0,.46])faces.push(lineOnTop([x,-.90],[x,.90],.003,27.039,'#bf9767','plank-joint'));
  for(let row=0;row<9;row++){const x=-.75+row*.18,y=-.65+(row%3)*.43;for(let step=0;step<4;step++){const v=y+step*.10,u=x+Math.sin(step*.8+row)*.012;faces.push(lineOnTop([u,v],[x+Math.sin((step+1)*.8+row)*.012,v+.095],.0025,27.043,'#c19868','wood-grain'));}}
 }
 // Mitred border and joinery remain visible around freely placed accessories.
 for(const x of [-inset,inset])for(const y of [-inset,inset])faces.push(lineOnTop([x*.95,y],[x,y*.95],.004,27.05,shade(top,-22),'mitred-corner'));
 return transformFaces(faces,{x:table.x+1,y:table.y+1,angle:table.rotation*90});
}

export function tabletopFaces(object,layout){
 const pose=surfacePose(object,layout);if(!pose)return [];const faces=[],part=object.kind,base=surfaceBaseHeight(object,layout),add=(...fs)=>faces.push(...fs);
 if(object.kind==='mat'){
  add(...softBlock(0,0,0,pose.width,pose.depth,.28,'#53766c',part));const a=pose.width/2-.04,b=pose.depth/2-.04;
  for(const y of [-b,b])add(lineOnTop([-a,y],[a,y],.011,.32,'#c0c5a0','mat-binding'));for(const x of [-a,a])add(lineOnTop([x,-b],[x,b],.011,.32,'#c0c5a0','mat-binding'));
  const coast=[[-.45,.19],[-.25,.06],[-.33,-.18],[-.1,-.33],[.08,-.24],[.16,-.38],[.4,-.19],[.29,.04],[.43,.19]];for(let i=1;i<coast.length;i++)add(lineOnTop(coast[i-1],coast[i],.009,.33,'#77978a','mat-map'));
  add(lineOnTop([.34,.32],[.34,.49],.008,.33,'#aab99b','mat-compass'),lineOnTop([.26,.405],[.42,.405],.008,.33,'#aab99b','mat-compass'));
 }else if(object.kind==='dice'){
  for(const [x,y,size,color,spots]of [[-.075,-.025,.16,'#b95c4c',3],[.105,.055,.125,'#dfc992',1]]){
   add(...softBlock(x,y,0,size,size,size*30,color,part,.025));for(const [u,v]of spots===3?[[-.035,-.035],[0,0],[.035,.035]]:[[0,0]])add(disk(x+u,y+v,size*30+.015,.012,.012,'#fff3d6','dice-pip',8));
   for(const z of [1.3,3])add(flat([[x+size/2+.002,y-.012,z-.4],[x+size/2+.002,y+.012,z-.4],[x+size/2+.002,y+.012,z+.4],[x+size/2+.002,y-.012,z+.4]],'#eadfbd','dice-pip'));
  }
 }else if(object.kind==='tablet'){
  add(...tapered(0,0,0,.54,.38,.56,.4,1.2,'#344449',part),...softBlock(0,0,1.2,.54,.38,1,'#40575c',part,.035));add(flat([[-.235,-.16,2.22],[.235,-.16,2.22],[.235,.12,2.22],[-.235,.12,2.22]],'#9cbfb0','tablet-screen'));
  for(let i=0;i<4;i++)add(lineOnTop([-.17,-.1+i*.05],[.12-(i%2)*.07,-.1+i*.05],.008,2.23,'#547c73','tablet-rules'));add(disk(0,.155,2.23,.018,.018,'#acb9b1','tablet-button'));
 }else if(object.kind==='screen'){
  for(const [a,b]of [[[-.235,0],[.235,0]],[[-.47,.105],[-.235,0]],[[.235,0],[.47,.105]]]){
   const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI,cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
   const panel=softBlock(0,0,0,len,.026,19,'#526c62',part);panel.push(...softBlock(0,0,18.5,len,.035,.65,'#c9ac73','screen-binding'));
   for(const z of [4,8,12,15])panel.push(flat([[-len*.38,.014,z],[-len*.38,.014,z+.3],[len*.35,.014,z+.3],[len*.35,.014,z]],'#c6c7a4','screen-notes'));
   for(const z of [5,10,15])panel.push(flat([[-.055,-.014,z],[0,-.014,z+1.6],[.055,-.014,z],[0,-.014,z-1.6]],'#c4a967','screen-emblem'));
   add(...transformFaces(panel,{x:cx,y:cy,angle}));add(...cylinder(b[0],b[1],.4,.010,.010,17.7,'#b89c6b',16,'screen-hinge'));
  }
 }else if(object.kind==='miniatures'){
  for(const [x,y,color,helmet]of [[-.12,-.055,'#906b79',false],[.12,.07,'#607c79',true]]){
   add(...cylinder(x,y,0,.075,.075,1.1,'#5e6252',10,part),...cylinder(x,y,1.1,.062,.028,6,color,8,part),...block(x,y,6.1,.05,.05,3,color,part),...lathe(x,y,9.1,[[.020,0],[.035,.5],[.037,1.8],[.025,2.8],[.012,3]],'#d1ad86',part,16));
   add(flat([[x-.047,y+.025,7.5],[x+.047,y+.025,7.5],[x+.07,y+.06,1.8],[x-.07,y+.06,1.8]],shade(color,-15),'miniature-cloak'));
   if(helmet)add(...cylinder(x,y,11.2,.042,.029,1.7,'#9aa8a1',8,'miniature-helmet'));else{add(...cylinder(x+.065,y-.015,1.1,.008,.008,12,'#b7ac8c',16,'miniature-staff'),...cylinder(x+.065,y-.015,13.1,.019,.010,.6,'#adb8ba',16,'staff-crystal'));}
  }
 }else if(object.kind==='deskLamp'){
  add(...cylinder(0,0,0,.145,.14,1.4,'#47675f',16,part),...cylinder(0,0,1.4,.025,.025,17,'#b99b68',8,part));
  add(...transformFaces(softBlock(0,0,17,.18,.045,1.3,'#b99b68',part),{x:.055}));
  add(...lathe(.09,0,18.3,[[.22,0],[.223,.7],[.207,2],[.163,5],[.115,8],[.105,9.2]],'#e1c98d',part),disk(.09,0,18.25,.2,.2,'#f5e4ad','lamp-diffuser',16),...cylinder(.09,0,27.5,.055,.035,1.1,'#b59a66',10,part),disk(-.07,.05,1.45,.018,.018,'#d0b478','lamp-switch'));
 }
 return transformFaces(faces,{x:pose.x,y:pose.y,z:base,angle:pose.angle});
}
export function tableSceneFaces(table,layout){const faces=tableFaces(table).map(f=>({...f,owner:table.id}));for(const object of layout.objects.filter(o=>parentTable(o,layout)?.id===table.id))faces.push(...tabletopFaces(object,layout).map(f=>({...f,owner:object.id})));return faces;}
export function tableSceneGroups(table,layout,{selectedId=null,movingId=null}={}){
 const faces=tableSceneFaces(table,layout),visible=visibleSolidFaces(faces),groups=new Map();for(const f of visible){const id=f.owner;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(f);}
 return [...groups].map(([id,fs])=>{const object=id===table.id?table:layout.objects.find(o=>o.id===id),paths=new Map();for(const f of fs){const k=f.fill+f.part;if(!paths.has(k))paths.set(k,{fill:f.fill,part:f.part,d:[]});paths.get(k).d.push('M'+f.points.map(p=>p.x.toFixed(5)+','+p.y.toFixed(5)).join('L')+'Z');}const art=[...paths.values()].map(p=>'<path data-model-part="'+esc(p.part)+'" d="'+p.d.join('')+'" fill="'+p.fill+'" shape-rendering="geometricPrecision" stroke="'+p.fill+'" stroke-width=".18" stroke-linejoin="round"/>').join(''),pose=object===table?{x:table.x+1,y:table.y+1}:surfacePose(object,layout);return {id,depth:pose.x+pose.y,art:'<g data-object="'+esc(id)+'" class="world-object '+(id===selectedId?'selected':'')+'" opacity="'+(id===movingId?.25:1)+'">'+art+'</g>'};});
}
export function standaloneTabletopArt(object,layout,{ghost=false}={}){const own=tabletopFaces(object,layout),table=parentTable(object,layout),occluders=table?tableSceneFaces(table,{...layout,objects:layout.objects.filter(o=>o.id!==object.id)}):[];return '<g data-object="'+esc(object.id??'preview')+'" class="world-object" opacity="'+(ghost?.65:1)+'">'+solidArt(own,occluders)+'</g>';}
