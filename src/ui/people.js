export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// One miniature style for portraits, walking and seated people. Feet remain
// at the origin and every animated limb stays attached to its joint.
export const ADMINISTRATOR=Object.freeze({name:'Администратор',age:32,grammar:'masculine',role:'administrator',portrait:Object.freeze({skin:'#dfb399',hairColor:'#493b37',hair:'short',coat:'#426b64',trousers:'#344349',shoes:'#303b3e',accent:'#d4bd86',iris:'#536d62',outfit:'vest',bodyShape:'regular',face:2})});
const color=(value,fallback)=>/^#[\da-f]{6}$/i.test(value??'')?value:fallback;
function tint(hex,amount){const n=parseInt(hex.slice(1),16),part=shift=>Math.max(0,Math.min(255,(n>>shift&255)+amount)).toString(16).padStart(2,'0');return '#'+part(16)+part(8)+part(0);}
const path=(d,fill,extra='')=>'<path d="'+d+'" fill="'+fill+'" '+extra+'/>';
const line=(d,stroke,width=1)=>path(d,'none','stroke="'+stroke+'" stroke-width="'+width+'"');
const limb=(name,x,y,art)=>'<g class="limb '+name+'" style="transform-origin:'+x+'px '+y+'px">'+art+'</g>';

export function personArt(person,{seated=false,back=false,drag=false,reception=false,seatRotation=null,headOnly=false,yaw=0}={}){
 const identity=person?.identity??person??{},p=identity.portrait??{},name=identity.name??person?.profile?.name??person?.name??'Гость';
 const seed=[...name].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7),skin=color(p.skin,'#e3b79e'),skinDark=tint(skin,-24),skinLight=tint(skin,13),hair=color(p.hairColor,'#57433a'),hairDark=tint(hair,-15),hairLight=tint(hair,21),coat=color(p.coat,['#627f84','#9c705c','#728368','#82718b'][seed%4]),coatDark=tint(coat,-23),coatLight=tint(coat,17),pants=color(p.trousers,'#3c4e58'),shoe=color(p.shoes,'#303b42'),accent=color(p.accent,'#d8cab2'),eyes=color(p.iris,'#5a6c66');
 const head=seated?-77:-104,shoulder=seated?-58:-85,hip=seated?-22:-49,build=p.bodyShape??['lean','regular','soft','broad','compact'][seed%5],wide=build==='broad'?18:build==='lean'?14:16,waist=build==='soft'?14:build==='lean'?10:12,age=identity.age??person?.age??30,style=p.hair??['short','bob','curly','tied'][seed%4],outfit=p.outfit??['shirt','hoodie','cardigan','sweater'][seed%4],admin=identity.role==='administrator';
 const faceWidth=[9.2,9.8,10,8.8,9.5,10.4][(p.face??seed)%6],jaw=faceWidth-2,ink=tint(hair,-14),happy=['happy','delighted'].includes(p.expression),eyeY=p.eastAsian?-.5:0;
 let hairBehind='';
 if(['long','braid','ponytail'].includes(style))hairBehind=path('M-10 '+(head-7)+'Q-17 '+(head+5)+'-14 '+(shoulder+13)+'Q-6 '+(shoulder+20)+' 2 '+(shoulder+10)+'L11 '+(shoulder+12)+'Q16 '+(head+7)+' 10 '+(head-9)+'Z',hairDark)+path('M-10 '+head+'Q-13 '+(head+15)+'-10 '+(shoulder+10)+'L-7 '+(shoulder+12)+'Q-8 '+(head+10)+'-7 '+head+'Z',hair);
 if(['tied','ponytail'].includes(style))hairBehind+='<ellipse cx="9" cy="'+(head-8)+'" rx="6" ry="7" fill="'+hairDark+'"/>'+(style==='ponytail'?path('M11 '+(head-8)+'Q24 '+head+' 17 '+(head+25)+'Q12 '+(head+19)+' 14 '+(head+7)+'Z',hair):'');
 if(style==='bob')hairBehind=path('M-11 '+(head-6)+'Q-17 '+(head+4)+'-13 '+(head+19)+'Q0 '+(head+25)+' 13 '+(head+17)+'L12 '+(head-6)+'Z',hairDark);
 let leftLeg=seated?path('M-11-24Q-12-21-15-17L-13-4-6-4-6-14 0-17 0-24Z',pants)+path('M-14-17L-10-16-8-4-13-4Z',tint(pants,-19)):path('M-12-51L1-50-1-27-4-4-12-4-11-27Z',pants)+path('M-12-49L-8-47-7-27-9-4-12-4-11-27Z',tint(pants,-17));
 let rightLeg=seated?path('M0-24L11-24 16-17 13-3 6-3 8-14 0-17Z',tint(pants,5))+path('M12-21L16-17 13-3 10-3 12-15 6-20Z',tint(pants,-12)):path('M0-50L12-50 11-27 13-4 5-4 1-26Z',tint(pants,6))+path('M9-48L12-49 11-27 13-4 10-4 7-27Z',tint(pants,-13));
 let shoesLeft=path('M-13-6Q-9-7-5-4L-5 0Q-10 3-17 1L-17-1Z',shoe)+line('M-16 0Q-11 2-5 0',tint(shoe,27),1.1),shoesRight=path('M5-5Q8-7 13-5L18-1Q19 2 13 2L5 1Z',shoe)+line('M6 0Q13 2 17 0',tint(shoe,27),1.1);
 if(seated&&seatRotation!==null){
  const [dx,dy]=[[1,-1],[1,1],[-1,1],[-1,-1]][seatRotation],kneeY=-22+dy*9,footY=dy*9;
  const leg=side=>{const x=side*6+dx*16,fill=side===-1?pants:tint(pants,6);return path('M'+(side*6-6)+'-24H'+(side*6+6)+'L'+(x+4)+' '+(kneeY-2)+' '+(x+3)+' '+(footY-3)+' '+(x-4)+' '+(footY-3)+' '+(x-5)+' '+(kneeY+2)+'Z',fill)+line('M'+(x+1)+' '+kneeY+'V'+(footY-4),tint(pants,-17),1.4);};
  const foot=side=>{const x=side*6+dx*16,toe=x+dx*9;return path('M'+(x-4)+' '+(footY-5)+'L'+(x+4)+' '+(footY-5)+' '+toe+' '+(footY+dy*3)+'Q'+toe+' '+(footY+dy*3+3)+' '+x+' '+(footY+2)+'L'+(x-4)+' '+(footY+1)+'Z',shoe);};
  leftLeg=leg(-1);rightLeg=leg(1);shoesLeft=foot(-1);shoesRight=foot(1);
 }
 let arms='';
 for(const side of [-1,1]){
  const sleeve=seated?path('M11-58Q18-58 20-51L23-42 16-38 10-48Z',coat)+path('M19-52L23-42 20-40 16-50Z',coatDark):reception?path('M11-85Q19-86 22-78L25-66 18-61 12-72Z',coat)+path('M22-77L25-66 22-64 18-75Z',coatDark):path('M'+(wide-6)+' '+(shoulder+1)+'Q'+(wide+4)+' '+(shoulder-1)+' '+(wide+5)+' '+(shoulder+10)+'L'+(wide+5)+' '+(shoulder+27)+' '+(wide-2)+' '+(shoulder+28)+' '+(wide-4)+' '+(shoulder+11)+'Z',coat)+path('M'+(wide+1)+' '+(shoulder+7)+'L'+(wide+5)+' '+(shoulder+12)+' '+(wide+5)+' '+(shoulder+27)+' '+(wide+2)+' '+(shoulder+27)+'Z',coatDark);
  const hand=seated?path('M20-44L22-40 10-35 7-39Z',skin)+path('M8-40Q3-41 2-38L3-35 10-35 12-38Z',skinLight)+line('M4-37h5',skinDark,.6):reception?path('M24-68L25-63 11-57 8-62Z',skin)+path('M10-63Q4-64 2-61L3-57 11-57 13-60Z',skinLight)+line('M4-59h5',skinDark,.6):path('M'+(wide-2)+' '+(shoulder+26)+'L'+(wide+4)+' '+(shoulder+26)+' '+(wide+3)+' '+(shoulder+36)+'Q'+(wide+2)+' '+(shoulder+40)+' '+(wide-1)+' '+(shoulder+38)+'L'+(wide-3)+' '+(shoulder+33)+'Z',skin)+line('M'+(wide+1)+' '+(shoulder+31)+'v5',skinDark,.6);
  arms+=limb(side===-1?'arm-left':'arm-right',side*(wide-3),shoulder,'<g transform="scale('+side+' 1)">'+sleeve+hand+'</g>');
 }
 let body=path('M-'+(wide-6)+' '+(shoulder-1)+'Q0 '+(shoulder-7)+' '+(wide-6)+' '+(shoulder-1)+'L'+wide+' '+(shoulder+4)+' '+(waist+1)+' '+(hip-1)+'Q0 '+(hip+3)+'-'+(waist+1)+' '+(hip-1)+'L-'+wide+' '+(shoulder+4)+'Z',coat,'stroke="'+coatDark+'" stroke-width=".65"');
 body+=path('M'+(wide-5)+' '+(shoulder+3)+'L'+wide+' '+(shoulder+5)+' '+(waist+1)+' '+(hip-1)+' '+(waist-3)+' '+(hip+1)+'Z',coatDark)+path('M-'+(wide-4)+' '+(shoulder+6)+'L-'+(wide-7)+' '+(shoulder+4)+' -'+(waist-2)+' '+(hip-3)+' -'+waist+' '+(hip-2)+'Z',coatLight);
 if(!back){
  if(outfit==='hoodie')body+=path('M-9 '+(shoulder-1)+'Q0 '+(shoulder-9)+' 9 '+(shoulder-1)+'L7 '+(shoulder+8)+'Q0 '+(shoulder+15)+'-7 '+(shoulder+8)+'Z',coatDark)+path('M-5 '+(shoulder+1)+'Q0 '+(shoulder+5)+' 5 '+(shoulder+1)+'L3 '+(shoulder+8)+'H-3Z',accent)+line('M-5 '+(shoulder+10)+'v12M5 '+(shoulder+10)+'v12',tint(accent,-15),.8)+line('M-7 '+(hip-10)+'L-9 '+(hip-4)+'H9L7 '+(hip-10),coatDark,1);
  else if(['shirt','vest','cardigan'].includes(outfit)){
   body+=path('M-6 '+(shoulder-2)+'L0 '+(shoulder+9)+' 6 '+(shoulder-2)+'Z',accent)+path('M-6 '+(shoulder-2)+'L-8 '+(shoulder+4)+' -2 '+(shoulder+8)+' 0 '+(shoulder+3)+' 2 '+(shoulder+8)+' 8 '+(shoulder+4)+' 6 '+(shoulder-2)+' 0 '+(shoulder+3)+'Z',tint(accent,13))+line('M0 '+(shoulder+10)+'V'+(hip-2),coatDark,.9);
   if(outfit!=='shirt')body+=line('M-7 '+(shoulder+3)+'L-5 '+(shoulder+11)+' -3 '+(hip-1)+'M7 '+(shoulder+3)+'L5 '+(shoulder+11)+' 3 '+(hip-1),tint(coat,-35),.8);
   for(let i=0;i<3;i++)body+='<circle cx="1.5" cy="'+(shoulder+17+i*7)+'" r=".65" fill="'+accent+'"/>';
   body+=line('M6 '+(shoulder+16)+'h6v5H6Z',coatDark,.75);
  }else body+=path('M-7 '+(shoulder-2)+'Q0 '+(shoulder+8)+' 7 '+(shoulder-2)+'L5 '+(shoulder+3)+'Q0 '+(shoulder+9)+'-5 '+(shoulder+3)+'Z',coatDark)+line('M-'+waist+' '+(hip-3)+'Q0 '+hip+' '+waist+' '+(hip-3),coatDark,1.3);
  if(admin)body+=line('M-4 '+(shoulder+4)+'L-2 '+(shoulder+22)+' 4 '+(shoulder+22)+' 6 '+(shoulder+4),accent,1.1)+path('M-3 '+(shoulder+20)+'h9v7H-3Z','#e9dfbf','stroke="'+coatDark+'" stroke-width=".5"')+line('M-1 '+(shoulder+23)+'h5',coatDark,.7);
 }else body+=line('M0 '+(shoulder+5)+'V'+(hip-4),coatDark,.65)+line('M-'+(wide-4)+' '+(shoulder+9)+'Q0 '+(shoulder+4)+' '+(wide-4)+' '+(shoulder+9),coatDark,.65);
 const neck=path('M-3.8 '+(head+8)+'L-4 '+(shoulder+1)+'Q0 '+(shoulder+6)+' 4 '+(shoulder+1)+'L3.8 '+(head+8)+'Z',back?skinDark:skin)+path('M-3.8 '+(head+9)+'Q0 '+(head+15)+' 4 '+(head+9)+'V'+(head+14)+'Q0 '+(head+17)+'-4 '+(head+13)+'Z',skinDark);
 let face=path('M-'+faceWidth+'-5Q-'+(faceWidth+1)+'-12 0-12Q'+(faceWidth+1)+'-12 '+faceWidth+'-5L'+faceWidth+' 3Q'+(faceWidth-1)+' 8 '+jaw+' 10L2 13Q0 14-2 13L-'+jaw+' 10Q-'+faceWidth+' 7-'+faceWidth+' 3Z',back?hair:skin,'stroke="'+(back?hairDark:skinDark)+'" stroke-width=".5"');
 face+='<ellipse cx="-'+(faceWidth+.25)+'" cy="2" rx="1.8" ry="3" fill="'+skinDark+'"/><ellipse cx="'+(faceWidth+.25)+'" cy="2" rx="1.8" ry="3" fill="'+skin+'"/>';
 if(!back){
  const baseFace=face;face='';
  face+=path('M2-11Q'+(faceWidth+1)+'-11 '+faceWidth+'-4V4Q8 10 2 13L6 7 7-3Z',skinDark,'opacity=".5"')+path('M-7-7Q-1-11 4-7L3-4Q-2-6-6-3Z',skinLight,'opacity=".5"')+line('M-7-3.8Q-4-5.3-1.5-3.8M2.5-3.8Q5-5 7.7-3.2',hair,.85);
  for(const x of [-4.2,4.7])face+=path('M'+(x-2)+' '+eyeY+'Q'+x+' '+(eyeY-2)+' '+(x+2)+' '+eyeY+'Q'+x+' '+(eyeY+1.8)+' '+(x-2)+' '+eyeY+'Z','#f8eee1')+'<ellipse cx="'+(x+.35)+'" cy="'+eyeY+'" rx=".95" ry="1.25" fill="'+eyes+'"/><circle cx="'+(x+.5)+'" cy="'+(eyeY-.25)+'" r=".55" fill="#283739"/>'+line('M'+(x-2)+' '+eyeY+'Q'+x+' '+(eyeY-2)+' '+(x+2)+' '+eyeY,ink,.7);
  face+=line('M.8 0L-.3 4.6 2.3 4.8',tint(skin,-44),.65)+path('M-5 7.5Q0 '+(happy?11:9)+' 5 7.5L2 10H-1Z',tint(skin,-40))+line('M-3.8 7.7Q0 '+(happy?9.6:8.8)+' 4 7.7',tint(skin,-61),.55);
  if(p.beard)face+=path('M-8 5L-5 7-3 5 0 6 3 5 6 7 9 4 8 10 2 13-2 13-7 10Z',hair,'opacity=".8"')+path('M-3 7Q0 9 4 7L2 9H-1Z',skin);
  if(p.moustache)face+=path('M-5 6Q-1 3 0 5Q3 3 6 6L2 7 0 6-2 7Z',hair);
  if(age>=48)face+=line('M-8 3l1.5 1M7.5 3l1 1M-6 6l-1 3M6 6l1 3M-5-7h8',skinDark,.55);
  if(p.freckles)for(const x of [-7,-5,5,7])face+='<circle cx="'+x+'" cy="4.5" r=".48" fill="'+tint(skin,-47)+'"/>';
  if(p.glasses)face+='<g stroke="'+ink+'" stroke-width=".75" fill="#cfdfda" fill-opacity=".08"><rect x="-9" y="-2.5" width="8" height="6" rx="2"/><rect x="1" y="-2.5" width="8" height="6" rx="2"/>'+line('M-1-1h2M-9-1l-2-.5M9-1l2-.5',ink,.75)+'</g>';
  face=baseFace+'<g transform="translate('+(yaw*2.8)+' 0) scale('+(yaw ? .8 : 1)+' 1)">'+face+'</g>';
 }
 let hairFront='';
 if(back)hairFront=path('M-11-3Q-14-14-2-16Q11-17 12-5L10 9Q0 16-10 9Z',hair)+path('M1-13Q10-11 9 5L7 9Q5 3 5-5Z',hairDark)+line('M-8-9Q-3-14 3-12',hairLight,.8);
 else if(style==='shaved')hairFront=path('M-10 1L-11-6Q-9-14 0-14Q10-14 11-5L10 2 8-4Q4-11-3-10L-8-5-8 2Z',hair,'opacity=".7"');
 else if(style==='curly')hairFront=path('M-11 3Q-15-1-12-6Q-16-10-10-13Q-10-19-4-17Q0-22 5-17Q12-19 12-13Q18-10 13-5L11 4 8 1 8-6Q3-3 0-8Q-5-4-8-7L-8 2Z',hair)+line('M-9-12q3-5 6-1M0-14q3-4 6 0M8-10q4-2 4 2',hairLight,.85);
 else if(['long','braid','ponytail','tied','bob'].includes(style))hairFront=path('M-11 4Q-15-12-4-15Q6-18 11-10L12 6 9 9 8-6Q3-11 0-10Q-3-3-8-1L-8 10-11 13Z',hair)+path('M0-12Q4-17 9-10L11 4 8 7 7-6Z',hairDark)+line('M-10-3Q-9-11-1-13M3-12Q8-12 9-5',hairLight,.9);
 else if(style==='pixie')hairFront=path('M-11 3Q-16-8-7-13L-9-16-3-15Q4-21 5-16L10-15 9-12Q15-9 11 3L9 6 7-6 3-3 2-9Q-3-2-8-2L-8 5Z',hair)+line('M-9-8Q-4-13 2-13M4-13l4 3',hairLight,.9);
 else hairFront=path('M-11 3L-12-6Q-13-13-5-15Q3-18 10-13L12-7 10 4 8 5 7-6Q2-4-1-8Q-5-3-9-3L-8 5Z',hair)+path('M2-15Q10-16 12-7L10 4 8 5 7-6 3-9Z',hairDark)+line('M-9-8Q-5-13 1-13',hairLight,1);
 if(style==='braid')hairFront+=path('M8 10q7 3 1 7 7 3 0 7 6 4-1 6L4 24q5-4 0-7 5-3 1-7Z',hair)+line('M7 12l3 4-4 4 4 4',hairDark,.8);
 if(age>=50&&style!=='shaved')hairFront+=line('M-9-3l-.5 5M9-3l.5 5',tint(hair,44),1.4);
 if(headOnly)return '<g class="person-head-art">'+(hairBehind?'<g transform="translate(0 '+(-head)+')">'+hairBehind+'</g>':'')+face+hairFront+'</g>';
 return '<g class="person '+(seated?'is-seated ':'')+(drag?'is-held ':'')+(admin?'administrator-figure':'')+'" stroke-linecap="round" stroke-linejoin="round"><ellipse cy=".7" rx="17" ry="4" fill="#263b3c" opacity=".13"/>'+(back?'':hairBehind)+limb('leg-left',-6,hip,leftLeg+shoesLeft)+limb('leg-right',6,hip,rightLeg+shoesRight)+arms+body+neck+(back?hairBehind:'')+'<g class="person-head" transform="translate(0 '+head+')">'+face+hairFront+'</g></g>';
}

export function portrait(person,options={}){
 return '<svg class="portrait-art" viewBox="-26 -123 52 76" aria-hidden="true"><path d="M-26-123H26V-47H-26Z" fill="#d9dbc6"/><circle cx="0" cy="-93" r="24" fill="#c4ccba"/><path d="M-26-47v-11Q0-72 26-58v11" fill="#b8c2af"/>'+personArt(person,options)+'</svg>';
}
