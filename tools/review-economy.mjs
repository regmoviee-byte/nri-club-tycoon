import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {serve} from './serve.mjs';
if(!process.argv.includes('-noaudio'))throw Error('Economy review requires -noaudio');
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const out=resolve(arg('--out')),folder=dirname(out),remote=arg('--url'),require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const report={finished:false,passed:false,checks:[],errors:[],screenshots:[],audio:'-noaudio; Chromium --mute-audio; ReviewAudioSilence; isolated storage'};await mkdir(folder,{recursive:true});let browser,server;
async function check(message){report.checks.push(message);await writeFile(out+'.progress.json',JSON.stringify({checks:report.checks,at:new Date().toISOString()}));}
function ReviewAudioSilence(){
 const mute=()=>document.querySelectorAll('audio,video').forEach(m=>{m.muted=true;m.volume=0;m.pause();});Object.defineProperty(globalThis,'ReviewAudioSilence',{value:Object.freeze({enabled:true,mute})});HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};
 for(const name of ['AudioContext','webkitAudioContext']){const Original=globalThis[name];if(Original)globalThis[name]=class extends Original{constructor(...args){super(...args);this.suspend();this.resume=async()=>this.suspend();}};}
 new MutationObserver(mute).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['muted','volume','autoplay']});addEventListener('focus',mute);addEventListener('visibilitychange',mute);addEventListener('DOMContentLoaded',mute);
}
try{
 if(!remote)server=await serve(0);const url=remote??'http://127.0.0.1:'+server.address().port+'/';report.url=url;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--mute-audio','--autoplay-policy=user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addInitScript(ReviewAudioSilence);
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>Boolean(globalThis.clubStudio));
 const snap=()=>page.evaluate(()=>clubStudio.snapshot()),idle=()=>page.waitForFunction(()=>document.querySelector('#game').getAttribute('aria-busy')==='false');
 const nav=tab=>page.locator('.game-rail [data-action="nav"][data-tab="'+tab+'"]').click();
 async function shot(name){await page.screenshot({path:resolve(folder,name)});report.screenshots.push(name);}
 assert.equal(await page.evaluate(()=>ReviewAudioSilence.enabled),true);assert.equal(await page.locator('dialog').count(),0);
 const initial=await snap();assert.equal(initial.guests.length,6);assert.equal(initial.finance.cash,4050);
 if(process.env.NRI_EXPECTED_SOURCE){
  const expected=JSON.parse(process.env.NRI_EXPECTED_SOURCE),files=expected.files??expected;report.sourceChecks=[];
  for(const [path,hash]of Object.entries(files)){const response=await context.request.get(new URL(path,url).href+'?review='+Date.now());assert.equal(response.status(),200,path);assert.equal(createHash('sha256').update(await response.body()).digest('hex'),hash,path);report.sourceChecks.push(path);}
  await check('Published entry and all changed runtime files match the accepted local SHA-256 hashes');
 }
 await check('Six initial guests and 4,050 rubles; silent isolated browser; no separate dialogs');
 await nav('build');await page.locator('#catalog-category').selectOption('equipment');await page.locator('[data-action="build-item"][data-kind="dice"]').click();
 const tabletop=initial.layout.objects.find(o=>o.kind==='table'),point=await page.evaluate(([x,y])=>{const p=clubStudio.point(x,y);return{x:p.x,y:p.y-27*clubStudio.camera().zoom};},[tabletop.x+.62,tabletop.y+.62]);
 await page.mouse.click(point.x,point.y);await page.locator('#build-preview [data-action="apply-build"]').click();await idle();assert.equal((await snap()).finance.cash,initial.finance.cash-150);
 await check('A real 150-ruble dice purchase is freely placed on the table and debited once');
 // Every seat, interview and time advance below uses the same controls as the player.
 for(let seat=0;seat<4;seat++){
  const id=(await snap()).guests.find(g=>!g.roomId).id;await page.locator('.queue-person[data-id="'+id+'"]').click();
  const before=await snap();await page.locator('[data-action="quick-interview"]').click();await idle();
  const after=await snap(),g=after.guests.find(g=>g.id===id);
  assert.ok(['stories','time','boundaries','avoidGenres','commitment','knowledge','learning','participation'].every(q=>g.asked.includes(q)));
  assert.equal(after.clock,before.clock);assert.equal(after.finance.cash,before.finance.cash);assert.equal(g.roomId,null);
  assert.equal(await page.locator('[data-action="quick-interview"]').count(),0);assert.equal(await page.locator('.interview-notes').count(),1);
  if(seat===0){await page.locator('.interview-notes summary').click();await shot('economy-guest-intake.png');}
  await page.locator('button[data-action="seat"][data-seat="'+seat+'"]').click();await idle();
  assert.equal((await snap()).guests.filter(g=>g.roomId).length,seat+1);
 }
 await check('One short interview records eight actual answers without money, time or automatic seating; the player fills all four seats');
 await nav('rooms');assert.equal(await page.locator('[data-table-plan]').count(),1);assert.equal(await page.locator('.plan-guest').count(),4);
 assert.equal(await page.locator('#room-form [name="hours"]').count(),0);assert.ok((await page.locator('.party-plan').innerText()).includes('ПРИ ПОЛНОЙ ОПЛАТЕ'));
 await page.locator('.plan-guest summary').first().click();await shot('economy-table-plan.png');
 await check('Integrated room plan lists heard conditions and unknowns; authored adventure sets duration; forecast labels full-payment revenue');
 await page.locator('[data-action="start-room"]').click();if(await page.locator('.inline-confirm').count())await page.locator('[data-action="confirm"]').click();
 await page.waitForFunction(()=>clubStudio.snapshot().rooms[0].status==='running');await idle();
 const running=await snap(),run=running.rooms[0].run;assert.equal(run.ratingVersion,8);assert.equal(run.contract.pricingVersion,3);assert.equal(run.contract.paymentCurve,3);assert.equal(running.clock,initial.clock);
 await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));assert.deepEqual((await snap()).rooms[0].run,run);
 await page.locator('[data-action="advance"]').click();await page.waitForFunction(()=>clubStudio.snapshot().rating.count===4);await idle();
 const settled=await snap(),completed=settled.lastReport.completed[0];
 for(const r of completed.reviews){const f=r.financial,coefficient=r.violations.length?0:Math.max(0,Math.min(1,(r.satisfactionValue-3)/4));assert.equal(f.payment,Math.round(f.price*coefficient*100)/100);assert.equal(Math.round((f.payment+f.refund)*100),Math.round(f.price*100));}
 assert.equal(settled.clock,run.endsAt);assert.equal(settled.finance.settledRuns.filter(id=>id===run.id).length,1);
 assert.ok((await page.locator('#panel-content').innerText()).includes('% билета'));assert.ok((await page.locator('#panel-content').innerText()).includes('удовольствие'));
 assert.ok(completed.reviews.some(r=>r.upgradeBenefit.bonus>0));assert.ok((await page.locator('#panel-content').innerText()).includes('Без бонусов оснащения и сервиса'));
 await shot('economy-payment-results.png');report.settlement={payments:completed.payments,tips:completed.tips,fullPaid:completed.fullPaidCount,partialPaid:completed.partialPaidCount,refunds:completed.refunds,satisfaction:completed.reviews.map(r=>r.satisfactionValue)};
 await check('V8/V3 signed session survives reload, settles once and shows continuous satisfaction, ticket percentage and discounts');
 const waiting=(await snap()).guests.find(g=>!g.roomId);assert.ok(waiting);await page.locator('.queue-person[data-id="'+waiting.id+'"]').click();
 const beforeDismiss=await snap();await page.locator('[data-action="dismiss-guest"]').click();await idle();const dismissed=await snap();
 assert.equal(dismissed.guests.length,beforeDismiss.guests.length-1);assert.equal(dismissed.clock,beforeDismiss.clock);assert.equal(dismissed.finance.cash,beforeDismiss.finance.cash);assert.ok(!dismissed.guests.some(g=>g.id===waiting.id));
 await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));assert.deepEqual(await snap(),dismissed);
 await check('Dismissal and reload cannot roll free replacement visitors or advance the clock');
 await nav('club');assert.equal(await page.locator('[data-arrival-plan]').count(),1);
 const flow=await page.evaluate(async()=>{const {guestFlowStatus}=await import('./src/model/campaign.js');return guestFlowStatus(clubStudio.snapshot());});
 assert.ok(flow.enabled&&flow.waitingUntil-dismissed.clock<=.5);await page.locator('[data-action="wait-guests"]').click();await idle();
 const arrived=await snap();assert.equal(arrived.clock,flow.waitingUntil);assert.ok(dismissed.finance.cash-arrived.finance.cash<=flow.waitingCost);assert.ok(arrived.guests.some(g=>!dismissed.guests.some(p=>p.id===g.id)));assert.ok(arrived.rooms.every(r=>r.status!=='running'));assert.ok(arrived.guests.every(g=>!g.roomId));
 report.wait={minutes:(arrived.clock-dismissed.clock)*60,cost:dismissed.finance.cash-arrived.finance.cash,upperBound:flow.waitingCost,arrivals:arrived.guests.filter(g=>!dismissed.guests.some(p=>p.id===g.id)).length};await shot('economy-arrivals.png');
 await check('Explicit wait admits a finite wave within 30 minutes at the shown operating cost; it never seats guests or starts play');
 for(const tab of ['club','guests','rooms','build','team','library','service','finance','goals','settings']){await page.locator('[data-action="nav"][data-tab="'+tab+'"]').first().click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,tab+' overflow');}
 await nav('service');await page.locator('[data-action="hire-service"]').click();await idle();assert.ok((await page.locator('#panel-content').innerText()).includes('25 ₽/ч'));assert.equal((await snap()).serviceStaff[0].hourlyWage,25);
 await page.locator('[data-action="service-shift"]').click();await idle();assert.equal((await snap()).serviceStaff[0].onShift,true);
 const helperClean=page.locator('[data-action="clean"][data-id="common"][data-helper="true"]');assert.equal(await helperClean.isEnabled(),true);assert.ok((await helperClean.innerText()).includes('16,25 ₽'));
 const beforeClean=await snap();await helperClean.click();await idle();const cleaning=await snap(),task=cleaning.operations.tasks.find(t=>t.zoneId==='common'&&t.state==='active');assert.equal(task.helperId,'service-1');assert.equal(beforeClean.finance.cash-cleaning.finance.cash,10);assert.equal(task.dueAt-cleaning.clock,.25);
 await nav('club');await page.locator('[data-action="wait-guests"]').click();await idle();
 assert.equal((await snap()).operations.tasks.find(t=>t.id===task.id).state,'done');assert.ok((await snap()).operations.zones.common.cleanliness>beforeClean.operations.zones.common.cleanliness);await nav('service');await page.locator('[data-action="service-shift"]').click();await idle();assert.equal((await snap()).serviceStaff[0].onShift,false);
 await check('All ten panels stay integrated; the 25-ruble helper can actually clean a section in 15 minutes for 10 materials plus 6.25 wages, then leave shift');
 // The helper's appliance assignment must also be usable from the integrated UI.
 await nav('build');await page.locator('#catalog-category').selectOption('service');await page.locator('[data-action="build-item"][data-kind="water"]').click();
 const waterPlace=await page.evaluate(async()=>{const {quoteEdit}=await import('./src/model/layout.js'),c=clubStudio.snapshot();for(let y=0;y<8;y++)for(let x=0;x<6;x++){if(quoteEdit(c.layout,{type:'place',object:{id:'water-probe',kind:'water',x,y,rotation:0}}).ok)return clubStudio.point(x+.5,y+.5);}throw Error('No legal water place');});
 await page.mouse.click(waterPlace.x,waterPlace.y);await page.locator('#build-preview [data-action="apply-build"]').click();await idle();const water=(await snap()).layout.objects.find(o=>o.kind==='water');assert.ok(water);
 await nav('service');await page.locator('[data-action="assign-helper"][data-id="'+water.id+'"]').click();await idle();assert.deepEqual((await snap()).serviceStaff[0].assignment,{type:'service',itemId:water.id});
 await page.locator('[data-action="assign-helper"][data-id=""]').click();await idle();assert.equal((await snap()).serviceStaff[0].assignment,null);await shot('economy-service-controls.png');
 await check('A real water dispenser purchase exposes working assign/release controls for the helper, without automatic guest decisions');
 await page.setViewportSize({width:390,height:844});await nav('guests');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot('economy-mobile.png');
 assert.deepEqual(report.errors,[]);report.passed=true;await context.close();
}catch(error){report.errors.push(error.stack??String(error));if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});}}
finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));report.finished=true;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({finished:report.finished,passed:report.passed,checks:report.checks,errors:report.errors}));if(!report.passed)process.exitCode=1;}
