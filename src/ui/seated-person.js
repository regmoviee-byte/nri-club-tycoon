import {seatFrame,SEAT_HEIGHT} from './seat-frame.js';
import {personArt} from './people.js';
import {prismFaces,solidArt} from './isometric-solids.js';
import {chairBaseFaces} from './seat-solids.js';
const paint=(value,fallback)=>/^#[\da-f]{6}$/i.test(value??'')?value:fallback;
const shade=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
const points=ps=>ps.map(p=>p.x+','+p.y).join(' ');
const polygon=(ps,fill)=>'<polygon points="'+points(ps)+'" fill="'+fill+'"/>';
const stroke=(ps,color,width)=>'<polyline points="'+points(ps)+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';

export function seatedLegFaces(rotation=0,pants='#40515c',shoes='#303b42'){
 const frame=seatFrame(rotation),faces=[];
 const prism=(coords,colors,part)=>faces.push(...prismFaces(coords.map(v=>frame.world(...v)),colors,part));
 for(const side of [-1,1]){
  const u=side*.115,name=side<0?'left':'right',legColors=[shade(pants,-20),shade(pants,-12),pants,shade(pants,-8),shade(pants,-18),shade(pants,8)];
  // Both ends of the thigh remain above the seat. The calf starts beyond
  // the seat's front edge, so its bend cannot pass through the solid seat.
  prism([[u-.065,-.045,SEAT_HEIGHT+.3],[u+.065,-.045,SEAT_HEIGHT+.3],[u+.065,.405,SEAT_HEIGHT+.3],[u-.065,.405,SEAT_HEIGHT+.3],[u-.065,-.045,SEAT_HEIGHT+6.3],[u+.065,-.045,SEAT_HEIGHT+6.3],[u+.065,.405,SEAT_HEIGHT+5.8],[u-.065,.405,SEAT_HEIGHT+5.8]],legColors,'thigh-'+name);
  prism([[u-.055,.37,1.6],[u+.055,.37,1.6],[u+.055,.49,1.6],[u-.055,.49,1.6],[u-.055,.345,16.1],[u+.055,.345,16.1],[u+.055,.465,16.1],[u-.055,.465,16.1]],legColors,'calf-'+name);
  prism([[u-.065,.39,.3],[u+.065,.39,.3],[u+.065,.61,.3],[u-.065,.61,.3],[u-.065,.39,2.5],[u+.065,.39,2.5],[u+.065,.61,2.5],[u-.065,.61,2.5]],[shoes,shade(shoes,-9),shoes,shoes,shade(shoes,-7),shade(shoes,11)],'shoe-'+name);
 }return faces;
}

export function seatedPersonArt(person,{rotation=0,kind='chair',width=1,height=1,offsetX=0,offsetY=0}={}){
 const identity=person?.identity??person??{},look=identity.portrait??{},frame=seatFrame(rotation),P=frame.point,coat=paint(look.coat,'#6c7e80'),pants=paint(look.trousers,'#40515c'),shoes=paint(look.shoes,'#303b42'),skin=paint(look.skin,'#e3b79e'),accent=paint(look.accent,'#d8cab2');
 const rightNear=frame.right[0]+frame.right[1]>0,nearSide=rightNear?1:-1,chair=chairBaseFaces(width,height,kind,rotation).map(f=>({...f,points:f.points.map(p=>({...p,x:p.x+offsetX,y:p.y+offsetY}))})),legs='<g class="seated-legs" data-chair-occlusion="solid-depth">'+solidArt(seatedLegFaces(rotation,pants,shoes),chair)+'</g>';
 const arm=side=>{
  const shoulder=P(side*.215,-.015,36),elbow=P(side*.265,.15,26),wrist=P(side*.185,.29,24.5),hand=P(side*.145,.34,24.5);
  return '<g class="seated-arm">'+stroke([shoulder,elbow,wrist],side===nearSide?coat:shade(coat,-18),5.6)+stroke([wrist,hand],skin,3.1)+'</g>';
 };
 const frontTop=[P(-.205,.08,36),P(.205,.08,36)],backTop=[P(-.205,-.13,36),P(.205,-.13,36)],frontHip=[P(-.16,.11,18),P(.16,.11,18)],backHip=[P(-.16,-.15,18),P(.16,-.15,18)];
 const sideFace=rightNear?[backTop[1],frontTop[1],frontHip[1],backHip[1]]:[frontTop[0],backTop[0],backHip[0],frontHip[0]];
 const bodyFace=frame.backNear?[backTop[1],backTop[0],backHip[0],backHip[1]]:[frontTop[0],frontTop[1],frontHip[1],frontHip[0]];
 let torso=polygon(sideFace,shade(coat,-22))+polygon(bodyFace,frame.backNear?shade(coat,-6):coat)+polygon([backTop[0],backTop[1],frontTop[1],frontTop[0]],shade(coat,12));
 if(frame.backNear)torso+=stroke([P(0,-.151,19),P(0,-.135,34)],shade(coat,-22),.6);
 else{
  torso+=polygon([P(-.065,.084,36.3),P(0,.105,31),P(.065,.084,36.3)],accent)+stroke([P(0,.112,30),P(0,.112,19)],shade(coat,-25),.7);
  for(const z of [27,23,20]){const b=P(.025,.116,z);torso+='<circle cx="'+b.x+'" cy="'+b.y+'" r=".5" fill="'+accent+'"/>';}
 }
 const neck=stroke([P(0,-.025,35.8),P(0,-.025,42.5)],skin,4.3),head=P(0,-.025,49.5);
 const headLayer=layer=>'<g class="'+(layer==='back'?'seated-hair-back':'seated-head')+'" data-head-view="'+(frame.backNear?'back':'three-quarter')+'" transform="translate('+head.x+' '+head.y+') scale('+(frame.headMirror*.67)+' .67)">'+personArt(person,{seated:true,headOnly:true,headLayer:layer,back:frame.backNear,yaw:1})+'</g>';
 // Rear hair sits behind the collar when facing us and over the back when
 // facing away. The neck and face keep their own connected silhouette.
 const rear=headLayer('back');
 return '<g class="seated-miniature" data-seat-facing="'+frame.direction+'" stroke-linecap="round" stroke-linejoin="round">'+legs+(!frame.backNear?rear:'')+arm(-nearSide)+torso+neck+(frame.backNear?rear:'')+arm(nearSide)+headLayer('front')+'</g>';
}
