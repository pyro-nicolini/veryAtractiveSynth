import test from 'node:test';import assert from 'node:assert/strict';
import {selectionPercent,sourceTimeFromPointer,pitchReviewMarkup} from '../src/pitch-review-ui.js';
test('zoom review maps selection precisely into original source seconds',()=>{
 assert.deepEqual(selectionPercent(2,5,10),{left:20,width:30});
 assert.equal(sourceTimeFromPointer(150,{left:100,width:100},10),5);
 assert.equal(sourceTimeFromPointer(50,{left:100,width:100},10),0);
 assert.match(pitchReviewMarkup({buffer:{duration:8}}),/id="pitchZoom"/);
 assert.match(pitchReviewMarkup({buffer:{duration:8}}),/id="pitchWave"/);
});
