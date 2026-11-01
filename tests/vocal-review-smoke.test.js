import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('voice recording, region review, auto-tuners and character panel are wired',()=>{
 const app=read('src/app.js'),ui=read('src/tune-lab-ui.js'),engine=read('src/engine.js'),worklet=read('src/worklets/voice-processor.js');
 assert.match(app,/id="singingNote"/);assert.match(app,/estimateNote\(samples/);
 assert.match(app,/function openPitchReview\(\)/);assert.match(app,/autoTuneSegments\(clip/);
 assert.match(app,/setNoteMask\(clip/);
 assert.match(ui,/id="characterPad"/);assert.match(ui,/data-voice-character/);
 assert.match(engine,/pitchNode\.parameters\.get\('shift'\)/);
 assert.match(worklet,/name:'shift'/);
});
