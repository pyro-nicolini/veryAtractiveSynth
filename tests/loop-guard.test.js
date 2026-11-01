import test from 'node:test';import assert from 'node:assert/strict';
import {loopBoundaryFades} from '../src/loop-guard.js';
test('each finite loop has sample-clock microfade at each interior boundary',()=>{
 const events=loopBoundaryFades({from:2,to:3,repeats:4});
 assert.equal(events.length,3);
 assert.deepEqual(events.map(x=>x.center),[1,2,3]);
 assert.ok(events.every(x=>x.before<x.center&&x.center<x.after&&x.after-x.before<=.0161));
});
test('seeking into a loop does not schedule fades in the past',()=>{
 const events=loopBoundaryFades({from:0,to:.5,repeats:6},1.497);
 assert.ok(events.every(x=>x.before>=0));
 assert.ok(events.every(x=>x.center>0));
 assert.deepEqual(loopBoundaryFades({from:0,to:0.1,repeats:1}),[]);
 assert.deepEqual(loopBoundaryFades({from:0,to:0.01,repeats:12}),[]);
});
