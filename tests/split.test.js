import test from 'node:test';
import assert from 'node:assert/strict';
import {splitClip} from '../src/timeline.js';
import {effectiveDuration} from '../src/dsp.js';
test('split two clips without copying or modifying original audio',()=>{
 const buffer={duration:10};
 const src={id:'a',name:'Voz',buffer,offset:2,trimStart:1,trimEnd:2,fadeIn:1,fadeOut:1};
 const [left,right]=splitClip(src,5,'b');
 assert.equal(left.buffer,buffer);assert.equal(right.buffer,buffer);
 assert.equal(left.offset,2);assert.equal(right.offset,5);
 assert.equal(effectiveDuration(left),3);assert.equal(effectiveDuration(right),4);
 assert.equal(src.trimStart,1);assert.equal(src.trimEnd,2);assert.equal(right.id,'b');
 assert.throws(()=>splitClip(src,2,'c'),/marcador/);
});
