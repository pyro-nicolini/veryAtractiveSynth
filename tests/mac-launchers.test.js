import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Finder scripts are syntax-safe, portable Bash, and work from repository folder',()=>{
 for(const name of ['Iniciar.command','Actualizar.command']){
  const content=read(name);
  assert.match(content,/^#!\/bin\/bash/);
  assert.match(content,/cd "\$\(dirname "\$0"\)"/);
  assert.match(content,/\/opt\/homebrew\/bin:\/usr\/local\/bin/);
  const syntax=spawnSync('bash',['-n',new URL('../'+name,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(syntax.status,0,name+' syntax: '+syntax.stderr);
 }
 const start=read('Iniciar.command'),update=read('Actualizar.command');
 assert.match(start,/npm start/);assert.match(start,/open "http:\/\/127\.0\.0\.1:4173\/"/);
 assert.match(start,/curl --silent --fail/);assert.match(start,/Node\.js 20/);
 assert.match(update,/git status --porcelain/);assert.match(update,/git fetch origin main/);
 assert.match(update,/git switch main/);assert.match(update,/git pull --ff-only origin main/);
 assert.doesNotMatch(update,/git reset --hard|git clean -fd|git push --force/);
 assert.match(read('.gitattributes'),/\*\.command text eol=lf/);
 const readme=read('README.md');
 assert.match(readme,/Iniciar\.command/);
 assert.match(readme,/Actualizar\.command/);
 assert.match(readme,/chmod \+x Iniciar\.command Actualizar\.command/);
});
