import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('visual pitch edit exposes zoom, drag selection and source-time mask overlay',()=>{
 const app=read('src/app.js'),ui=read('src/pitch-review-ui.js');
 assert.match(ui,/id="pitchWave"/);assert.match(ui,/id="pitchZoom"/);
 assert.match(app,/function drawActivePitchReview\(\)/);
 assert.match(app,/sourceTimeFromPointer\(event\.clientX/);
 assert.match(app,/function openTrackMove\(id\)/);
 assert.match(app,/data-track-action="move-track"/);
});
test('Flow keyboard delete preserves focus between two consecutive presses',()=>{
 const app=read('src/app.js');
 assert.match(app,/function deleteFlowNode\(id\)/);
 assert.match(app,/focus\(\{preventScroll:true\}\)/);
 assert.match(app,/e\.key\.toLowerCase\(\)==='x'/);
});
