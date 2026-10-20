import {seatFrame,SEAT_HEIGHT} from './seat-frame.js';
import {personArt} from './people.js';
const paint=(value,fallback)=>/^#[\da-f]{6}$/i.test(value??'')?value:fallback;
const shade=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
const points=ps=>ps.map(p=>p.x+','+p.y).join(' ');
const polygon=(ps,fill)=>'<polygon points="'+points(ps)+'" fill="'+fill+'"/>';
const stroke=(ps,color,width)=>'<polyline points="'+points(ps)+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';

export function seatedPersonArt(person,{rotation=0}={}){
 const identity=person?.identity??person??{},look=identity.portrait??{},frame=seatFrame(rotation),P=frame.point,coat=paint(look.coat,'#6c7e80'),pants=paint(look.trousers,'#40515c'),shoes=paint(look.shoes,'#303b42'),skin=paint(look.skin,'#e3b79e'),accent=paint(look.accent,'#d8cab2');
 const rightNear=frame.right[0]+frame.right[1]>0,nearSide=rightNear?1:-1,leg=side=>{
  const u=side*.115,hip=P(u,-.045,SEAT_HEIGHT+3.2),knee=P(u,.405,SEAT_HEIGHT+1),ankle=P(u,.43,2.1),front=side===nearSide;
  const top=[P(u-.065,.39,2.1),P(u+.065,.39,2.1),P(u+.065,.61,2.1),P(u-.065,.61,2.1)],bottom=[P(u-.065,.39,.3),P(u+.065,.39,.3),P(u+.065,.61,.3),P(u-.065,.61,.3)];
  return '<g class="seated-leg" data-leg="'+(side<0?'left':'right')+'">'+stroke([hip,knee],front?pants:shade(pants,-13),6.1)+stroke([knee,ankle],front?shade(pants,3):shade(pants,-16),5.1)+polygon([top[1],top[2],bottom[2],bottom[1]],shade(shoes,-7))+polygon([top[2],top[3],bottom[3],bottom[2]],shoes)+polygon(top,shade(shoes,11))+'</g>';
 };
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
 const headArt='<g class="seated-head" data-head-view="'+(frame.backNear?'back':'three-quarter')+'" transform="translate('+head.x+' '+head.y+') scale('+(frame.headMirror*.67)+' .67)">'+personArt(person,{seated:true,headOnly:true,back:frame.backNear,yaw:1})+'</g>';
 return '<g class="seated-miniature" data-seat-facing="'+frame.direction+'" stroke-linecap="round" stroke-linejoin="round"><ellipse cy="1" rx="13" ry="5" fill="#243b38" opacity=".12"/>'+leg(-nearSide)+leg(nearSide)+arm(-nearSide)+torso+neck+arm(nearSide)+headArt+'</g>';
}
