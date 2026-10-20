import {run} from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
if(!process.argv.includes('-noaudio'))throw Error('Pass -noaudio');
globalThis.ReviewAudioSilence=Object.freeze({enabled:true});
const i=process.argv.indexOf('--out'),out=resolve(i<0?'review/economy-balance/flow.json':process.argv[i+1]);
const report={finished:false,passed:false,audio:'Pure model; -noaudio; ReviewAudioSilence',checks:[],failures:[]};
await mkdir(dirname(out),{recursive:true});
try{for await(const event of run({files:[fileURLToPath(new URL('../tests/economy-flow.test.mjs',import.meta.url))],concurrency:1})){if(event.type==='test:pass')report.checks.push(event.data.name);if(event.type==='test:fail')report.failures.push({name:event.data.name,error:event.data.details?.error?.cause?.stack??event.data.details?.error?.message??String(event.data.details?.error)});}report.passed=report.checks.length>0&&report.failures.length===0;}catch(error){report.failures.push({error:error.stack});}
report.finished=true;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
