import test from 'node:test';
import assert from 'node:assert/strict';
import {setClipLoop,clipDuration,clipsOf,validLoop,removeClipLoop,duplicateLoop,cloneTrackMetadata} from '../src/track-clips.js';
import {projectDuration} from '../src/dsp.js';
const buffer={duration:10,sampleRate:48000};
test('loop targets a trimmed source region, does not change the original audio',()=>{
 const t={id:'a',name:'Voz',buffer,offset:4,trimStart:1,trimEnd:1};
 const clip=clipsOf(t)[0];
 setClipLoop(clip,2,3.5,8);
 assert.equal(clipDuration(clip),12);
 assert.equal(clip.buffer,buffer);
 assert.deepEqual(clip.loop,{from:2,to:3.5,repeats:8});
 assert.throws(()=>setClipLoop(clip,0,3,4),/fragmento válido/);
 assert.throws(()=>setClipLoop(clip,2,3,100),/fragmento válido/);
 assert.throws(()=>setClipLoop(clip,2,2.005,4),/fragmento válido/);
 removeClipLoop(clip);assert.equal(clipDuration(clip),8);
});
test('clip loops do not interrupt timing of independent tracks',()=>{
 const a={id:'a',name:'Beat',buffer,offset:0,trimStart:0,trimEnd:0};
 const b={id:'b',name:'Base larga',buffer:{duration:30},offset:0};
 const clip=clipsOf(a)[0];setClipLoop(clip,0,1,20);
 a.clips=[clip];
 assert.equal(projectDuration([a,b]),30);
 assert.equal(projectDuration([a]),20);
 assert.equal(clipDuration(clipsOf(b)[0]),30);
});
test('duplicate repeat clips references original PCM without extra files',()=>{
 const track={id:'voice',name:'Voz',buffer,offset:0};
 const first=clipsOf(track)[0];setClipLoop(first,2,4,3);track.clips=[first];
 const copies=duplicateLoop(track,first.id,2,i=>'c'+i);
 assert.equal(track.clips.length,3);
 assert.deepEqual(copies.map(c=>c.offset),[6,12]);
 assert.ok(copies.every(c=>c.buffer===buffer));
 const snap=cloneTrackMetadata(track);
 snap.clips[0].loop.repeats=11;
 assert.equal(track.clips[0].loop.repeats,3,'undo snapshot must deeply copy loop metadata');
 assert.throws(()=>duplicateLoop(track,first.id,17,()=>''),/16/);
});
