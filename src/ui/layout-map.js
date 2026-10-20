import {roomOccupants} from '../model/club.js';
import {lockedGuest,clockText} from '../model/lifecycle.js';
import {bounds,objectCells,roomReadiness} from '../model/layout.js';
import {roomAssignment,startQuote} from '../model/campaign.js';
import {roomPreparation} from '../model/kit-lifecycle.js';
import {staffRoomStatus,staffCanRest} from '../model/staff-room.js';
import {guestWaitingStatus} from '../model/guest-waiting.js';
import {visualObjectState,visualRoomState} from '../model/operations.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
import {graphicPortrait} from './graphic-portrait.js';
import {project,cellPolygon,edgePoints,projectedBounds} from './layout-projection.js';

export const TILE=72; // Legacy palette sizing; all world geometry uses layout-projection.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=value=>Number(value.toFixed(3));
const xy=p=>`${n(p.x)},${n(p.y)}`;
const ink='#645044';
const polygon=(points,fill,stroke=ink,width=1.2,extra='')=>`<polygon points="${points.map(xy).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" ${extra}/>`;
const line=(points,color=ink,width=1.2,extra='')=>`<polyline points="${points.map(xy).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const cellBounds=cells=>{const x=Math.min(...cells.map(c=>c.x)),y=Math.min(...cells.map(c=>c.y));return{x,y,w:Math.max(...cells.map(c=>c.x))-x+1,h:Math.max(...cells.map(c=>c.y))-y+1};};

// Every vertex is rotated on the grid BEFORE projection. Vertical edges stay upright.
function objectDrawing(kind,rotation=0,state={}) {
  const item=BUILD_CATALOG[kind]??{width:1,height:1,layer:'floor'};
  const w=item.width,h=item.height,turn=((Math.trunc(rotation)%4)+4)%4,frontVisible=turn===0||turn===3;
  const rotate=(x,y)=>[ [x,y],[h-y,x],[w-x,h-y],[y,w-x] ][turn];
  const worldPoint=([x,y,z=0])=>{const[a,b]=rotate(x,y);return[a,b,z];};
  const p=v=>project(...worldPoint(v));
  const faces=[],all=[];
  let order=0,phase=0;
  const face=(vertices,fill,stroke=ink,width=1.1,offset=0,extra='')=>{
    const points=vertices.map(p);all.push(...points);
    const depth=vertices.reduce((sum,v)=>{const[x,y,z]=worldPoint(v);return sum+(x+y)*48+z*.08;},0)/vertices.length+offset;
    faces.push({phase,depth,order:order++,html:polygon(points,fill,stroke,width,extra)});
  };
  const stroke=(vertices,color=ink,width=1.3,offset=.2)=>{
    const points=vertices.map(p);all.push(...points);
    const depth=vertices.reduce((sum,v)=>{const[x,y,z]=worldPoint(v);return sum+(x+y)*48+z*.08;},0)/vertices.length+offset;
    faces.push({phase,depth,order:order++,html:line(points,color,width)});
  };
  const slab=(x,y,z,a,b,color,edge=ink)=>face([[x,y,z],[x+a,y,z],[x+a,y+b,z],[x,y+b,z]],color,edge);
  const box=(x,y,z,a,b,c,top='#cbaa7f',left='#ad855f',right='#8d674b')=>{
    const corners=[[x,y,z],[x+a,y,z],[x+a,y+b,z],[x,y+b,z]],upper=corners.map(([u,v])=>[u,v,z+c]);
    for(let i=0;i<4;i++){
      const j=(i+1)%4,A=worldPoint(corners[i]),B=worldPoint(corners[j]);
      // Positive world X/Y faces face the camera; never paint hidden back faces.
      const normal=[B[1]-A[1],A[0]-B[0]];
      if(normal[0]+normal[1]>0)face([corners[i],corners[j],upper[j],upper[i]],normal[0]>0?right:left);
    }
    face(upper,top);
  };
  const disk=(x,y,z,r,color,edge=ink,segments=20)=>face(Array.from({length:segments},(_,i)=>[x+Math.cos(i*Math.PI*2/segments)*r,y+Math.sin(i*Math.PI*2/segments)*r,z]),color,edge,1);
  const cylinder=(x,y,z,r,height,top,side)=>{
    const q=p([x,y,z]),t=p([x,y,z+height]);
    const rx=r*67.88,ry=r*33.94;
    all.push({x:q.x-rx,y:t.y-ry},{x:q.x+rx,y:q.y+ry});
    const[a,b]=rotate(x,y),depth=(a+b)*48+z*.08;
    faces.push({phase,depth,order:order++,html:`<path d="M${n(q.x-rx)} ${n(q.y)}v${-height}a${n(rx)} ${n(ry)} 0 0 1 ${n(2*rx)} 0v${height}a${n(rx)} ${n(ry)} 0 0 1 ${n(-2*rx)} 0" fill="${side}" stroke="${ink}" stroke-width="1.1"/><ellipse cx="${n(t.x)}" cy="${n(t.y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${top}" stroke="${ink}" stroke-width="1.1"/>`});
  };
  const leg=(x,y,z=0,height=30)=>box(x,y,z,.07,.07,height,'#b3936b','#9a7453','#76553f');
  const legs=(a,b,height)=>{for(const x of[.13,a-.2])for(const y of[.13,b-.2])leg(x,y,0,height);};
  const chair=(x=0,y=0,soft=false,arms=false)=>{
    for(const a of[.22,.7])for(const b of[.23,.7])leg(x+a,y+b,0,23);
    box(x+.16,y+.16,24,.68,.68,5,soft?'#a9b7a0':'#d6b384',soft?'#7d9989':'#b48a60',soft?'#657e74':'#936b49');
    box(x+.18,y+.12,27,.64,.1,27,soft?'#b4c0a6':'#debc8a',soft?'#8a9f8d':'#c09769',soft?'#748b7b':'#a47b54');
    if(soft)stroke([[x+.25,y+.23,44],[x+.75,y+.23,44]],'#dce1c7',1.5);
    else stroke([[x+.24,y+.23,39],[x+.76,y+.23,39]],'#8b674d',1.5);
    if(arms)for(const a of[.13,.8]){leg(x+a,y+.65,28,11);box(x+a,y+.24,39,.07,.51,3,'#b9c4ab','#829687','#6f8478');}
  };
  const cabinet=(a=1)=>{
    legs(a,1,5);box(.12,.12,5,a-.24,.74,34,'#e0d5b8','#c4bca4','#a9a28b');
    box(.08,.08,39,a-.16,.82,4,'#d2b386','#ae8a60','#906b4c');
    for(let x=.27;x<a-.1;x+=.6)stroke([[x,.871,14],[x,.871,31]],'#f1e5c6',1.5);
  };
  const cup=(x,y,z)=>cylinder(x,y,z,.07,6,'#fff1cf','#d9c8a4');
  const paper=(x,y,z,a=.3,b=.32)=>{slab(x,y,z,a,b,'#f4e6c3','#af9d7e');phase++;for(let i=0;i<3;i++)stroke([[x+.04,y+.06+i*.07,z+.2],[x+a-.05,y+.06+i*.07,z+.2]],'#b4a18a',.8);};
  const empty=state.empty===true,expired=state.expired===true;
  if(item.layer==='floor')slab(.08,.1,0,w-.16,h-.2,'#5e4b3820','none');
  switch(kind){
    case'table':case'tableComfort':{
      const soft=kind==='tableComfort';legs(2,2,32);box(.07,.07,32,1.86,1.86,6,'#d4ae7d','#b68b5d','#936943');phase=1;
      if(soft){slab(.18,.18,38.5,1.64,1.64,'#6e8d7f','#e0c89c');stroke([[.26,.26,39],[1.74,.26,39],[1.74,1.74,39],[.26,1.74,39],[.26,.26,39]],'#a4b59a',1.1);}
      else for(const y of[.5,1,1.5])stroke([[.1,y,38.2],[1.9,y,38.2]],'#b88e62',.9);
      phase=2;paper(.7,.66,39,.49,.55);box(1.45,.66,39,.13,.13,6,'#d3aa80','#a86d5a','#895b50');cup(.35,1.45,39);break;
    }
    case'chair':case'chairSoft':case'chairArms':chair(0,0,kind!=='chair',kind==='chairArms');break;
    case'staffChair':chair(0,0,true,true);slab(.35,.4,30,.25,.25,'#cfaf80','#9e835e');break;
    case'bench':case'sofa':case'staffBench':case'staffSofa':{
      const soft=kind.toLowerCase().includes('sofa'),staff=kind.startsWith('staff');
      for(const x of[.2,1.45,2.7])for(const y of[.21,.7])leg(x,y,0,20);
      box(.12,.13,23,2.76,.16,28,soft?'#aab89e':'#d6b388',soft?'#809487':'#b88e63',soft?'#6b8176':'#956e4d');
      for(let i=0;i<3;i++){box(i+.15,.26,20,.7,.59,7,soft?(staff?'#b0afa5':'#b9c5aa'):'#d6b388',soft?'#8a9e8d':'#b78e64',soft?'#718879':'#96704d');if(staff)stroke([[i+.28,.36,27.2],[i+.7,.36,27.2]],'#e6dec0',1.5);}
      if(soft)for(const x of[.06,2.82])box(x,.2,23,.12,.7,14,'#a8b89f','#869b86','#6b8372');break;
    }
    case'shelf':case'shelfLarge':{
      for(const x of[.16,w-.23])for(const y of[.2,.55])leg(x,y,0,6);
      box(.12,.16,6,w-.24,.54,57,'#c5a074','#b38e63','#8b6749');
      if(frontVisible){
        phase=1;face([[.19,.711,11],[w-.19,.711,11],[w-.19,.711,57],[.19,.711,57]],'#695340','#8e7050');
        phase=2;
        for(const z of[12,34])for(let x=.23,i=0;x<w-.25;x+=.14,i++){
          const colors=['#8c6e69','#76928a','#c3a166','#7b8394'],height=14+i%3*2;
          face([[x,.721,z],[x+.09,.721,z],[x+.09,.721,z+height],[x,.721,z+height]],colors[i%4],'#65513f',.7);
        }
        phase=3;
        for(const z of[12,34])for(let x=.23;x<w-.25;x+=.14)stroke([[x+.025,.731,z+5],[x+.065,.731,z+5]],'#e7d2ad',.8);
        for(const z of[11,32,56])face([[.16,.74,z],[w-.16,.74,z],[w-.16,.74,z+2],[.16,.74,z+2]],'#d9b88c','#9d7954',.8);
      }
      break;
    }
    case'kitchen':{
      cabinet(2);for(let x=.2;x<1.8;x+=.52)stroke([[x,.871,7],[x,.871,37]],'#968d78',1.1);
      phase=1;slab(1.12,.22,43.5,.55,.42,'#8d9d97','#b6c7bd');phase=2;slab(1.19,.28,43.6,.4,.29,'#627e7a','#d9dfc8');
      stroke([[1.5,.3,44],[1.5,.3,59],[1.35,.3,59],[1.35,.3,54]],'#8faaa2',3);
      paper(.23,.27,44,.4,.35);box(.7,.2,44,.21,.2,11,'#b8c5a5','#8f9f84','#6d806c');break;
    }
    case'water':{
      box(.27,.25,3,.46,.51,40,'#e4e6cf','#cbd3c2','#9eafa4');phase=1;
      cylinder(.5,.48,43,.18,23,'#c4e0d6',empty?'#d9e1d8':'#88b5b6');
      if(frontVisible){phase=2;face([[.32,.765,17],[.67,.765,17],[.67,.765,34],[.32,.765,34]],'#819c94');stroke([[.4,.81,31],[.4,.81,26]],'#bc7364',2.6);stroke([[.61,.81,31],[.61,.81,26]],'#6a96b0',2.6);cup(.5,.8,17);}break;
    }
    case'kettle':cabinet();phase=1;cylinder(.48,.43,44,.17,16,'#c7d1b8','#91a68d');stroke([[.64,.43,55],[.77,.43,57],[.78,.43,47],[.65,.43,47]],'#6a7f6f',3);stroke([[.3,.43,53],[.22,.43,57]],'#9fae98',4);cup(.36,.72,44);break;
    case'coffee':case'coffeeAuto':{
      cabinet();phase=1;const auto=kind==='coffeeAuto';
      box(.23,.2,43,.54,.42,auto?28:23,auto?'#889487':'#baa28a',auto?'#65766e':'#9f8873',auto?'#485f58':'#806d5d');
      cup(.49,.75,44);
      if(frontVisible){
        phase=2;face([[.31,.631,55],[.65,.631,55],[.65,.631,64],[.31,.631,64]],auto?'#adbea0':'#514f45');
        face([[.36,.635,46],[.63,.635,46],[.63,.635,53],[.36,.635,53]],'#46534b');
        stroke([[.49,.64,53],[.49,.72,53],[.49,.72,50]],'#bcbba0',2);
        phase=3;if(auto){stroke([[.36,.64,61],[.58,.64,61]],'#5d7f71',1.5);stroke([[.36,.64,58],[.49,.64,58]],'#5d7f71',.8);}else stroke([[.34,.64,59],[.61,.64,59]],'#969f85',1.4);
      }break;
    }
    case'cookies':{
      cabinet();phase=1;box(.24,.23,44,.52,.48,18,'#e4d5b3',empty?'#d5dbca':'#c0b994',empty?'#b7c6b9':'#9fa98c');
      if(frontVisible&&!empty){phase=2;for(const[x,z]of[[.33,50],[.48,55],[.62,49]]){face([[x-.06,.721,z-3],[x+.06,.721,z-3],[x+.08,.721,z+3],[x,.721,z+5],[x-.08,.721,z+2]],expired?'#96927b':'#cba064');stroke([[x-.02,.725,z],[x+.02,.725,z+1]],'#786347',1.4);}}
      phase=3;box(.21,.2,62,.58,.54,3,'#c29b6d','#aa825b','#8e6746');break;
    }
    case'fridge':{
      box(.16,.18,3,.68,.65,65,'#dbe1cd','#bacdbf','#8fa99d');
      if(frontVisible){phase=1;face([[.27,.85,28],[.45,.85,28],[.45,.85,41],[.27,.85,41]],'#e7ce9e','#a09272');stroke([[.18,.837,45],[.82,.837,45]],'#79988b',1.4);stroke([[.7,.85,53],[.7,.85,61]],'#627e73',2.7);stroke([[.7,.85,19],[.7,.85,36]],'#627e73',2.7);}break;
    }
    case'light':{
      const c=p([.5,.5,0]);all.push({x:c.x-32,y:c.y-17},{x:c.x+32,y:c.y+17});faces.push({phase,depth:-100,order:order++,html:`<ellipse cx="${n(c.x)}" cy="${n(c.y)}" rx="31" ry="16" fill="#ffe9ab" opacity=".22"/>`});
      stroke([[.5,.5,69],[.5,.5,88]],'#8f795b',1.6);cylinder(.5,.5,67,.21,9,'#e8cd8f','#c7a875');disk(.5,.5,66,.21,'#fff0b9','#d0b275');break;
    }
    case'lightAdjustable':cylinder(.35,.48,0,.2,3,'#9ba88f','#71816c');stroke([[.35,.48,4],[.35,.48,41],[.64,.43,67],[.53,.43,76]],'#718575',3.6);cylinder(.53,.43,64,.17,8,'#b8c7a3','#83977e');disk(.53,.43,63,.17,'#fff0bb','#c6b38b');break;
    case'hanger':stroke([[.5,.5,2],[.5,.5,65]],'#987252',4);for(const[a,b]of[[.25,.5],[.75,.5],[.5,.23],[.5,.76]]){stroke([[.5,.5,6],[a,b,0]],'#846549',3);stroke([[.5,.5,44],[a,b,55]],'#a98058',3);}face([[.62,.5,22],[.82,.5,25],[.77,.5,48],[.65,.5,47]],'#829b8b','#647e6e');break;
    case'bin':cylinder(.5,.5,1,.25,28,'#7b8f7b','#9aab92');cylinder(.5,.5,28,.28,4,'#b7c4a5','#81957d');disk(.5,.5,32,.15,'#65725d');break;
    case'plant':{
      cylinder(.5,.5,0,.23,17,'#d4a077','#b77858');stroke([[.5,.5,17],[.5,.5,65]],'#6d8959',2.4);
      for(const[a,b,z]of[[.22,.47,36],[.74,.46,45],[.43,.23,53],[.62,.68,30],[.48,.5,66]])face([[.5,.5,z-14],[a-.08,b,z-1],[a,b,z+6],[a+.08,b,z]],'#87a576','#5c7a56');break;
    }
    case'decor':box(.26,.24,0,.48,.5,12,'#c4a577','#a68b62','#8a6d4d');face([[.31,.5,13],[.36,.5,39],[.24,.5,47],[.43,.5,44],[.5,.5,61],[.57,.5,44],[.76,.5,47],[.64,.5,39],[.69,.5,13]],'#c6ad76','#92744f');stroke([[.4,.5,32],[.5,.5,28],[.6,.5,32]],'#8a704e',1.2);break;
    case'fan':{
      cylinder(.5,.5,0,.25,3,'#aab9a0','#7c917d');stroke([[.5,.5,3],[.5,.5,43]],'#809680',4);
      const rim=y=>Array.from({length:32},(_,i)=>[.5+Math.cos(i*Math.PI/16)*.32,y,53+Math.sin(i*Math.PI/16)*20]);
      phase=1;face(rim(.46),'#9bae99','#768e78',1.7);face(rim(.52),'#d1dcc5','#7f987f',1.5);
      phase=2;
      for(let j=0;j<3;j++){const a=j*Math.PI*2/3;face([[.5,.53,53],[.5+Math.cos(a)*.26,.53,53+Math.sin(a)*16],[.5+Math.cos(a+.7)*.24,.53,53+Math.sin(a+.7)*15],[.5+Math.cos(a+1.2)*.08,.53,53+Math.sin(a+1.2)*5]],'#8ea88f','none');}
      stroke([[.5,.54,52],[.5,.54,54]],'#e9dbb8',4);break;
    }
    case'poster':case'whiteboard':case'soundproof':case'conditioner':{
      const z=kind==='conditioner'?57:23,high=kind==='conditioner'?20:39;
      box(.13,.02,z,.74,.07,high,kind==='conditioner'?'#e2e5d1':'#c1a57c','#a9b59e','#8c927d');
      if(!frontVisible)break;phase=1;
      if(kind==='conditioner'){face([[.2,.101,62],[.8,.101,62],[.8,.101,69],[.2,.101,69]],'#a1b4a4');stroke([[.24,.111,65],[.76,.111,65]],'#718e82',1.3);}
      else if(kind==='poster'){face([[.18,.101,28],[.82,.101,28],[.82,.101,57],[.18,.101,57]],'#dae1bc','#f2dcae');face([[.22,.111,32],[.39,.111,49],[.53,.111,38],[.66,.111,48],[.78,.111,32]],'#849f88','none');}
      else if(kind==='whiteboard'){face([[.18,.101,28],[.82,.101,28],[.82,.101,57],[.18,.101,57]],'#f0ebce','#cabc9c');phase=2;stroke([[.26,.111,48],[.43,.111,48],[.43,.111,37],[.7,.111,37]],'#7a9987',1.8);}
      else for(let a=0;a<3;a++)for(let b=0;b<3;b++)face([[.2+a*.2,.111,29+b*10],[.29+a*.2,.111,34+b*10],[.38+a*.2,.111,29+b*10],[.29+a*.2,.111,25+b*10]],'#95a28a','#76876f');break;
    }
    case'mat':slab(.08,.08,39,1.84,1.84,'#75988a','#c7bb91');phase=1;for(let i=.35;i<1.9;i+=.3){stroke([[i,.12,39.2],[i,1.88,39.2]],'#a8baa0',.6);stroke([[.12,i,39.2],[1.88,i,39.2]],'#a8baa0',.6);}break;
    case'dice':for(const[x,y,color]of[[.3,.35,'#bd8269'],[.57,.6,'#d9bb83']]){box(x,y,39,.18,.18,9,color,color,'#9a7958');disk(x+.09,y+.09,48.2,.024,'#5f5346');}break;
    case'miniatures':for(const[x,y,c]of[[.3,.3,'#b78a71'],[.6,.45,'#92a48a'],[.4,.7,'#a6a079']]){cylinder(x,y,39,.11,2,'#887e65','#69664f');box(x-.04,y-.04,41,.08,.08,10,c,c,c);cylinder(x,y,51,.04,4,'#e1c698','#c4a479');}break;
    case'screen':face([[.13,.3,39],[.38,.2,39],[.38,.2,63],[.13,.3,63]],'#a98b62');face([[.38,.2,39],[.65,.2,39],[.65,.2,63],[.38,.2,63]],'#c0a16e');face([[.65,.2,39],[.9,.3,39],[.9,.3,63],[.65,.2,63]],'#9d805a');for(const z of[47,53,58])stroke([[.43,.211,z],[.6,.211,z]],'#e8cf9c',1.1);break;
    case'tablet':slab(.25,.2,40,.5,.6,'#546d64','#3e544c');phase=1;slab(.29,.24,40.4,.42,.48,'#b7caaa','#819b85');phase=2;for(const y of[.32,.43,.54])stroke([[.35,y,40.6],[.63,y,40.6]],'#739282',1.3);break;
    default:box(.15,.15,0,w-.3,h-.3,25);
  }
  faces.sort((a,b)=>(a.phase??0)-(b.phase??0)||a.depth-b.depth||a.order-b.order);
  const corners=[p([0,0,0]),p([w,0,0]),p([w,h,0]),p([0,h,0])];all.push(...corners);
  const left=Math.floor(Math.min(...all.map(q=>q.x)))-3,top=Math.floor(Math.min(...all.map(q=>q.y)))-3;
  const right=Math.ceil(Math.max(...all.map(q=>q.x)))+3,bottom=Math.ceil(Math.max(...all.map(q=>q.y)))+3;
  return{left,top,width:right-left,height:bottom-top,html:faces.map(f=>f.html).join('')};
}

export function layoutObjectSVG(kind,rotation=0,state={}) {
  const art=objectDrawing(kind,rotation,state);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="layout-furniture-svg" viewBox="${art.left} ${art.top} ${art.width} ${art.height}" aria-hidden="true" focusable="false">${art.html}</svg>`;
}
function objectArtAt(object,origin,state={}){
  const art=objectDrawing(object.kind,object.rotation,state),anchor=project(object.x,object.y);
  return{art,left:anchor.x+art.left-origin.x,top:anchor.y+art.top-origin.y};
}
export function layoutObjectPreview(object,origin={x:0,y:0}) {
  const{art,left,top}=objectArtAt(object,origin);
  return `<span class="layout-iso-ghost" style="position:absolute;left:${left}px;top:${top}px;width:${art.width}px;height:${art.height}px">${layoutObjectSVG(object.kind,object.rotation)}</span>`;
}

