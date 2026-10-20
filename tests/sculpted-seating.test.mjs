import test from 'node:test';
import assert from 'node:assert/strict';
import {seatedArmFaces} from '../src/ui/seated-person.js';
import {seatFrame} from '../src/ui/seat-frame.js';
import {createCampaign} from '../src/model/campaign.js';
import {surfaceEditAt,surfacePlacementIssue,tableSurfacePolygon,polygonContains,surfacePolygon,surfacePose} from '../src/model/table-surface.js';

test('Playing hands reach over the table edge and stay above the wood or mat in every seat direction',()=>{
 for(const rotation of [0,1,2,3])for(const name of ['Ася','Анна','Вера','Павел','Максим']){
  const frame=seatFrame(rotation),faces=seatedArmFaces({name},{rotation,atTable:true,forearmsOnly:true}),hands=faces.filter(f=>f.part.startsWith('hand-'));
  assert.ok(hands.length>0,'Every playing pose must have a hand on the table');
  for(const f of faces)for(const p of f.points){const forward=p.x*frame.forward[0]+p.y*frame.forward[1];if(forward>.5)assert.ok(p.z>27.43,'No hand or sleeve may enter the wood or a mat: '+f.part+' / '+forward+' / z='+p.z);}
  for(const f of hands)for(const p of f.points)assert.ok(p.x*frame.forward[0]+p.y*frame.forward[1]>.5,'Hands must actually reach the table');
 }
});

test('Rounded tabletop corners reject a footprint that fits only the former square outline',()=>{
 const c=createCampaign('rounded-boundary'),table=c.layout.objects.find(o=>o.kind==='table'),object={id:'corner',...surfaceEditAt(c.layout,'tablet',{x:table.x+.32,y:table.y+.245},0)};
 const pose=surfacePose(object,c.layout);assert.ok(surfacePolygon(pose).every(p=>p.x>=table.x+.035&&p.y>=table.y+.035));
 assert.equal(polygonContains(tableSurfacePolygon(table),surfacePolygon(pose)),false);assert.match(surfacePlacementIssue(object,c.layout),/край/);
});
