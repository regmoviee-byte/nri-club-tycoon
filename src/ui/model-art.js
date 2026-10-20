import {boxFaces,prismFaces} from './isometric-solids.js';
export const shade=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
export const palette=hex=>[shade(hex,-24),shade(hex,-17),shade(hex,-9),shade(hex,-4),shade(hex,-18),shade(hex,14)];
export const block=(x,y,z,w,d,h,color,part='')=>boxFaces(x-w/2,y-d/2,z,x+w/2,y+d/2,z+h,palette(color),part);
export const flat=(points,fill,part='')=>({points:points.map(p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:p),fill,part});
export function transformFaces(faces,{x=0,y=0,z=0,angle=0}={}){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return faces.map(f=>({...f,points:f.points.map(p=>({x:x+p.x*c-p.y*s,y:y+p.x*s+p.y*c,z:p.z+z}))}));}
export function cylinder(x,y,z,r0,r1,height,color,segments=12,part=''){
 const ring=(r,h)=>Array.from({length:segments},(_,i)=>({x:x+r*Math.cos(i*Math.PI*2/segments),y:y+r*Math.sin(i*Math.PI*2/segments),z:z+h})),bottom=ring(r0,0),top=ring(r1,height),faces=[flat(bottom,shade(color,-24),part),flat(top,shade(color,15),part)];
 for(let i=0;i<segments;i++){const j=(i+1)%segments;faces.push(flat([bottom[i],bottom[j],top[j],top[i]],shade(color,Math.round(-8+12*Math.cos(i*Math.PI*2/segments+2))),part));}return faces;
}
export function tapered(x,y,z,w0,d0,w1,d1,height,color,part=''){return prismFaces([[x-w0/2,y-d0/2,z],[x+w0/2,y-d0/2,z],[x+w0/2,y+d0/2,z],[x-w0/2,y+d0/2,z],[x-w1/2,y-d1/2,z+height],[x+w1/2,y-d1/2,z+height],[x+w1/2,y+d1/2,z+height],[x-w1/2,y+d1/2,z+height]].map(([x,y,z])=>({x,y,z})),palette(color),part);}
export function disk(x,y,z,rx,ry,color,part='',segments=12){return flat(Array.from({length:segments},(_,i)=>({x:x+rx*Math.cos(i*Math.PI*2/segments),y:y+ry*Math.sin(i*Math.PI*2/segments),z})),color,part);}
export function lineOnTop(a,b,width,z,color,part=''){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),x=-dy/length*width/2,y=dx/length*width/2;return flat([[a[0]+x,a[1]+y,z],[b[0]+x,b[1]+y,z],[b[0]-x,b[1]-y,z],[a[0]-x,a[1]-y,z]],color,part);}
export function roundedSlab(width,depth,z,height,radius,color,part=''){
 const ring=[];for(const [cx,cy,start]of [[width/2-radius,depth/2-radius,0],[-width/2+radius,depth/2-radius,90],[-width/2+radius,-depth/2+radius,180],[width/2-radius,-depth/2+radius,270]])for(let i=0;i<=3;i++){const a=(start+i*30)*Math.PI/180;ring.push({x:cx+radius*Math.cos(a),y:cy+radius*Math.sin(a),z});}
 const top=ring.map(p=>({...p,z:z+height})),faces=[flat(ring,shade(color,-20),part),flat(top,shade(color,10),part)];for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length;faces.push(flat([ring[i],ring[j],top[j],top[i]],shade(color,-10+Math.round(6*Math.cos(i))),part));}return faces;
}
