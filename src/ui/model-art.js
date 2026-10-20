import {boxFaces,prismFaces} from './isometric-solids.js';
export const shade=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
export const palette=hex=>[shade(hex,-24),shade(hex,-17),shade(hex,-9),shade(hex,-4),shade(hex,-18),shade(hex,14)];
export const block=(x,y,z,w,d,h,color,part='')=>boxFaces(x-w/2,y-d/2,z,x+w/2,y+d/2,z+h,palette(color),part);
export const flat=(points,fill,part='')=>({points:points.map(p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:p),fill,part});
export function transformFaces(faces,{x=0,y=0,z=0,angle=0}={}){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return faces.map(f=>({...f,points:f.points.map(p=>({x:x+p.x*c-p.y*s,y:y+p.x*s+p.y*c,z:p.z+z}))}));}
export function cylinder(x,y,z,r0,r1,height,color,segments=20,part=''){
 segments=Math.max(16,segments);
 const ring=(r,h)=>Array.from({length:segments},(_,i)=>({x:x+r*Math.cos(i*Math.PI*2/segments),y:y+r*Math.sin(i*Math.PI*2/segments),z:z+h})),bottom=ring(r0,0),top=ring(r1,height),faces=[flat([...bottom].reverse(),shade(color,-24),part),flat(top,shade(color,15),part)];
 for(let i=0;i<segments;i++){const j=(i+1)%segments;faces.push(flat([bottom[i],bottom[j],top[j],top[i]],shade(color,Math.round(-8+12*Math.cos(i*Math.PI*2/segments+2))),part));}return faces.map(f=>({...f,closed:true}));
}
export function tapered(x,y,z,w0,d0,w1,d1,height,color,part=''){return prismFaces([[x-w0/2,y-d0/2,z],[x+w0/2,y-d0/2,z],[x+w0/2,y+d0/2,z],[x-w0/2,y+d0/2,z],[x-w1/2,y-d1/2,z+height],[x+w1/2,y-d1/2,z+height],[x+w1/2,y+d1/2,z+height],[x-w1/2,y+d1/2,z+height]].map(([x,y,z])=>({x,y,z})),palette(color),part);}
export function disk(x,y,z,rx,ry,color,part='',segments=12){return flat(Array.from({length:segments},(_,i)=>({x:x+rx*Math.cos(i*Math.PI*2/segments),y:y+ry*Math.sin(i*Math.PI*2/segments),z})),color,part);}
export function lineOnTop(a,b,width,z,color,part=''){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),x=-dy/length*width/2,y=dx/length*width/2;return flat([[a[0]+x,a[1]+y,z],[b[0]+x,b[1]+y,z],[b[0]-x,b[1]-y,z],[a[0]-x,a[1]-y,z]],color,part);}
export function roundedSlab(width,depth,z,height,radius,color,part=''){
 const ring=[];for(const [cx,cy,start]of [[width/2-radius,depth/2-radius,0],[-width/2+radius,depth/2-radius,90],[-width/2+radius,-depth/2+radius,180],[width/2-radius,-depth/2+radius,270]])for(let i=0;i<=3;i++){const a=(start+i*30)*Math.PI/180;ring.push({x:cx+radius*Math.cos(a),y:cy+radius*Math.sin(a),z});}
 const top=ring.map(p=>({...p,z:z+height})),faces=[flat([...ring].reverse(),shade(color,-20),part),flat(top,shade(color,10),part)];for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length;faces.push(flat([ring[i],ring[j],top[j],top[i]],shade(color,-10+Math.round(6*Math.cos(i))),part));}return faces.map(f=>({...f,closed:true}));
}

// A chamfer around a rounded outline catches light without turning the
// entire object into a rectangular prism. Dimensions include the bevel.
export function softBlock(x,y,z,width,depth,height,color,part='',radius=Math.min(width,depth)*.07){
 const bevel=Math.min(.5,height*.18),r=Math.min(radius,width/2-.001,depth/2-.001),outline=(inset,zz)=>{
  const w=width-2*inset,d=depth-2*inset,rr=Math.max(.003,r-inset),ring=[];
  for(const [cx,cy,start]of [[w/2-rr,d/2-rr,0],[-w/2+rr,d/2-rr,90],[-w/2+rr,-d/2+rr,180],[w/2-rr,-d/2+rr,270]])for(let i=0;i<=3;i++){const a=(start+i*30)*Math.PI/180;ring.push({x:x+cx+rr*Math.cos(a),y:y+cy+rr*Math.sin(a),z:zz});}return ring;
 },bottom=outline(0,z),edge=outline(0,z+height-bevel),top=outline(Math.min(.012,r*.3),z+height),faces=[flat([...bottom].reverse(),shade(color,-20),part),flat(top,shade(color,12),part)];
 for(let i=0;i<bottom.length;i++){const j=(i+1)%bottom.length,normal=(i+.5)*Math.PI*2/bottom.length,light=Math.round(-9+10*Math.cos(normal+1.1));faces.push(flat([bottom[i],bottom[j],edge[j],edge[i]],shade(color,light),part),flat([edge[i],edge[j],top[j],top[i]],shade(color,light+12),part));}return faces.map(f=>({...f,closed:true}));
}

// Tube axes use world tiles horizontally and pixels vertically. Rounded
// cross-sections preserve the same geometry for drawing and chair occlusion.
export function tube(points,radii,color,part='',segments=12){
 const rings=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],v=[b[0]-a[0],b[1]-a[1],(b[2]-a[2])/36],l=Math.hypot(...v)||1,t=v.map(n=>n/l),axis=Math.abs(t[0])<.95?[1,0,0]:[0,1,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],n=cross(t,axis),nl=Math.hypot(...n),u=n.map(n=>n/nl),w=cross(t,u),r=Array.isArray(radii)?radii[i]:radii;
  return Array.from({length:segments},(_,j)=>{const angle=j*Math.PI*2/segments,c=Math.cos(angle)*r,s=Math.sin(angle)*r;return {x:p[0]+u[0]*c+w[0]*s,y:p[1]+u[1]*c+w[1]*s,z:p[2]+36*(u[2]*c+w[2]*s)};});
 });
 const faces=[flat([...rings[0]].reverse(),shade(color,-12),part),flat(rings.at(-1),shade(color,6),part)];for(let k=1;k<rings.length;k++)for(let i=0;i<segments;i++){const j=(i+1)%segments;const colorAt=shade(color,Math.round(5*Math.cos(i*Math.PI*2/segments+1.2)));faces.push(flat([rings[k-1][i],rings[k-1][j],rings[k][j]],colorAt,part),flat([rings[k-1][i],rings[k][j],rings[k][i]],colorAt,part));}return faces.map(f=>({...f,closed:true}));
}

export function lathe(x,y,z,profile,color,part='',segments=24){
 const rings=profile.map(([r,h])=>Array.from({length:segments},(_,i)=>({x:x+r*Math.cos(i*Math.PI*2/segments),y:y+r*Math.sin(i*Math.PI*2/segments),z:z+h}))),faces=[flat([...rings[0]].reverse(),shade(color,-17),part),flat(rings.at(-1),shade(color,16),part)];
 for(let k=1;k<rings.length;k++)for(let i=0;i<segments;i++){const j=(i+1)%segments;faces.push(flat([rings[k-1][i],rings[k-1][j],rings[k][j],rings[k][i]],shade(color,Math.round(-3+10*Math.cos((i+.5)*Math.PI*2/segments+1))),part));}return faces.map(f=>({...f,closed:true}));
}
