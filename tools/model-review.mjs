import {run} from 'node:test';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
if(!process.argv.includes('-noaudio'))throw Error('Pass -noaudio');
globalThis.ReviewAudioSilence=Object.freeze({enabled:true});
const out=resolve(process.argv[process.argv.indexOf('--out')+1]),report={finished:false,passed:false,checks:[],failures:[],audio:'Pure model checks; -noaudio; ReviewAudioSilence'};
await mkdir(dirname(out),{recursive:true});
try{const selected=process.argv.includes('--file')?process.argv[process.argv.indexOf('--file')+1]:null,available=(await readdir(new URL('../tests/',import.meta.url))).filter(n=>n.endsWith('.test.mjs'));if(selected&&!available.includes(selected))throw Error('Unknown model check: '+selected);report.files=available.filter(n=>!selected||n===selected);for await(const event of run({files:report.files.map(n=>fileURLToPath(new URL('../tests/'+n,import.meta.url))),concurrency:1})){if(event.type==='test:pass')report.checks.push(event.data.name);if(event.type==='test:fail')report.failures.push({name:event.data.name,error:event.data.details?.error?.cause?.message??event.data.details?.error?.message??String(event.data.details?.error)});}report.passed=report.failures.length===0&&report.checks.length>0;}catch(error){report.failures.push({error:error.stack});}
report.finished=true;await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failures:report.failures}));if(!report.passed)process.exitCode=1;
