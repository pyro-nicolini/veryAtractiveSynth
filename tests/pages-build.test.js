import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages,declaredAssets} from '../scripts/build-pages.mjs';
test('Pages bundle contains every offline file, excludes dev files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'vas-pages-'));
 try{
  const result=await buildPages({output:dir});
  assert.ok(result.files>=28);
  const html=await readFile(join(dir,'index.html'),'utf8');
  const sw=await readFile(join(dir,'sw.js'),'utf8');
  for(const asset of declaredAssets(sw)){
   if(asset==='./')continue;
   assert.ok((await stat(join(dir,asset.slice(2)))).isFile(),asset);
  }
  assert.match(html,/src="\.\/src\/app\.js"/);
  assert.match(html,/href="\.\/manifest\.webmanifest"/);
  assert.ok((await readdir(dir)).includes('.nojekyll'));
  for(const f of ['server.js','README.md','tests','.github','.gitignore','package.json'])
   assert.ok(!(await readdir(dir)).includes(f),f+' must not be published');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('manifest rejects duplicate entries',()=>{
 const list='const ASSETS = ['+Array.from({length:21},(_,i)=>JSON.stringify(i===20?'./x0.js':'./x'+i+'.js')).join(',')+'];';
 assert.throws(()=>declaredAssets(list),/duplicados/);
});