function objectStatus(club,object){
  const state=visualObjectState(club,object.id),flags=state?.flags??[];
  return{...state,flags,empty:flags.some(f=>f.kind==='empty')&&!flags.some(f=>f.kind==='unsafe'||f.kind==='isolated'),expired:flags.some(f=>f.kind==='unsafe'||f.kind==='isolated'),off:flags.some(f=>f.kind==='off'),broken:flags.some(f=>f.kind==='broken'),repair:flags.some(f=>f.kind==='repair')};
}
function seatLabelSide(club,room,object){
  const table=club.layout.objects.find(item=>item.roomId===room.id&&BUILD_CATALOG[item.kind]?.family==='table');
  const box=table?cellBounds(objectCells(table)):cellBounds(club.layout.rooms.find(item=>item.id===room.id).cells);
  return project(object.x+.5,object.y+.5).x<project(box.x+box.w/2,box.y+box.h/2).x?'left':'right';
}
const sprite=guest=>`<span class="map-person" aria-hidden="true">${graphicPortrait(guest.identity,{mini:true})}</span>`;
function guestChair(club,room,object,selected,available,position){
  const seat=object.seat,guest=roomOccupants(club,room.id).find(p=>p.seat===seat),running=room.status==='running';
  const locked=running||!available||lockedGuest(club,selected),name=guest?.profile?.name??guest?.identity?.name;
  const attrs=guest?`data-guest="${esc(guest.id)}"${running?'':` data-drag-guest="${esc(guest.id)}"`} aria-label="${esc(name)}, комната ${esc(room.number)}, стул ${seat+1}"`:`data-place="${esc(room.id)}" aria-label="Посадить в комнате ${esc(room.number)}, стул ${seat+1}"${locked?' disabled':''}`;
  return `<button type="button" class="map-chair chair-${seat} label-${seatLabelSide(club,room,object)}${guest?' occupied':''}${guest?.id===selected?.id?' chosen':''}" data-seat="${seat}" ${attrs} title="${guest?esc(name):'Свободный стул'}" style="left:${position.x-32}px;top:${position.y-75}px">${guest?sprite(guest):'<span class="empty-seat">+</span>'}<span class="chair-label">${guest?esc(name):'свободно'}</span></button>`;
}
function masterChair(club,room,object,position){
  const present=room.status==='running',label=`${present?'Мастер':'Назначен мастер'} ${room.master.name}`;
  const visual=present?`<span class="master-visual"><span class="master-figure">${graphicPortrait(room.master.identity,{mini:true})}</span></span>`:'<span class="master-visual master-away" aria-hidden="true"><span class="master-mark">◇</span></span>';
  return `<button class="master-seat label-${seatLabelSide(club,room,object)}" data-inspect="${esc(room.id)}" type="button" title="${esc(label)}" aria-label="${esc(label)}" style="left:${position.x-32}px;top:${position.y-75}px">${visual}<span class="master-name">${esc(room.master.name)}</span></button>`;
}

