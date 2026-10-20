// Read-only economy audit. This file never edits runtime or published saves.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
if(!process.argv.includes('-noaudio'))throw Error('Pass -noaudio');
globalThis.ReviewAudioSilence=Object.freeze({enabled:true});
const value=(flag,fallback)=>{const i=process.argv.indexOf(flag);return i<0?fallback:process.argv[i+1];};
const out=resolve(value('--out','review/economy-balance/progression.json'));
const report={finished:false,passed:false,audio:'Pure model analysis; -noaudio; ReviewAudioSilence; no browser',checks:[],failures:[],limitations:[
 'No cash is injected. One starter room, starter master and starter adventure are retained. No purchase policy is simulated.',
 'Informed policy enumerates all combinations from the present finite reception queue. It is an optimistic information bound, not an automatic player feature.',
 'Only already expired visitors may be dismissed, once per pre-session boundary. No voluntary replacement or infinite reroll is permitted.',
 'The current finite guest-flow system is used when available. Any manual expired dismissal is bounded to the pre-existing list, never a newly generated visitor.',
 'No external data, translation, browser, real save, or publishing is used.'
]};
await mkdir(dirname(out),{recursive:true});
const check=(name,result)=>{if(!result)throw Error(name);report.checkCount=(report.checkCount??0)+1;if(!report.checks.includes(name))report.checks.push(name);};
try{
 const campaign=await import('../src/model/campaign.js');
 const {assignGuest,askQuestion}=await import('../src/model/club.js');
 const {rateCampaignGuest,CAMPAIGN_RATING_VERSION}=await import('../src/model/campaign-rating.js');
 const {commerceItems,ECONOMY,gameProduct,availableMasterCandidates}=await import('../src/data/commerce.js');
 const {sessionForecast,hourlyCosts,settlementFor}=await import('../src/model/finances.js');
 const {cleanZone}=await import('../src/model/operations.js');
 const {buildRoomTemplate}=await import('../src/model/campaign-layout.js');
 const {quoteEdit}=await import('../src/model/layout.js');
 report.rules={ratingVersion:CAMPAIGN_RATING_VERSION,paymentCurve:3,at:new Date().toISOString(),sourceHashes:{}};
 for(const file of ['src/model/campaign-rating.js','src/model/campaign.js','src/model/guest-flow.js','src/model/finances.js','src/data/balance.js']){
  try{report.rules.sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 const combinations=(items,size,start=0,prefix=[],result=[])=>{if(prefix.length===size){result.push(prefix);return result;}for(let i=start;i<=items.length-(size-prefix.length);i++)combinations(items,size,i+1,[...prefix,items[i]],result);return result;};
 const preview=(c,group)=>{
  const room=c.rooms[0],guests=group.map((g,seat)=>({...structuredClone(g),seat}));
  const run={id:'audit-preview',ratingVersion:CAMPAIGN_RATING_VERSION,startedAt:c.clock,endsAt:c.clock+room.hours,guests,room:{...structuredClone(room),equipment:commerceItems(c.layout).filter(i=>room.layout.items.includes(i.id)),environment:{hot:room.hours>=5&&room.layout.cells.length<=28,noisyAppliances:false}},observed:{noiseHours:0,services:[],dirtyHours:0}};
  run.contract={pricingVersion:3,paymentCurve:3,guestPrice:room.hours*ECONOMY.guestHour,tipRolls:{}};
  const reviews=guests.map(g=>rateCampaignGuest(run,g)),scores=reviews.map(r=>r.score);
  return {group,scores,value:reviews.reduce((n,r)=>n+settlementFor(run,r).payment,0)+scores.reduce((a,b)=>a+b,0)/100};
 };
 const heardChoice=(c,group)=>{
  // Uses only answers actually requested below and the master's public offer.
  // No hidden personality, exact final rating, tip roll or peer trait is read.
  const room=c.rooms[0],s=room.session,master=room.master,system=s.systemId;
  let value=0,demand=0;
  for(const g of group){
   const [low,high]=g.schedule.preferred,distance=Math.max(low-room.hours,room.hours-high,0);
   const violation=g.schedule.leaveAt<c.clock+room.hours||g.profile.boundaries.some(b=>s.requiredTopics.includes(b.id))||g.avoidGenres?.some(id=>s.genres.includes(id))||g.preferences.format!==room.program.format;
   value+=violation?-1000:0;value+=s.genres.includes(g.profile.genres[0].id)?10:0;value-=distance;
   if(g.preferences.knowledge[system]<2)demand+={ahead:.35,table:.8,describe:1.2}[g.preferences.learning]*(g.preferences.knowledge[system]===1?.75:1);
  }
  const capacity=master.wantsTeaching?master.teachingCapacity*master.teachingSkill:0;
  value-=Math.max(0,demand-capacity)*2;
  return {group,value};
 };
 const baseline=campaign.createCampaign('progression-arithmetic');
 report.baseline={economy:ECONOMY,cash:baseline.finance.cash,hourlyCosts:hourlyCosts(baseline),forecast:sessionForecast(baseline,baseline.rooms[0].id)};
 check('Starter cash and forecast are finite',Number.isFinite(report.baseline.cash)&&Number.isFinite(report.baseline.forecast.totalCost));
 const baselineOperating=report.baseline.forecast.operatingCost/report.baseline.forecast.hours;
 report.baseline.linearPrices=[2,4,6].map(hours=>({hours,ticket:hours*ECONOMY.guestHour,master:hours*baseline.staff[0].hourlyWage,operating:hours*baselineOperating,netByPayingGuests:[0,1,2,3,4].map(paid=>({paid,net:paid*hours*ECONOMY.guestHour-hours*(baseline.staff[0].hourlyWage+baselineOperating)}))}));
 const expanded=quoteEdit(baseline.layout,{type:'expand',plotId:baseline.layout.plots[0].id,direction:'east'});
 check('A second plot quote is possible',expanded.ok);
 const passage=quoteEdit(expanded.next,{type:'wall',edge:{axis:'v',x:6,y:3},kind:'door'});
 check('A passage into the second plot can be quoted',passage.ok);
 const furnished=buildRoomTemplate(structuredClone(passage.next),7,0);
 check('A complete second room can be quoted on second plot: '+(furnished.reason??''),furnished.ok);
 const secondCopy=Math.round(gameProduct('fate').price*.6),secondMaster=availableMasterCandidates(baseline).filter(m=>m.known.includes('fate')).sort((a,b)=>a.fee-b.fee)[0];
 report.baseline.secondRoom={land:expanded.cost,passage:passage.cost,furnishedRoom:furnished.cost,secondFateCopy:secondCopy,master:{id:secondMaster.id,name:secondMaster.name,fee:secondMaster.fee,hourlyWage:secondMaster.hourlyWage},total:expanded.cost+passage.cost+furnished.cost+secondCopy+secondMaster.fee,assumes:'Existing staff room has a second place; no optional service or decoration'};
 const seeds=Number(value('--seeds','20')),turns=Number(value('--turns','20'));
 check('Probe bounds are sensible',Number.isInteger(seeds)&&seeds>=1&&seeds<=100&&Number.isInteger(turns)&&turns>=1&&turns<=40);
 report.trajectories=[];
 const policies=['first-four','heard-basic','oracle-best-four'];
 for(const policy of policies)for(let seed=0;seed<seeds;seed++){
  const c=campaign.createCampaign('economist-progression-'+seed),row={seed,policy,openingCash:c.finance.cash,turns:[],expiredDismissals:0,cleanings:0,stop:null};let continuousAdjustment=0;
  for(let turn=1;turn<=turns;turn++){
   const cycleCash=c.finance.cash,cycleLedger=c.finance.ledger.length;let arrivalWaitingCost=0,arrivalWaitingHours=0;
   if(c.finance.cash<0){row.stop='cash below zero';break;}
   // Once-only finite removal. A newly generated visitor is never dismissed here.
   const expired=c.guests.filter(g=>!g.roomId&&g.schedule.leaveAt<=c.clock).map(g=>g.id);
   for(const id of expired){const r=campaign.dismissGuest(c,id);check('Expired departure succeeds',r.ok);row.expiredDismissals++;}
   const needsCleaning=Object.entries(c.operations.zones).filter(([,z])=>z.cleanliness<60).map(([id])=>id);
   for(const id of needsCleaning){const r=cleanZone(c,id);if(r.ok)row.cleanings++;}
   for(let guard=0;c.operations.tasks.some(t=>['active','queued'].includes(t.state))&&guard<20;guard++){const r=campaign.waitForOperation(c);check('Cleaning advances through real event clock',r.ok);}
   let waits=0;
   while(c.guests.filter(g=>!g.roomId).length<4&&waits++<8){const cash=c.finance.cash,clock=c.clock,arrival=campaign.waitForGuests?.(c);if(!arrival?.ok)break;arrivalWaitingCost+=cash-c.finance.cash;arrivalWaitingHours+=c.clock-clock;}
   const waiting=c.guests.filter(g=>!g.roomId);
   if(waiting.length<4){row.stop='fewer than four visitors';break;}
   if(policy==='heard-basic')for(const g of waiting)for(const question of ['time','stories','boundaries','avoidGenres','commitment','knowledge','learning'])askQuestion(c,g.id,question);
   const selected=policy==='first-four'?{group:waiting.slice(0,4)}:combinations(waiting,4).map(group=>policy==='heard-basic'?heardChoice(c,group):preview(c,group)).sort((a,b)=>b.value-a.value)[0];
   const before=c.finance.cash,room=c.rooms[0];
   for(const [seat,g] of selected.group.entries())check('Explicit manual-style seat assignment succeeds',assignGuest(c,g.id,room.id,seat).ok);
   const start=campaign.startRoom(c,room.id,{acceptRisk:true});
   if(!start.ok){row.stop=start.reason;break;}
   let guard=0;
   while(c.rooms.some(r=>r.status==='running')&&guard++<60)check('Real session advances',campaign.advanceClub(c).ok);
   check('Session actually settled',!c.rooms.some(r=>r.status==='running')&&c.finance.settledRuns.length===turn);
   const ledger=c.finance.ledger.filter(e=>e.id==='payment-'+start.sessionId||e.id==='tips-'+start.sessionId),reviews=c.lastReport.completed.flatMap(r=>r.reviews);
   const actualPayments=ledger.filter(e=>e.kind==='session').reduce((n,e)=>n+e.amount,0),continuous=reviews.map(r=>{
    const shortfall=Math.sqrt(Object.keys(r.components).reduce((n,k)=>n+r.weights[k]*(1-r.components[k])**2,0)/10);
    const raw=r.satisfactionValue??Math.max(1,Math.min(10,10-9*shortfall-r.comfort.penalty+(r.upgradeBenefit?.bonus??0)));
    return {satisfaction:raw,coefficient:r.violations.length?0:Math.max(0,Math.min(1,(raw-3)/4))};
   });
   const continuousPayments=continuous.reduce((n,r)=>n+Math.round(room.hours*ECONOMY.guestHour*r.coefficient*100)/100,0);continuousAdjustment+=continuousPayments-actualPayments;
   const cycleEntries=c.finance.ledger.slice(cycleLedger);
   row.turns.push({turn,cash:c.finance.cash,continuousCashSameDecisions:Math.round((c.finance.cash+continuousAdjustment)*100)/100,partyNet:Math.round((c.finance.cash-before)*100)/100,cycleNet:Math.round((c.finance.cash-cycleCash)*100)/100,payments:actualPayments,continuousPayments,continuous,tips:ledger.filter(e=>e.kind==='tips').reduce((n,e)=>n+e.amount,0),guestIds:reviews.map(r=>r.guestId),scores:reviews.map(r=>r.score),teachingPenalties:reviews.map(r=>r.teachingPenalty??0),hardViolations:reviews.filter(r=>r.violations.length).length,fatigue:c.staff[0].fatigue,kitCondition:c.library.copies[0].condition,clock:c.clock,visitors:c.arrivals,arrivalWaitingCost,arrivalWaitingHours,cleaningCost:-cycleEntries.filter(e=>e.kind==='cleaning').reduce((n,e)=>n+e.amount,0),operatingCost:-cycleEntries.filter(e=>e.kind==='operations').reduce((n,e)=>n+e.amount,0),wages:-cycleEntries.filter(e=>e.kind==='wage').reduce((n,e)=>n+e.amount,0)});
  }
  row.finalCash=c.finance.cash;row.continuousFinalCashSameDecisions=Math.round((c.finance.cash+continuousAdjustment)*100)/100;row.completed=row.turns.length;row.rating=c.rating.count?c.rating.sum/c.rating.count:null;
  report.trajectories.push(row);
 }
 const quantile=(numbers,p)=>numbers.toSorted((a,b)=>a-b)[Math.floor((numbers.length-1)*p)];
 const secondReserve=2*(60+160+80+baseline.staff[0].hourlyWage+secondMaster.hourlyWage),expansionTarget=report.baseline.secondRoom.total+secondReserve;
 report.baseline.secondRoom.reserve=secondReserve;report.baseline.secondRoom.safeCashTarget=expansionTarget;
 report.summary=policies.map(policy=>{const rows=report.trajectories.filter(r=>r.policy===policy);return{policy,seeds:rows.length,completedAll:rows.filter(r=>r.completed===turns).length,finalCash:{min:Math.min(...rows.map(r=>r.finalCash)),median:quantile(rows.map(r=>r.finalCash),.5),max:Math.max(...rows.map(r=>r.finalCash))},continuousFinalCashSameDecisions:{min:Math.min(...rows.map(r=>r.continuousFinalCashSameDecisions)),median:quantile(rows.map(r=>r.continuousFinalCashSameDecisions),.5),max:Math.max(...rows.map(r=>r.continuousFinalCashSameDecisions))},after10Cash:{min:Math.min(...rows.map(r=>r.turns[Math.min(9,r.turns.length-1)]?.cash??r.finalCash)),median:quantile(rows.map(r=>r.turns[Math.min(9,r.turns.length-1)]?.cash??r.finalCash),.5)},averageRating:rows.reduce((n,r)=>n+(r.rating??0),0)/rows.length,medianCleanings:quantile(rows.map(r=>r.cleanings),.5),medianArrivalWaitCost:quantile(rows.map(r=>r.turns.reduce((n,t)=>n+t.arrivalWaitingCost,0)),.5),medianArrivalWaitHours:quantile(rows.map(r=>r.turns.reduce((n,t)=>n+t.arrivalWaitingHours,0)),.5),medianOperatingCost:quantile(rows.map(r=>r.turns.reduce((n,t)=>n+t.operatingCost,0)),.5),medianFatigueAtEnd:quantile(rows.map(r=>r.turns.at(-1)?.fatigue??0),.5),medianKitConditionAtEnd:quantile(rows.map(r=>r.turns.at(-1)?.kitCondition??100),.5),canSafelyExpand:rows.filter(r=>r.turns.some(t=>t.cash>=expansionTarget)).length,medianExpansionTurn:quantile(rows.map(r=>r.turns.find(t=>t.cash>=expansionTarget)?.turn??turns+1),.5),stops:rows.filter(r=>r.stop).map(r=>({seed:r.seed,completed:r.completed,reason:r.stop}))};});
 check('All three finite-queue strategies produced scenarios',report.trajectories.length===seeds*3);
 report.passed=true;
}catch(error){report.failures.push(error.stack);}
report.finished=true;await writeFile(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({finished:report.finished,passed:report.passed,summary:report.summary,baseline:report.baseline,failures:report.failures}));
if(!report.passed)process.exitCode=1;
