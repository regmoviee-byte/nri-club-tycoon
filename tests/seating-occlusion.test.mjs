import test from 'node:test';
import assert from 'node:assert/strict';
import {project,seatFrame,SEAT_HEIGHT} from '../src/ui/seat-frame.js';
import {chairBaseFaces} from '../src/ui/seat-solids.js';
import {seatedLegFaces} from '../src/ui/seated-person.js';
import {visibleSolidFaces} from '../src/ui/isometric-solids.js';

function depthAt(p,faces){
 let depth=-Infinity;
 for(const f of faces){const points=f.points.map(v=>({...project(v.x,v.y,v.z),depth:v.x+v.y}));
  for(let i=1;i+1<points.length;i++){const [a,b,c]=[points[0],points[i],points[i+1]],d=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(d)<1e-8)continue;const u=((b.y-c.y)*(p.x-c.x)+(c.x-b.x)*(p.y-c.y))/d,v=((c.y-a.y)*(p.x-c.x)+(a.x-c.x)*(p.y-c.y))/d,w=1-u-v;if(Math.min(u,v,w)>1e-5)depth=Math.max(depth,u*a.depth+v*b.depth+w*c.depth);}
 }return depth;
}
function contains(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}

test('Thighs stay above the seat and both calves start beyond its front edge',()=>{
 for(const rotation of [0,1,2,3]){const f=seatFrame(rotation);for(const face of seatedLegFaces(rotation))for(const p of face.points){if(face.part.startsWith('thigh'))assert.ok(p.z>SEAT_HEIGHT,'Thigh must not enter the solid seat');if(face.part.startsWith('calf'))assert.ok(p.x*f.forward[0]+p.y*f.forward[1]>.32,'Calf must remain outside the front edge');}}
});

test('Chair solids hide only the leg surfaces behind them in all four rotations',()=>{
 let totalHidden=0;
 for(const rotation of [0,1,2,3]){const legs=seatedLegFaces(rotation),chair=chairBaseFaces(),visible=visibleSolidFaces(legs,chair);let hidden=0,exposed=0;
  // Independent ray-depth sampling of the original 3D faces checks the final
  // clipped outlines. Names and layer order alone cannot satisfy this check.
  for(let x=-26.731;x<27;x+=.71)for(let y=-26.347;y<14;y+=.71){const p={x,y},body=depthAt(p,legs);if(!Number.isFinite(body))continue;const solid=depthAt(p,chair);if(Math.abs(solid-body)<.002)continue;const rendered=visible.some(f=>contains(p,f.points));
   if(solid>body){hidden++;assert.equal(rendered,false,'Leg leaks through chair at rotation '+rotation+' / '+x+','+y);}else{exposed++;assert.equal(rendered,true,'Visible leg was removed at rotation '+rotation+' / '+x+','+y);}
  }totalHidden+=hidden;assert.ok(exposed>50,'Must preserve the visible lower legs and shoes');
 }
 assert.ok(totalHidden>5,'Must actually exercise overlapping chair and leg surfaces: '+totalHidden);
});