function roomPlaque(club,physical,room,readiness,campaign,origin){
  const box=cellBounds(physical.cells),staff=physical.purpose==='staff',anchor=staff?project(box.x+box.w/2,box.y+box.h):project(box.x+box.w/2,box.y),count=room?roomOccupants(club,room.id).length:0,housekeeping=visualRoomState(club,physical.id);
  const running=room?.status==='running',preparation=staff?{ready:true}:roomPreparation(club,physical.id);
  const ready=!staff&&preparation.ready&&readiness.ok&&count===4&&room?.session&&room?.master&&room.status==='seating'&&(!campaign||campaign.enabled&&campaign.assignment.ok&&campaign.start.ok);
  const state=staff?(readiness.ok?'Отдых':'Обустройство'):running?`Игра до ${clockText(room.run?.endsAt??club.clock)}`:!preparation.ready?`${preparation.queued?'В очереди · готовность':'Подготовка до'} ${clockText(preparation.endsAt)}`:housekeeping.cleaning?'Идёт уборка':housekeeping.queued?'Уборка после игры':housekeeping.dirty?'Нужна уборка':campaign&&!campaign.enabled?'Комната отключена':!readiness.ok?'Обустройство':campaign&&!campaign.assignment.ok?'Комната не настроена':`${count}/4 гостей${room?.master?' · мастер назначен':' · нужен мастер'}`;
  const reasons=[...readiness.reasons];
  if(housekeeping.dirty&&!housekeeping.cleaning)reasons.push('В комнате грязно: нужна уборка.');
  if(campaign&&!running&&!staff){if(!campaign.enabled)reasons.unshift('Включите комнату в управлении.');else if(!campaign.assignment.ok&&campaign.assignment.reason)reasons.push(campaign.assignment.reason);else if(!campaign.start.ok&&campaign.start.reason)reasons.push(campaign.start.reason);}
  const issue=reasons.length?`<small class="layout-room-issue" title="${esc(reasons.join(' · '))}">${esc(reasons[0])}</small>`:'';
  const manage=campaign&&!staff?`<button type="button" class="layout-manage-room" data-manage-room="${esc(physical.id)}">Управление</button>`:'';
  const title=esc(physical.name||`Комната ${physical.number??''}`);
  if(staff)return `<header class="layout-room-plaque layout-staff-plaque" style="--plaque-x:${anchor.x-origin.x}px;top:${anchor.y-origin.y+32}px"><span class="layout-room-title">${title}</span>${issue}</header>`;
  const heading=room?.session?`<button type="button" class="layout-room-game" data-system="${esc(room.session.systemId)}" aria-label="${title}: справочник ${esc(room.session.game)}"><span class="layout-room-title">${title}</span><span>${esc(room.session.game)}</span></button>`:`<div class="layout-room-game"><span class="layout-room-title">${title}</span><span>Игра не назначена</span></div>`;
  return `<header class="layout-room-plaque layout-strip-card${running?' is-running':''}" data-room-card="${esc(physical.id)}">${heading}<span class="layout-room-state"${!preparation.ready?` title="${esc(preparation.reason)}"`:''}>${esc(state)}</span>${issue}<div class="layout-room-actions">${manage}${ready?`<button type="button" class="layout-start-room" data-start-room="${esc(room.id)}">Начать игру</button>`:''}</div></header>`;

}

