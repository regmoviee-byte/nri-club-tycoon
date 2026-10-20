import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
if(!process.argv.includes('-noaudio'))throw new Error('Use -noaudio');
globalThis.ReviewAudioSilence=Object.freeze({enabled:true});
const out=resolve(process.argv[process.argv.indexOf('--out')+1]),report={finished:false,passed:false,audio:'Pure model arithmetic; -noaudio; ReviewAudioSilence enabled',checks:[],failures:[],source:{}};
try{
 const [{createCampaign,makeGuest},{SESSIONS},{masterCandidate,MASTER_MARKET_COUNT},{sessionProgram},{rateCampaignGuest},{settlementFor},{BUILD_CATALOG}]=await Promise.all([
  import('../src/model/campaign.js'),import('../src/data/club.js'),import('../src/data/masters-market.js'),import('../src/model/preferences.js'),import('../src/model/campaign-rating.js'),import('../src/model/finances.js'),import('../src/data/build-catalog.js')]);
 for(const file of ['src/model/campaign-rating.js','src/model/upgrades.js','src/data/build-catalog.js','src/data/balance.js','src/model/finances.js'])report.source[file]=createHash('sha256').update(await readFile(resolve(file))).digest('hex');
 const masters=Array.from({length:MASTER_MARKET_COUNT},(_,i)=>masterCandidate(i));
 const variants={tableComfort:['tableComfort'],dice:['dice'],mat:['mat'],miniatures:['miniatures'],screen:['screen'],allTable:['tableComfort','dice','mat','miniatures','screen'],board:['whiteboard'],tablet:['tablet'],softSeats:['chairSoft'],armSeats:['chairArms'],oneSoftSeat:['chairSoft'],oneArmSeat:['chairArms'],fan:['fan'],aircon:['conditioner'],soundproof:['soundproof'],dimmer:['lightAdjustable'],cookies:['cookies'],water:['water'],tea:['kettle'],coffee:['coffee'],cold:['fridge']};
 const costs={tableComfort:BUILD_CATALOG.tableComfort.price-BUILD_CATALOG.table.price*.6,allTable:0,board:BUILD_CATALOG.whiteboard.price,softSeats:4*(BUILD_CATALOG.chairSoft.price-BUILD_CATALOG.chair.price*.6),armSeats:4*(BUILD_CATALOG.chairArms.price-BUILD_CATALOG.chair.price*.6),aircon:BUILD_CATALOG.conditioner.price,dimmer:BUILD_CATALOG.lightAdjustable.price-BUILD_CATALOG.light.price*.6,tea:BUILD_CATALOG.kettle.price,cold:BUILD_CATALOG.fridge.price};
 for(const key of Object.keys(variants))costs[key]??=BUILD_CATALOG[key]?.price??0;costs.allTable=costs.tableComfort+['dice','mat','miniatures','screen'].reduce((n,k)=>n+costs[k],0);costs.oneSoftSeat=BUILD_CATALOG.chairSoft.price-BUILD_CATALOG.chair.price*.6;costs.oneArmSeat=BUILD_CATALOG.chairArms.price-BUILD_CATALOG.chair.price*.6;
 const sum=()=>({groups:0,guests:0,baseRaw:0,rawGain:0,rawChanged:0,scoreChanged:0,benefitGuests:0,paymentGain:0,expectedTipGain:0,hourlyExtra:0,appropriateGroups:0,appropriateNet:0,allTargetGroups:0,allTargetNet:0,meanGain:0});
 const results={random:Object.fromEntries(Object.keys(variants).map(k=>[k,sum()])),informed:Object.fromEntries(Object.keys(variants).map(k=>[k,sum()]))};
 function addEquipment(run,kinds,singleSeat=false){
  const r=structuredClone(run);if(singleSeat)r.guests.sort((a,b)=>Number(b.preferences.comfort.longSeat)-Number(a.preferences.comfort.longSeat)).forEach((g,seat)=>g.seat=seat);
  for(const kind of kinds){if(['chairSoft','chairArms'].includes(kind)){for(const chair of r.room.equipment.filter((_,index)=>!singleSeat||index===0))Object.assign(chair,{kind,type:kind==='chairSoft'?'softChair':'armchair'});}else{const type={tableComfort:'wideTable',conditioner:'aircon',whiteboard:'board',lightAdjustable:'dimmer',kettle:'tea'}[kind]??kind;r.room.equipment.push({id:'extra-'+kind,kind,type,enabled:true});}}
  if(kinds.includes('fan'))r.room.environment.noisyAppliances=true;
  const service={cookies:'cookie',water:'water',kettle:'tea',coffee:'coffee',fridge:'cold'}[kinds[0]];
  if(service)r.observed.services=r.guests.filter(g=>service==='cookie'?g.preferences.comfort.snack:service==='cold'?g.preferences.comfort.cold:g.preferences.comfort.drink===service).map(g=>({guestId:g.id,service,clock:r.startedAt+1}));
  return r;
 }
 function expectedTip(run,review){const s=settlementFor(run,review);return s.fullPayment?s.price*.1*s.chance:0;}
 for(let seed=0;seed<300;seed++){
  const c=createCampaign('economist-purchases-'+seed);c.guests=[];c.arrivals=20;for(let i=0;i<12;i++)c.guests.push(makeGuest(c));
  const session=SESSIONS[seed%SESSIONS.length],hours=session.minutes/60,known=masters.filter(m=>m.known.includes(session.systemId)),master=known[Math.floor(seed/SESSIONS.length)%known.length];
  const makeRun=guests=>({id:'probe-v8-'+seed,startedAt:c.clock,endsAt:c.clock+hours,ratingVersion:8,guests:guests.map((g,seat)=>({...structuredClone(g),seat})),room:{session:structuredClone(session),program:sessionProgram(session),master:structuredClone(master),chairIds:['c0','c1','c2','c3'],equipment:Array.from({length:4},(_,i)=>({id:'c'+i,kind:'chair',type:'chair',enabled:true})),environment:{hot:hours>=5,noisyAppliances:false}},observed:{noiseHours:seed%2?hours:0,services:[]},contract:{pricingVersion:3,paymentCurve:3,guestPrice:hours*200,tipRolls:{}}});
  const ranked=c.guests.map(g=>({g,score:rateCampaignGuest(makeRun([g,...c.guests.filter(o=>o.id!==g.id).slice(0,3)]),g).satisfactionValue})).sort((a,b)=>b.score-a.score);
  for(const [cohort,guests]of [['random',c.guests.slice(0,4)],['informed',ranked.slice(0,4).map(x=>x.g)]]){
   const base=makeRun(guests),before=new Map(base.guests.map(g=>[g.id,rateCampaignGuest(base,g)]));
   for(const [variant,kinds]of Object.entries(variants)){
    const run=addEquipment(base,kinds,variant.startsWith('one')),s=results[cohort][variant];let cashGain=0,benefitted=0;
    const hourly=kinds.reduce((n,k)=>n+(BUILD_CATALOG[k]?.hourlyCost??0),0),operating=hourly*hours;
    s.groups++;s.hourlyExtra+=operating;
    for(let i=0;i<4;i++){
     const g=run.guests[i],old=before.get(g.id),next=rateCampaignGuest(run,g),oldPay=settlementFor(base,old),pay=settlementFor(run,next),tipGain=expectedTip(run,next)-expectedTip(base,old),gain=pay.payment-oldPay.payment;
     s.guests++;s.baseRaw+=old.satisfactionValue;s.rawGain+=next.satisfactionValue-old.satisfactionValue;s.rawChanged+=next.satisfactionValue!==old.satisfactionValue?1:0;s.scoreChanged+=next.score!==old.score?1:0;
     s.paymentGain+=gain;s.expectedTipGain+=tipGain;cashGain+=gain+tipGain;if(next.satisfactionValue>old.satisfactionValue||tipGain>0){s.benefitGuests++;benefitted++;}
    }
    if(benefitted){s.appropriateGroups++;s.appropriateNet+=cashGain-operating;}if(benefitted===4){s.allTargetGroups++;s.allTargetNet+=cashGain-operating;}
   }
  }
 }
 const round=n=>Number.isFinite(n)?+n.toFixed(4):null;
 for(const cohort of Object.values(results))for(const [name,s]of Object.entries(cohort)){
  s.meanBase=round(s.baseRaw/s.guests);s.meanRawGain=round(s.rawGain/s.guests);s.meanCashGainPerGuest=round((s.paymentGain+s.expectedTipGain)/s.guests);s.meanNetPerGroup=round((s.paymentGain+s.expectedTipGain-s.hourlyExtra)/s.groups);s.meanAppropriateNet=round(s.appropriateNet/s.appropriateGroups);s.meanAllTargetNet=round(s.allTargetNet/s.allTargetGroups);s.capitalCost=costs[name];s.paybackMixedGroups=s.meanNetPerGroup>0?round(s.capitalCost/s.meanNetPerGroup):null;s.paybackAppropriateGroups=s.meanAppropriateNet>0?round(s.capitalCost/s.meanAppropriateNet):null;s.paybackAllTargetGroups=s.meanAllTargetNet>0?round(s.capitalCost/s.meanAllTargetNet):null;
 }
 report.results=results;report.sample={groupsPerCohort:300,guestsPerCohort:1200,pool:12,method:'Static matched counterfactuals of V8 rating and real payment V3; known master and authored adventure rotate. First four random, or four of twelve ranked by exact satisfaction. Half have adjacent noise; long games use compact rooms. Appropriate group = at least one guest with a positive fractional or expected-tip change. All-target = all four. oneSoftSeat/oneArmSeat upgrade just one seat and place a guest with a long-seat preference there, without changing party membership; the preference is public after the comfort question. Services force one matching actual portion with an in-session timestamp: their money excludes cafe revenue/stock/waste and is only a rating-effect upper bound. No campaign win-rate claim.'};
 report.checks.push({name:'More than 1000 generated guests per variant and cohort',passed:Object.values(results).every(c=>Object.values(c).every(s=>s.guests>=1000))});
 report.checks.push({name:'A targeted accessory affects fractional satisfaction more often than integer stars',passed:results.informed.mat.rawChanged>results.informed.mat.scoreChanged});
 report.checks.push({name:'Actually served cookies now affect satisfaction',passed:results.informed.cookies.rawGain>0});
 report.checks.push({name:'Tablet differs from whiteboard',passed:results.informed.tablet.rawGain>results.informed.board.rawGain});
 report.checks.push({name:'Armrests differ from soft chairs',passed:results.informed.armSeats.rawGain>results.informed.softSeats.rawGain});
 report.passed=report.checks.every(c=>c.passed);if(!report.passed)report.failures.push('Candidate comparison failed; inspect the sampled cohorts and source hashes.');
}catch(e){report.failures.push(e.stack??String(e));}
report.finished=true;await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
