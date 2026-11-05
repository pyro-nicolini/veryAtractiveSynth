import test from 'node:test';import assert from 'node:assert/strict';
import {beatSeconds,quantizeOffset,quantizeClip} from '../src/loop-quantize.js';
test('quantizes offsets to a musical subdivision without mutating the clip',()=>{
  assert.equal(beatSeconds(120,4),.5);assert.equal(quantizeOffset(.37,120,4),.5);
  const clip={id:'x',offset:.37};const next=quantizeClip(clip,120,4);assert.equal(next.offset,.5);assert.equal(clip.offset,.37);
});
