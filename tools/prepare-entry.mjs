import {readFile,writeFile,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),revision='20261020-sculpted-v1';
async function modules(folder){let files=[];for(const entry of await readdir(new URL(folder,root),{withFileTypes:true})){const path=folder+entry.name;if(entry.isDirectory())files.push(...await modules(path+'/'));else if(entry.name.endsWith('.js'))files.push(path);}return files;}
const imports=Object.fromEntries((await modules('src/')).sort().map(path=>['./'+path,'./'+path+'?v='+revision]));
let html=await readFile(new URL('index.html',root),'utf8');html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'').replace(/src\/ui\/studio\.css(?:\?v=[^"']*)?/g,'src/ui/studio.css?v='+revision).replace(/src\/ui\/app\.js(?:\?v=[^"']*)?/g,'src/ui/app.js?v='+revision);
html=html.replace('<script type="module"','<script type="importmap">'+JSON.stringify({imports})+'</script><script type="module"');
await writeFile(new URL('index.html',root),html);console.log('Prepared versioned module graph: '+Object.keys(imports).length+' modules.');
