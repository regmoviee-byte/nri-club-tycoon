import {seatFrame,SEAT_HEIGHT} from './seat-frame.js';
import {personArt} from './people.js';
import {solidArt} from './isometric-solids.js';
import {tube,softBlock,flat} from './model-art.js';
import {chairBaseFaces} from './seat-solids.js';
import {poseFrames} from './table-actions.js';
const paint=(value,fallback)=>/^#[\da-f]{6}$/i.test(value??'')?value:fallback;
const shade=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
const points=ps=>ps.map(p=>p.x+','+p.y).join(' ');
const polygon=(ps,fill)=>'<polygon points="'+points(ps)+'" fill="'+fill+'"/>';
const bodyWidth=shape=>({broad:1.1,lean:.91,soft:1.06,compact:.94})[shape]??1;
const stroke=(ps,color,width)=>'<polyline points="'+points(ps)+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';

export function seatedLegFaces(rotation=0,pants='#40515c',shoes='#303b42'){
 const frame=seatFrame(rotation),faces=[],convert=fs=>fs.map(f=>({...f,points:f.points.map(p=>frame.world(p.x,p.y,p.z))}));
 for(const side of [-1,1]){
  const u=side*.13,name=side<0?'left':'right';
  faces.push(...convert(tube([[u,-.055,16.5],[u,.17,16.6],[u,.395,16.1]],[.067,.072,.064],pants,'thigh-'+name)));
  faces.push(...convert(tube([[u,.405,15.7],[u,.435,11],[u,.445,3.0]],[.051,.052,.041],shade(pants,side<0?-5:3),'calf-'+name)));
  faces.push(...convert(softBlock(u,.52,.2,.145,.235,2.5,shoes,'shoe-'+name,.045)));
  faces.push(...convert([flat([[u-.048,.478,2.72],[u+.048,.478,2.72],[u+.048,.492,2.72],[u-.048,.492,2.72]],shade(shoes,24),'shoe-laces')]));
 }return faces;
}

export function seatedArmFaces(person,{rotation=0,atTable=false,forearmsOnly=false,actionFrame=0,playing=false,master=false,blockedSides=[]}={}){
 const identity=person?.identity??person??{},look=identity.portrait??{},frame=seatFrame(rotation),coat=paint(look.coat,'#6c7e80'),skin=paint(look.skin,'#e3b79e'),accent=paint(look.accent,'#d8cab2'),faces=[];
 const variant=[...(identity.name??person?.profile?.name??person?.name??'Гость')].reduce((n,c)=>n+c.charCodeAt(0),0)%3,size=bodyWidth(look.bodyShape);
 for(const side of [-1,1]){
  const gesture=atTable&&playing&&actionFrame===1&&side===(master?1:variant===1?1:-1)&&!blockedSides.includes(side),tableSide=atTable&&!blockedSides.includes(side)&&(variant===0||side===(variant===1?1:-1)||master);
  if(forearmsOnly&&!tableSide&&!gesture)continue;
  const coordinates=gesture?[[.23,.125,35.8],[.285,.17,33.2],[.31,.25,30],[.27,.34,30.5],[.21,.42,31.4]]:tableSide?[[.23,.125,35.8],[.26,.20,32.9],[.27,.35,29.4],[.235,.46,28.7],[.175,.565,28.9]]:[[.21,.045,35.8],[.25,.095,31.6],[.255,.17,26.5],[.22,.245,23.5],[.17,.30,21.8]],radii=[.074,.072,.058,.047,.036],points=coordinates.map(([u,v,z],i)=>[u*side*(i<2?size:1),v,z]);
  faces.push(...tube(forearmsOnly?points.slice(2):points,forearmsOnly?radii.slice(2):radii,coat,'sleeve-'+side));
  const wrist=points.at(-1),handV=gesture?.45:tableSide?(side>0?.62:.67):.37,handZ=gesture?31.4:tableSide?27.8:20.0,handU=side*(gesture?.20:tableSide?(side>0?.185:.145):.165);
  faces.push(...tube([wrist,[handU,handV-.025,handZ+.9]],[.038,.032],accent,'cuff-'+side));
  faces.push(...softBlock(handU,handV,handZ,.095,.135,1.35,skin,'hand-'+side,.035));
  for(const du of [-.024,0,.024])faces.push(flat([[handU+du-.002,handV+.008,handZ+1.37],[handU+du+.002,handV+.008,handZ+1.37],[handU+du+.002,handV+.046,handZ+1.37],[handU+du-.002,handV+.046,handZ+1.37]],shade(skin,-19),'fingers-'+side));
 }
 return faces.map(f=>({...f,points:f.points.map(p=>frame.world(p.x,p.y,p.z))}));
}

