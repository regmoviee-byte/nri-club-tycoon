import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createFreshCampaign} from '../src/model/new-club.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {roomEdit,rectangle} from '../src/model/studio-building.js';
import {hireMaster,buyGame,waitForGuests,targetGuestCount} from '../src/model/campaign.js';
import {recordMoney} from '../src/model/finances.js';
import {availableMasterCandidates} from '../src/data/masters-market.js';
import {guestFlowStatus} from '../src/model/guest-flow.js';
if(!process.argv.includes('-noaudio'))throw Error('Pass -noaudio');
globalThis.ReviewAudioSilence=Object.freeze({enabled:true});
const out=resolve(process.argv[process.argv.indexOf('--out')+1]),report={finished:false,passed:false,auditCompleted:false,findings:[],errors:[],audio:'Pure model; -noaudio; ReviewAudioSilence',fixture:'Labelled technical funds; all geometry, hiring and game purchases use paid production APIs.'};await mkdir(dirname(out),{recursive:true});
try{
 const club=createFreshCampaign('audit-seat-capacity-flow');recordMoney(club,50000,'fixture','Проверочный бюджет большого стола');const service=createConstructionService({getClub:()=>club,replaceClub:n=>Object.assign(club,n),persist:async()=>{},economy:constructionBudgetAdapter()});let seq=0;
 const ok=r=>{assert.equal(r.ok,true,r.reason);return r;};async function buy(edit){const q=ok(service.quote(edit));ok(await service.commit(q.edit,{baseRevision:q.baseRevision,transactionId:'capacity-audit-'+(++seq)}));}
 await buy({type:'buyCells',cells:[...rectangle({x:6,y:0},{x:7,y:8}),{x:5,y:8}]});await buy(roomEdit(club.layout,rectangle({x:1,y:0},{x:7,y:5}),{purpose:'game',furnished:false}));await buy({type:'place',object:{kind:'table',x:3,y:2,rotation:0}});await buy({type:'place',object:{kind:'light',x:3,y:2,rotation:0}});
 for(const[x,y,rotation]of [[2,2,1],[2,3,1],[5,2,3],[5,3,3],[3,4,0],[4,4,0],[3,1,2],[4,1,2]])await buy({type:'place',object:{kind:'chair',x,y,rotation}});
 await buy(roomEdit(club.layout,rectangle({x:6,y:6},{x:7,y:8}),{purpose:'staff',furnished:true}));await buy({type:'place',object:{kind:'shelf',x:4,y:6,rotation:0}});ok(hireMaster(club,availableMasterCandidates(club)[0].id));ok(buyGame(club,'fate'));assert.equal(club.rooms.length,1);assert.equal(club.rooms[0].capacity,7);assert.equal(club.rooms[0].operational,true);
 const samples=[];for(let i=0;i<24;i++){samples.push({clock:club.clock,present:club.guests.length,capacity:guestFlowStatus(club).capacity});ok(waitForGuests(club));}
 report.details={physicalSeats:club.rooms[0].capacity,target:targetGuestCount(club),flowCapacity:guestFlowStatus(club).capacity,maximumGuests:Math.max(...samples.map(s=>s.present)),samples};
 if(report.details.flowCapacity<report.details.physicalSeats)report.findings.push({id:'UX-G01',priority:'P2',title:'Поток гостей всё ещё рассчитан на старые четыре места и ограничивает большую комнату шестью посетителями',steps:['Построить одну доступную комнату с семью гостевыми стульями','Нанять мастера и купить игру','Несколько раз дождаться гостей'],actual:report.details,expected:'Лимит присутствующих учитывает реальные физические места и отдельно понятный резерв очереди, без создания бесплатных гостей.',source:['src/model/campaign.js:34','src/model/guest-flow.js:7','src/model/guest-flow.js:52']});
 assert.ok(report.details.maximumGuests>=7);assert.equal(report.details.target,11);assert.equal(report.details.flowCapacity,11);assert.equal(report.findings.length,0);report.auditCompleted=true;report.passed=true;
}catch(error){report.errors.push(error.stack??String(error));}
report.finished=true;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({auditCompleted:report.auditCompleted,details:report.details,errors:report.errors}));if(!report.passed)process.exitCode=1;
