import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=new URL('../',import.meta.url),arg=n=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:null;
if(arg('--read')){
 const path=arg('--read');if(path.includes('..')||path.startsWith('/')||path.includes(':'))throw Error('Repository path required');
 const bytes=await readFile(new URL(path,root)),content=bytes.toString(process.argv.includes('--base64')?'base64':'utf8'),offset=Number(arg('--offset')??0),length=Number(arg('--length')??content.length);
 console.log(JSON.stringify({content:content.slice(offset,offset+length),total:content.length}));
}else{
 const base=JSON.parse(await readFile(new URL('review/rework-20261021/base-tree.json',root),'utf8')),known=new Map(base.map(row=>[row.path,row]));
 async function walk(folder){let found=[];for(const item of await readdir(new URL(folder,root),{withFileTypes:true})){const path=folder+item.name;if(item.isDirectory())found.push(...await walk(path+'/'));else found.push(path);}return found;}
 const runtime=['index.html',...(await walk('src/')).filter(p=>/\.(js|css)$/.test(p))],hashes={};for(const path of runtime)hashes[path]=createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');
 const source={version:'20261021-improvements-v1',parent:'9eab0dca26515b9d5c6a923046ce50ac92609254',sha256:hashes};await writeFile(new URL('docs/improvements-evidence/source.json',root),JSON.stringify(source,null,2)+'\n');
 const paths=new Set([...known.keys(),...runtime,...await walk('tests/'),...await walk('tools/'),...await walk('docs/audit-20261021/'),...await walk('docs/improvements-evidence/'),'docs/IMPROVEMENTS.md','README.md']);
 const changed=[],missing=[];
 for(const path of [...paths].sort()){
  let bytes;try{bytes=await readFile(new URL(path,root));}catch(error){if(error.code==='ENOENT'){missing.push(path);continue;}throw error;}
  const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(known.get(path)?.sha===sha)continue;
  changed.push({path,sha,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,encoding:/\.(png|jpg|webp|ico)$/.test(path)?'base64':'utf-8',mode:known.get(path)?.mode??'100644'});
 }
 // Git's base tree preserves remote-only historical evidence; no deletion
 // entries are emitted for files absent from this recovered local checkout.
 const manifest={version:source.version,parent:source.parent,baseTree:'8dc4a544e11f34d527e735723022facd28b09281',preserved:base.length-changed.filter(x=>known.has(x.path)).length,remoteOnlyPreserved:missing,changed,runtimeCount:runtime.length};
 const out=resolve(arg('--out')??new URL('review/rework-20261021/release-manifest.json',root).pathname.slice(1));await writeFile(out,JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
}
