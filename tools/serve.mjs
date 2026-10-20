import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function serve(port=8174){
 const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png'};
 const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(path!==root&&!path.startsWith(root+sep))throw Error('path');if(!(await stat(path)).isFile())throw Error('file');res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));}catch{res.writeHead(404);res.end('Not found');}});
 await new Promise((done,fail)=>server.listen(port,'127.0.0.1',done).on('error',fail));return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){await serve(Number(process.env.PORT??8174));console.log('Клуб открыт: http://127.0.0.1:8174');if(process.argv.includes('--open')){const opened=spawn('powershell.exe',['-NoProfile','-Command',"Start-Process 'http://127.0.0.1:8174'"],{windowsHide:true,stdio:'ignore'});opened.on('error',()=>console.log('Откройте адрес клуба в браузере.'));opened.unref();}}
