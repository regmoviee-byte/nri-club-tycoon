import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {createCampaign,makeGuest} from '../src/model/campaign.js';
import {rateCampaignGuest,tableWorkload} from '../src/model/campaign-rating.js';
import {sessionProgram,masterPreferences} from '../src/model/preferences.js';
import {marketCandidates} from '../src/data/masters-market.js';
import {SESSIONS} from '../src/data/club.js';
import {recordGuestOutcome,returningGuest} from '../src/model/guests-history.js';
import {settlementFor} from '../src/model/finances.js';
if(!process.argv.includes('-noaudio'))throw Error('Pass -noaudio');
globalThis.ReviewAudioSilence=Object.freeze({enabled:true});
const out=resolve(process.argv[process.argv.indexOf('--out')+1]);
const version=process.argv.includes('--version')?Number(process.argv[process.argv.indexOf('--version')+1]):7;
const report={finished:false,passed:false,audio:'Pure model probe; -noaudio; ReviewAudioSilence',ratingVersion:version,source:version===7?'Original published V7 mechanics':'V8, fictional guests regenerated locally from the original deterministic seed',failures:[]};
report.sourceHashes={};for(const path of ['src/model/campaign-rating.js','src/data/balance.js','src/model/finances.js'])try{report.sourceHashes[path]=createHash('sha256').update(await readFile(resolve(path))).digest('hex');}catch{}
const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
const groups=guests=>{const result=[];for(let a=0;a<guests.length-3;a++)for(let b=a+1;b<guests.length-2;b++)for(let c=b+1;c<guests.length-1;c++)for(let d=c+1;d<guests.length;d++)result.push([guests[a],guests[b],guests[c],guests[d]]);return result;};
function evaluate(club,guests,session,master,equipment=[]){
 const run={id:'economist-'+session.id+'-'+master.id+'-'+guests.map(g=>g.id).join(','),ratingVersion:version,startedAt:club.clock,endsAt:club.clock+session.minutes/60,room:{...structuredClone(club.rooms[0]),session,program:sessionProgram(session),master:masterPreferences(master),equipment,environment:{hot:false,noisyAppliances:false}},guests:guests.map((g,seat)=>({...g,seat})),observed:{noiseHours:0,services:[]},contract:{pricingVersion:version>=8?3:2,paymentCurve:version>=8?3:undefined,guestPrice:session.minutes/60*200}};
 const reviews=run.guests.map(g=>rateCampaignGuest(run,g));
 const finances=reviews.map(r=>settlementFor(run,r)),fullPayEquivalent=finances.reduce((n,f)=>n+f.payment/f.price,0);
 return {run,reviews,summary:{sessionId:session.id,title:session.title,masterId:master.id,master:master.name,hourlyWage:master.hourlyWage,hours:session.minutes/60,guests:guests.map(g=>g.id),names:guests.map(g=>g.profile.name),scores:reviews.map(r=>r.score),satisfaction:reviews.map(r=>r.satisfactionValue??r.score),average:mean(reviews.map(r=>r.satisfactionValue??r.score)),paid:finances.filter(f=>f.payment===f.price).length,paymentShares:finances.map(f=>f.payment/f.price),fullPayEquivalent,contributionPerHour:200*fullPayEquivalent-master.hourlyWage-180,violations:reviews.reduce((n,r)=>n+r.violations.length,0),workload:tableWorkload(run),details:reviews.map(r=>({name:r.name,score:r.score,satisfaction:r.satisfactionValue??r.score,components:r.components,reason:r.text,violations:r.violations}))}};
}
const rank=(a,b)=>b.fullPayEquivalent-a.fullPayEquivalent||b.average-a.average||a.hourlyWage-b.hourlyWage||a.hours-b.hours;
try{
 const candidates=marketCandidates(),initial=[];
 for(let index=0;index<100;index++){
  const club=createCampaign('economists-opening-'+index),room=club.rooms[0],variants=groups(club.guests).map(g=>evaluate(club,g,room.session,room.master).summary).sort(rank);
  initial.push({seed:club.seed,first:evaluate(club,club.guests.slice(0,4),room.session,room.master).summary,best:variants[0],worst:variants.at(-1)});
 }
 report.opening100={firstMean:mean(initial.map(s=>s.first.average)),bestMean:mean(initial.map(s=>s.best.average)),worstMean:mean(initial.map(s=>s.worst.average)),firstPaidMean:mean(initial.map(s=>s.first.paid)),bestPaidMean:mean(initial.map(s=>s.best.paid)),worstPaidMean:mean(initial.map(s=>s.worst.paid)),bestUnviable:initial.filter(s=>s.best.paid<3).map(s=>({seed:s.seed,best:s.best})),example:initial[0]};
 const club=createCampaign('economists-guests-20261020'),pool=Array.from({length:12},()=>makeGuest(club));
 club.guests=pool;
 report.pool=structuredClone(pool);
 const configurations=SESSIONS.flatMap(session=>candidates.filter(master=>master.known.includes(session.systemId)).map(master=>({session,master})));
 const same=pool.slice(0,4),sameResults=configurations.map(({session,master})=>evaluate(club,same,session,master).summary).sort(rank);
 report.sameFour={baseline:evaluate(club,same,SESSIONS.find(s=>s.id==='dark'),candidates[0]).summary,best:sameResults[0],bestWithoutViolations:sameResults.filter(r=>!r.violations)[0],worstWithoutViolations:sameResults.filter(r=>!r.violations).at(-1),worst:sameResults.at(-1)};
 let best=null,worstLegal=null;const winnerCounts={},results=[];
 for(const guests of groups(pool)){
  const variants=configurations.map(({session,master})=>evaluate(club,guests,session,master).summary).sort(rank),winner=variants[0];
  results.push({guests:guests.map(g=>g.id),winner});
  winnerCounts[winner.masterId]=(winnerCounts[winner.masterId]??0)+1;
  if(!best||rank(winner,best)<0)best=winner;
  const legal=variants.filter(r=>!r.violations).at(-1);if(legal&&(!worstLegal||rank(legal,worstLegal)>0))worstLegal=legal;
 }
 report.allTwelve={combinations:results.length,configurations:configurations.length,best,worstLegal,meanBest:mean(results.map(r=>r.winner.average)),meanBestFullPayEquivalent:mean(results.map(r=>r.winner.fullPayEquivalent)),belowThreeFullEquivalent:results.filter(r=>r.winner.fullPayEquivalent<3).length,negativeContribution:results.filter(r=>r.winner.contributionPerHour<0).length,winnerCounts,median:results.toSorted((a,b)=>a.winner.average-b.winner.average)[Math.floor(results.length/2)]};
 // Teaching demand is measured without altering any guest preferences.
 report.teachingExamples=results.map(r=>r.winner).filter(r=>r.workload.demand>3).toSorted((a,b)=>b.workload.demand-a.workload.demand).slice(0,3);
 const goodGuests=pool.filter(g=>best.guests.includes(g.id)),good=evaluate(club,goodGuests,SESSIONS.find(s=>s.id===best.sessionId),candidates.find(m=>m.id===best.masterId));
 const before=goodGuests.map(g=>({id:g.id,knowledge:g.preferences.knowledge[good.run.room.session.systemId]}));
 club.clock=good.run.endsAt;recordGuestOutcome(club,good.run,good.reviews);
 club.guests=club.guests.filter(g=>!goodGuests.includes(g));
 report.returnLearning={before,after:goodGuests.map(g=>{const person=club.guestRegistry.persons[g.personId];return {id:g.id,score:good.reviews.find(r=>r.guestId===g.id).score,knowledge:person.preferences.knowledge[good.run.room.session.systemId],availableAfter:person.availableAfter,waitHours:person.availableAfter-club.clock,favorite:person.favoriteAdventureId};})};
 club.clock+=64;let returning=null;for(let n=0;n<100&&!returning;n++)returning=returningGuest(club,1000+n);
 report.returnLearning.returned=returning?{personId:returning.personId,knowledge:returning.preferences.knowledge,playedAtClub:returning.playedAtClub,schedule:returning.schedule}:null;
 report.passed=report.opening100.bestUnviable.length===0&&Boolean(best)&&results.length===495&&Boolean(returning);
}catch(error){report.failures.push(error.stack);}
report.finished=true;await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,opening:report.opening100&&{firstMean:report.opening100.firstMean,bestMean:report.opening100.bestMean,bestPaid:report.opening100.bestPaidMean},best:report.allTwelve?.best}));if(!report.passed)process.exitCode=1;
