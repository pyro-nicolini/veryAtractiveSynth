import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('essential studio controls and keyboard-accessible timeline exist',()=>{
 const html=get('index.html');
 for(const id of ['ruler','bpmInput','metronomeBtn','snapBtn','loopBtn','masterMeter','saveStatus','recordingGhost','undoBtn','redoBtn'])
   assert.match(html,new RegExp('id="'+id+'"'),id+' missing from HTML');
 assert.match(html,/role="slider"/);
});
test('offline cache includes every new local module',()=>{
 const sw=get('sw.js');
 for(const path of ['src/timeline.js','src/engine.js','src/portable-project.js','src/recording-utils.js','src/worklets/capture-processor.js'])
   assert.ok(sw.includes(path),path+' missing from service worker cache');
 assert.ok(!sw.includes('http://')&&!sw.includes('https://'));
});
