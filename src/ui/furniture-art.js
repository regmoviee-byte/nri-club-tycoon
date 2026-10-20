import {BUILD_CATALOG} from '../data/build-catalog.js';
import {project} from './seat-frame.js';
import {solidArt} from './isometric-solids.js';
import {softBlock as block,cylinder,tapered,disk,flat,transformFaces,shade,lathe} from './model-art.js';
const cache=new Map();
const path=(d,fill,stroke='',width=1)=>'<path d="'+d+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+width+'"':'')+'/>';
const line=(d,color,width=1)=>path(d,'none',color,width);
const rect=(x,y,w,h,color,r=0,stroke='')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+color+'"'+(stroke?' stroke="'+stroke+'" stroke-width=".65"':'')+'/>';
const text=(s,x,y,size=3.5,color='#e8dcc0')=>'<text x="'+x+'" y="'+y+'" font-family="Segoe UI,sans-serif" font-size="'+size+'" text-anchor="middle" fill="'+color+'">'+s+'</text>';

function model(kind,rotation){
 const spec=BUILD_CATALOG[kind],w=spec.width,d=spec.height,faces=[],decals=[];
 const add=(...f)=>faces.push(...f),P=(x,y,z)=>{const a=rotation*Math.PI/2;return project(x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z);};
 function front(art,depth=.34,width=.8,back=false){const a=rotation*Math.PI/2,normal={x:(back?1:-1)*Math.sin(a),y:(back?-1:1)*Math.cos(a)};if(normal.x+normal.y<.5)return;const p=P(0,depth*(back?-1:1),0),q=P(width/32,0,0);decals.push('<g transform="matrix('+q.x+' '+q.y+' 0 1 '+p.x+' '+p.y+')">'+art+'</g>');}
 function top(art,z=30,width=.8,depth=.65){const p=P(0,0,z),a=P(width/32,0,0),b=P(0,depth/32,0);decals.push('<g transform="matrix('+a.x+' '+a.y+' '+b.x+' '+b.y+' '+p.x+' '+p.y+')">'+art+'</g>');}
 const foot=(width=.72,depth=.58)=>{for(const x of [-width/2,width/2])for(const y of [-depth/2,depth/2])add(...block(x,y,0,.065,.065,3,'#4a5149','rubber-foot'));};
 function cabinet(width=.8,depth=.65,height=27,color='#b7bba6'){
  foot(width-.13,depth-.13);add(...block(0,0,2.5,width,depth,height-2.5,color,'cabinet'),...block(0,0,height,width+.045,depth+.045,1.8,'#d6ccac','worktop'));
  front(rect(-14,-height+3,28,height-7,'#a5afa0',1,'#798e81')+line('M0 '+(-height+3)+'V-4','#778c80',.6)+line('M-3-17q-2 0-2 2v3q0 2 2 2M3-17q2 0 2 2v3q0 2-2 2','#e1dcc0',1.3)+line('M-12-5h24','#7d8d7d',.7),depth/2+.003,width);
  front(rect(-12,-height+5,24,height-10,'#a0aa9c',.6)+line('M-11-7h22M-11-10h22','#7b8f82',.5),depth/2+.003,width,true);
 }

 if(kind==='reception'){
  add(...block(0,0,1,w-.12,d-.12,32,'#6e8377','reception-panel'),...block(0,-.035,33,w-.04,d-.04,2.5,'#9e7957','counter-edge'),...tapered(0,-.035,35.5,w-.04,d-.04,w-.07,d-.07,1.5,'#d7b887','countertop'));
  front(rect(-14,-29,28,25,'#536e64',1,'#b8a578')+line('M-12-5h24M-12-28h24','#bcaa7e',.5)+path('M-2-22l2-3 2 3-2 4Z','none','#d8bd83',.7)+text('НРИ / КЛУБ',0,-11,3.3)+line('M-12-6h24','#dbc590',1.2),.442,w-.12);
  front(rect(-14,-29,28,24,'#697c71',1)+line('M0-27v20M-3-18v5M3-18v5','#c8c9ab',.65),.442,w-.12,true);
 }else if(['shelf','shelfLarge'].includes(kind)){
  const width=w-.12,depth=.43;add(...block(0,-.2,2,width,.035,50,'#79644f','shelf-back'));
  for(const x of [-width/2,width/2])add(...block(x,0,1,.055,depth,52,'#ac8962','shelf-side'));
  for(const z of [2,18.5,35,51])add(...block(0,0,z,width,depth,1.6,'#c2a079','shelf-board'));
  const colors=['#ad6559','#768e88','#d1b47a','#718292','#a19186','#7c7969'];
  for(let row=0;row<3;row++)for(let i=0;i<Math.round(width*8);i++){const x=-width/2+.08+i*.115,height=9+(i*5+row*3)%6;if(x+.045>width/2-.035)continue;const z=3.7+row*16.5;add(...block(x,.075,z,.077,.23,height,colors[(i+row)%colors.length],'book'));add(flat([[x-.024,.192,z+height-2],[x+.024,.192,z+height-2],[x+.024,.192,z+height-1.6],[x-.024,.192,z+height-1.6]],'#e4d2a9','book-label'));add(flat([[x-.024,.192,z+2],[x+.024,.192,z+2],[x+.024,.192,z+2.4],[x-.024,.192,z+2.4]],'#cbb78f','book-binding'));}
  if(kind==='shelfLarge')for(let i=0;i<2;i++)add(...block(-.48+i*.05,0,52.6+i*1.8,.46,.30,1.7,['#748b7b','#b28968'][i],'stacked-rulebook'));
 }else if(kind==='kitchen'){
  cabinet(1.8,.76,29,'#a2b2a6');top('<ellipse cx="-7" cy="0" rx="6.2" ry="8" fill="#637e79" stroke="#c1cbb9" stroke-width="1.1"/><ellipse cx="-7" cy="0" rx="4.9" ry="6.6" fill="#90a49a"/><circle cx="-7" cy="1" r="1" fill="#586f6b"/>'+rect(4,-10,10,18,'#bb9769',1)+line('M6-8v13M9-7v10M12-7v12','#a8865d',.5),30.84,1.8,.76);
  front(line('M-8-31v-10q0-5 6-5q5 0 5 5v3','#657d7b',1.7),-.06,1.8);add(...cylinder(.58,.18,30.8,.075,.065,6.5,'#7d9387',10,'utensil-cup'));
  front(line('M9-37v-7M10.5-37v-9M11.5-37v-6','#c5c6a8',.8),.245,1.8);
 }else if(kind==='water'){
  foot(.42,.38);add(...tapered(0,0,2,.58,.5,.55,.46,30,'#d2d6bf','cooler-body'),...block(0,0,31.8,.57,.48,2,'#8b9f98','cooler-top'));
  add(...lathe(0,0,33,[[.07,0],[.11,1],[.165,3],[.175,5],[.17,14],[.15,16],[.09,19],[.065,19.7]],'#a4c7c5','water-bottle'),...cylinder(0,0,52.7,.068,.068,1.2,'#648d8c',20,'bottle-cap'));front(line('M-5-38v10M-6-45v5','#d6e3d6',1.3)+line('M-7-34h14','#7fafa9',.6),.14,.75);
  front(rect(-12,-28,24,12,'#617c78',2)+rect(-8,-23,5,3,'#8aaeb2',.7)+rect(3,-23,5,3,'#bc7765',.7)+line('M-5-20v3M5-20v3','#dce0c9',1.2)+rect(-9,-14,18,2,'#657f79',.6)+line('M-8-8h16M-8-6h16','#8c9f95',.6),.251,.58);
 }else if(['kettle','coffee','coffeeAuto','cookies'].includes(kind)){
  cabinet(.78,.62,27,'#9eafa4');
  if(kind==='kettle'){
   add(...lathe(-.09,.03,28.8,[[.085,0],[.13,1.2],[.16,4],[.15,7.7],[.12,9.7]],'#c6d0bd','kettle-body'),...cylinder(-.09,.03,38.5,.15,.11,1.2,'#9aac9c',14,'kettle-lid'),...cylinder(-.09,.03,39.7,.025,.022,1,'#a68c60',8,'kettle-knob'));
   front(line('M-8-37q-10-2-9 5 0 5 8 4','#6e897d',1.6)+path('M1-32l7-6v3l-6 8Z','#b9c8b8','#7f9b8f',.6),.185,.78);
   add(...cylinder(.22,.08,28.8,.063,.075,4.7,'#e4d4ae',10,'tea-cup'),...cylinder(.20,-.14,28.8,.075,.075,7.5,'#7d9581',10,'tea-canister'));front(line('M-3-32v4','#e4e2ca',1)+text('ЧАЙ',0,-6,3.4),.313,.78);
  }else if(kind==='coffee'){
   add(...block(0,-.1,28.8,.55,.25,16,'#485e5b','brewer'),...block(0,.03,28.8,.58,.46,1.7,'#43554e','brew-tray'),...tapered(0,-.05,44,.58,.32,.52,.29,2.3,'#c1b293','brew-cover'),...cylinder(.02,.105,30.5,.11,.095,8,'#7b6250',12,'coffee-pot'),...cylinder(.02,.105,38.5,.095,.095,.7,'#3b504c',12,'pot-rim'));
   front(rect(-11,-44,22,5,'#8d9e8f',.8)+rect(5,-43,3,2,'#c4cf9f',.5)+line('M4-37q8-3 8 2v3q0 3-8 2','#334f4b',1.7)+text('КОФЕ',0,-6,3.5),.242,.78);
  }else if(kind==='coffeeAuto'){
   add(...tapered(0,-.055,28.8,.62,.41,.58,.38,22,'#405956','espresso-machine'),...block(0,-.04,49.9,.63,.43,1.4,'#b6bba2','machine-cap'),...cylinder(0,-.06,51.3,.16,.19,5.5,'#a48c67',12,'bean-hopper'),...cylinder(0,-.06,56.8,.19,.19,.8,'#4f6860',12,'hopper-lid'));
   for(const x of [-.12,.12])add(...cylinder(x,.18,29,.061,.072,5,'#e6d9ba',10,'espresso-cup'));
   front(rect(-12,-48,24,8,'#253f3b',1)+rect(-9,-46,11,3,'#a4c7b2',.4)+rect(6,-46,3,3,'#c5c8a3',1)+rect(-9,-38,18,1.7,'#c3c9b6',.6)+line('M-4-36v3M4-36v3','#d9d6b9',1.3)+text('ЭСПРЕССО',0,-6,2.8),.153,.62);
  }else{
   add(...cylinder(0,0,28.8,.23,.23,1.8,'#b8a173',16,'jar-base'));for(const [x,y,z]of [[-.08,-.04,31],[.07,.05,33],[-.05,.08,37],[.06,-.05,40],[-.03,.01,44]]){add(...cylinder(x,y,z,.09,.09,1.8,'#c49a5e',10,'biscuit'));for(const [dx,dy]of [[-.025,-.02],[.03,.02]])add(disk(x+dx,y+dy,z+1.83,.012,.012,'#886240','chocolate-chip',6));}
   add(...cylinder(0,0,46,.24,.24,1.5,'#ab8d5e',16,'jar-lid'),...cylinder(0,0,47.5,.04,.035,2,'#b99b66',8,'jar-knob'));
   // Glass remains transparent, so it cannot hide the biscuits like a solid.
   decals.push('<g class="cookie-jar-glass"><path d="M-11.7-46a11.7 5.85 0 0 1 23.4 0v16a11.7 5.85 0 0 1-23.4 0Z" fill="#c6dcca" fill-opacity=".18" stroke="#9fb8a7" stroke-width=".7"/>'+line('M-8-43v12','#e0e8d0',1.1)+'</g>');
   front(text('ПЕЧЕНЬЕ',0,-6,3.3),.19,.78);
  }
 }else if(kind==='fridge'){
  foot(.65,.6);add(...tapered(0,0,2,.83,.73,.80,.70,53,'#bdcbbb','fridge-body'),...block(0,0,55,.79,.69,1.4,'#d4dbc4','fridge-cap'));
  front(rect(-14,-53,28,49,'#d8dcc4',1.8,'#8da396')+line('M-13-40h26','#8ca195',.7)+rect(-11,-37,22,27,'#87aba4',1.2,'#708f88')+line('M11-46v7M11-29v9','#8a9c82',1.4)+line('M-4-47h8M0-51v8M-3-50l6 6M3-50l-6 6','#91b0a5',.7)+rect(-8,-7,16,1.5,'#91a18d',.4),.367,.83);
  front([[-6,'#c8a56f'],[0,'#a9c5af'],[6,'#c09169']].map(([x,c])=>rect(x-2.1,-28,4.2,14,c,1)+rect(x-1.1,-32,2.2,5,c,.4)+rect(x-1.2,-24,2.4,4,'#e1dabc',.2)).join('')+line('M-10-35L9-12','#c9d8c3',.6),.371,.83);
  front(rect(-12,-50,24,42,'#a1b4a5',.6)+line('M-11-12h22M-11-15h22M-11-18h22M-11-21h22','#6f8a7b',.6),.367,.83,true);
 }else if(kind==='fan'){
  add(...cylinder(0,0,0,.23,.22,2,'#526f64',16,'fan-base'),...cylinder(0,0,2,.03,.026,31,'#9daea0',10,'fan-pole'));
  const cage='<circle cy="-44" r="12.5" fill="#cad5c0" stroke="#657f73" stroke-width="1.4"/><circle cy="-44" r="10.5" fill="none" stroke="#9aafa0" stroke-width=".5"/>'+[0,120,240].map(a=>'<g transform="rotate('+a+' 0 -44)">'+path('M0-44Q-10-52-7-54Q1-58 3-48Z','#7c9b8a')+'</g>').join('')+[0,30,60,90,120,150].map(a=>'<path d="M-12-44H12" transform="rotate('+a+' 0 -44)" stroke="#a1b5a4" stroke-width=".45"/>').join('')+'<circle cy="-44" r="2.1" fill="#c9d0b1" stroke="#7d9585" stroke-width=".5"/>';
  front(cage,.025,.95);front(cage+rect(-3,-47,6,6,'#7c9684',2),.025,.95,true);
 }else if(['light','lightAdjustable'].includes(kind)){
  const dark=kind==='lightAdjustable';add(...lathe(0,0,80,[[.225,0],[.23,.7],[.212,2.2],[.16,5.6],[.108,8.9],[.09,10]],dark?'#5b7566':'#d2b675','pendant-shade'),disk(0,0,79.98,.213,.213,'#f6e2a1','diffuser',16),...cylinder(0,0,90,.028,.026,2,'#a98c56',10,'shade-cap'),...cylinder(0,0,92,.009,.009,12,'#6e7666',6,'pendant-cord'),...cylinder(0,0,103.5,.045,.06,.7,'#7f8f7a',12,'ceiling-rose'));
  front(line('M-7-82l4-6M7-82l-4-6','#e5cc91',.35),.15,.7);
 }else if(kind==='bin'){
  add(...lathe(0,0,0,[[.15,0],[.175,1],[.20,12],[.23,22],[.23,23]],'#8c9c87','bin-body'),...cylinder(0,0,22.8,.25,.25,1.6,'#637d6a',16,'bin-rim'),disk(0,0,24.42,.203,.203,'#314e45','bin-opening',16));
  front(rect(-5,-14,10,7,'#c3c9a7',.8)+path('M-2-11l2-2 2 2-2 3Z','none','#738d72',.6),.18,.56);add(...block(0,.235,0,.15,.12,1.5,'#617c68','bin-pedal'));
 }else if(kind==='plant'){
  add(...lathe(0,0,0,[[.12,0],[.145,1.2],[.20,11],[.215,14]],'#b87e62','terracotta'),...cylinder(0,0,12.5,.232,.232,2.5,'#ce9675',16,'pot-rim'),disk(0,0,15.03,.195,.195,'#645e45','pot-soil',16));
  front(line('M-7-8q7 3 14 0M-8-10q8 3 16 0','#d5a083',.5),.16,.72);
  const leaves=line('M0-15Q-2-27 1-47M0-26l-10-8M1-35l11-5','#5b7952',1.3)+path('M0-25Q-20-23-17-37Q-7-45 0-25','#799966','#536e4d',.6)+path('M1-34Q5-52 17-46Q25-32 1-34','#8ba573','#607f55',.6)+path('M1-43Q-10-53-3-61Q12-64 1-43','#759565','#526f4c',.6)+path('M0-20Q12-28 15-18Q12-10 0-20','#95af78','#6a8958',.6)+line('M-15-36L-2-27M14-43L3-36M-2-57l3 12M12-19L2-20','#b0c58f',.45);
  front(leaves,0,.85);front(leaves,0,.85,true);
 }else if(kind==='hanger'){
  add(...cylinder(0,0,0,.045,.035,48,'#8c6c4f',10,'coat-stand'),...cylinder(0,0,48,.06,.04,2,'#b29a6c',10,'coat-knob'));
  for(const a of [0,120,240])add(...transformFaces(block(0,.18,0,.055,.45,1.6,'#785b44','stand-foot'),{angle:a}));
  const coat=line('M-11-42Q-11-38 0-38T11-42M-8-47Q-8-44 0-44T8-47','#8f7356',1.6)+path('M-8-41Q-12-40-14-35L-18-25Q-18-22-14-22L-9-30Q-11-20-10-14Q-4-10 3-11L5-30L9-23Q11-20 14-23L9-36Q7-39 3-41L0-36Z','#82978a','#5f7869',.65)+line('M-1-33L-2-13M-7-22l4 1M2-21l4 1','#bbcab4',.55)+path('M-6-39l5 4 4-5 2 8-6-2-5-3Z','#c4b698')+line('M9-39q8 1 3 10L9-10','#a68f64',.8)+path('M8-10l-2-3 7-1-2 4Z','#8e7771');
  front(coat,0,.8);front(coat,0,.8,true);
 }else if(kind==='decor'){
  add(...block(0,0,0,.5,.5,3,'#6e7560','display-plinth'),...tapered(0,0,3,.44,.44,.38,.38,24,'#a58b66','display-pedestal'),...block(0,0,27,.54,.54,1.7,'#c6ad7c','display-top'));
  const top=[0,0,44],bottom=[0,0,30],ring=Array.from({length:5},(_,i)=>[.19*Math.cos(i*Math.PI*2/5),.19*Math.sin(i*Math.PI*2/5),37]);for(let i=0;i<5;i++){add(flat([top,ring[i],ring[(i+1)%5]],['#e1c279','#c5a567','#d1b572','#ae8e57','#d8ba75'][i],'display-d20'),flat([bottom,ring[(i+1)%5],ring[i]],['#b69c64','#bfa468','#9c8357','#bca06a','#c5aa70'][i],'display-d20'));}
  front(rect(-10,-22,20,6,'#6d7762',.5)+text('ГИЛЬДИЯ',0,-17.5,2.6),.223,.5);
 }else if(spec.layer==='wall'){
  const conditioner=kind==='conditioner',height=conditioner?13:29,z=conditioner?37:23,width=conditioner ? .92 : .83,depth=conditioner ? .18 : .045;
  add(...block(0,-.5+depth/2,z,width,depth,height,kind==='soundproof'?'#4f6258':kind==='poster'?'#a58b5e':'#b7c4b1','wall-frame'));
  const plane=-.5+depth+.003;
  if(kind==='whiteboard'){
   front(rect(-15,-50,30,25,'#eee9d3',.7,'#879b88')+text('ПЛАН ПАРТИИ',0,-46,2.3,'#6b8578')+line('M-11-42h14M-11-39h18M-11-36h10','#79988a',.7)+rect(7,-43,5,5,'#dbc58f',.2)+line('M8-41h3M8-39h2','#a98c5b',.4)+path('M-11-31l5-3 5 3-5 3Z','none','#b68b65',.7)+line('M2-32h9M2-29h5','#b68b65',.6),plane,width);
   add(...block(0,-.42,22,.57,.12,.8,'#7f9788','marker-tray'),...block(-.12,-.415,22.85,.13,.032,.7,'#b76e5d','red-marker'),...block(.09,-.415,22.85,.15,.032,.7,'#557c75','green-marker'));
  }else if(kind==='conditioner'){
   front(rect(-15,-49,30,10,'#dbe0ca',2,'#9aac98')+line('M-12-42h24M-12-40.5h24','#92a998',.65)+'<circle cx="11" cy="-46" r=".7" fill="#8ab69d"/>'+text('CLIMA',-4,-45,2.4,'#8da28e'),plane,width);
  }else if(kind==='poster'){
   front(rect(-14.5,-50,29,25,'#344e4d',.3)+path('M-13-29Q-2-39 13-30v4h-26Z','#6d8f79')+path('M-14-32L-9-38-5-35 0-40 6-33 10-36 14-31v5h-28Z','#5b7e6c')+path('M-8-36l8-10 8 10-8 7Z','none','#dfc084',.8)+line('M-8-36H8M0-46L-3-36 0-29 3-36Z','#dfc084',.55)+[[-10,-44],[10,-43],[9,-34]].map(([x,y])=>line('M'+(x-1)+' '+y+'h2M'+x+' '+(y-1)+'v2','#c7cfad',.5)).join('')+text('МИРЫ ЖДУТ',0,-27,2.5),plane,width);
  }else{
   for(let row=0;row<5;row++)for(let col=0;col<4;col++){const x=-.3+col*.2,zz=25+row*5;add(flat([[x-.085,plane,zz],[x+.085,plane,zz],[x,plane+.065,zz+2]],'#6c8171','acoustic-foam'),flat([[x+.085,plane,zz],[x+.085,plane,zz+4],[x,plane+.065,zz+2]],'#425e51','acoustic-foam'),flat([[x+.085,plane,zz+4],[x-.085,plane,zz+4],[x,plane+.065,zz+2]],'#7b8f79','acoustic-foam'),flat([[x-.085,plane,zz+4],[x-.085,plane,zz],[x,plane+.065,zz+2]],'#536e5d','acoustic-foam'));}
  }
  front(rect(-12,-(z+height-3),24,height-6,'#879b85',.6),.502,width,true);
 }
 return {faces:transformFaces(faces,{angle:rotation*90}),decals:decals.join('')};
}

export function detailedFurnitureArt(object){
 const spec=BUILD_CATALOG[object.kind];if(!spec)return null;
 const key=object.kind+':'+object.rotation;if(!cache.has(key)){const data=model(object.kind,object.rotation);if(!data.faces.length&&!data.decals)return null;cache.set(key,solidArt(data.faces)+data.decals);}
 const width=object.rotation%2?spec.height:spec.width,depth=object.rotation%2?spec.width:spec.height,p=project(object.x+width/2,object.y+depth/2);return '<g class="crafted-furniture" transform="translate('+p.x+' '+p.y+')">'+cache.get(key)+'</g>';
}
