import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,encodeClub,decodeClub} from '../src/model/campaign.js';
import {normalizeEdit} from '../src/model/construction.js';
import {quoteEdit,validateLayout} from '../src/model/layout.js';
import {surfaceEditAt,surfacePose,surfacePlacementIssue,TABLETOP_HEIGHT,surfaceBaseHeight} from '../src/model/table-surface.js';
import {roomUpgradeBenefit} from '../src/model/upgrades.js';
import {SURFACE_ITEMS,surfacePolygon,polygonContains} from '../src/model/table-surface.js';
import {tabletopFaces} from '../src/ui/table-art.js';
const club=()=>createCampaign('free-surface');
function place(c,kind,x,y,angle=0){const edit=normalizeEdit(c,{type:'place',object:surfaceEditAt(c.layout,kind,{x,y},angle)}),q=quoteEdit(c.layout,edit);if(q.ok)c.layout=q.next;return {...q,object:edit.object};}

test('Two separated accessories fit inside one former grid cell at exact fractional positions',()=>{
 const c=club();for(const [x,y]of [[2.25,1.25],[2.76,1.25]]){const q=place(c,'dice',x,y,7);assert.equal(q.ok,true,q.reason);const p=surfacePose(q.object,c.layout);assert.ok(Math.abs(p.x-x)<1e-6);assert.ok(Math.abs(p.y-y)<1e-6);assert.equal(p.angle,7);}
 assert.equal(c.layout.objects.filter(o=>o.kind==='dice').length,2);assert.equal(validateLayout(c.layout).ok,true);
});
test('Free placement rejects physical overlap, edge overhang and invalid surface data',()=>{
 const c=club();assert.equal(place(c,'dice',2.25,1.25).ok,true);assert.equal(place(c,'dice',2.27,1.26).ok,false);assert.equal(place(c,'tablet',2.05,1.2,15).ok,false);
 const s=structuredClone(c.layout);s.objects.find(o=>o.kind==='dice').surface.angle=NaN;assert.equal(validateLayout(s).ok,false);
});
test('A mat supports dice and a lamp without permitting object intersections or stacked mats',()=>{
 const c=club();assert.equal(place(c,'mat',3,2).ok,true);const dice=place(c,'dice',2.65,1.65),lamp=place(c,'deskLamp',3.3,2.25);assert.equal(dice.ok,true,dice.reason);assert.equal(lamp.ok,true,lamp.reason);assert.ok(surfaceBaseHeight(lamp.object,c.layout)>TABLETOP_HEIGHT+.35);assert.equal(place(c,'deskLamp',2.65,1.65).ok,false);assert.equal(place(c,'mat',3,2,15).ok,false);assert.equal(place(c,'tablet',3.65,2).ok,false);
});
test('Duplicate accessories cannot be stacked indefinitely and cannot multiply a party bonus',()=>{
 const c=club();assert.equal(place(c,'dice',2.3,1.3).ok,true);for(let i=0;i<20;i++)assert.equal(place(c,'dice',2.3,1.3).ok,false);assert.equal(place(c,'dice',2.8,1.3).ok,true);
 const guest={preferences:{knowledge:{fate:0}}},one={room:{equipment:[{kind:'dice',enabled:true}],session:{systemId:'fate'}}},many=structuredClone(one);many.room.equipment=Array.from({length:50},()=>({kind:'dice',enabled:true}));assert.equal(roomUpgradeBenefit(one,guest).bonus,.12);assert.deepEqual(roomUpgradeBenefit(many,guest),roomUpgradeBenefit(one,guest));
});
test('Moving a table carries its surface items and keeps exact positions relative to it',()=>{
 const c={layout:{version:1,revision:0,plots:[{id:'plot',x:0,y:0,w:8,h:8}],entry:{x:0,y:0},floors:[],walls:[],rooms:[],objects:[{id:'table',kind:'table',x:1,y:1,rotation:0}]}};
 const q=place(c,'dice',1.37,1.42,23);assert.equal(q.ok,true,q.reason);const before=surfacePose(q.object,c.layout),move=quoteEdit(c.layout,{type:'move',id:'table',x:3,y:3,rotation:1});assert.equal(move.ok,true,move.reason);const item=move.next.objects.find(o=>o.id===q.object.id),after=surfacePose(item,move.next);assert.deepEqual(item.surface,q.object.surface);assert.equal(after.angle,113);assert.equal(surfacePlacementIssue(item,move.next),null);assert.ok(Math.abs(Math.hypot(before.x-2,before.y-2)-Math.hypot(after.x-4,after.y-4))<1e-8);
});
test('Continuous table coordinates, angle, ownership and inventory survive save round trips',()=>{
 const c=club();assert.equal(place(c,'screen',3.2,2.2,27).ok,true);const raw=encodeClub(c),loaded=decodeClub(raw),a=c.layout.objects.find(o=>o.kind==='screen'),b=loaded.layout.objects.find(o=>o.id===a.id);assert.deepEqual(b,a);assert.equal(surfacePose(b,loaded.layout).angle,27);
});
test('Collision footprints enclose every visible part of each tabletop model at arbitrary angles',()=>{
 const c=club();for(const kind of Object.keys(SURFACE_ITEMS))for(const angle of [0,15,47,91,270]){const object={id:'bounds-'+kind,...surfaceEditAt(c.layout,kind,{x:3,y:2},angle)},polygon=surfacePolygon(surfacePose(object,c.layout));for(const face of tabletopFaces(object,c.layout))for(const point of face.points)assert.equal(polygonContains(polygon,[point]),true,kind+' extends beyond its collision footprint at '+angle+'°');}
});
test('A pointer inside one table never attaches to a nearer adjacent table',()=>{
 const layout={objects:[{id:'a',kind:'table',x:1,y:1,rotation:0},{id:'b',kind:'table',x:3,y:2,rotation:0}]};assert.equal(surfaceEditAt(layout,'dice',{x:2.88,y:2.88}).surface.tableId,'a');
});
test('A table can carry older grid-based accessories without discarding them',()=>{
 let layout={version:1,revision:0,plots:[{id:'plot',x:0,y:0,w:8,h:8}],entry:{x:0,y:0},floors:[],walls:[],rooms:[],objects:[{id:'table',kind:'table',x:1,y:1,rotation:0}]};
 for(const o of [{id:'old-mat',kind:'mat',x:1,y:1},{id:'old-screen',kind:'screen',x:1,y:1},{id:'old-dice',kind:'dice',x:2,y:1}]){const q=quoteEdit(layout,{type:'place',object:{...o,rotation:0}});assert.equal(q.ok,true,q.reason);layout=q.next;}
 const q=quoteEdit(layout,{type:'move',id:'table',x:3,y:3,rotation:1});assert.equal(q.ok,true,q.reason);for(const id of ['old-mat','old-screen','old-dice'])assert.ok(q.next.objects.some(o=>o.id===id));
});