function groundSVG(layout,origin,width,height){
  const local=p=>({x:p.x-origin.x,y:p.y-origin.y});
  const poly=(vertices,fill,stroke='#c4a276',sw=1,extra='')=>polygon(vertices.map(local),fill,stroke,sw,extra);
  const seg=vertices=>vertices.map(([x,y,z=0])=>local(project(x,y,z)));
  const plots=layout.plots.map(plot=>{
    const{x,y,w,h}=plot,a=project(x,y),b=project(x+w,y),c=project(x+w,y+h),d=project(x,y+h);
    return `<g data-plot="${esc(plot.id)}">${poly([b,c,{x:c.x,y:c.y+8},{x:b.x,y:b.y+8}],'#a79b80','#8a7d64')}${poly([d,c,{x:c.x,y:c.y+8},{x:d.x,y:d.y+8}],'#b8aa8d','#8a7d64')}${poly([a,b,c,d],'#d5d2bd','#aca88f',1.5)}</g>`;
  }).join('');
  const floors=layout.floors.map(cell=>{
    const{x,y}=cell,tile=cell.finish==='tile';
    const base=poly(cellPolygon(x,y),tile?'#d6dcc6':(x+y)%2?'#d9b98b':'#d2ae7f',tile?'#aeb9a4':'#ba9569',.75);
    const detail=tile?line(seg([[x+.5,y],[x+.5,y+1]]),'#b8c4ae',.7)+line(seg([[x,y+.5],[x+1,y+.5]]),'#b8c4ae',.7):[.33,.66].map(b=>line(seg([[x,y+b],[x+1,y+b]]),'#b99264',.8)).join('')+line(seg([[x+.35,y],[x+.35,y+.33],[x+.35,y+.33]]),'#b99264',.8)+line(seg([[x+.66,y+.33],[x+.66,y+.66]]),'#b99264',.8)+line(seg([[x+.14,y+.17],[x+.5,y+.17]]),'#edcfa1',1.1);
    return `<g class="layout-floor-${tile?'tile':'wood'}" data-cell="${x},${y}">${base}${detail}</g>`;
  }).join('');
  const zones=layout.rooms.map(room=>{
    const cells=new Set(room.cells.map(c=>`${c.x},${c.y}`)),edges=[];
    for(const c of room.cells)for(const[dx,dy,axis,ax,ay]of[[0,-1,'h',0,0],[0,1,'h',0,1],[-1,0,'v',0,0],[1,0,'v',1,0]])if(!cells.has(`${c.x+dx},${c.y+dy}`))edges.push(line(edgePoints({x:c.x+ax,y:c.y+ay,axis}).map(local),room.purpose==='staff'?'#71998a':'#7e946e',1.8,'stroke-dasharray="5 4"'));
    return `<g class="layout-room-area" data-room-area="${esc(room.id)}">${edges.join('')}</g>`;
  }).join('');
  const entry=layout.entry?(()=>{const{x,y}=layout.entry;return poly(cellPolygon(x,y),'#a6b69a','#70846a')+line(seg([[x+.5,y+.8,1],[x+.5,y+.2,1],[x+.3,y+.4,1],[x+.5,y+.2,1],[x+.7,y+.4,1]]),'#f0e7c7',3);})():'';
  return `<svg class="layout-ground" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${plots}${floors}${zones}${entry}</svg>`;
}

