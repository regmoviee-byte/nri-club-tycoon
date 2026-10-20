import {project} from './seat-frame.js';
const EPS=1e-7;
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-a.y*b.x;},0)/2;
const bounds=p=>({left:Math.min(...p.map(v=>v.x)),right:Math.max(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),bottom:Math.max(...p.map(v=>v.y))});
function clip(p,value){
 const result=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],da=value(a),db=value(b);if(da>=-EPS)result.push(a);if((da>EPS&&db<-EPS)||(da<-EPS&&db>EPS)){const t=da/(da-db);result.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}return result;
}
function subtract(subject,occluder){
 // Disjoint convex shapes must leave the subject intact. Splitting them by
 // each infinite edge creates needless fragments during dense prop previews.
 const signTest=Math.sign(area(occluder));let intersection=subject;
 for(let i=0;i<occluder.length&&intersection.length>=3;i++){const a=occluder[i],b=occluder[(i+1)%occluder.length];intersection=clip(intersection,p=>signTest*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)));}
 if(intersection.length<3||Math.abs(area(intersection))<EPS)return [subject];
 let inside=subject;const visible=[],sign=Math.sign(area(occluder));
 for(let i=0;i<occluder.length&&inside.length>=3;i++){const a=occluder[i],b=occluder[(i+1)%occluder.length],distance=p=>sign*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)),outside=clip(inside,p=>-distance(p));if(outside.length>=3&&Math.abs(area(outside))>EPS)visible.push(outside);inside=clip(inside,distance);}
 return visible;
}
function projected(face){
 const p=face.points.map(v=>({...project(v.x,v.y,v.z),depth:v.x+v.y}));if(Math.abs(area(p))<EPS||(face.closed&&area(p)<EPS))return null;
 const [a,b,c]=p,det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y),dx=((b.depth-a.depth)*(c.y-a.y)-(c.depth-a.depth)*(b.y-a.y))/det,dy=((b.x-a.x)*(c.depth-a.depth)-(c.x-a.x)*(b.depth-a.depth))/det;
 return {...face,p,bounds:bounds(p),depth:v=>a.depth+dx*(v.x-a.x)+dy*(v.y-a.y)};
}
// Cut each face only where another solid is closer along the same view ray.
// This preserves a leg in front of a chair, while hiding it behind a support.
export function visibleSolidFaces(faces,occluders=[]){
 const own=faces.map(projected).filter(Boolean),all=[...own,...occluders.map(projected).filter(Boolean)],result=[];
 for(const face of own){let parts=[face.p];for(const other of all){if(other===face||other.bounds.left>face.bounds.right||other.bounds.right<face.bounds.left||other.bounds.top>face.bounds.bottom||other.bounds.bottom<face.bounds.top)continue;
   const cover=clip(other.p,p=>other.depth(p)-face.depth(p)-1e-5);if(cover.length<3||Math.abs(area(cover))<EPS)continue;parts=parts.flatMap(p=>subtract(p,cover));if(!parts.length)break;
  }for(const points of parts)result.push({points,fill:face.fill,part:face.part,owner:face.owner});
 }return result;
}
export function solidArt(faces,occluders=[]){
 const groups=new Map();for(const f of visibleSolidFaces(faces,occluders)){const key=f.part+f.fill,group=groups.get(key)??{part:f.part,fill:f.fill,paths:[]};group.paths.push('M'+f.points.map(p=>p.x.toFixed(5)+','+p.y.toFixed(5)).join('L')+'Z');groups.set(key,group);}
 return [...groups.values()].map(g=>'<path'+(g.part?' data-solid-part="'+g.part+'"':'')+' d="'+g.paths.join('')+'" fill="'+g.fill+'" shape-rendering="geometricPrecision" stroke="'+g.fill+'" stroke-width=".24" stroke-linejoin="round"/>').join('');
}
export function prismFaces(vertices,colors,part=''){
 return [[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]].map((indices,i)=>({points:indices.map(n=>vertices[n]),fill:colors[i]??colors[0],part,closed:true}));
}
export function boxFaces(x0,y0,z0,x1,y1,z1,colors,part=''){
 return prismFaces([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]].map(([x,y,z])=>({x,y,z})),colors,part);
}
