import {gripPoint} from './drag-geometry.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const safeScale=(scale,fallback=.148)=>Number.isFinite(scale)&&scale>0?clamp(scale,.0001,8):fallback;
const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
export function standingPose(build=1){return{root:{x:0,y:0},neck:{x:0,y:-23},head:{x:0,y:-92},shoulderL:{x:-65*build,y:-10},shoulderR:{x:65*build,y:-10},hipL:{x:-38*build,y:150},hipR:{x:38*build,y:150},elbowL:{x:-88*build,y:88},elbowR:{x:88*build,y:88},wristL:{x:-97*build,y:181},wristR:{x:97*build,y:181},kneeL:{x:-42*build,y:285},kneeR:{x:42*build,y:285},ankleL:{x:-46*build,y:420},ankleR:{x:46*build,y:420},angle:0,headAngle:0};}
export function seatedPose(build=1){const p=standingPose(build);Object.assign(p,{elbowL:{x:-99*build,y:82},elbowR:{x:99*build,y:82},wristL:{x:-52*build,y:145},wristR:{x:52*build,y:145},kneeL:{x:-63*build,y:217},kneeR:{x:63*build,y:217},ankleL:{x:-68*build,y:310},ankleR:{x:68*build,y:310}});return p;}
const chains=[['shoulderL','elbowL','wristL'],['shoulderR','elbowR','wristR'],['hipL','kneeL','ankleL'],['hipR','kneeR','ankleR']];
export function createPuppet(x,y,{scale=.6,build=1}={}){
  scale=safeScale(scale);
  const p=standingPose(build),nodes={};
  for(const [,b,c]of chains)for(const key of [b,c])nodes[key]={x:x+p[key].x*scale,y:y+p[key].y*scale,px:x+p[key].x*scale,py:y+p[key].y*scale};
  return{x,y,scale,build,nodes,angle:0,omega:0,headAngle:0,lastX:x,lastY:y,lastH:1/120,energy:0,lengths:chains.map(([a,b,c])=>[Math.hypot(p[b].x-p[a].x,p[b].y-p[a].y),Math.hypot(p[c].x-p[b].x,p[c].y-p[b].y)])};
}
function core(r){const p=standingPose(r.build),result={};for(const key of ['root','neck','head','shoulderL','shoulderR','hipL','hipR']){const q=rotate(p[key].x,p[key].y,r.angle);result[key]={x:r.x+q.x*r.scale,y:r.y+q.y*r.scale};}return result;}
function project(node,anchor,length){let dx=node.x-anchor.x,dy=node.y-anchor.y,d=Math.hypot(dx,dy);if(d<1e-8){dx=0;dy=1;d=1;}node.x=anchor.x+dx/d*length;node.y=anchor.y+dy/d*length;}
export function resizePuppet(r,scale){scale=safeScale(scale,r.scale);const ratio=scale/r.scale;for(const p of Object.values(r.nodes)){p.x=r.x+(p.x-r.x)*ratio;p.y=r.y+(p.y-r.y)*ratio;p.px=r.x+(p.px-r.x)*ratio;p.py=r.y+(p.py-r.y)*ratio;}r.scale=scale;}
function translatePuppet(r,dx,dy){r.x+=dx;r.y+=dy;for(const p of Object.values(r.nodes)){p.x+=dx;p.px+=dx;p.y+=dy;p.py+=dy;}}
export function pinPuppet(r,point,grip){const local=gripPoint(puppetPose(r),grip);translatePuppet(r,point.x-r.x-local.x*r.scale,point.y-r.y-local.y*r.scale);r.pointer={x:point.x,y:point.y};return r;}

// Equal-mass distance constraints move the two free nodes only by their actual
// length error. A valid bent limb is already a solution: no hidden straightening.
export function solveLimb(anchor,joint,tip,upper,lower){
  for(let i=0;i<8;i++){
    project(joint,anchor,upper);
    const dx=tip.x-joint.x,dy=tip.y-joint.y,distance=Math.hypot(dx,dy);
    if(distance>1e-8){
      const correction=(distance-lower)/distance*.5;
      joint.x+=dx*correction;joint.y+=dy*correction;
      tip.x-=dx*correction;tip.y-=dy*correction;
    }
  }
  // Finish with exact lengths even after a large cursor jump.
  project(joint,anchor,upper);project(tip,joint,lower);
}

