import test from 'node:test';import assert from 'node:assert/strict';
import {extractCompTake} from '../src/comping.js';
test('extracts a non-destructive comp take from a timeline range',()=>{
 const buffer={duration:4};const track={clips:[{id:'a',name:'Toma 1',buffer,offset:2,trimStart:0,trimEnd:0,speed:1}]};
 const take=extractCompTake(track,'a',3,4,()=> 'b');assert.equal(take.offset,3);assert.equal(take.trimStart,1);assert.equal(track.clips.length,2);assert.equal(track.clips[0].id,'a');
});
