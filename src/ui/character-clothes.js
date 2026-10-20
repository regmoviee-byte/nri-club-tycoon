// Fabric silhouettes cover the entire articulated chain; no joint caps are drawn.
const ink='#3b313e';
const P=(d,fill='none',stroke=ink,w=1.6)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const L=(d,c=ink,w=1.2)=>P(d,'none',c,w);
const xy=p=>`${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const shift=(p,x,y,a=0)=>({x:p.x+x*Math.cos(a)-y*Math.sin(a),y:p.y+x*Math.sin(a)+y*Math.cos(a)});
const normal=(a,b)=>{const d=Math.max(.01,Math.hypot(b.x-a.x,b.y-a.y));return{x:-(b.y-a.y)/d,y:(b.x-a.x)/d};};
const edge=(p,n,w)=>({x:p.x+n.x*w,y:p.y+n.y*w});
// The torso and sleeve share this curved armhole around the physical shoulder.
export function shoulderGeometry(pose,side){
 const joint=pose['shoulder'+side],dir=side==='L'?-1:1,a=pose.angle??0;
 return{joint,side,top:shift(joint,-dir,-1,a),curve:shift(joint,dir*17,9,a),underarm:shift(joint,dir*14,27,a)};
}
function cloth(a,b,c,color,width,endWidth,shade,openStart=false,shoulder=null,startAt=0){
 const n=normal(a,b),m=normal(b,c),bis={x:n.x+m.x,y:n.y+m.y},d=Math.max(.5,Math.hypot(bis.x,bis.y));bis.x/=d;bis.y/=d;
 let aL=edge(a,n,width*.5),aR=edge(a,n,-width*.5);
 if(shoulder){
  // Keep the fabric's two sides stable as the arm swings through the armhole.
  aL=shoulder.side==='L'?shoulder.top:shoulder.underarm;
  aR=shoulder.side==='L'?shoulder.underarm:shoulder.top;
 }
 const bL=edge(b,bis,width*.44),bR=edge(b,bis,-width*.44),cL=edge(c,m,endWidth*.5),cR=edge(c,m,-endWidth*.5),u=mix(a,b,.7),v=mix(b,c,.35);
 let upperL=edge(u,n,width*.56),upperR=edge(u,n,-width*.46);
 const shadeB=edge(b,bis,-width*.28);
 let shadeStart=shoulder?mix(aR,aL,.25):edge(a,n,-width*.25),shadeControl=edge(u,n,-width*.25);
 if(startAt){
  // Split the original curves so a foreground forearm cannot widen at its join.
  const split=(start,control,end)=>{const next=mix(control,end,startAt);return[mix(mix(start,control,startAt),next,startAt),next];};
  [aL,upperL]=split(aL,upperL,bL);[aR,upperR]=split(aR,upperR,bR);
  [shadeStart,shadeControl]=split(shadeStart,shadeControl,shadeB);
 }
 const sides=`M ${xy(aL)} Q ${xy(upperL)} ${xy(bL)} Q ${xy(edge(v,m,width*.48))} ${xy(cL)} Q ${xy(shift(c,0,3))} ${xy(cR)} Q ${xy(edge(v,m,-width*.38))} ${xy(bR)} Q ${xy(upperR)} ${xy(aR)}`;
 const outline=sides+(shoulder&&!startAt?` Q ${xy(shoulder.curve)} ${xy(aL)}`:'')+' Z';
 let art=P(outline,color,openStart||shoulder?'none':ink);
 if(openStart||shoulder)art+=L(sides,ink,1.6);
 art+=P(`M ${xy(shadeStart)} Q ${xy(shadeControl)} ${xy(shadeB)} L ${xy(edge(c,m,-endWidth*.25))} L ${xy(cR)} Q ${xy(edge(v,m,-width*.38))} ${xy(bR)} Q ${xy(upperR)} ${xy(aR)} Z`,shade,'none');
 return art;
}
export function characterClothes(identity,s){
 const p=identity.portrait,a=s.angle??0,build=p.build,coat=p.coat,shade=p.clothShade??'#25263727';
 const shape={lean:{belly:0,leg:39,sleeve:32,hem:0},regular:{belly:5,leg:48,sleeve:37,hem:0},soft:{belly:17,leg:58,sleeve:42,hem:9},broad:{belly:10,leg:54,sleeve:43,hem:3},compact:{belly:9,leg:50,sleeve:37,hem:14}}[p.bodyShape]??{belly:5,leg:48,sleeve:37,hem:0};
 const shoulders={L:shoulderGeometry(s,'L'),R:shoulderGeometry(s,'R')};
 let legs='',arms='',armsFront='';
 for(const side of ['L','R']){
  const h=s['hip'+side],k=s['knee'+side],ank=s['ankle'+side],dir=side==='L'?-1:1;
  legs+=cloth(h,k,ank,p.trousers??'#465065',shape.leg*build,shape.leg*.63,'#24283538');
  legs+=L(`M ${xy(mix(h,k,.2))} Q ${xy(shift(mix(h,k,.46),dir*4,0))} ${xy(mix(h,k,.62))}`,'#ffffff18',1.4);
  legs+=L(`M ${xy(shift(k,-13,4))} Q ${xy(shift(k,-2,0))} ${xy(shift(k,10,6))} M ${xy(shift(ank,-13,-5))} L ${xy(shift(ank,12,-4))}`,'#282c3e6b',1.3);
  const shoeAngle=Math.atan2(ank.y-k.y,ank.x-k.x)-Math.PI/2;
  legs+=`<g transform="translate(${xy(ank)}) rotate(${shoeAngle*180/Math.PI}) translate(0 -6)">${P(`M -15 -7 Q -2 -2 13 -8 L 15 1 Q ${dir>0?31:21} 3 ${dir>0?33:24} 12 Q ${dir>0?34:25} 19 ${dir>0?28:20} 20 L ${dir<0?-32:-17} 20 Q ${dir<0?-37:-22} 13 -17 3 Z`,p.shoes??'#3b3843')}${L(`M ${dir<0?-32:-17} 17 L ${dir>0?31:22} 17`,'#d4c7b2',3)}${L('M -7 2 L 7 4 M -5 7 L 9 9 M -11 -5 Q 0 0 10 -5','#ab9f96',1)}</g>`;
  const armhole=shoulders[side],shoulder=armhole.joint,elbow=s['elbow'+side],wrist=s['wrist'+side],short=p.outfit==='crew';
  arms+=cloth(shoulder,elbow,wrist,short?p.skin:coat,(short?shape.sleeve*.74:shape.sleeve)*build,short?19:25,short?p.shade:shade,false,armhole);
  if(short){const hem=mix(shoulder,elbow,.55);arms+=cloth(shoulder,mix(shoulder,elbow,.4),hem,coat,(shape.sleeve+5)*build,shape.sleeve,shade,false,armhole);const n=normal(shoulder,elbow);arms+=L(`M ${xy(edge(hem,n,16))} Q ${xy(shift(hem,0,-2))} ${xy(edge(hem,n,-16))}`,'#342e3e66',1.1);}
  else{
   const n=normal(elbow,wrist),cuff=mix(elbow,wrist,.94);
   arms+=P(`M ${xy(edge(cuff,n,12))} L ${xy(edge(wrist,n,12))} L ${xy(edge(wrist,n,-12))} L ${xy(edge(cuff,n,-12))} Z`,coat,ink,1);
   arms+=L(`M ${xy(shift(elbow,-9,-5))} Q ${xy(shift(elbow,-2,2))} ${xy(shift(elbow,10,3))} M ${xy(shift(elbow,-8,5))} L ${xy(shift(elbow,2,10))}`,'#362d4055',1.1);
  }
  const handAngle=Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x)*180/Math.PI;
  const hand=`<g transform="translate(${xy(wrist)}) rotate(${handAngle})">${P('M -3 -7 Q 4 -10 10 -6 Q 15 -4 21 -3 Q 25 -2 24 1 L 23 5 Q 22 9 17 9 L 8 7 Q 3 7 1 4 Q 0 10 -4 9 Q -8 7 -5 1 Z',p.skin,ink,1.25)}${L('M 13 0 Q 18 1 22 1 M 12 4 L 21 5 M 2 -3 Q 7 -3 8 1',p.shade,.85)}</g>`;
  arms+=hand;
  if(wrist.y<s.hipL.y+5&&Math.abs(wrist.x-s.root.x)<Math.abs(elbow.x-s.root.x)){armsFront+=cloth(shoulder,elbow,wrist,short?p.skin:coat,(short?shape.sleeve*.74:shape.sleeve)*build,short?19:25,short?p.shade:shade,true,armhole,.82)+hand;}
 }
 const sl=shift(s.shoulderL,-12,-1,a),sr=shift(s.shoulderR,12,-1,a),hl=shift(s.hipL,-17-shape.belly*.4,24+shape.hem,a),hr=shift(s.hipR,17+shape.belly*.4,24+shape.hem,a);
 const nl=shift(s.neck,-14,0,a),nr=shift(s.neck,14,0,a),headA=s.headAngle??a,chin=shift(s.head,0,46,headA);
 let neck=P(`M ${xy(shift(chin,-12,0,headA))} L ${xy(shift(chin,12,0,headA))} L ${xy(shift(s.neck,15,18,a))} Q ${xy(shift(s.neck,0,27,a))} ${xy(shift(s.neck,-15,18,a))} Z`,p.skin);
 neck+=P(`M ${xy(shift(chin,-11,0,headA))} L ${xy(shift(chin,11,0,headA))} L ${xy(shift(s.neck,10,5,a))} Q ${xy(shift(s.neck,-4,4,a))} ${xy(shift(s.neck,-12,-1,a))} Z`,p.shade,'none');
 const wL=shift(mix(sl,hl,.55),-shape.belly,0,a),wR=shift(mix(sr,hr,.55),shape.belly,0,a),nC=shift(s.neck,0,20,a),bottom=mix(hl,hr,.5);
 const silhouette=`M ${xy(nl)} Q ${xy(shift(s.neck,-29,1,a))} ${xy(shoulders.L.top)} Q ${xy(shoulders.L.curve)} ${xy(shoulders.L.underarm)} Q ${xy(shift(wL,6,-23,a))} ${xy(shift(wL,6,0,a))} Q ${xy(shift(hl,7,-25,a))} ${xy(hl)} Q ${xy(shift(bottom,0,8,a))} ${xy(hr)} Q ${xy(shift(hr,-6,-25,a))} ${xy(shift(wR,-6,0,a))} Q ${xy(shift(wR,-6,-23,a))} ${xy(shoulders.R.underarm)} Q ${xy(shoulders.R.curve)} ${xy(shoulders.R.top)} Q ${xy(shift(s.neck,29,1,a))} ${xy(nr)} Q ${xy(nC)} ${xy(nl)} Z`;
 let shirt=P(silhouette,coat);
 shirt+=P(`M ${xy(shift(sr,-13,8,a))} Q ${xy(shift(wR,-10,0,a))} ${xy(hr)} L ${xy(shift(bottom,20,3,a))} Q ${xy(shift(wR,-23,5,a))} ${xy(shift(sr,-24,12,a))} Z`,shade,'none');
 shirt+=L(`M ${xy(shift(sl,14,34,a))} Q ${xy(shift(sl,17,43,a))} ${xy(shift(sl,24,49,a))} M ${xy(shift(hl,9,-14,a))} l 13 -9 M ${xy(shift(hr,-8,-16,a))} l -12 -5 M ${xy(shift(hl,2,-4,a))} Q ${xy(shift(bottom,0,1,a))} ${xy(shift(hr,-2,-4,a))}`,'#2d2b3b33',1.2);
 const cL=shift(s.neck,-17,4,a),cR=shift(s.neck,17,4,a);
 if(['crew','sweater'].includes(p.outfit)){
  shirt+=L(`M ${xy(cL)} Q ${xy(shift(nC,0,6,a))} ${xy(cR)}`,'#393043',4);
  shirt+=L(`M ${xy(shift(cL,-2,3,a))} Q ${xy(shift(nC,0,11,a))} ${xy(shift(cR,2,3,a))}`,'#ffffff36',1);
  if(p.outfit==='sweater')for(const y of [70,80,90])shirt+=L(`M ${xy(shift(s.root,-52*build,y,a))} Q ${xy(shift(s.root,0,y+5,a))} ${xy(shift(s.root,52*build,y,a))}`,p.accent??'#c5b9aa',y===80?4:1.5);
  else {
   const pocket=(x,y)=>xy(shift(s.root,x,y,a));
   shirt+=P(`M ${pocket(-13,46)} L ${pocket(-13,73)} Q ${pocket(0,82)} ${pocket(13,73)} L ${pocket(13,46)} Z`,coat,'#302b3d55',1);
   shirt+=L(`M ${pocket(-10,51)} L ${pocket(10,51)}`,'#ffffff26',1);
  }
 }else if(p.outfit==='hoodie'){
  shirt+=P(`M ${xy(nl)} Q ${xy(shift(s.neck,-30,-12,a))} ${xy(shift(sl,8,6,a))} Q ${xy(shift(s.neck,-32,40,a))} ${xy(nC)} Q ${xy(shift(s.neck,31,39,a))} ${xy(shift(sr,-8,6,a))} Q ${xy(shift(s.neck,31,-12,a))} ${xy(nr)} Q ${xy(shift(nC,0,3,a))} ${xy(nl)} Z`,coat);
  shirt+=P(`M ${xy(nl)} Q ${xy(shift(nC,0,3,a))} ${xy(nr)} L ${xy(shift(s.neck,25,23,a))} L ${xy(nC)} L ${xy(shift(s.neck,-25,23,a))} Z`,shade,'none');
  for(const dir of [-1,1])shirt+=L(`M ${xy(shift(s.neck,dir*16,27,a))} Q ${xy(shift(s.neck,dir*21,47,a))} ${xy(shift(s.neck,dir*18,66,a))}`,'#d8c6af',2);
  const pL=shift(bottom,-36,-47,a),pR=shift(bottom,36,-47,a);shirt+=P(`M ${xy(pL)} Q ${xy(shift(bottom,0,-42,a))} ${xy(pR)} L ${xy(shift(bottom,47,-8,a))} Q ${xy(bottom)} ${xy(shift(bottom,-47,-8,a))} Z`,coat,'#372d3f88',1.2);
  shirt+=L(`M ${xy(shift(pL,4,5,a))} L ${xy(shift(bottom,-40,-13,a))} M ${xy(shift(pR,-4,5,a))} L ${xy(shift(bottom,40,-13,a))}`,shade,3);
 }else if(p.outfit==='cardigan'){
  shirt+=P(`M ${xy(nl)} Q ${xy(nC)} ${xy(nr)} L ${xy(shift(bottom,15,1,a))} L ${xy(shift(bottom,-15,1,a))} Z`,p.accent??'#d7c6b0');
  shirt+=L(`M ${xy(shift(nl,-5,3,a))} L ${xy(shift(bottom,-19,0,a))} M ${xy(shift(nr,5,3,a))} L ${xy(shift(bottom,19,0,a))}`,'#3d334b',3);
  for(const dir of [-1,1]){const c=shift(bottom,dir*37,-38,a);shirt+=P(`M ${xy(shift(c,-12,0,a))} l 24 0 l -1 22 q -11 7 -22 0 Z`,coat,'#3a2d3f66',1);}
 }else{
  const end=shift(bottom,0,1,a);shirt+=L(`M ${xy(nC)} L ${xy(end)}`,'#393246',1.3);
  shirt+=P(`M ${xy(nl)} L ${xy(shift(s.neck,-24,13,a))} L ${xy(shift(s.neck,-10,33,a))} L ${xy(nC)} Z`,p.accent??'#d4c7bb')+P(`M ${xy(nr)} L ${xy(shift(s.neck,24,13,a))} L ${xy(shift(s.neck,10,33,a))} L ${xy(nC)} Z`,p.accent??'#d4c7bb');
  for(const t of [.2,.43,.66,.86]){const b=mix(nC,end,t);shirt+=`<circle cx="${b.x+4}" cy="${b.y}" r="1.8" fill="#d8c7af" stroke="#514051" stroke-width=".5"/>`;}
  const c=shift(s.root,-40,40,a);shirt+=P(`M ${xy(c)} l 25 0 l -1 25 l -11 6 l -12 -6 Z`,coat,'#332d3d66',1);
  if(p.outfit==='vest')shirt+=P(`M ${xy(shift(sl,5,2,a))} L ${xy(shift(s.neck,-17,7,a))} L ${xy(shift(s.root,0,66,a))} L ${xy(shift(bottom,-5,0,a))} L ${xy(hl)} Q ${xy(shift(wL,10,0,a))} ${xy(shift(sl,5,2,a))} Z`,p.accent??'#49495d')+P(`M ${xy(shift(sr,-5,2,a))} L ${xy(shift(s.neck,17,7,a))} L ${xy(shift(s.root,0,66,a))} L ${xy(shift(bottom,5,0,a))} L ${xy(hr)} Q ${xy(shift(wR,-10,0,a))} ${xy(shift(sr,-5,2,a))} Z`,p.accent??'#49495d');
 }
 return{legs,arms,armsFront,torso:neck+shirt,anchor:mix(shift(s.hipL,-17,24,a),shift(s.hipR,17,24,a),.5)};
}
