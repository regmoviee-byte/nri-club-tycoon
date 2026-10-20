import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
if(!process.argv.includes('-noaudio'))throw Error('Live review requires -noaudio');
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const arg=name=>process.argv[process.argv.indexOf(name)+1],out=resolve(arg('--out')),url=arg('--url'),expected=JSON.parse(process.env.NRI_EXPECTED_SOURCE??'{}');
assert.equal(new URL(url).origin,'https://regmoviee-byte.github.io');assert.ok(Object.keys(expected).length>=3);
const report={finished:false,passed:false,url,checks:[],errors:[],audio:'-noaudio; Chromium --mute-audio; ReviewAudioSilence before scripts; isolated browser storage'};
await mkdir(dirname(out),{recursive:true});let browser;
function ReviewAudioSilence(){
 const mute=()=>document.querySelectorAll('audio,video').forEach(m=>{m.muted=true;m.volume=0;m.pause();});
 Object.defineProperty(globalThis,'ReviewAudioSilence',{value:Object.freeze({enabled:true,mute})});
 HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};
 for(const name of ['AudioContext','webkitAudioContext']){const Original=globalThis[name];if(Original)globalThis[name]=class extends Original{constructor(...args){super(...args);this.suspend();this.resume=async()=>this.suspend();}};}
 new MutationObserver(mute).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['muted','volume','autoplay']});
 addEventListener('focus',mute);addEventListener('visibilitychange',mute);addEventListener('DOMContentLoaded',mute);
}
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--mute-audio','--autoplay-policy=user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(ReviewAudioSilence);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.waitForFunction(()=>Boolean(globalThis.clubStudio));
 assert.equal(await page.evaluate(()=>ReviewAudioSilence.enabled),true);assert.equal(await page.locator('dialog').count(),0);assert.equal(await page.locator('.game-rail [data-tab]').count(),9);assert.equal(await page.getByRole('img',{name:'Администратор за стойкой',exact:true}).count(),1);
 report.checks.push('Published game boots with integrated UI and physical administrator in isolated storage');
 for(const [path,sha]of Object.entries(expected)){
  const remote=await page.request.get(new URL(path+'?review='+sha.slice(0,12),url).href);assert.equal(remote.status(),200,path);assert.equal(createHash('sha256').update(await remote.body()).digest('hex'),sha,path+' differs from tested source');
 }report.checks.push('Published entry point, character art, world renderer and CSS match tested source SHA-256');
 const admin=await page.getByRole('img',{name:'Администратор за стойкой',exact:true}).boundingBox();await page.mouse.click(admin.x+admin.width/2,admin.y+12);assert.equal(await page.locator('#panel-title').innerText(),'Знакомство');report.checks.push('Published administrator opens reception conversation');
 await page.screenshot({path:resolve(dirname(out),'live-desktop.png')});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(dirname(out),'live-mobile.png')});report.checks.push('Published desktop and mobile render without page overflow');
 assert.deepEqual(report.errors,[]);report.passed=true;await context.close();
}catch(error){report.errors.push(error.stack??String(error));}
finally{if(browser)await browser.close();report.finished=true;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;}
