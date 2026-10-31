/** Zero-dependency static server. Binds loopback only; no uploads or audio telemetry. */
import http from 'node:http';
import {createReadStream,stat} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,extname,sep} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const port=Number(process.env.PORT||4173);
http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method Not Allowed');return;}
  let path;
  try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
  catch{res.writeHead(400);res.end('Bad Request');return;}
  if(path==='/'||path.endsWith('/'))path+='index.html';
  const target=resolve(root,'.'+path);
  if(target!==root&&!target.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  stat(target,(error,info)=>{
    if(error||!info.isFile()){res.writeHead(404);res.end('Not Found');return;}
    res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Permissions-Policy':'microphone=(self)'});
    if(req.method==='HEAD'){res.end();return;}
    createReadStream(target).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>{
  console.log('\nVERY ATRACTIVE SYNTH — ESTUDIO LOCAL');
  console.log('Abre http://127.0.0.1:'+port+' en tu navegador.');
  console.log('Todo el audio permanece en tu dispositivo.\n');
});
