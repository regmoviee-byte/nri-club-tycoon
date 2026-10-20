import {SEAT_HEIGHT,seatFrame} from './seat-frame.js';
import {boxFaces,prismFaces} from './isometric-solids.js';
import {roundedSlab,softBlock,flat,transformFaces} from './model-art.js';
export function chairBaseFaces(width=1,height=1,kind='chair',rotation=0){
 const x0=-width/2+.18,x1=width/2-.18,y0=-height/2+.18,y1=height/2-.18,cushioned=/Soft|Arms|Sofa|sofa/.test(kind),staff=kind.startsWith('staff'),top=cushioned?(staff?'#819077':'#66808a'):'#c2a16e',side=cushioned?(staff?'#657862':'#536b74'):'#aa895b';
 const faces=softBlock(0,0,SEAT_HEIGHT-(cushioned?4:2.2),x1-x0,y1-y0,cushioned?4:2.2,top,'seat',cushioned?.085:.055);
 if(cushioned){const inset=.045;for(const y of [y0+inset,y1-inset])faces.push(flat([[x0+inset,y-.003,SEAT_HEIGHT+.02],[x1-inset,y-.003,SEAT_HEIGHT+.02],[x1-inset,y+.003,SEAT_HEIGHT+.02],[x0+inset,y+.003,SEAT_HEIGHT+.02]],'#91aaa3','seat-piping'));}
 for(const [x,y]of [[x0,y0],[x1,y0],[x1,y1],[x0,y1]])faces.push(...boxFaces(x-.022,y-.022,0,x+.022,y+.022,SEAT_HEIGHT-1,['#5e4d3e','#705c4a','#635140','#705c4a','#806953','#8b735d'],'support'));
 for(const x of [x0,x1])faces.push(...boxFaces(x-.016,y0,3.5,x+.016,y1,4.5,['#6c5946','#806952','#735f4b','#806952','#695643','#998064'],'stretcher'));
 if(kind==='chairArms'||/sofa/i.test(kind)){
  const frame=seatFrame(rotation),sofa=/sofa/i.test(kind),localWidth=rotation%2?height:width;
  for(const side of [-1,1]){
   const fs=softBlock(side*(localWidth/2-.18),0,SEAT_HEIGHT+5.5,sofa?.16:.07,.64,sofa?3:2,'#617e81','armrest',.03);
   if(sofa)fs.push(...softBlock(side*(localWidth/2-.18),0,SEAT_HEIGHT,.16,.64,6,'#58757a','sofa-side',.04));
   else fs.push(...softBlock(side*.32,.27,SEAT_HEIGHT,.045,.045,5.5,'#58747a','armrest-post',.012));
   faces.push(...fs.map(f=>({...f,points:f.points.map(p=>frame.world(p.x,p.y,p.z))})));
  }
 }return faces;
}
