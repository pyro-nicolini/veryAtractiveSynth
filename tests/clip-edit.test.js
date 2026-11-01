import test from 'node:test';import assert from 'node:assert/strict';
import {clipSpeed,setClipSpeed,trimClip,moveClip} from '../src/clip-edit.js';
import {clipDuration} from '../src/track-clips.js';
test('non-destructive speed changes timeline duration, not source PCM',()=>{
 const buffer={duration:10},clip={buffer,offset:1,trimStart:2,trimEnd:2};
 assert.equal(clipDuration(clip),6);setClipSpeed(clip,2);assert.equal(clipDuration(clip),3);
 setClipSpeed(clip,.5);assert.equal(clipDuration(clip),12);
 assert.equal(buffer.duration,10);assert.throws(()=>setClipSpeed(clip,10),/Velocidad/);
});
test('each trim edge can be extended back to original without recopying buffer',()=>{
 const clip={buffer:{duration:10},trimStart:3,trimEnd:4};
 trimClip(clip,'start',1);trimClip(clip,'end',0);
 assert.equal(clipDuration(clip),9);moveClip(clip,10);assert.equal(clip.offset,10);
 assert.throws(()=>trimClip(clip,'start',10),/fragmento/);
});