function wallHTML(wall,layout,origin,depth){
  const rooms=layout.rooms,behind=wall.axis==='h'?{x:wall.x,y:wall.y-1}:{x:wall.x-1,y:wall.y},front={x:wall.x,y:wall.y};
  const has=c=>rooms.some(r=>r.cells.some(p=>p.x===c.x&&p.y===c.y));
  const cut=has(behind),height=cut?12:68;
  const points=[];let html='';
  const q=(t,z,side=0)=>{const p=wall.axis==='h'?project(wall.x+t,wall.y+side,z):project(wall.x+side,wall.y+t,z);const local={x:p.x-origin.x,y:p.y-origin.y};points.push(local);return local;};
  const face=(a,b,z1,z2,color)=>polygon([q(a,z1),q(b,z1),q(b,z2),q(a,z2)],color,'#9c8a6c',.9);
  const segment=(a,b)=>face(a,b,0,height,wall.axis==='h'?'#e6dbc0':'#d4c5a5')+polygon([q(a,height,-.05),q(b,height,-.05),q(b,height,.05),q(a,height,.05)],'#f2e5c7','#b7a582',.9)+face(a,b,0,5,'#bda37a');
  if(wall.kind==='door'||wall.kind==='wideDoor'){
    const a=wall.kind==='wideDoor'?.1:.21,b=1-a;
    html=segment(0,a)+segment(b,1)+polygon([q(a,0,-.06),q(b,0,-.06),q(b,0,.06),q(a,0,.06)],'#c8ac7f','#a58b66',1);
    // The open leaf rotates on the floor plane; it does not fill the doorway.
    const hinge=wall.axis==='h'?[wall.x+a,wall.y]:[wall.x,wall.y+a],tip=wall.axis==='h'?[hinge[0]+.13,hinge[1]+(b-a)*.8]:[hinge[0]+(b-a)*.8,hinge[1]+.13];
    const leaf=[project(...hinge,0),project(...tip,0),project(...tip,cut?12:51),project(...hinge,cut?12:51)].map(p=>({x:p.x-origin.x,y:p.y-origin.y}));points.push(...leaf);html+=polygon(leaf,'#b48c60','#866545',1.2);
  }else if(wall.kind==='window'&&!cut){
    html=face(0,1,0,23,'#d8c9a9')+face(0,.13,23,height,'#e5d8b9')+face(.87,1,23,height,'#e5d8b9')+face(.13,.87,23,55,'#b1cec4')+face(0,1,55,height,'#e4d8ba')+line([q(.5,23),q(.5,55)],'#f6ead0',2.4)+line([q(.16,40),q(.84,40)],'#f2e9d0',2);
  }else{html=segment(0,1);if(wall.kind==='window')html+=line([q(.15,height+1),q(.85,height+1)],'#a7c8c0',4);}
  const left=Math.min(...points.map(p=>p.x))-4,top=Math.min(...points.map(p=>p.y))-4,w=Math.max(...points.map(p=>p.x))-left+4,h=Math.max(...points.map(p=>p.y))-top+4;
  return `<svg class="layout-iso-wall${cut?' is-cutaway':''}" data-wall="${esc(wall.id)}" data-wall-kind="${esc(wall.kind)}" width="${w}" height="${h}" viewBox="${left} ${top} ${w} ${h}" style="left:${left}px;top:${top}px;z-index:${depth}" aria-hidden="true">${html}</svg>`;
}

