/**
 * Build static GitHub Pages artifact from the offline asset list.
 * No server, user projects, tests or repository metadata are published.
 */
import {readFile,mkdir,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function declaredAssets(swText){
 const match=swText.match(/\bconst ASSETS\s*=\s*\[([\s\S]*?)\];/);
 if(!match)throw Error('No se encontró ASSETS');
 const urls=[...match[1].matchAll(/['"](\.\/[^'"]+)['"]/g)].map(m=>m[1]);
 if(urls.length<20)throw Error('Lista incompleta de assets');
 if(new Set(urls).size!==urls.length)throw Error('Hay assets duplicados');
 for(const url of urls){
  if(url==='./')continue;
  if(!/^\.\/[a-zA-Z0-9._/-]+$/.test(url)||url.split('/').includes('..')||url.startsWith('./.'))
    throw Error('Ruta de asset insegura: '+url);
 }
 return urls;
}
export async function buildPages({root=ROOT,output=join(root,'dist')}={}){
 const assets=declaredAssets(await readFile(join(root,'sw.js'),'utf8'));
 const files=new Set(['index.html','manifest.webmanifest','sw.js',...assets.filter(x=>x!=='./').map(x=>x.slice(2))]);
 const index=await readFile(join(root,'index.html'),'utf8');
 for(const match of index.matchAll(/(?:src|href)="(\/[^"]+)"/g))
  throw Error('URL absoluta incompatible con Pages: '+match[1]);
 for(const match of index.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g))
  if(!files.has(match[1].slice(2)))throw Error('Asset no publicado: '+match[1]);
 const bytes=new Map();
 for(const f of files)bytes.set(f,await readFile(join(root,f)));
 await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
 for(const [file,data] of bytes){
  const to=join(output,file);
  await mkdir(dirname(to),{recursive:true});await writeFile(to,data);
 }
 await writeFile(join(output,'.nojekyll'),'');
 return {files:files.size,output};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 buildPages().then(x=>process.stdout.write('Pages: '+x.files+' archivos públicos en '+x.output+'\n'))
  .catch(error=>{process.stderr.write(String(error.stack||error)+'\n');process.exitCode=1;});
}
