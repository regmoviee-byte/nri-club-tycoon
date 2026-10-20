import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createCampaign,build,hireMaster,buyGame,configureRoom,startRoom,advanceClub,waitForGuests,waitForOperation,decodeClub,encodeClub,trainMaster,masterTrainingOffer} from '../src/model/campaign.js';
import {assignGuest,askQuestion} from '../src/model/club.js';
import {cleanZone} from '../src/model/operations.js';
import {kitStatus,repairKit} from '../src/model/kit-lifecycle.js';
import {availableMasterCandidates,gameProduct} from '../src/data/commerce.js';
import {prestigeNeeded} from '../src/model/upgrades.js';
import {createConstructionService} from '../src/model/construction.js';
import {constructionBudgetAdapter} from '../src/model/campaign-construction.js';
import {roomEdit,rectangle} from '../src/model/studio-building.js';
import {clubDirectionStatus} from '../src/model/club-direction.js';
import {audienceDemand} from '../src/model/guest-flow.js';
import {masterPreferences} from '../src/model/preferences.js';
import {reserveRequired} from '../src/model/finances.js';
if(!process.argv.includes('-noaudio'))throw Error('Pass -noaudio');
globalThis.ReviewAudioSilence=Object.freeze({enabled:true});
const val=(key,defaultValue)=>{const i=process.argv.indexOf(key);return i<0?defaultValue:process.argv[i+1];};
const out=resolve(val('--out','review/design-growth/report.json')),seeds=Number(val('--seeds',3)),parties=Number(val('--parties',120)),target=Number(val('--target-rooms',3)),policies=val('--policies','first-four,heard-four,heard-flex').split(','),direction=val('--direction','general');
const report={finished:false,passed:false,audio:'-noaudio; ReviewAudioSilence; pure model, no browser',sourceHashes:{},settings:{seeds,parties,target,policies,direction},checks:[],failures:[],runs:[],limitations:['Explicit deterministic management policies, not a human playtest. No budget grants, no hidden final score and no free replacement of guests.','Expansion is paid through normal construction/hiring/library APIs. The policy retains the starter and purchased base adventures; it is not optimal investment.','Actions include individual questions, not the existing one-click quick interview. They are not physical UI clicks. UI fatigue and subjective fun require human playtesting.']};
const began=Date.now();
await mkdir(dirname(out),{recursive:true});
const check=(condition,message)=>{if(!condition)throw Error(message);};
const combinations=(a,k,start=0,chosen=[],result=[])=>{if(chosen.length===k){result.push(chosen);return result;}for(let i=start;i<=a.length-(k-chosen.length);i++)combinations(a,k,i+1,[...chosen,a[i]],result);return result;};
function fit(c,room,group){
 let value=0,demand=0;const s=room.session;
 for(const g of group){
  const hard=g.schedule.leaveAt<c.clock+room.hours||g.profile.boundaries.some(b=>s.requiredTopics.includes(b.id))||g.avoidGenres.some(id=>s.genres.includes(id));
  value+=hard?-1000:0;value+=s.genres.includes(g.profile.genres[0].id)?10:0;
  const [lo,hi]=g.schedule.preferred;value-=Math.max(lo-room.hours,room.hours-hi,0);
  if(g.preferences.knowledge[s.systemId]<2)demand+={ahead:.35,table:.8,describe:1.2}[g.preferences.learning]*(g.preferences.knowledge[s.systemId]===1?.75:1);
 }
 value-=Math.max(0,demand-room.master.teachingCapacity*room.master.teachingSkill)*2;
 return value;
}
async function expand(c){
 const i=c.rooms.length,x=6*i,plan=structuredClone(c),service=createConstructionService({getClub:()=>plan,replaceClub:next=>Object.assign(plan,next),persist:async()=>{},economy:constructionBudgetAdapter()});
 const purchase=async edit=>{const quote=service.quote(edit);check(quote.ok,quote.reason);const result=await service.commit(quote.edit,{transactionId:'growth-'+plan.layout.revision,baseRevision:quote.baseRevision});check(result.ok,result.reason);};
 const ok=result=>{check(result.ok,result.reason);return result;};
 await purchase({type:'buyCells',cells:rectangle({x,y:0},{x:x+5,y:7})});ok(build(plan,'wall',{x:x-1,y:6,side:'E',type:'door'}));ok(build(plan,'template',{x:x+1,y:0}));
 await purchase(roomEdit(plan.layout,rectangle({x:x+4,y:5},{x:x+5,y:7}),{purpose:'staff',furnished:true}));ok(build(plan,'item',{type:'shelf',x:x+5,y:4}));
 const candidate=availableMasterCandidates(plan).filter(m=>prestigeNeeded(m)===0).sort((a,b)=>Number(!a.known.includes('fate'))-Number(!b.known.includes('fate'))||a.fee-b.fee)[0];check(candidate,'No affordable entry candidate');ok(hireMaster(plan,candidate.id));
 const room=plan.rooms.at(-1),system=candidate.known[0],kit=ok(buyGame(plan,system)).kit;ok(configureRoom(plan,room.id,{masterId:candidate.id,kitId:kit.id}));
 // Keep a real working reserve, not just enough money to finish construction.
 if(plan.finance.cash<3500+plan.rooms.length*1200)return {requiredCash:c.finance.cash-plan.finance.cash+3500+plan.rooms.length*1200};
 Object.assign(c,plan);return true;
}
try{
 check(Number.isInteger(seeds)&&seeds>=1&&seeds<=12&&parties>=100&&parties<=500&&target>=1&&target<=10,'Invalid probe bounds');
 for(const directory of ['src/model','src/data'])for(const filename of (await readdir(new URL('../'+directory+'/',import.meta.url))).filter(f=>f.endsWith('.js')).sort()){const file=directory+'/'+filename;report.sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');}
 report.probeSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
 for(const policy of policies)for(let seed=0;seed<seeds;seed++){
  const c=createCampaign('design-growth-'+seed),row={policy,seed,openingCash:c.finance.cash,completed:0,actions:0,history:[],expansions:[{rooms:1,afterParties:0,clock:12,cash:c.finance.cash}],investments:[],waitingHours:0,roomOpenHours:0,roomBusyHours:0,stop:null};report.runs.push(row);
  let iterations=0,nextExpansionCash=17000;
  if(direction==='beginners'){const {executeCampaignAction}=await import('../src/model/campaign.js');check(executeCampaignAction(c,{type:'setClubDirection',direction}).ok,'Could not choose direction');}
  while(c.finance.settledRuns.length<parties&&iterations++<parties*12){
   if(c.finance.cash<0||c.campaign.status==='bankrupt'){row.stop='debt or bankruptcy';break;}
   if(c.rooms.length<target&&!c.rooms.some(r=>r.status==='running')&&!c.operations.tasks.some(t=>['active','queued'].includes(t.state))&&c.finance.cash>=nextExpansionCash){try{const result=await expand(c);if(result===true){row.expansions.push({afterParties:c.finance.settledRuns.length,clock:c.clock,rooms:c.rooms.length,cash:c.finance.cash});row.actions+=8;nextExpansionCash=17000;}else nextExpansionCash=result.requiredCash;}catch(error){if(!/не хватает|недостаточно|престиж/i.test(error.message))throw error;nextExpansionCash=c.finance.cash+2000;}}
   for(const [id,state]of Object.entries(c.operations.zones))if(state.cleanliness<55&&!c.operations.tasks.some(t=>t.zoneId===id&&['active','queued'].includes(t.state))){const result=cleanZone(c,id);if(result.ok)row.actions++;}
   for(const kit of c.library.copies)if(kitStatus(c,kit.id).condition<15&&repairKit(c,kit.id).ok)row.actions++;
   if(policy==='school-invest'){
    for(const room of c.rooms.filter(r=>r.operational&&r.status!=='running'))if(!c.layout.objects.some(o=>o.roomId===room.id&&o.kind==='tablet')&&c.finance.cash-reserveRequired(c)>2500){const table=c.layout.objects.find(o=>o.id===room.tableId),result=build(c,'item',{type:'tablet',x:table.x,y:table.y});check(result.ok,result.reason);row.investments.push({type:'tablet',roomId:room.id,clock:c.clock,cost:result.cost});}
    if(c.staff.length>=2&&!c.staff.some(m=>m.training)&&c.finance.cash-reserveRequired(c)>4000){const master=c.staff.find(m=>!c.rooms.some(r=>r.masterId===m.id&&r.status==='running')&&masterTrainingOffer(m,'teaching').ok);if(master){const result=trainMaster(c,master.id,'teaching');if(result.ok)row.investments.push({type:'teaching',masterId:master.id,clock:c.clock,cost:result.cost,hours:result.hours});}}
   }
   for(const room of c.rooms.filter(r=>r.operational&&r.status!=='running')){
    if(c.operations.tasks.some(t=>t.zoneId===room.id&&['active','queued'].includes(t.state))||!kitStatus(c,room.kitId).ok)continue;
    const waiting=c.guests.filter(g=>!g.roomId);let chosen;
    if(policy==='first-four'){if(waiting.length<4)continue;chosen=waiting.slice(0,4);}
    else{
     for(const g of waiting)for(const q of ['time','stories','boundaries','avoidGenres','commitment','knowledge','learning']){if(!g.asked.includes(q)){askQuestion(c,g.id,q);row.actions++;}check(g.asked.includes(q)&&g.dialogue.some(a=>a.questionId===q),'Policy must actually hear every fact it uses');}
     const safe=waiting.filter(g=>g.schedule.leaveAt>=c.clock+room.hours&&!g.profile.boundaries.some(b=>room.session.requiredTopics.includes(b.id))&&!g.avoidGenres.some(id=>room.session.genres.includes(id)));
     const size=safe.length>=4?4:['heard-flex','school-invest'].includes(policy)&&safe.length>=3?3:0;if(!size)continue;
     const best=safe.toSorted((a,b)=>fit(c,room,[b])-fit(c,room,[a])).slice(0,10);chosen=combinations(best,size).toSorted((a,b)=>fit(c,room,b)-fit(c,room,a))[0];
    }
    for(const [seat,g]of chosen.entries()){check(assignGuest(c,g.id,room.id,seat).ok,'Seat assignment failed');row.actions++;}
    const start=startRoom(c,room.id,{acceptRisk:true});if(start.ok)row.actions++;else throw Error(start.reason);
   }
   const beforeClock=c.clock,beforeCash=c.finance.cash,busy=c.rooms.filter(r=>r.status==='running').length,opened=c.rooms.filter(r=>r.operational||r.status==='running').length;
   let result;if(c.rooms.some(r=>r.status==='running'))result=advanceClub(c);else if(c.operations.tasks.some(t=>['active','queued'].includes(t.state))||c.library.copies.some(k=>k.repair))result=waitForOperation(c);else result=waitForGuests(c);
   if(!result.ok){if(c.library.copies.some(k=>k.repair)){const {waitForPreparation}=await import('../src/model/campaign.js');result=waitForPreparation(c);}if(!result.ok){row.stop=result.reason;break;}}
   row.actions++;if(!c.lastReport.completed.length)row.waitingHours+=c.clock-beforeClock;
   row.roomOpenHours+=opened*(c.clock-beforeClock);row.roomBusyHours+=busy*(c.clock-beforeClock);
   for(const entry of c.lastReport.completed)row.history.push({party:row.history.length+1,clock:c.clock,rooms:c.rooms.length,group:entry.reviews.length,cash:c.finance.cash,revenue:entry.payments,tips:entry.tips,wages:entry.wages,satisfaction:entry.reviews.reduce((sum,r)=>sum+(r.satisfactionValue??r.score),0)/entry.reviews.length,refunds:entry.refunds??0});
   check(c.clock>beforeClock||c.finance.cash!==beforeCash,'No progress');
   if(c.finance.settledRuns.length%20===0)check(decodeClub(encodeClub(c)).finance.cash===c.finance.cash,'Reload changed cash');
   if(c.lastReport.completed.length&&Math.floor((c.finance.settledRuns.length-c.lastReport.completed.length)/10)<Math.floor(c.finance.settledRuns.length/10)){row.completed=c.finance.settledRuns.length;row.currentCash=c.finance.cash;row.currentRooms=c.rooms.length;report.elapsedMs=Date.now()-began;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({progress:true,elapsedMs:report.elapsedMs,policy,seed,completed:row.completed,rooms:c.rooms.length,cash:c.finance.cash}));}
  }
  row.completed=c.finance.settledRuns.length;row.finalCash=c.finance.cash;row.rooms=c.rooms.length;row.clock=c.clock;row.reviews=c.rating.count;row.rating=c.rating.sum/c.rating.count;row.actionsPerParty=row.actions/Math.max(1,row.completed);row.costs=Object.fromEntries(['construction','hire','game','operations','wage','cleaning','kit-maintenance','direction'].map(kind=>[kind,-c.finance.ledger.filter(e=>e.kind===kind).reduce((n,e)=>n+e.amount,0)]));
  row.profitPerGameHour=(row.finalCash-row.openingCash)/(c.clock-12);row.loadedChecks=0;
  row.utilization=row.roomOpenHours?row.roomBusyHours/row.roomOpenHours:0;row.unreachedRoomMilestones=[1,3,7,10].filter(n=>n>row.rooms);row.elapsedMs=Date.now()-began;
  row.direction=clubDirectionStatus(c);row.finalDemand=audienceDemand(c);
  const last=decodeClub(encodeClub(c));check(last.finance.cash===c.finance.cash,'Final reload changed cash');row.loadedChecks++;
  console.log(JSON.stringify({policy,seed,completed:row.completed,rooms:row.rooms,cash:row.finalCash,stop:row.stop}));await writeFile(out,JSON.stringify(report,null,2));
 }
 report.checks.push('All requested deterministic growth trajectories completed with finished outcomes and no injected cash');
 check(report.runs.every(r=>r.completed>=parties),'At least one strategy stopped before the requested parties');report.passed=true;
}catch(error){report.failures.push(error.stack);}
report.finished=true;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({finished:true,passed:report.passed,runs:report.runs.map(({history,...row})=>row),failures:report.failures}));if(!report.passed)process.exitCode=1;
