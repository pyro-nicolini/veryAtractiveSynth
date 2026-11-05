import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('delete requires real focus and safe two-step node removal',()=>{
 const app=read('src/app.js'),flow=read('src/flow-studio.js');
 assert.match(app,/function deleteFlowNode\(id\)/);assert.match(app,/if\(!t\.muted\)/);
 assert.match(app,/t\.flowHidden=true/);assert.match(app,/function deleteTrack\(id\)/);
 assert.match(app,/await askConfirm\('¿Eliminar la pista/);
 assert.match(app,/\['Delete','Backspace'\]/);
 assert.match(flow,/tracks\.filter\(t=>!t\.flowHidden\)/);
 assert.match(flow,/data-flow-delete/);
});
test('waveform and ruler use scrollable zoomed segment with handles',()=>{
 const app=read('src/app.js'),html=read('index.html'),css=read('src/studio-light.css');
 assert.match(app,/data-clip-control="start"/);
 assert.match(app,/data-clip-control="end"/);
 assert.match(app,/data-clip-control="move"/);
 assert.match(app,/state\.zoom/);assert.match(html,/id="rulerViewport"/);
 assert.match(css,/\.wave-playhead\{[^}]*z-index:20/);
 assert.match(css,/\.wave-viewport\{/);
});