const seatedCache=new Map();
export function seatedPersonArt(person,options={}){
 const identity=person?.identity??person??{},key=JSON.stringify([identity.name??person?.profile?.name,identity.age,identity.portrait,options]);
 if(!seatedCache.has(key)){if(seatedCache.size>320)seatedCache.clear();seatedCache.set(key,renderSeatedPerson(person,options));}return seatedCache.get(key);
}
const torsoProfile=[[16,.17,.12],[18,.195,.14],[23,.185,.135],[29,.225,.155],[34,.25,.15],[36.3,.20,.115],[38,.065,.065]];
function torsoSection(z){let a=torsoProfile[0],b=torsoProfile.at(-1);for(let i=1;i<torsoProfile.length;i++)if(z<=torsoProfile[i][0]){a=torsoProfile[i-1];b=torsoProfile[i];break;}const t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0])));return {rx:a[1]+(b[1]-a[1])*t,ry:a[2]+(b[2]-a[2])*t};}
const torsoLean=(z,atTable)=>.035+(z-36.3)*.005+(atTable?.08:0);
export function seatedTorsoFaces(person,{rotation=0,atTable=false}={}){
 const look=(person?.identity??person??{}).portrait??{},coat=paint(look.coat,'#6c7e80'),frame=seatFrame(rotation),size=bodyWidth(look.bodyShape),height=look.bodyShape==='compact'?.97:1,segments=16;
 const rings=torsoProfile.map(([z,rx,ry])=>Array.from({length:segments},(_,i)=>{const a=i*Math.PI*2/segments;return frame.world(Math.cos(a)*rx*size*1.14,torsoLean(z,atTable)+Math.sin(a)*ry,17+(z-17)*height);})),faces=[flat([...rings[0]].reverse(),shade(coat,-14),'torso-cloth'),flat(rings.at(-1),shade(coat,12),'torso-cloth')];
 for(let k=1;k<rings.length;k++)for(let i=0;i<segments;i++){const j=(i+1)%segments,a=(i+.5)*Math.PI*2/segments,n=frame.world(Math.cos(a),Math.sin(a),0),light=Math.round(-5+18*(n.x*.55-n.y*.7));faces.push(flat([rings[k-1][i],rings[k-1][j],rings[k][j],rings[k][i]],shade(coat,light),'torso-cloth'));}
 return faces.map(face=>({...face,closed:true}));
}
function renderSeatedPerson(person,{rotation=0,kind='chair',width=1,height=1,offsetX=0,offsetY=0,atTable=false,playing=false,master=false,blockedSides=[]}={}){
 const identity=person?.identity??person??{},look=identity.portrait??{},frame=seatFrame(rotation),P=frame.point,coat=paint(look.coat,'#6c7e80'),pants=paint(look.trousers,'#40515c'),shoes=paint(look.shoes,'#303b42'),skin=paint(look.skin,'#e3b79e'),accent=paint(look.accent,'#d8cab2');
 const chair=chairBaseFaces(width,height,kind,rotation).map(f=>({...f,points:f.points.map(p=>({...p,x:p.x+offsetX,y:p.y+offsetY}))})),legs='<g class="seated-legs" data-chair-occlusion="solid-depth">'+solidArt(seatedLegFaces(rotation,pants,shoes),chair)+'</g>';
 const rightNear=frame.right[0]+frame.right[1]>0,nearSide=rightNear?1:-1,armFrames=[0,...(playing&&atTable?[1]:[])].map(actionFrame=>seatedArmFaces(person,{rotation,atTable,playing,master,blockedSides,actionFrame})),arm=side=>poseFrames(actionFrame=>{const faces=armFrames[actionFrame];return '<g class="seated-arm" data-pose="'+(atTable?(master?'explaining':'listening'):'rest')+'" data-blocked-sides="'+blockedSides.join(',')+'">'+solidArt(faces.filter(f=>f.part.endsWith('-'+side)),chair)+'</g>';},{playing:playing&&atTable,person});
 const size=bodyWidth(look.bodyShape),screenRight=P(1,0,0).x>0?1:-1,torsoHeight=look.bodyShape==='compact'?.97:1;
 const T=(u,z)=>{const {rx,ry}=torsoSection(z),x=u*size*1.14*screenRight,depth=ry*Math.sqrt(Math.max(0,1-(u/rx)**2));return P(x,torsoLean(z,atTable)+(frame.backNear?-1:1)*(depth+.004),17+(z-17)*torsoHeight);},p=(u,z)=>{const q=T(u,z);return q.x+' '+q.y;};
 let torso='<g class="seated-torso" data-body-volume="rounded">'+solidArt(seatedTorsoFaces(person,{rotation,atTable}),chair);
 const detail=(d,color=shade(coat,-24),w=.6)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+w+'"/>';
 if(frame.backNear)torso+=detail('M'+p(-.13,34)+'Q'+p(0,35)+' '+p(.13,34))+detail('M'+p(0,32)+'Q'+p(-.02,25)+' '+p(.015,20),shade(coat,-12),.45);
 else{
  torso+='<path d="M'+p(-.07,37)+'Q'+p(0,35)+' '+p(.07,37)+'L'+p(.042,32.8)+'Q'+p(0,32.2)+' '+p(-.042,32.8)+'Z" fill="'+accent+'"/>';
  const outfit=look.outfit??'shirt';
  if(['hoodie','sweater'].includes(outfit)){
   torso+=detail('M'+p(-.08,36.5)+'Q'+p(0,31.5)+' '+p(.08,36.5),shade(coat,-27),1.2);
   if(outfit==='hoodie')torso+=detail('M'+p(-.055,32)+'L'+p(-.06,27)+'M'+p(.055,32)+'L'+p(.06,27),accent,.6)+detail('M'+p(-.10,23)+'Q'+p(0,20)+' '+p(.10,23));
  }else{
   torso+='<path d="M'+p(-.073,37.3)+'L'+p(-.11,34.5)+' '+p(-.035,32.8)+' '+p(0,35.4)+' '+p(.035,32.8)+' '+p(.11,34.5)+' '+p(.073,37.3)+' '+p(0,35.4)+'Z" fill="'+shade(accent,12)+'"/>';
   torso+=detail('M'+p(0,32)+'Q'+p(-.015,25)+' '+p(0,18.5),shade(coat,-20),.55);
   for(const z of [29,25.5,22]){const b=T(.023,z);torso+='<circle cx="'+b.x+'" cy="'+b.y+'" r=".47" fill="'+accent+'"/>';}
   torso+=detail('M'+p(.065,29)+'Q'+p(.12,28.5)+' '+p(.15,29)+'L'+p(.14,26.3)+'Q'+p(.10,25.7)+' '+p(.065,26.3));
  }
 }
 torso+=detail('M'+p(-.12,19)+'Q'+p(-.05,20)+' '+p(-.01,18.5)+'M'+p(.04,20)+'Q'+p(.10,21)+' '+p(.13,20),shade(coat,-16),.45)+'</g>';
 const neck=stroke([P(0,.035+(atTable?.08:0),36.3),P(0,.075+(atTable?.08:0),42.1)],skin,4.3),head=P(0,.075+(atTable?.08:0),49.1);
 const headLayer=layer=>'<g class="'+(layer==='back'?'seated-hair-back':'seated-head')+'" data-head-view="'+(frame.backNear?'back':'three-quarter')+'" transform="translate('+head.x+' '+head.y+') scale('+(frame.headMirror*.67)+' .67)">'+personArt(person,{seated:true,headOnly:true,headLayer:layer,back:frame.backNear,yaw:1})+'</g>';
 const rear=headLayer('back');
 return '<g class="seated-miniature" data-seat-facing="'+frame.direction+'" data-seated-pose="'+(atTable?'table':'rest')+'" stroke-linecap="round" stroke-linejoin="round">'+legs+(!frame.backNear?rear:'')+arm(-nearSide)+torso+neck+(frame.backNear?rear:'')+arm(nearSide)+headLayer('front')+'</g>';
}