export function stepPuppet(r,target,dt){
  if(!Number.isFinite(target.x)||!Number.isFinite(target.y)||!Number.isFinite(dt))return r;
  dt=clamp(dt,.001,.1);
  const local=target.grip?gripPoint(puppetPose(r),target.grip):null;
  const previous=target.grip?(r.pointer??{x:r.x+local.x*r.scale,y:r.y+local.y*r.scale}):{x:r.x,y:r.y};
  const dx=target.x-previous.x,dy=target.y-previous.y;
  const steps=Math.max(1,Math.ceil(dt/(1/240))),h=dt/steps;
  const inputVX=clamp(dx/dt,-2200,2200),inputVY=clamp(dy/dt,-2200,2200);
  r.energy+=(Math.hypot(inputVX,inputVY)-r.energy)*(1-Math.exp(-14*dt));
  for(let s=0;s<steps;s++){
    // Distribute the pointer path over substeps, instead of teleporting the
    // anchor at the start of a frame. The same path behaves alike at 30–120 Hz.
    const t=(s+1)/steps,point={x:previous.x+dx*t,y:previous.y+dy*t};
    const current=target.grip?(r.pointer??previous):{x:r.x,y:r.y};
    let mx=point.x-current.x,my=point.y-current.y;
    const distance=Math.hypot(mx,my),limit=6000*r.scale*h;
    if(distance>limit){
      const tx=mx*(1-limit/distance),ty=my*(1-limit/distance);
      translatePuppet(r,tx,ty);mx-=tx;my-=ty;
    }
    const vx=mx/h,vy=my/h;r.x+=mx;r.y+=my;
    const desired=clamp(-inputVX/4500,-.45,.45);
    r.omega=clamp((r.omega+(desired-r.angle)*150*h)*Math.exp(-18*h),-5,5);
    r.angle=clamp(r.angle+r.omega*h,-.62,.62);
    r.headAngle+=(clamp(-inputVX/15000,-.1,.1)-r.headAngle)*(1-Math.exp(-20*h));
    const anchors=core(r);
    for(const n of Object.values(r.nodes)){
      // Damping/caps concern movement relative to the carried body. Capping
      // world velocity made a fast cursor drag every limb sideways like syrup.
      let ux=(n.x-n.px)/r.lastH-vx,uy=(n.y-n.py)/r.lastH-vy;
      const speed=Math.hypot(ux,uy),cap=4500*r.scale;
      if(speed>cap){ux*=cap/speed;uy*=cap/speed;}
      n.px=n.x;n.py=n.y;
      n.x+=(vx+ux*Math.exp(-12*h))*h;
      n.y+=(vy+uy*Math.exp(-12*h))*h+24000*r.scale*h*h;
    }
    chains.forEach(([a,b,c],i)=>solveLimb(anchors[a],r.nodes[b],r.nodes[c],r.lengths[i][0]*r.scale,r.lengths[i][1]*r.scale));
    if(target.grip)pinPuppet(r,point,target.grip);else r.pointer=null;
    r.lastH=h;
  }
  r.lastX=target.x;r.lastY=target.y;return r;
}
export function puppetPose(r){const p=core(r);for(const [key,node]of Object.entries(r.nodes))p[key]={x:node.x,y:node.y};for(const key of Object.keys(p))p[key]={x:(p[key].x-r.x)/r.scale,y:(p[key].y-r.y)/r.scale};p.angle=r.angle;p.headAngle=r.angle+r.headAngle;return p;}
export function interpolatePose(a,b,t){const p={};for(const key of Object.keys(b))p[key]=typeof b[key]==='number'?a[key]+(b[key]-a[key])*t:{x:a[key].x+(b[key].x-a[key].x)*t,y:a[key].y+(b[key].y-a[key].y)*t};return p;}
export function boneErrors(r){const p=puppetPose(r);return chains.flatMap(([a,b,c],i)=>[Math.abs(Math.hypot(p[b].x-p[a].x,p[b].y-p[a].y)-r.lengths[i][0]),Math.abs(Math.hypot(p[c].x-p[b].x,p[c].y-p[b].y)-r.lengths[i][1])]);}
