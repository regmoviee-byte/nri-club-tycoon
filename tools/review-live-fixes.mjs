import {verifyRuntime} from './verify-runtime.mjs';
import {expandedClub} from './endless-fixture.js';
import {serve} from './serve.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
if(!process.argv.includes('-noaudio'))throw Error('Silent review requires -noaudio');
const arg=n=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:null;
const out=resolve(arg('--out')),folder=dirname(out),server=arg('--url')?null:await serve(0),url=arg('--url')??('http://127.0.0.1:'+server.address().port);
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const report={finished:false,passed:false,collectionCompleted:false,productAccepted:false,url,states:[],checks:[],errors:[],runtimeErrors:[],limitations:['Controlled browser walkthrough, not a novice user study or physical device check.','Screenshots require separate visual review; successful collection is not product acceptance.'],silence:'-noaudio; ReviewAudioSilence; --mute-audio; chromiumSandbox:true; isolated storage; owned process runner'};
await mkdir(folder,{recursive:true});let browser,context,page;const begun=Date.now();
function ReviewAudioSilence(){const mute=()=>document.querySelectorAll('audio,video').forEach(n=>{n.muted=true;n.volume=0;n.pause();});Object.defineProperty(globalThis,'ReviewAudioSilence',{value:Object.freeze({enabled:true,mute})});HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};for(const name of ['AudioContext','webkitAudioContext']){const Original=globalThis[name];if(Original)globalThis[name]=class extends Original{constructor(...a){super(...a);this.suspend();this.resume=async()=>this.suspend();}};}new MutationObserver(mute).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['volume','muted','autoplay']});addEventListener('focus',mute);addEventListener('visibilitychange',mute);addEventListener('DOMContentLoaded',mute);}
const action=(a,attrs='')=>page.locator('[data-action="'+a+'"]'+attrs),idle=()=>page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false');
async function nav(tab){await action('nav','[data-tab="'+tab+'"]').first().click();await idle();await page.waitForTimeout(180);}
async function capture(id,note=''){
 await page.waitForTimeout(100);
 const data=await page.evaluate(()=>{const box=n=>{const r=n?.getBoundingClientRect();if(!r)return null;let clip={left:0,top:0,right:innerWidth,bottom:innerHeight};for(let p=n.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden/.test(s.overflowY)){clip.top=Math.max(clip.top,b.top);clip.bottom=Math.min(clip.bottom,b.bottom);}if(/auto|scroll|hidden/.test(s.overflowX)){clip.left=Math.max(clip.left,b.left);clip.right=Math.min(clip.right,b.right);}}const visibleWidth=Math.max(0,Math.min(r.right,clip.right)-Math.max(r.left,clip.left)),visibleHeight=Math.max(0,Math.min(r.bottom,clip.bottom)-Math.max(r.top,clip.top));return{x:r.x,y:r.y,width:r.width,height:r.height,visibleWidth,visibleHeight,fullyVisible:visibleWidth>=r.width-1&&visibleHeight>=r.height-1};};return{viewport:{width:innerWidth,height:innerHeight},title:document.querySelector('#panel-title')?.textContent,preview:box(document.querySelector('.admin-preview')),world:box(document.querySelector('#world-host')),panel:box(document.querySelector('#panel-content')),text:document.querySelector('#panel-content')?.innerText,saveStatus:document.querySelector('#save-state')?.innerText,focus:document.activeElement?.outerHTML.slice(0,300),controls:[...document.querySelectorAll('#panel-content button,#panel-content input,#panel-content select,#panel-content summary')].map(n=>({tag:n.tagName,action:n.dataset.action,name:n.name,text:n.textContent.trim().slice(0,90),disabled:n.disabled,box:box(n)}))};});
 const screenshot=id+'.png';await page.screenshot({path:resolve(folder,screenshot)});report.states.push({id,note,screenshot,...data});await writeFile(out+'.progress.json',JSON.stringify(report,null,2));
}
async function check(name,fn){try{await fn();report.checks.push({name,completed:true});console.log('Collected: '+name);}catch(e){report.errors.push({name,error:e.stack??String(e)});await capture('failure-'+report.errors.length).catch(()=>{});}}
async function importClub(c){await nav('settings');await action('settings-tab','[data-id=saves]').click();await page.locator('#import-save').setInputFiles({name:'isolated-labelled-audit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(c))});await action('confirm').click();await idle();await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));}
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--mute-audio','--autoplay-policy=user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true,reducedMotion:'reduce'});await context.addInitScript(ReviewAudioSilence);page=await context.newPage();page.setDefaultTimeout(6000);page.setDefaultNavigationTimeout(45000);page.on('pageerror',e=>report.runtimeErrors.push(e.message));await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(globalThis.clubStudio));
 if(arg('--source'))report.source=await verifyRuntime(page,url,arg('--source'));

 const snap=()=>page.evaluate(()=>clubStudio.snapshot()),point=(x,y)=>page.evaluate(([x,y])=>clubStudio.point(x,y),[x,y]);
 const settle=async()=>{await idle();await page.waitForTimeout(180);};
 const place=async(kind,x,y,turns=0)=>{await action('build-item','[data-kind='+kind+']').click();const p=await point(x,y);await page.mouse.move(p.x,p.y);for(let i=0;i<turns;i++){await page.keyboard.press('KeyR');await page.waitForTimeout(70);}await page.mouse.click(p.x,p.y);await settle();};
 const fully=async selector=>page.locator(selector).evaluateAll(ns=>ns.every(n=>{let r=n.getBoundingClientRect(),top=0,bottom=innerHeight;for(let p=n.parentElement;p;p=p.parentElement){if(/auto|hidden|scroll/.test(getComputedStyle(p).overflowY)){let b=p.getBoundingClientRect();top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}return r.height>0&&r.top>=top-1&&r.bottom<=bottom+1;}));
 await page.setViewportSize({width:1366,height:768});
 await check('LIVE-04: an unaffordable storage purchase explains its reason and opens the shelf tool',async()=>{
  await page.locator('#administrator-form button[type=submit]').click();await settle();await nav('library');await action('library-tab','[data-id=games]').click();
  const buy=action('buy-game','[data-id=fate]');assert.ok(await buy.isDisabled());const reason=await buy.getAttribute('aria-describedby');assert.ok(reason);assert.match(await page.locator('#'+reason).innerText(),/полк/i);assert.ok(await page.getByRole('button',{name:'Поставить полку',exact:true}).isVisible());await capture('01-explained-library-lock');
  await page.getByRole('button',{name:'Поставить полку',exact:true}).click();assert.equal(await page.locator('#game').getAttribute('data-build-tool'),'item');assert.equal((await snap()).finance.cash,14020);await page.keyboard.press('Escape');
 });
 if(!arg('--checkpoint'))throw Error('Provide --checkpoint with a local review save; campaign data is not bundled or published.');
 const checkpoint=JSON.parse(await readFile(resolve(arg('--checkpoint')),'utf8'));
 await importClub(checkpoint);report.checkpoint={cash:checkpoint.finance.cash,clock:checkpoint.clock,parties:checkpoint.sessionJournal.entries.length};
 await check('LIVE-01: risk, genre and all five scene types can be inspected before purchase and beside the assigned adventure',async()=>{
  await nav('library');await action('library-tab','[data-id=adventures]').click();
  const card=page.locator('.story-card').filter({hasText:'Легенда о пустой короне'});assert.ok(await card.locator('.story-genres').isVisible());assert.ok(await card.locator('.story-risk').isVisible());await card.locator('summary').click();assert.equal(await card.locator('.story-scene').count(),5);assert.ok(await fully('.story-card .story-scenes:visible,.story-card .story-characteristics:visible'));assert.match(await card.innerText(),/Бои|Исследование/);await capture('02-adventure-decision-data');
  await nav('rooms');await page.locator('.room-story-details summary').click();assert.equal(await page.locator('.room-story-details .story-scene').count(),5);await capture('03-assigned-adventure-data');await page.locator('.room-story-details summary').click();
 });
 await check('LIVE-03 and LIVE-08: fresh and repeated answers are distinct and the full reply uses one page scroll on four viewports',async()=>{
  await nav('guests');await action('guest-tab','[data-id=talk]').first().click();await action('question-set','[data-id=all]').click();await action('ask','[data-question=stakes]').click();await settle();assert.doesNotMatch(await page.locator('#guest-answer').innerText(),/ПЕРЕЧИТЫВАЕМ/);await capture('04-first-answer');
  await action('ask','[data-question=stakes]').click();assert.match(await page.locator('#guest-answer').innerText(),/ПЕРЕЧИТЫВАЕМ/);
  for(const viewport of [{width:1366,height:768},{width:1280,height:720},{width:844,height:390},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(200);await action('question-set','[data-id=main]').click();await action('ask','[data-question=avoidGenres]').click();await settle();
   const dimensions=await page.locator('.conversation-answer,.conversation-questions').evaluateAll(ns=>ns.map(n=>({class:n.className,height:n.clientHeight,scroll:n.scrollHeight,overflow:getComputedStyle(n).overflowY})));assert.ok(dimensions.every(n=>n.overflow==='visible'&&n.scroll<=n.height+1),JSON.stringify(dimensions));assert.ok(await fully('#guest-answer,#task-actions [data-id=brief]'));await capture('05-conversation-'+viewport.width+'-'+viewport.height);
  }
  await page.setViewportSize({width:1366,height:768});
 });
 await check('LIVE-05: right click presents one menu, then Properties opens one inspector, including the narrow layout',async()=>{
  await nav('build');await action('fit-buildings').click();const shelf=(await snap()).layout.objects.find(o=>o.kind==='shelf');
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(200);await action('fit-buildings').click();await page.locator('[data-object="'+shelf.id+'"]').first().click({button:'right'});assert.ok(await page.locator('#context-menu').isVisible());assert.ok(await page.locator('#selection-inspector').isHidden());assert.equal(await page.locator('#selection-slot .object-actions').count(),0);await capture('06-single-context-'+viewport.width);
   await page.locator('#context-menu [data-action=inspect-object]').click();assert.ok(await page.locator('#context-menu').isHidden());assert.equal(await page.locator('.object-actions:visible').count(),1);await capture('07-single-inspector-'+viewport.width);await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:1366,height:768});
 });
 await check('LIVE-06: a real dice collision stays unpaid and its error clears on a tool and category change',async()=>{
  await nav('build');await page.locator('#catalog-category').selectOption('equipment');await action('fit-buildings').click();const dice=(await snap()).layout.objects.find(o=>o.kind==='dice'),b=await page.locator('[data-object="'+dice.id+'"]').first().boundingBox(),cash=(await snap()).finance.cash;
  await action('build-item','[data-kind=dice]').click();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await settle();assert.match(await page.locator('#message').innerText(),/пересекается/);assert.equal((await snap()).finance.cash,cash);await action('tool','[data-tool=door]').click();assert.equal(await page.locator('#panel-error').count(),0);assert.equal(await page.locator('#message').innerText(),'');await capture('08-new-tool-without-old-error');await page.keyboard.press('Escape');
 });
 await check('LIVE-07: the saved window renders a framed opening, glazing and sill in its real wall',async()=>{
  await nav('build');await action('fit-buildings').click();assert.ok(await page.locator('.window-detail').count()>0);assert.ok(await page.locator('[data-window-glazing]').isVisible());assert.ok(await page.locator('[data-window-sill]').isVisible());await action('zoom-in').click();await capture('09-window-frame-and-sill');
 });
 await check('LIVE-08: ages, equal hour ranges, expiry and the day-two clock are formatted once',async()=>{
  await nav('guests');await action('guest-tab','[data-id=brief]').first().click();const text=await page.locator('#panel-content').innerText();assert.doesNotMatch(text,/удобно ([2-6])–\1 ч/);assert.doesNotMatch(await page.locator('#clock').innerText(),/день 2.*день 2/i);await nav('service');assert.doesNotMatch(await page.locator('.stock-batch').first().innerText(),/До дня/);await capture('09b-readable-day-and-stock');
 });
 await check('LIVE-02: ordinary saved club receives supplies during a still-running party, reloads and settles once at the end',async()=>{
  await nav('build');await page.locator('#catalog-category').selectOption('service');await place('kettle',4.5,2.5);await page.keyboard.press('Escape');const kettle=(await snap()).layout.objects.find(o=>o.kind==='kettle');assert.ok(kettle,await page.locator('#message').innerText());
  await nav('service');await action('restock','[data-id="'+kettle.id+'"]').click();await settle();const due=(await snap()).inventory.orders.find(o=>o.location===kettle.id&&o.state==='ordered').dueAt;
  await nav('guests');for(const seat of [0,2]){const g=(await snap()).guests.find(g=>!g.roomId);assert.ok(g);await action('guest','[data-id="'+g.id+'"]').first().click();await action('guest-tab','[data-id=talk]').first().click();if(await action('quick-interview').count())await action('quick-interview').click();await settle();await action('guest-tab','[data-id=brief]').first().click();await action('seat','[data-seat="'+seat+'"]').click();await settle();}
  await nav('rooms');await page.locator('#room-form [name=adventure]').selectOption('dark');await settle();const before=await snap(),entries=before.sessionJournal.entries.length;await action('start-room').click();await settle();assert.equal((await snap()).rooms[0].status,'running');await action('wait').click();await settle();const mid=await snap();assert.equal(mid.clock,before.clock+1);assert.equal(mid.clock,due);assert.equal(mid.rooms[0].status,'running');assert.equal(mid.sessionJournal.entries.length,entries);assert.ok(mid.inventory.batches.some(b=>b.location===kettle.id&&b.remaining>0));assert.equal(await page.locator('#session-results').getAttribute('open'),null);await capture('10-one-hour-party-still-running');
  await nav('service');await capture('11-supply-arrived-mid-party');const midCash=mid.finance.cash;await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));assert.equal((await snap()).finance.cash,midCash);assert.equal((await snap()).clock,mid.clock);await action('advance').click();await settle();assert.equal((await snap()).sessionJournal.entries.length,entries+1);await capture('12-hourly-party-result');report.resume={initialCash:checkpoint.finance.cash,midCash,endCash:(await snap()).finance.cash,entriesBefore:entries,entriesAfter:(await snap()).sessionJournal.entries.length,hour:mid.clock};
 });
 report.collectionCompleted=true;report.passed=report.errors.length===0&&report.runtimeErrors.length===0;
}catch(e){report.errors.push({name:'review',error:e.stack??String(e)});if(page)await capture('review-stopped').catch(()=>{});}
finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(server)await new Promise(r=>server.close(r));report.finished=true;report.elapsedMs=Date.now()-begun;report.harnessSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({finished:report.finished,passed:report.passed,checks:report.checks.length,states:report.states.length,errors:report.errors,runtimeErrors:report.runtimeErrors}));if(!report.passed)process.exitCode=1;}
