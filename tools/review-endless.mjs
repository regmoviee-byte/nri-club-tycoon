import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {serve} from './serve.mjs';
if(!process.argv.includes('-noaudio'))throw Error('Endless review requires -noaudio');
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const out=resolve(arg('--out')),folder=dirname(out),remote=arg('--url'),require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const report={finished:false,passed:false,checks:[],errors:[],screenshots:[],audio:'-noaudio; Chromium --mute-audio; ReviewAudioSilence; isolated storage'};await mkdir(folder,{recursive:true});let browser,server;
const begun=Date.now();report.timings=[];
async function check(message){report.checks.push(message);report.timings.push({message,elapsedMs:Date.now()-begun});await writeFile(out+'.progress.json',JSON.stringify({checks:report.checks,timings:report.timings,at:new Date().toISOString()}));}
function ReviewAudioSilence(){
 const mute=()=>document.querySelectorAll('audio,video').forEach(m=>{m.muted=true;m.volume=0;m.pause();});Object.defineProperty(globalThis,'ReviewAudioSilence',{value:Object.freeze({enabled:true,mute})});HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};
 for(const name of ['AudioContext','webkitAudioContext']){const Original=globalThis[name];if(Original)globalThis[name]=class extends Original{constructor(...args){super(...args);this.suspend();this.resume=async()=>this.suspend();}};}
 new MutationObserver(mute).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['muted','volume','autoplay']});addEventListener('focus',mute);addEventListener('visibilitychange',mute);addEventListener('DOMContentLoaded',mute);
}
try{
 if(!remote)server=await serve(0);const url=remote??'http://127.0.0.1:'+server.address().port+'/';report.url=url;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--mute-audio','--autoplay-policy=user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.addInitScript(ReviewAudioSilence);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>Boolean(globalThis.clubStudio));
 const snap=()=>page.evaluate(()=>clubStudio.snapshot()),idle=()=>page.waitForFunction(()=>document.querySelector('#game').getAttribute('aria-busy')==='false'),nav=tab=>page.locator('[data-action="nav"][data-tab="'+tab+'"]').first().click();
 async function shot(name){await page.screenshot({path:resolve(folder,name)});report.screenshots.push(name);}
 async function importClub(club){await nav('settings');await page.locator('#import-save').setInputFiles({name:'technical-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(club))});await page.waitForSelector('.inline-confirm');await page.locator('[data-action="confirm"]').click();await idle();}
 if(process.env.NRI_EXPECTED_SOURCE){report.sourceChecks=[];for(const [path,hash]of Object.entries(JSON.parse(process.env.NRI_EXPECTED_SOURCE))){const response=await context.request.get(new URL(path,url).href+'?review='+Date.now());assert.equal(response.status(),200,path);assert.equal(createHash('sha256').update(await response.body()).digest('hex'),hash,path);report.sourceChecks.push(path);}await check('Published entry and changed runtime files match accepted SHA-256 hashes');}
 assert.equal(await page.evaluate(()=>ReviewAudioSilence.enabled),true);const initial=await snap();assert.equal(initial.campaign.mode,'endless');assert.equal(initial.campaign.goal,undefined);assert.equal(initial.campaign.won,undefined);
 await nav('goals');assert.equal(await page.locator('[data-endless-development]').count(),1);assert.equal(await page.locator('[data-action="continue"]').count(),0);assert.ok((await page.locator('#panel-content').innerText()).includes('Ваш масштаб'));
 await shot('endless-first-club.png');await check('New club opens directly in endless play; development displays optional milestones without a victory or continuation gate');
 const old=structuredClone(initial);delete old.campaign.mode;delete old.campaign.development;Object.assign(old.campaign,{won:true,wonAt:12,goal:{rooms:5,participations:100,rating:8,reserve:8000,systems:4}});
 await importClub(old);const migrated=await snap();assert.equal(migrated.campaign.mode,'endless');assert.equal(migrated.campaign.previousVictory.clock,12);for(const key of ['finance','layout','guests','rating','clock'])assert.deepEqual(migrated[key],old[key]);
 await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));await nav('goals');assert.equal(await page.locator('[data-action="continue"]').count(),0);assert.deepEqual(await snap(),migrated);
 await check('An old winning save imports through normal controls and reloads with the entire club intact and no victory gate');
 const six=await page.evaluate(async()=>{const {expandedClub}=await import('./tools/endless-fixture.js');return expandedClub(6,{spareLand:true});});
 report.fixture='Clearly labelled one-million-ruble technical construction budget; six rooms, rest places, games and hires use paid APIs. This is not earned progression.';
 await importClub(six);assert.equal((await snap()).rooms.filter(r=>r.operational).length,6);
 await nav('goals');assert.ok((await page.locator('[data-development-track="rooms"]').innerText()).includes('6 / 10'));assert.equal(await page.locator('[data-action="continue"]').count(),0);
 await shot('endless-six-working-rooms.png');await check('Six complete operational rooms show the next optional milestone of ten, while the club stays active');
 await nav('build');await page.locator('[data-action="tool"][data-tool="room"]').click();await page.locator('[data-action="fit"]').click();
 const points=await page.evaluate(()=>({a:clubStudio.point(37.1,.1),b:clubStudio.point(41.8,4.8)}));await page.mouse.move(points.a.x,points.a.y);await page.mouse.down();await page.mouse.move(points.b.x,points.b.y,{steps:18});await page.mouse.up();
 const apply=page.locator('#build-preview [data-action="apply-build"]');assert.equal(await apply.isEnabled(),true,await page.locator('#build-preview').innerText());await apply.click();await idle();assert.equal((await snap()).rooms.length,7);
 const candidate=await page.evaluate(async()=>{const {campaignMarket}=await import('./src/model/campaign.js'),{prestigeNeeded}=await import('./src/model/upgrades.js');return campaignMarket(clubStudio.snapshot()).candidates.find(m=>prestigeNeeded(m)===0);});assert.ok(candidate);
 await nav('team');await page.locator('[data-action="team-tab"][data-candidates="true"]').click();await page.locator('[data-action="hire"][data-id="'+candidate.id+'"]').click();await idle();assert.equal((await snap()).staff.length,7);
 await nav('library');await page.locator('[data-action="library-tab"][data-id="games"]').click();await page.locator('[data-action="buy-game"][data-id="'+candidate.systems[0]+'"]').click();await idle();assert.equal((await snap()).library.copies.length,7);
 const seven=await snap();assert.equal(seven.rooms.filter(r=>r.operational).length,7);assert.equal(seven.campaign.mode,'endless');assert.equal(seven.campaign.won,undefined);assert.ok(seven.finance.cash<six.finance.cash);
 await nav('goals');await shot('endless-seventh-room.png');await page.reload();await page.waitForFunction(()=>Boolean(globalThis.clubStudio));assert.deepEqual(await snap(),seven);
 await nav('club');const before=(await snap()).clock;await page.locator('[data-action="wait-guests"]').click();await idle();assert.ok((await snap()).clock>before);assert.ok((await snap()).guests.length>6);assert.equal((await snap()).rooms.filter(r=>r.operational).length,7);
 await check('The player draws and buys room seven, hires its master and buys its game through native controls; seven operational rooms persist and new visitors still arrive');
 const wide=await page.evaluate(async()=>{
  const {createConstructionService}=await import('./src/model/construction.js'),{constructionBudgetAdapter}=await import('./src/model/campaign-construction.js'),c=clubStudio.snapshot();
  const api=createConstructionService({getClub:()=>c,replaceClub:next=>Object.assign(c,next),persist:async()=>{},economy:constructionBudgetAdapter()}),q=api.quote({type:'buyCells',cells:Array.from({length:100},(_,i)=>({x:42+i,y:7}))});
  if(!q.ok)throw Error(q.reason);const result=await api.commit(q.edit,{transactionId:'technical-wide-map',baseRevision:q.baseRevision});if(!result.ok)throw Error(result.reason);return c;
 });
 await importClub(wide);await page.locator('[data-action="fit"]').click();const overview=await page.evaluate(()=>({camera:clubStudio.camera(),left:clubStudio.point(0,7),right:clubStudio.point(141.9,7)})),host=await page.locator('#world-host').boundingBox();
 assert.ok(overview.camera.zoom<.35);for(const p of [overview.left,overview.right])assert.ok(p.x>=host.x&&p.x<=host.x+host.width&&p.y>=host.y&&p.y<=host.y+host.height,'Whole-club overview must include both ends of a wide purchased map');
 report.overviewZoom=overview.camera.zoom;await shot('endless-wide-map.png');await check('Whole-club camera fits a 142-cell-wide purchased map below the former minimum zoom');
 await page.setViewportSize({width:390,height:844});await nav('goals');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('dialog').count(),0);await shot('endless-mobile.png');
 assert.deepEqual(report.errors,[]);report.passed=true;await context.close();
}catch(error){report.errors.push(error.stack??String(error));if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});}}
finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));report.finished=true;report.elapsedMs=Date.now()-begun;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({finished:report.finished,passed:report.passed,checks:report.checks,errors:report.errors}));if(!report.passed)process.exitCode=1;}
