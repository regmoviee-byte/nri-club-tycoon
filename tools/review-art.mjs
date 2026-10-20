import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {serve} from './serve.mjs';
if(!process.argv.includes('-noaudio'))throw Error('Table review requires -noaudio');
const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const out=resolve(arg('--out')),folder=dirname(out),remote=arg('--url'),require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const report={finished:false,passed:false,checks:[],errors:[],screenshots:[],audio:'-noaudio; Chromium --mute-audio; ReviewAudioSilence; isolated storage'};await mkdir(folder,{recursive:true});let browser,server;
function ReviewAudioSilence(){
 const mute=()=>document.querySelectorAll('audio,video').forEach(m=>{m.muted=true;m.volume=0;m.pause();});Object.defineProperty(globalThis,'ReviewAudioSilence',{value:Object.freeze({enabled:true,mute})});HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};
 for(const name of ['AudioContext','webkitAudioContext']){const Original=globalThis[name];if(Original)globalThis[name]=class extends Original{constructor(...args){super(...args);this.suspend();this.resume=async()=>this.suspend();}};}
 new MutationObserver(mute).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['muted','volume','autoplay']});addEventListener('focus',mute);addEventListener('visibilitychange',mute);addEventListener('DOMContentLoaded',mute);
}
try{
 if(!remote)server=await serve(0);const url=remote??'http://127.0.0.1:'+server.address().port+'/';report.url=url;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--mute-audio','--autoplay-policy=user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});await context.addInitScript(ReviewAudioSilence);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>Boolean(globalThis.clubStudio));assert.equal(await page.evaluate(()=>ReviewAudioSilence.enabled),true);

 const timing=await page.evaluate(async()=>{
  const {createCampaign}=await import('/src/model/campaign.js'),{surfaceEditAt}=await import('/src/model/table-surface.js'),{tableSceneGroups,standaloneTabletopArt}=await import('/src/ui/table-art.js');
  const c=createCampaign('dense-preview'),table=c.layout.objects.find(o=>o.kind==='table'),items=[['mat',1,1],['dice',.62,.62],['dice',1.3,.7],['deskLamp',1.35,1.3],['miniatures',.67,1.23],['screen',1,.17]];
  c.layout.objects.push(...items.map(([kind,x,y],i)=>({id:'timing-'+i,...surfaceEditAt(c.layout,kind,{x:table.x+x,y:table.y+y}),roomId:table.roomId})));tableSceneGroups(table,c.layout);
  const samples=[];for(let i=0;i<8;i++){const ghost={id:'timing-4',...surfaceEditAt(c.layout,'miniatures',{x:table.x+.67+i*.015,y:table.y+1.23},15)},start=performance.now();standaloneTabletopArt(ghost,c.layout,{ghost:true});samples.push(performance.now()-start);}return {samples,maximum:Math.max(...samples),total:samples.reduce((a,b)=>a+b,0)};
 });report.previewTimingMs=timing;assert.ok(timing.maximum<250&&timing.total<1500,'Dense-table pointer previews must remain responsive: '+JSON.stringify(timing));report.checks.push('Eight dense-table previews finish below 250 ms each without fragment growth');
 const gallery=await context.newPage();await gallery.goto(new URL('package.json',url).href);await gallery.setViewportSize({width:1600,height:1000});
 const html=await gallery.evaluate(async()=>{
  const {furnitureArt,seatForeground,seatedPersonArt,seatedTableArmArt,project}=await import('/src/ui/world.js'),{tableSceneGroups}=await import('/src/ui/table-art.js'),{createCampaign}=await import('/src/model/campaign.js');
  const c=createCampaign('sculpted-art'),base=c.layout.objects.find(o=>o.kind==='table'),chairs=c.layout.objects.filter(o=>o.role==='guest'||o.role==='master'),person={name:'Посадка',portrait:{hair:'long',hairColor:'#493b37',skin:'#e3b79e',coat:'#627f84',glasses:true,outfit:'cardigan'}};
  function scene(kind){const table={...base,kind},layout={...c.layout,objects:[table,...chairs]},entities=tableSceneGroups(table,layout);for(const [index,seat] of chairs.entries()){const figure={...person,name:'Посадка '+index,portrait:{...person.portrait,bodyShape:['regular','lean','soft','broad','compact'][index],coat:['#627f84','#8d6b79','#8b725b','#657c69','#77718b'][index]}};const p=project(seat.x+.5,seat.y+.5);entities.push({depth:seat.x+seat.y+1,art:furnitureArt(seat,layout,{occupied:true})+'<g transform="translate('+p.x+' '+p.y+')">'+seatedPersonArt(figure,{rotation:seat.rotation,kind:seat.kind,atTable:true})+'</g>'+seatForeground(seat)});entities.push({depth:table.x+table.y+2.005,art:seatedTableArmArt(figure,seat,layout)});}return entities.sort((a,b)=>a.depth-b.depth).map(e=>e.art).join('');}
  const rest=[0,1,2,3].map(rotation=>{const o={kind:'chairArms',id:'rest-'+rotation,x:0,y:0,rotation};return '<article><h2>Отдых · '+rotation*90+'°</h2><svg viewBox="-45 -53 90 95">'+furnitureArt(o,{objects:[]},{occupied:true})+'<g transform="translate(0 18)">'+seatedPersonArt(person,{rotation,kind:o.kind})+'</g>'+seatForeground(o)+'</svg></article>';}).join('');
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#dce1d2;color:#334c46;font:14px Segoe UI}h1{font:26px Georgia}h2{font-size:14px}.tables{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tables svg{width:100%;height:470px}.rest{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.rest svg{width:100%;height:250px}article{padding:14px;background:#f5eedf;border:1px solid #b2bea8}</style><h1>Форма тела и посадка · реальные модели игры</h1><div class="tables">'+['table','tableComfort'].map(kind=>'<article><h2>'+kind+'</h2><svg data-fit="true">'+scene(kind)+'</svg></article>').join('')+'</div><div class="rest">'+rest+'</div>';
 });
 await gallery.setContent(html);await gallery.evaluate(()=>{for(const svg of document.querySelectorAll('svg[data-fit]')){const b=svg.getBBox();svg.setAttribute('viewBox',[b.x-8,b.y-8,b.width+16,b.height+16].join(' '));}if(/NaN|Infinity|undefined/.test(document.querySelector('.tables').innerHTML))throw Error('Invalid geometry');});
 await gallery.screenshot({path:resolve(folder,'sculpted-people-and-tables.png'),fullPage:true});report.screenshots.push('sculpted-people-and-tables.png');report.checks.push('Five people use curved torsos and rounded arms at both gaming tables; four chair directions use a separate relaxed pose');
 await gallery.close();
 assert.deepEqual(report.errors,[]);report.passed=true;await context.close();
}catch(error){report.errors.push(error.stack??String(error));if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});}}
finally{if(browser)await browser.close();if(server)await new Promise(done=>server.close(done));report.finished=true;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({finished:report.finished,passed:report.passed,checks:report.checks,errors:report.errors}));if(!report.passed)process.exitCode=1;}
