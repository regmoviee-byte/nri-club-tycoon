import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarterLayout,quoteEdit,roomReadiness,validateLayout,edgeKey} from '../src/model/layout.js';
import {replanRoomEdit,demolishRoomEdit} from '../src/model/studio-building.js';

test('existing furnished room can grow with one priced boundary/floor transaction',()=>{
 const layout=createStarterLayout(),before=structuredClone(layout),cells=Array.from({length:30},(_,i)=>({x:1+i%5,y:Math.floor(i/5)}));
 const edit=replanRoomEdit(layout,'room-1',cells,{name:'Зал историй',finish:'tile'}),quote=quoteEdit(layout,edit);
 assert.equal(quote.ok,true,quote.reason);assert.deepEqual(layout,before);assert.equal(quote.next.rooms[0].name,'Зал историй');
 assert.equal(quote.next.rooms[0].cells.length,30);assert.equal(quote.next.floors.filter(f=>f.finish==='tile').length,30);
 assert.equal(quote.next.walls.some(w=>w.axis==='h'&&w.y===5&&w.x>=1&&w.x<=5),false);
 assert.equal(roomReadiness(quote.next,'room-1').ok,true);assert.ok(quote.cost>quote.refund);assert.equal(quote.next.revision,layout.revision+1);
});

test('replanning refuses to silently sell furniture or bypass a locked room',()=>{
 const layout=createStarterLayout(),small=layout.rooms[0].cells.filter(c=>c.x!==4);
 assert.throws(()=>replanRoomEdit(layout,'room-1',small),/Сначала перенесите внутрь/);
 const edit=replanRoomEdit(layout,'room-1',layout.rooms[0].cells,{name:'Новое имя'});
 const quote=quoteEdit(layout,edit,{lockedRoomIds:['room-1']});assert.equal(quote.ok,false);assert.match(quote.reason,/Комната занята/);
});

test('demolition explicitly sells tabletop contents before its supporting table, once',()=>{
 let layout=createStarterLayout();const placed=quoteEdit(layout,{type:'place',object:{id:'dice-on-table',kind:'dice',roomId:'room-1',rotation:0,x:2,y:1,surface:{tableId:'room-1-table',x:.6,y:.6,angle:15}}});
 assert.equal(placed.ok,true,placed.reason);layout=placed.next;
 assert.throws(()=>demolishRoomEdit(layout,'room-1'),/выберите продажу/);
 const edit=demolishRoomEdit(layout,'room-1',{sellContents:true,removeFinishes:true,removeBoundary:true});
 assert.equal(edit.edits[0].id,'dice-on-table');const quote=quoteEdit(layout,edit);assert.equal(quote.ok,true,quote.reason);
 assert.equal(quote.cost,0);assert.ok(quote.refund>0);for(const key of ['objects','rooms','floors','walls'])assert.equal(quote.next[key].length,0);
 assert.equal(validateLayout(quote.next).ok,true);assert.equal(quoteEdit(quote.next,edit).ok,false);
});

test('demolition preserves a neighbouring room shared boundary',()=>{
 const layout=createStarterLayout();layout.plots[0].w=12;
 layout.rooms.push({id:'neighbour',number:2,name:'Соседняя',cells:Array.from({length:25},(_,i)=>({x:6+i%5,y:Math.floor(i/5)}))});
 const shared=layout.walls.filter(w=>w.axis==='v'&&w.x===6).map(edgeKey);
 const quote=quoteEdit(layout,demolishRoomEdit(layout,'room-1',{sellContents:true,removeBoundary:true}));
 assert.equal(quote.ok,true,quote.reason);assert.equal(quote.next.rooms[0].id,'neighbour');
 assert.deepEqual(quote.next.walls.filter(w=>w.axis==='v'&&w.x===6).map(edgeKey),shared);
});
