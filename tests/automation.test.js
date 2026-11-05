import test from 'node:test';import assert from 'node:assert/strict';
import {normaliseAutomation,sampleAutomation,addAutomationPoint} from '../src/automation.js';
test('automation points clamp, sort, and interpolate safely',()=>{
 const points=normaliseAutomation([{time:2,value:2},{time:0,value:-1}],0,1);assert.deepEqual(points,[{time:0,value:0},{time:2,value:1}]);assert.equal(sampleAutomation(points,1,0,1),.5);assert.equal(addAutomationPoint(points,1,.25)[1].value,.25);
});
