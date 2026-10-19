// Original, layered line art. All measurements are in the shared character rig.
const ink='#382e3b';
const path=(d,fill='none',stroke=ink,w=1.6)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line=(d,color=ink,w=1.4)=>path(d,'none',color,w);

function hairArt(p,rx){
 const h=p.hairColor,shadow=p.hairShadow??'#282331',glint=p.hairLight??'#ac8271';
 let back='',fringe='',locks='';
 if(p.hair==='long'){
  back=path(`M -43 -30 C -65 12 -49 74 -66 135 Q -71 157 -59 166 L -39 158 L -30 171 Q 5 160 36 171 L 52 158 L 68 160 C 48 114 61 68 50 7 Q 54 -49 16 -63 Z`,h);
  back+=path('M 36 -24 C 60 27 34 101 53 159 L 36 171 Q 26 112 34 59 L 25 3 Z',shadow,'none');
  back+=line('M -44 39 Q -52 102 -43 146 M 45 66 Q 39 111 48 145',glint,1);
  locks=path(`M ${-rx+1} -19 Q ${-rx-8} 13 ${-rx-1} 55 Q -32 82 -43 118 Q -52 99 -48 69 L -53 29 Z`,h)+path(`M ${rx-1} -21 Q ${rx+9} 17 ${rx+3} 52 Q 34 83 45 117 Q 53 96 51 62 L 55 21 Z`,h);
 }else if(p.hair==='bob'){
  back=path('M -45 -39 C -61 -7 -49 28 -58 62 Q -36 84 -4 72 Q 23 85 54 64 C 46 41 60 -7 44 -41 Q 0 -72 -45 -39 Z',h);
  back+=path('M 31 -26 Q 51 7 41 56 L 51 65 Q 23 83 6 70 L 18 45 Z',shadow,'none');
  locks=path(`M ${-rx+1} -24 Q -49 18 -36 63 L -48 59 Q -58 25 -50 -8 Z`,h)+path(`M ${rx-1} -23 Q 48 16 36 64 L 49 60 Q 57 27 50 -7 Z`,h);
 }else if(p.hair==='curly'){
  const end=p.shortCurls?39:113;
  back=path(`M -45 -41 Q -65 -26 -53 -6 Q -67 9 -53 25 Q -66 42 -51 54 ${p.shortCurls?'L -40 39 Q 0 52 41 38 L 53 24':'Q -67 76 -51 89 Q -64 108 -43 117 Q -29 133 -13 119 Q 1 132 17 119 Q 34 134 45 117 Q 67 118 56 96 Q 70 80 54 64 L 52 45'} Q 68 28 54 11 Q 68 -7 53 -22 Q 61 -45 35 -48 Q 21 -72 2 -59 Q -21 -75 -30 -55 Q -47 -62 -45 -41 Z`,h);
  back+=line(`M -49 31 Q -37 36 -46 49 M 47 37 Q 36 48 48 54 M -42 ${end-8} Q -32 ${end+4} -22 ${end-3}`,glint,1.3);
 }else if(['tied','ponytail','braid'].includes(p.hair)){
  if(p.hair==='ponytail')back=path('M 35 -36 Q 71 -69 78 -35 C 86 -5 52 29 66 66 Q 40 54 51 23 Q 62 -6 40 -10 Z',h)+line('M 65 -38 Q 75 -17 60 8',glint);
  else if(p.hair==='tied')back=path('M 27 -40 Q 56 -68 66 -41 Q 81 -23 55 -12 L 35 -9 Z',h)+line('M 48 -43 Q 65 -44 62 -27',glint);
  else back=path('M -40 -3 Q -64 13 -48 29 Q -67 40 -50 55 Q -68 68 -50 81 Q -67 95 -47 109 L -34 104 Q -25 88 -43 79 Q -23 62 -42 53 Q -23 37 -41 27 Q -27 12 -40 -3 Z',h)+line('M -49 29 L -41 27 M -50 55 L -42 53 M -50 81 L -43 79',glint)+path('M -49 106 L -33 104 L -32 112 L -46 115 Z','#796b84')+path('M -45 114 L -48 135 L -39 130 L -33 133 L -34 112 Z',h);
  back+=path('M -46 -36 C -58 -16 -51 17 -39 34 L -30 36 L 36 35 Q 59 6 46 -35 Q 5 -68 -46 -36 Z',h);
 }
 if(p.hair==='shaved'){
  fringe=path('M -40 -22 Q -43 -53 -9 -59 Q 25 -67 42 -31 L 40 -21 Q 19 -48 -10 -47 Q -28 -48 -40 -22 Z',h,'none');
  fringe+=line('M -35 -30 L -30 -36 M -24 -43 L -18 -46 M -7 -49 L 0 -50 M 13 -48 L 20 -46 M 28 -41 L 32 -36',glint,1);
 }else if(p.hair==='curly'){
  fringe=path(`M -48 7 L -55 -15 Q -66 -34 -44 -39 Q -49 -61 -26 -57 Q -17 -75 1 -62 Q 20 -79 33 -58 Q 58 -62 54 -40 Q 72 -32 57 -14 L 49 8 L 39 -5 Q 48 -23 35 -22 Q 28 -10 22 -25 Q 5 -13 2 -33 Q -10 -14 -21 -29 Q -31 -12 -40 -19 L -42 5 Z`,h);
  fringe+=line('M -40 -40 Q -27 -47 -25 -34 M -15 -53 Q -1 -60 4 -46 M 19 -52 Q 34 -52 36 -39',glint,1.5);
 }else if(p.hair==='pixie'){
  const cuts=[
   'M -46 9 Q -59 -20 -44 -41 L -50 -41 Q -38 -58 -20 -57 L -26 -65 Q -7 -65 3 -60 Q 26 -72 40 -47 L 53 -43 L 47 -34 Q 51 -15 43 9 L 37 -6 L 31 -20 Q 20 -14 9 -7 L 13 -24 Q -4 -10 -16 -10 L -12 -26 Q -29 -10 -38 -9 L -40 8 Z',
   'M -43 17 Q -52 -1 -50 -25 Q -48 -49 -24 -57 Q 4 -69 26 -54 Q 48 -46 48 -22 L 44 8 L 38 17 L 34 1 L 35 -25 Q 20 -40 12 -41 Q 5 -16 -12 -5 L -29 3 L -24 -8 Q -34 2 -39 3 L -39 18 Z',
   'M -44 10 Q -56 -6 -49 -29 Q -53 -45 -32 -48 Q -23 -63 -6 -58 Q 10 -67 24 -54 Q 45 -56 49 -34 Q 57 -20 46 -1 L 40 12 L 36 -5 Q 42 -20 31 -23 Q 23 -11 14 -24 Q 3 -9 -7 -23 Q -17 -10 -26 -22 Q -39 -20 -38 -4 L -39 12 Z',
  ];
  const detail=(p.hairDetail??0)%3;
  fringe=path(cuts[detail],h);
  fringe+=line([
   'M -36 -35 Q -17 -53 3 -48 M -13 -39 Q 4 -49 18 -44 M 24 -38 L 35 -31',
   'M -40 -24 Q -24 -49 5 -48 M -31 -17 Q -11 -26 8 -42 M 21 -45 Q 37 -35 40 -22',
   'M -38 -34 Q -29 -45 -20 -35 M -14 -43 Q -2 -53 7 -40 M 17 -42 Q 29 -46 36 -33',
  ][detail],glint,1.4);
 }else if(p.hair==='short'){
  const haircuts=[
   'M -45 12 L -51 -9 Q -56 -32 -39 -46 L -43 -54 L -23 -52 Q -5 -70 13 -60 L 29 -63 L 25 -54 Q 45 -55 50 -32 L 47 -2 L 41 13 L 36 -11 L 29 -25 Q 17 -13 1 -9 L 8 -26 Q -12 -9 -31 -12 L -37 2 L -40 15 Z',
   'M -44 14 Q -55 -20 -41 -47 Q -20 -65 10 -61 Q 42 -59 48 -34 L 47 11 L 39 15 L 36 -22 Q 21 -32 14 -39 Q 2 -15 -32 -9 L -38 13 Z',
   'M -43 12 L -49 -11 Q -55 -34 -32 -49 L -37 -54 Q -21 -62 -4 -57 L 10 -69 L 18 -57 L 37 -59 L 34 -49 L 48 -40 L 43 -28 L 47 -6 L 39 13 L 33 -17 L 21 -16 L 24 -28 L 6 -18 L 5 -31 L -15 -18 L -17 -31 L -35 -13 L -38 12 Z',
  ];
  fringe=path(haircuts[(p.hairDetail??0)%3],h);
  fringe+=path('M -34 -39 Q -13 -58 8 -50 Q -9 -48 -25 -32 Z',glint,'none',0);
  fringe+=line('M 17 -45 Q 30 -40 35 -31',glint,1);
 }else{
  // Sweep, curtain and side-part bangs vary independently of face and outfit.
  const bangs=[
   'M -47 8 C -60 -21 -49 -57 -19 -65 C 10 -80 49 -62 50 -29 L 47 11 Q 42 -11 32 -30 Q 22 -4 8 2 L 16 -18 Q 2 -3 -12 -4 L -8 -21 Q -24 -7 -37 -10 L -40 8 Z',
   `M -47 7 Q -61 -33 -26 -59 Q 5 -77 38 -54 Q 56 -35 48 9 L 40 13 Q 42 -15 17 -37 Q 6 -14 -36 -6 L -40 15 Z`,
   `M -47 9 Q -58 -34 -27 -60 Q 6 -75 35 -55 Q 56 -40 49 9 L 42 16 Q 41 -16 6 -43 Q -9 -10 -39 4 L -42 17 Z`,
  ];
  fringe=path(bangs[(p.hairDetail??0)%3],h);
  fringe+=line('M -37 -35 Q -25 -54 -5 -53 M 9 -57 Q 30 -53 38 -36',glint,1.4);
 }
 return {back,front:fringe+locks};
}