// Floor footprints determine the painter order across room boundaries. Tabletop
// pieces follow their host, rather than slipping behind it at their own far corner.
export function layoutDepthOrder(layout){
  const entries=layout.objects.filter(o=>BUILD_CATALOG[o.kind]?.layer!=='tabletop').map((object,index)=>{
    const box=cellBounds(objectCells(object)),art=objectDrawing(object.kind,object.rotation),p=project(object.x,object.y);
    return{object,index,box,rect:{x:p.x+art.left,y:p.y+art.top,w:art.width,h:art.height},next:new Set(),incoming:0};
  });
  const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j];if(!overlap(a.rect,b.rect))continue;
    const A=a.box,B=b.box,ab=A.x+A.w<=B.x||A.y+A.h<=B.y,ba=B.x+B.w<=A.x||B.y+B.h<=A.y;
    if(ab&&!ba){a.next.add(b);b.incoming++;}else if(ba&&!ab){b.next.add(a);a.incoming++;}
  }
  const depth=e=>e.box.x+e.box.y+(e.box.w+e.box.h)/2;
  const remaining=new Set(entries),result=[];
  while(remaining.size){
    const candidates=[...remaining].filter(e=>!e.incoming);
    // A rare cyclic overlap has no complete painter solution. A stable fallback
    // prevents flicker without changing model geometry or room stacking contexts.
    const chosen=(candidates.length?candidates:[...remaining]).sort((a,b)=>depth(a)-depth(b)||a.index-b.index)[0];
    remaining.delete(chosen);result.push(chosen.object);for(const e of chosen.next)e.incoming--;
  }
  for(const object of layout.objects.filter(o=>BUILD_CATALOG[o.kind]?.layer==='tabletop')){
    const host=result.findIndex(o=>BUILD_CATALOG[o.kind]?.family==='table'&&objectCells(object).every(c=>objectCells(o).some(p=>p.x===c.x&&p.y===c.y)));
    let at=host+1;while(at<result.length&&BUILD_CATALOG[result[at].kind]?.layer==='tabletop')at++;
    result.splice(host<0?result.length:at,0,object);
  }
  return new Map(result.map((o,i)=>[o.id,100+i*10]));
}

