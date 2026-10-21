import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function verifyRuntime(page,url,path){
 const manifest=JSON.parse(await readFile(path,'utf8')),entries=Object.entries(manifest.sha256),results=[];
 for(let start=0;start<entries.length;start+=4){await Promise.all(entries.slice(start,start+4).map(async([name,expected])=>{const target=new URL(name,url);target.search='v='+manifest.version+'&review='+Date.now();const response=await page.request.get(target.href,{timeout:45000});if(!response.ok())throw Error('Runtime unavailable: '+name+' '+response.status());const actual=createHash('sha256').update(await response.body()).digest('hex');if(actual!==expected)throw Error('Runtime differs: '+name);results.push(name);}));}
 return {version:manifest.version,matched:results.length,total:entries.length};
}