export function characterHead(identity,emotion){
 const p=identity.portrait,female=identity.grammar==='feminine';
 const older=identity.age>=50,senior=identity.age>=60;
 const rx=[41,44,40,46,42,44][p.face]+(older?2:0),jaw=[23,30,22,32,25,28][p.face]+(older?5:0),chinY=53+(p.face%3);
 const skin=p.skin,shade=p.shade,mood=emotion??p.expression??'calm',hair=hairArt(p,rx);
 const startled=mood==='surprised',joy=mood==='happy',delight=mood==='delighted',tired=mood==='bored';
 let front=path(`M ${-rx+4} -26 Q ${-rx-3} -5 ${-rx+3} 17 Q ${-rx+7} 29 ${-jaw} 42 Q -8 ${chinY+2} 0 ${chinY} Q 9 ${chinY+1} ${jaw} 42 Q ${rx-6} 28 ${rx-3} 16 Q ${rx+2} -5 ${rx-4} -28 Q 4 -57 ${-rx+4} -26 Z`,skin);
 front=path(`M ${-rx+2} -2 Q ${-rx-14} -10 ${-rx-10} 10 Q ${-rx-7} 22 ${-rx+3} 19 M ${rx-2} -2 Q ${rx+14} -10 ${rx+10} 10 Q ${rx+7} 22 ${rx-3} 19`,skin)+front;
 front+=path(`M ${rx-4} -21 Q ${rx+2} 11 ${rx-6} 24 L ${jaw} 42 Q 9 55 0 ${chinY} L 9 44 Q 26 32 28 18 L 31 -15 Z`,shade,'none');
 front+=line(`M ${-rx-6} 3 Q ${-rx-1} 1 ${-rx+1} 10 M ${rx+6} 3 Q ${rx+1} 1 ${rx-1} 10`,shade,1.4);
 const eyeW=[12,13,11.5,13.5,12,12.5,11][p.eyes],eyeH=tired?3:startled?9:delight?6:senior?4:p.eastAsian?4:[6,7,5,6.5,5.5,7,5][p.eyes];
 for(const side of [-1,1]){
  const cx=side*22.5,ey=-7,slant=(p.eyes%3-1)*1.1;
  const eyeD=`M ${cx-eyeW} ${ey+slant} Q ${cx-2} ${ey-eyeH-4} ${cx+eyeW} ${ey-slant} Q ${cx+6} ${ey+eyeH*.75} ${cx-2} ${ey+eyeH*.65} Q ${cx-eyeW+3} ${ey+eyeH*.6} ${cx-eyeW} ${ey+slant} Z`;
  let eyes='';
  if(joy&&p.mouth%2===0)eyes=line(`M ${cx-eyeW} ${ey+2} Q ${cx} ${ey-9} ${cx+eyeW} ${ey+1}`,ink,female?2.3:1.8);
  else{
   eyes+=path(eyeD,'#fff7ee','#8b6c6c',.75);
   eyes+=`<ellipse cx="${cx+side*.4}" cy="${ey+.4}" rx="${startled?4.2:5.4}" ry="${Math.min(eyeH,6.5)}" fill="${p.iris}" stroke="${ink}" stroke-width=".8"/><ellipse cx="${cx+side*.4}" cy="${ey+.5}" rx="2.2" ry="${Math.min(eyeH*.75,4.3)}" fill="#2e2936"/><ellipse cx="${cx-1.7}" cy="${ey-2}" rx="1.4" ry="1.6" fill="#fff9eb"/>`;
   eyes+=line(`M ${cx-eyeW-1} ${ey+slant} Q ${cx-2} ${ey-eyeH-4} ${cx+eyeW+1} ${ey-slant}`,ink,female?2.4:1.9);
   eyes+=line(`M ${cx-eyeW+4} ${ey+eyeH*.65+3} Q ${cx} ${ey+eyeH*.85+3} ${cx+eyeW-4} ${ey+eyeH*.65+2}`,shade,.75);
   if(female)eyes+=line(`M ${cx+side*eyeW} ${ey} l ${side*3.2} -2.2`,ink,1.5);
  }
  front+=`<g class="portrait-blink" style="transform-origin:${cx}px ${ey}px">${eyes}</g>`;
  let brow=-24-(startled?9:delight?5:joy?2:0),tilt=mood==='focused'?-side*4:startled?side*2:tired?side*2:0;
  front+=path(`M ${cx-12} ${brow+tilt} Q ${cx-2} ${brow-4} ${cx+12} ${brow-tilt} L ${cx+11} ${brow+1-tilt} Q ${cx-2} ${brow-1} ${cx-12} ${brow+tilt+1} Z`,p.hairColor,'none');
 }
 front+=path(`M -2 3 L -5 ${12+p.nose*.3} L 0 17 L 5 15 L 1 13 Z`,shade,'none');
 front+=line(`M -4 15 Q 0 18 ${4+p.nose*.25} 16`,'#9b6b64',.9);
 if(startled)front+=path('M -5 29 Q 1 25 6 29 Q 10 40 1 42 Q -7 41 -5 29 Z','#764652',ink,1.2);
 else if(delight)front+=path('M -13 29 Q 0 35 14 28 Q 10 46 1 45 Q -9 44 -13 29 Z','#784353',ink,1.2)+path('M -10 30 Q 1 34 11 29 L 8 35 Q 0 38 -7 34 Z','#fff3df','none')+path('M -5 41 Q 1 37 7 40 L 4 43 L 0 44 Z','#c37e83','none');
 else if(joy)front+=line('M -13 30 Q 1 41 14 29','#8e525f',1.8)+line('M -7 39 Q 1 42 7 38',shade,.8);
 else if(tired)front+=line('M -10 33 Q 1 31 12 32','#8c5560',1.5);
 else front+=line(`M -10 31 Q 1 ${mood==='focused'?30:35+p.mouth*.3} 12 31`,'#87515c',1.4)+line('M -4 38 Q 1 39 5 37',shade,.75);
 if(joy||delight)front+=path('M -32 18 Q -25 14 -18 18 Q -24 23 -32 18 M 19 18 Q 26 14 33 18 Q 27 23 19 18','#c9787a38','none');
 if(p.beard){
  front+=path(`M ${-rx+6} 17 Q -30 36 -23 36 Q -14 37 -11 42 Q 0 47 12 42 Q 15 36 24 36 Q 32 29 ${rx-5} 17 Q ${rx-5} 40 ${jaw} 47 Q 7 60 -7 56 Q -29 50 ${-rx+6} 17 Z`,p.hairColor,'none');
  front+=line('M -22 37 Q -20 44 -15 46 M -6 47 L -3 51 M 19 40 L 15 47',p.hairLight??'#978071',.7);
  if(delight)front+=path('M -9 33 Q 1 37 10 32 Q 8 41 1 41 Q -7 40 -9 33 Z','#754b52','none')+line('M -6 34 Q 1 36 7 34','#ecd8c8',1.6);
 }
 if(p.moustache)front+=path('M -16 26 Q -6 19 0 24 Q 7 19 17 26 Q 9 30 0 26 Q -7 31 -16 26 Z',p.hairColor,'none');
 if(identity.age>=41)front+=line('M -34 6 L -38 9 M 34 6 L 38 9 M -24 24 L -22 29 M 24 24 L 22 30',shade,.9);
 if(older)front+=line('M -33 11 Q -25 16 -15 12 M 15 12 Q 26 17 34 11 M -21 22 Q -28 29 -21 36 M 23 22 Q 29 30 22 37',shade,1.2);
 if(senior)front+=line('M -20 -36 Q 0 -41 20 -35 M -18 -31 Q 0 -35 17 -30 M -28 23 Q -31 32 -24 39 M 28 23 Q 31 32 25 39 M -18 42 L -12 46 M 15 44 L 20 40',shade,1);
 if(p.freckles)for(const [x,y]of[[-31,13],[-26,16],[-21,13],[24,14],[30,17]])front+=`<circle cx="${x}" cy="${y}" r=".9" fill="#aa786c"/>`;
 if(p.glasses){for(const x of [-23,23])front+=`<rect x="${x-17}" y="-21" width="34" height="27" rx="${p.face%2?7:12}" fill="#fff3dc08" stroke="#4b4252" stroke-width="1.8"/>`;front+=line('M -6 -10 Q 0 -13 6 -10 M -40 -10 L -48 -13 M 40 -10 L 48 -13','#4b4252',1.8);}
 return{back:hair.back,front:front+hair.front};
}
