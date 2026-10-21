import test from 'node:test';
import assert from 'node:assert/strict';
import {createFreshCampaign} from '../src/model/new-club.js';
import {createCampaign} from '../src/model/campaign.js';
import {roomEdit,paintRoomEdit,brushCells,rectangle} from '../src/model/studio-building.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {createStarterLayout,quoteEdit,roomReadiness} from '../src/model/layout.js';
import {personArt} from '../src/ui/people.js';
import {DEFAULT_ADMINISTRATOR} from '../src/model/new-club.js';
import {normalizePreferences,DEFAULT_PREFERENCES} from '../src/ui/preferences.js';
const service=c=>createConstructionService({getClub:()=>c,replaceClub:next=>Object.assign(c,next),persist:async()=>{},economy:constructionBudgetAdapter()});
test('manual room designation and brush extension have no purchased contents or minimum rectangle',async()=>{
 const c=createFreshCampaign('manual-area'),s=service(c),cash=c.finance.cash,objects=structuredClone(c.layout.objects);
 let q=s.quote(roomEdit(c.layout,[{x:1,y:1}],{structure:false}));assert.equal(q.ok,true,q.reason);assert.equal(q.cost,0);assert.equal((await s.commit(q.edit,{baseRevision:q.baseRevision,transactionId:'mark'})).ok,true);
 q=s.quote(paintRoomEdit(c.layout,[{x:2,y:1},{x:1,y:2}],{roomId:c.layout.rooms[0].id}));assert.equal(q.ok,true,q.reason);assert.equal((await s.commit(q.edit,{baseRevision:q.baseRevision,transactionId:'extend'})).ok,true);
 assert.equal(c.layout.rooms[0].cells.length,3);assert.equal(c.layout.walls.length,0);assert.equal(c.layout.floors.length,0);assert.deepEqual(c.layout.objects,objects);assert.equal(c.finance.cash,cash);assert.equal(roomReadiness(c.layout,c.layout.rooms[0].id).ok,false);
});
test('a smaller playable room needs its real furniture and approaches, not 25 cells or a mandatory light',()=>{
 const l=createStarterLayout();l.rooms[0].cells=l.rooms[0].cells.filter(c=>c.x<=4);l.walls=l.walls.filter(w=>!(w.axis==='h'&&w.x===5)).map(w=>w.axis==='v'&&w.x===6?{...w,x:5}:w);l.floors=l.floors.filter(c=>c.x<=4);l.objects=l.objects.filter(o=>o.kind!=='light'&&!(o.kind==='chair'&&[1,3].includes(o.seat)));
 const r=roomReadiness(l,'room-1');assert.equal(l.rooms[0].cells.length,20);assert.equal(r.ok,true,r.reasons.join('; '));assert.equal(r.seats.length,2);
});
test('last reception cannot be sold through construction, but can be replaced after another is built',async()=>{
 const c=createFreshCampaign('desk-guard'),s=service(c),desk=c.layout.objects[0],before=structuredClone(c);
 assert.equal(s.quote({type:'remove',id:desk.id}).ok,false);assert.deepEqual(c,before);
 let q=s.quote({type:'place',object:{kind:'reception',x:3,y:1,rotation:0}});assert.equal(q.ok,true,q.reason);assert.equal((await s.commit(q.edit,{baseRevision:q.baseRevision,transactionId:'second'})).ok,true);assert.equal(s.quote({type:'remove',id:desk.id}).ok,true);
});
test('land quotes do not mutate cash or land before commit and duplicate commits do not charge twice',async()=>{
 const c=createFreshCampaign('land-quote'),s=service(c),before=structuredClone(c),cells=rectangle({x:6,y:2},{x:7,y:3}),q=s.quote({type:'buyCells',cells});assert.equal(q.ok,true,q.reason);assert.equal(q.cost,500);assert.deepEqual(c,before);
 const options={baseRevision:q.baseRevision,transactionId:'purchase'};assert.equal((await s.commit(q.edit,options)).ok,true);const cash=c.finance.cash;await s.commit(q.edit,options);assert.equal(c.finance.cash,cash);
});
test('brush interpolation is connected even for fast diagonal pointer movement',()=>{const cells=brushCells({x:1,y:1},{x:5,y:4});for(let i=1;i<cells.length;i++)assert.equal(Math.abs(cells[i].x-cells[i-1].x)+Math.abs(cells[i].y-cells[i-1].y),1);});
test('standing body, clothing and gender choices change rendered geometry',()=>{const base=structuredClone(DEFAULT_ADMINISTRATOR);for(const [key,values] of Object.entries({bodyShape:['regular','lean','soft','broad','compact'],outfit:['shirt','hoodie','cardigan','sweater','vest']})){const arts=values.map(v=>personArt({...base,portrait:{...base.portrait,[key]:v}}));assert.equal(new Set(arts).size,values.length,key);}assert.notEqual(personArt(base),personArt({...base,grammar:'feminine'}));});
test('control preferences reject duplicate bindings but preserve valid custom controls',()=>{const p=structuredClone(DEFAULT_PREFERENCES);p.keys.rotate=['KeyT'];assert.deepEqual(normalizePreferences(p).keys,p.keys);p.keys.remove=['KeyT'];assert.deepEqual(normalizePreferences(p).keys,DEFAULT_PREFERENCES.keys);});
