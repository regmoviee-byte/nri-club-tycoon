import {SEAT_HEIGHT,seatFrame} from './seat-frame.js';
import {boxFaces,prismFaces} from './isometric-solids.js';
import {roundedSlab} from './model-art.js';
export function chairBaseFaces(width=1,height=1,kind='chair',rotation=0){
 const x0=-width/2+.18,x1=width/2-.18,y0=-height/2+.18,y1=height/2-.18,cushioned=/Soft|Arms|Sofa|sofa/.test(kind),top=cushioned?'#66808a':'#c2a16e',side=cushioned?'#536b74':'#aa895b';
 const faces=cushioned?roundedSlab(x1-x0,y1-y0,SEAT_HEIGHT-2.2,2.2,.065,top,'seat'):boxFaces(x0,y0,SEAT_HEIGHT-2.2,x1,y1,SEAT_HEIGHT,[side,side,side,side,side,top],'seat');
 for(const [x,y]of [[x0,y0],[x1,y0],[x1,y1],[x0,y1]])faces.push(...boxFaces(x-.022,y-.022,0,x+.022,y+.022,SEAT_HEIGHT-1,['#5e4d3e','#705c4a','#635140','#705c4a','#806953','#8b735d'],'support'));
 for(const x of [x0,x1])faces.push(...boxFaces(x-.016,y0,3.5,x+.016,y1,4.5,['#6c5946','#806952','#735f4b','#806952','#695643','#998064'],'stretcher'));
 if(kind==='chairArms'){
  const frame=seatFrame(rotation);for(const side of [-1,1]){
   const vertices=[];for(const z of [SEAT_HEIGHT+5.5,SEAT_HEIGHT+7.5])for(const [u,v]of [[side*.32-.025,-.32],[side*.32+.025,-.32],[side*.32+.025,.32],[side*.32-.025,.32]])vertices.push(frame.world(u,v,z));
   faces.push(...prismFaces(vertices,['#4c6268','#566b70','#566b70','#566b70','#566b70','#70878a'],'armrest'));
   const post=[];for(const z of [SEAT_HEIGHT,SEAT_HEIGHT+5.5])for(const [u,v]of [[side*.32-.02,.25],[side*.32+.02,.25],[side*.32+.02,.29],[side*.32-.02,.29]])post.push(frame.world(u,v,z));
   faces.push(...prismFaces(post,['#4c6268','#566b70','#566b70','#566b70','#566b70','#70878a'],'armrest-post'));
  }
 }return faces;
}
