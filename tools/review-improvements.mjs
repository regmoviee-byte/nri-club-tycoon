import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {serve} from './serve.mjs';
if(!process.argv.includes('-noaudio'))throw Error('Pass -noaudio');
const arg=n=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:null;
const out=resolve(arg('--out')),folder=dirname(out),remote=arg('--url'),require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const report={finished:false,passed:false,checks:[],errors:[],screenshots:[],audio:'-noaudio; Chromium --mute-audio; ReviewAudioSilence; isolated storage; sandbox enabled'};
await mkdir(folder,{recursive:true});let browser,server;const begun=Date.now();
function ReviewAudioSilence(){
 const mute=()=>document.querySelectorAll('audio,video').forEach(m=>{m.muted=true;m.volume=0;m.pause();});Object.defineProperty(globalThis,'ReviewAudioSilence',{value:Object.freeze({enabled:true,mute})});HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};
 for(const name of ['AudioContext','webkitAudioContext']){const Original=globalThis[name];if(Original)globalThis[name]=class extends Original{constructor(...args){super(...args);this.suspend();this.resume=async()=>this.suspend();}};}
 new MutationObserver(mute).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['muted','volume','autoplay']});addEventListener('focus',mute);addEventListener('visibilitychange',mute);addEventListener('DOMContentLoaded',mute);
}
async function check(text,detail={}){report.checks.push({text,...detail});await writeFile(out+'.progress.json',JSON.stringify({...report,elapsedMs:Date.now()-begun},null,2));}
try{
 if(!remote)server=await serve(0);const url=remote??'http://127.0.0.1:'+server.address().port+'/';report.url=url;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--mute-audio','--autoplay-policy=user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addInitScript(ReviewAudioSilence);
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>Boolean(globalThis.clubStudio));assert.equal(await page.evaluate(()=>ReviewAudioSilence.enabled),true);
 const snap=()=>page.evaluate(()=>clubStudio.snapshot()),idle=()=>page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false'),nav=tab=>page.locator('[data-action="nav"][data-tab="'+tab+'"]').first().click();
 const action=(name,attrs='')=>page.locator('[data-action="'+name+'"]'+attrs);
 async function shot(name){await page.screenshot({path:resolve(folder,name)});report.screenshots.push(name);}
 async function importClub(c){await nav('settings');await page.locator('#import-save').setInputFiles({name:'labelled-review-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(c))});await action('confirm').click();await idle();}
 async function applyBuild(){await action('apply-build').click();await idle();assert.equal(await action('apply-build').count(),0,await page.locator('#message').innerText());}
 async function point(x,y){return page.evaluate(([x,y])=>clubStudio.point(x,y),[x,y]);}
 async function paint(a,b=a){const p=await point(...a),q=await point(...b);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:8});await page.mouse.up();await action('apply-build').waitFor();}
 if(process.env.NRI_EXPECTED_SOURCE){report.sourceChecks=[];for(const [path,hash]of Object.entries(JSON.parse(process.env.NRI_EXPECTED_SOURCE))){const response=await context.request.get(new URL(path,url).href+'?review='+Date.now());assert.equal(response.status(),200,path);assert.equal(createHash('sha256').update(await response.body()).digest('hex'),hash,path);report.sourceChecks.push(path);}await check('Published files match the exact accepted local source hashes');}
 const initial=await page.evaluate(async()=>{const {createCampaign}=await import('./src/model/campaign.js');return createCampaign('improvements-native-review');});await importClub(initial);
 const camera=await page.evaluate(()=>clubStudio.camera());await action('nav','[data-tab="guests"]').first().focus();await page.keyboard.press('Space');assert.equal(await page.locator('#panel-title').innerText(),'Знакомство');assert.deepEqual(await page.evaluate(()=>clubStudio.camera()),camera);
 await action('quick-interview').focus();await page.keyboard.press('Space');await idle();assert.equal((await snap()).guests[0].asked.length,8);
 await page.locator('details[data-detail-key="interview"] summary').focus();await page.keyboard.press('Space');assert.equal(await page.locator('details[data-detail-key="interview"]').getAttribute('open'),'');
 await action('guest-tab','[data-id="talk"]').click();const ask=action('ask').first(),question=await ask.getAttribute('data-question');await ask.focus();await page.keyboard.press('Space');await idle();assert.equal(await page.evaluate(()=>document.activeElement?.dataset.question),question);
 await check('Space activates real buttons and disclosure controls without moving the camera; action focus survives rendering');
 await nav('build');await action('tool','[data-tool="select"]').click();const chairs=(await snap()).layout.objects.filter(o=>o.role==='guest'),positions=(await snap()).guests.map(g=>[g.id,g.roomId,g.seat]);
 for(const chair of chairs){await page.locator('[data-seat="'+chair.id+'"]').click();await page.locator('.selected-object').waitFor();assert.deepEqual((await snap()).guests.map(g=>[g.id,g.roomId,g.seat]),positions);}
 await check('Choosing each of the four chairs in construction leaves every guest in place');
 await nav('guests');await action('guest-tab','[data-id="brief"]').click();
 for(let seat=0;seat<3;seat++){if(await action('quick-interview').count())await action('quick-interview').click();await idle();await action('seat','[data-seat="'+seat+'"]').click();await idle();}
 await nav('rooms');assert.equal(await action('start-room').isEnabled(),true);await action('start-room').click();if(await action('confirm').count())await action('confirm').click();await idle();
 const running=(await snap()).rooms.find(r=>r.status==='running');assert.equal(running.run.guests.length,3);assert.equal(running.run.endsAt-running.run.startedAt,running.run.room.session.minutes/60);
 await shot('three-player-session.png');await action('advance').click();if(await action('confirm').count())await action('confirm').click();await idle();
 const completed=await snap();assert.equal(completed.rating.count,3);await nav('finance');await shot('session-journal.png');
 await action('wait').click();if(await action('confirm').count())await action('confirm').click();await idle();await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));await nav('finance');
 assert.ok((await page.locator('#panel-content').innerText()).includes(running.run.room.session.title));
 await check('A manually chosen three-player company runs for its adventure duration; its result survives further time and reloading');
 const fixture=await page.evaluate(async()=>{const {expandedClub}=await import('./tools/endless-fixture.js');return expandedClub(1,{spareLand:true});});await importClub(fixture);report.fixture='One-million-ruble technical construction grant, not earned progression; ordinary paid building and native UI actions';
 await nav('build');await action('tool','[data-tool="room"]').click();await page.locator('#room-furnished').uncheck();await paint([7.2,.2],[11.7,4.7]);await applyBuild();
 let state=await snap(),newRoom=state.layout.rooms.find(r=>r.purpose!=='staff'&&r.id!==initial.rooms[0].id);assert.ok(newRoom);await action('fit-buildings').click();
 await page.locator('.room-state-marker[data-room="'+newRoom.id+'"]').click();await page.locator('#room-inspector-form [name="name"]').fill('Зал открытий');await page.locator('#room-inspector-form button[type="submit"]').click();await applyBuild();
 assert.equal((await snap()).layout.rooms.find(r=>r.id===newRoom.id).name,'Зал открытий');
 await action('resize-room','[data-id="'+newRoom.id+'"]').click();await paint([7.2,.2],[11.7,5.7]);await applyBuild();assert.equal((await snap()).layout.rooms.find(r=>r.id===newRoom.id).cells.length,30);
 await action('tool','[data-tool="floor"]').click();await page.locator('#floor-finish').selectOption('tile');await paint([9.5,4.5]);await applyBuild();
 assert.equal((await snap()).layout.floors.find(f=>f.x===9&&f.y===4).finish,'tile');await shot('replanned-room-and-tile.png');
 await action('tool','[data-tool="select"]').click();await page.locator('.room-state-marker[data-room="'+newRoom.id+'"]').click();await page.locator('details[data-detail-key="demolish-room"] summary').click();
 await page.locator('#demolish-room-form [name="removeFinishes"]').check();await page.locator('#demolish-room-form [name="removeBoundary"]').check();await page.locator('#demolish-room-form button[type="submit"]').click();await applyBuild();
 assert.equal((await snap()).layout.rooms.some(r=>r.id===newRoom.id),false);await check('Native construction creates, renames, resizes, changes flooring and demolishes a room through priced previews');
 await page.locator('#catalog-search').fill('Декор');await action('build-item','[data-kind="decor"]').click();const prestigeDeltas=[];
 for(let i=0;i<3;i++){await paint([7.5+i,6.5]);const delta=Number(await page.locator('[data-prestige-delta]').getAttribute('data-prestige-delta'));prestigeDeltas.push(delta);await applyBuild();}
 assert.deepEqual(prestigeDeltas,[6,1.5,0]);await shot('purchase-marginal-effect.png');await check('Three paid decor purchases honestly preview +6, +1.5 and zero additional prestige', {prestigeDeltas});
 await nav('service');await action('hire-service').click();if(await action('confirm').count())await action('confirm').click();await idle();await action('service-shift').click();await idle();
 await page.locator('#cleaning-policy-form [name="enabled"]').check();await page.locator('#cleaning-policy-form [name="zoneIds"][value="common"]').check();await page.locator('#cleaning-policy-form [name="maxSpend"]').fill('80');await page.locator('#cleaning-policy-form button[type="submit"]').click();await idle();
 const delegated=await snap();assert.equal(delegated.operations.cleaningPolicy.enabled,true);assert.equal(delegated.operations.cleaningPolicy.maxSpend,80);
 await nav('goals');const beforeDirection=(await snap()).finance.cash;await action('set-direction','[data-id="beginners"]').click();if(await action('confirm').count())await action('confirm').click();await idle();assert.equal((await snap()).clubDirection.id,'beginners');assert.equal(beforeDirection-(await snap()).finance.cash,300);await shot('beginner-school-direction.png');
 await action('set-direction','[data-id="general"]').click();await idle();assert.equal((await snap()).clubDirection.id,'general');await check('Cleaning delegation saves explicit zones and budget; the school charges its displayed launch cost and can be switched off');
 const big=await page.evaluate(async()=>{const {expandedClub}=await import('./tools/endless-fixture.js');return expandedClub(7);});await importClub(big);await nav('rooms');const last=big.rooms.at(-1);
 await page.locator('#room-search').fill(String(last.number));await action('room','[data-id="'+last.id+'"]').click();const overview=await page.evaluate(()=>clubStudio.camera());await action('focus-room','[data-id="'+last.id+'"]').first().click();assert.ok((await page.evaluate(()=>clubStudio.camera())).zoom>overview.zoom);await shot('selected-room-close-up.png');
 await page.setViewportSize({width:390,height:844});await nav('guests');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok(await action('walls').isVisible());assert.equal(await page.locator('dialog').count(),0);await shot('mobile-compact-intake.png');await check('Room search and focus work on seven rooms; mobile keeps map controls and integrated panels without horizontal overflow');
 await page.setViewportSize({width:1440,height:1000});const twenty=await page.evaluate(async()=>{const {expandedClub}=await import('./tools/endless-fixture.js');return expandedClub(20);});await importClub(twenty);await action('fit-buildings').click();await shot('twenty-room-overview.png');assert.equal((await snap()).rooms.filter(r=>r.operational).length,20);
 await nav('rooms');const twentieth=twenty.rooms.at(-1);await page.locator('#room-search').fill(String(twentieth.number));await action('room','[data-id="'+twentieth.id+'"]').click();await action('focus-room','[data-id="'+twentieth.id+'"]').first().click();assert.ok((await page.evaluate(()=>clubStudio.camera())).zoom>.6);await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));assert.equal((await snap()).rooms.filter(r=>r.operational).length,20);
 await page.setViewportSize({width:390,height:844});await action('fit-buildings').click();await shot('twenty-room-mobile-overview.png');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await check('Twenty physically equipped paid-fixture rooms render, remain searchable, focus at working zoom and survive reloading, including a mobile overview');
 assert.deepEqual(report.errors,[]);report.passed=true;await context.close();
}catch(error){report.errors.push(error.stack??String(error));if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});}}
finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));report.finished=true;report.elapsedMs=Date.now()-begun;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({finished:report.finished,passed:report.passed,checks:report.checks,errors:report.errors}));if(!report.passed)process.exitCode=1;}