export function layoutMapHTML(club,selected,departures=[]){
  const layout=club.layout,area=bounds(layout),view=projectedBounds(layout),origin={x:view.x,y:view.y},assigned=new Set(),depths=layoutDepthOrder(layout),staffStatus=staffRoomStatus(club),waitingStatus=guestWaitingStatus(club);
  const roomData=new Map();
  for(const physical of layout.rooms.filter(r=>r.cells.length)){
    const source=club.rooms.find(r=>r.id===physical.id),staff=physical.purpose==='staff';
    const readiness=staff?{...(staffStatus.rooms.find(r=>r.id===physical.id)??{ok:false,reasons:[]}),blocked:[]}:roomReadiness(layout,physical.id);
    const assignment=club.campaign&&!staff?roomAssignment(club,physical.id):null;
    const campaign=assignment?{enabled:(assignment.enabled??source?.enabled)!==false,assignment,start:startQuote(club,physical.id)}:null;
    const room=campaign&&source?{...source,session:assignment.game?assignment.session??null:null,master:assignment.staff?assignment.master??null:null}:source;
    roomData.set(physical.id,{physical,room,readiness,campaign,available:!staff&&(!campaign||campaign.enabled&&campaign.assignment.ok&&readiness.ok)});
  }
  function furniture(object,data){
    const{room,available}=data??{},item=BUILD_CATALOG[object.kind],state=objectStatus(club,object),{art,left,top}=objectArtAt(object,origin,state);
    const center=project(object.x+cellBounds(objectCells(object)).w/2,object.y+cellBounds(objectCells(object)).h/2),position={x:center.x-origin.x-left,y:center.y-origin.y-top};
    const guestSeat=room&&item?.family==='chair'&&object.role!=='master'&&Number.isInteger(object.seat),masterSeat=room?.master?.identity&&item?.family==='chair'&&object.role==='master';
    let person=guestSeat?guestChair(club,room,object,selected,available,position):masterSeat?masterChair(club,room,object,position):'';
    if(item?.family==='staffSeat')for(const assignment of staffStatus.assignments.filter(a=>a.seat?.objectId===object.id&&staffCanRest(club,a.masterId))){
      const master=club.staff.find(m=>m.id===assignment.masterId),identity=master?.identity??master;if(!identity?.portrait)continue;
      const p=project(assignment.seat.x+.5,assignment.seat.y+.5),assignedRoom=club.rooms.find(r=>r.masterId===master.id);
      person+=`<${assignedRoom?'button':'span'} ${assignedRoom?`type="button" data-inspect="${esc(assignedRoom.id)}"`:''} class="master-seat staff-resting label-left" aria-label="${esc(master.name)}, отдыхает" title="${esc(master.name)}, отдыхает" style="left:${p.x-origin.x-left-32}px;top:${p.y-origin.y-top-75}px"><span class="master-visual"><span class="master-figure">${graphicPortrait(identity,{mini:true})}</span></span><span class="master-name">${esc(master.name)}</span></${assignedRoom?'button':'span'}>`;
    }
    if(item?.family==='waitingSeat')for(const assignment of waitingStatus.assignments.filter(a=>a.seat?.objectId===object.id)){
      const guest=club.guests.find(g=>g.id===assignment.guestId),p=project(assignment.seat.x+.5,assignment.seat.y+.5),name=guest.profile.name;
      person+=`<button type="button" class="map-chair waiting-seat occupied${guest.id===selected?.id?' chosen':''}" data-guest="${esc(guest.id)}" data-drag-guest="${esc(guest.id)}" data-waiting-seat="${assignment.seat.seatIndex}" aria-label="${esc(name)}, сидит в ожидании игры" title="${esc(name)}, сидит в ожидании игры" style="left:${p.x-origin.x-left-32}px;top:${p.y-origin.y-top-75}px">${sprite(guest)}<span class="chair-label">${esc(name)}</span></button>`;
    }
    const priority=['unsafe','broken','repair','isolated','closed','off','soon','empty'],flag=[...state.flags].sort((a,b)=>priority.indexOf(a.kind)-priority.indexOf(b.kind))[0];
    const stateText=state.flags.map(f=>f.label).join(' · '),stateKind=flag?.kind;
    const symbol=({repair:'⚒',broken:'!',off:'○',closed:'—',isolated:'▣',unsafe:'!',soon:'◷',empty:'∅'})[stateKind]??'';
    return `<div class="layout-object layout-object--${esc(object.kind)} layout-layer-${esc(item?.layer??'floor')}${guestSeat||masterSeat||item?.family==='waitingSeat'?' layout-seat-object':''}${state.off?' is-off':''}${state.broken?' is-broken':''}${state.repair?' is-repairing':''}" data-object="${esc(object.id)}" data-kind="${esc(object.kind)}" title="${esc(item?.name??object.kind)}${stateText?' · '+stateText:''}" style="left:${left}px;top:${top}px;width:${art.width}px;height:${art.height}px;z-index:${depths.get(object.id)}"><span class="layout-object-art">${layoutObjectSVG(object.kind,object.rotation,state)}</span>${person}${stateText?`<span class="layout-object-state" title="${esc(stateText)}" aria-label="${esc(stateText)}">${symbol}<span>${esc(flag.label)}</span></span>`:''}</div>`;
  }
  const rooms=[...roomData.values()].map(data=>{
    const{physical,room,readiness,campaign,available}=data,cells=new Set(physical.cells.map(c=>`${c.x},${c.y}`));
    const objects=layout.objects.filter(o=>o.roomId===physical.id||!o.roomId&&objectCells(o).every(c=>cells.has(`${c.x},${c.y}`)));
    objects.forEach(o=>assigned.add(o.id));
    const leaving=departures.find(d=>d.roomId===physical.id);
    const departure=leaving?leaving.guests.map(guest=>{const seat=objects.find(o=>o.role!=='master'&&o.seat===guest.seat);if(!seat)return'';const p=project(seat.x+.5,seat.y+.5);return`<div class="departing layout-departing" role="img" aria-label="${esc(guest.profile.name)}, уходит" style="left:${p.x-origin.x-32}px;top:${p.y-origin.y-75}px;z-index:850">${sprite(guest)}<span>${esc(guest.profile.name)}</span></div>`;}).join(''):'';
    const blocked=(readiness.blocked??[]).map(c=>{const p=project(c.x+.5,c.y+.5);return`<span class="layout-iso-blocked" title="Оставьте проход к игровому стулу" style="left:${p.x-origin.x}px;top:${p.y-origin.y}px">!</span>`;}).join('');
    return `<section class="layout-room ${room?.status==='running'?'is-running':available?'is-open':'is-dormant'}${physical.purpose==='staff'?' is-staff-room':''}" data-room="${esc(physical.id)}" aria-label="${esc(physical.name||'Комната '+physical.number)}"><div class="room-floor">${objects.map(o=>furniture(o,data)).join('')}${departure}${blocked}</div>${physical.purpose==='staff'?roomPlaque(club,physical,room,readiness,campaign,origin):(()=>{const box=cellBounds(physical.cells),p=project(box.x+box.w/2,box.y);return`<span class="layout-room-marker" data-room-marker="${esc(physical.id)}" title="${esc(physical.name||'Комната '+physical.number)}" style="left:${p.x-origin.x}px;top:${p.y-origin.y-78}px">${esc(physical.number??physical.name)}</span>`;})()}</section>`;
  }).join('');
  const shared=layout.objects.filter(o=>!assigned.has(o.id)).map(o=>furniture(o,null)).join('');
  const roomCells=new Set(layout.rooms.flatMap(r=>r.cells.map(c=>`${c.x},${c.y}`)));
  const commonCells=layout.plots.flatMap(plot=>Array.from({length:plot.w*plot.h},(_,i)=>({x:plot.x+i%plot.w,y:plot.y+Math.floor(i/plot.w)}))).filter(c=>!roomCells.has(`${c.x},${c.y}`));
  const housekeeping=[...layout.rooms,...(commonCells.length?[{id:'common',cells:commonCells}]:[])].map(room=>{
    const state=visualRoomState(club,room.id);if(!state.dirty&&!state.cleaning&&!state.queued)return'';
    const cells=room.cells.filter(c=>!layout.objects.some(o=>BUILD_CATALOG[o.kind]?.layer==='floor'&&objectCells(o).some(p=>p.x===c.x&&p.y===c.y)));
    const stains=state.dirty?cells.filter((c,i)=>i%3===0).map(c=>{const p=project(c.x+.5,c.y+.5);return`<ellipse cx="${p.x-origin.x}" cy="${p.y-origin.y}" rx="11" ry="5" fill="#8e795a" opacity=".3"/><path d="M${p.x-origin.x+13} ${p.y-origin.y-4}l5 2 -3 3 -5 -2Z" fill="#eee3c4" stroke="#ae9571" stroke-width=".7"/>`;}).join(''):'';
    const c=(room.id==='common'?layout.entry:null)??cells[0]??room.cells[0],p=project(c.x+.5,c.y+.5),label=state.cleaning?'Идёт уборка':state.queued?'Уборка после игры':'Нужна уборка';
    return`<svg class="layout-dirt" width="${view.w}" height="${view.h}" aria-hidden="true">${stains}</svg>${state.cleaning||state.queued?`<span class="layout-cleaning-sign" title="${label}" style="left:${p.x-origin.x}px;top:${p.y-origin.y-18}px" aria-label="${label}"><svg viewBox="0 0 30 34" aria-hidden="true"><path d="M9 4h12l7 27H2Z" fill="#d5b467" stroke="#947341"/><path d="M12 11h6l3 13H9Z" fill="#f0d796"/><path d="M15 12v7m0 3v1" stroke="#8a673a" stroke-width="2"/></svg></span>`:''}${room.id==='common'?`<span class="layout-zone-state" style="left:${p.x-origin.x}px;top:${p.y-origin.y-42}px">${label}</span>`:''}`;
  }).join('');
  const wallDepth=wall=>{
    const p=wall.axis==='h'?{x:wall.x+.5,y:wall.y}:{x:wall.x,y:wall.y+.5};
    let z=90;for(const o of layout.objects){const box=cellBounds(objectCells(o));if(box.x+box.y+(box.w+box.h)/2<=p.x+p.y)z=Math.max(z,depths.get(o.id)+1);}return z;
  };
  const walls=layout.walls.map(w=>wallHTML(w,layout,origin,wallDepth(w))).join('');
  const gameRooms=[...roomData.values()].filter(data=>data.physical.purpose!=='staff');
  const cards=gameRooms.map(({physical,room,readiness,campaign})=>roomPlaque(club,physical,room,readiness,campaign,origin)).join('');
  const strip=cards?`<div class="layout-room-strip-wrap"><div class="layout-room-strip" aria-label="Игровые комнаты; стрелки влево и вправо — другие комнаты" tabindex="0">${cards}</div><div class="layout-room-pages" aria-label="Страницы комнат"><button type="button" data-room-page="previous" aria-label="Предыдущие комнаты">←</button><span data-room-page-status aria-live="polite">Комнаты</span><button type="button" data-room-page="next" aria-label="Следующие комнаты">→</button></div></div>`:'';
  const content=`<div class="layout-content" style="width:${view.w}px;height:${view.h}px">${groundSVG(layout,origin,view.w,view.h)}${housekeeping}${rooms}${shared}${walls}</div>`;
  return `<div class="layout-view-tools" aria-label="Масштаб клуба"><span class="layout-map-caption">Мой клуб</span><button type="button" data-map-zoom="out" aria-label="Уменьшить">−</button><button type="button" data-map-zoom="fit" aria-label="Показать весь клуб">Весь клуб</button><button type="button" data-map-zoom="in" aria-label="Увеличить">+</button></div>${strip}<p class="layout-waiting-summary" data-waiting-summary>Ожидание: сидят ${waitingStatus.occupied} из ${waitingStatus.capacity} мест · стоят ${waitingStatus.standing}. Места занимаются по очереди прихода.</p><div class="layout-viewport" tabindex="0" aria-label="Клуб, прокрутка"><div class="layout-stage"><div class="layout-world" data-projection="isometric" data-origin-x="${area.x}" data-origin-y="${area.y}" data-base-origin-x="${area.x}" data-base-origin-y="${area.y}" data-projection-min-x="${view.x}" data-projection-min-y="${view.y}" data-base-projection-min-x="${view.x}" data-base-projection-min-y="${view.y}" data-base-width="${view.w}" data-base-height="${view.h}" data-tile="${TILE}" style="width:${view.w}px;height:${view.h}px">${content}<div class="layout-preview"></div></div></div></div>`;
}
