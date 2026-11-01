import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('light studio wires visual UI to actual actions and waveform ruler',()=>{
 const html=read('index.html'),js=read('src/app.js'),css=read('src/studio-light.css'),sw=read('sw.js');
 for(const id of ['flowToggle','flowArea','flowBody','libraryBody','soundLibrary','sessionRecordBtn'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/function alignWaveRuler\(\)/);
 assert.match(js,/wave-playhead/);
 assert.match(js,/function renderFlow\(\)/);
 assert.match(js,/function setupFlow\(\)/);
 assert.match(js,/function applyFlowFx\(/);
 assert.match(css,/\.timeline-ruler #ruler/);
 for(const asset of ['studio-light.css','flow-studio.js','studio-library.js','library-ui.js'])
  assert.ok(sw.includes(asset),'cache missing '+asset);
});
test('flow connection mute and effect bypass use real channel DSP',()=>{
 const app=read('src/app.js'),engine=read('src/engine.js');
 assert.match(app,/track\.muted=!track\.muted/);
 assert.match(app,/engine\.updateTrack\(track\)/);
 assert.match(engine,/if\(solo&&!track\.solo\)continue/);
 assert.match(engine,/set\(graph\.volume\.gain,track\.muted\?0/);
});

test('simple inspector keeps technical key and scale accessible on demand',()=>{
 const code=read('src/app.js'),style=read('src/studio-light.css');
 assert.match(code,/Opciones musicales avanzadas/);
 assert.match(code,/dial\('Afinar'/);
 assert.match(code,/dial\('Limpiar'/);
 assert.match(style,/\.inspector-more/);
});
