import test from 'node:test';
import assert from 'node:assert/strict';
import {clipsOf,ensureClips,clipDuration,projectEnd,addTrackClip,getEditableClip,splitTrackClip,cloneTrackMetadata} from '../src/track-clips.js';
const buffer=(duration)=>({duration});
test('legacy track remains playable, nested clips extend project without extra mixer channels',()=>{
 const t={id:'v',name:'Voz',buffer:buffer(10),offset:2,trimStart:1,trimEnd:1};
 assert.equal(clipsOf(t).length,1);assert.equal(projectEnd([t]),10);
 const extra=addTrackClip(t,buffer(4),12,'other','Toma 2');
 assert.equal(extra.offset,12);assert.equal(ensureClips(t).length,2);
 assert.equal(projectEnd([t]),16);
});
test('split preserves original buffer and supports non-destructive undo',()=>{
 const t={id:'v',name:'Voz',buffer:buffer(10),offset:2,trimStart:0,trimEnd:0};
 ensureClips(t);
 const earlier=cloneTrackMetadata(t);
 const [a,b]=splitTrackClip(t,'v:original',6,'v:right');
 assert.equal(a.buffer,b.buffer);assert.equal(clipDuration(a),4);
 assert.equal(clipDuration(b),6);assert.equal(b.offset,6);
 assert.equal(earlier.clips.length,1);
 assert.equal(t.clips.length,2);
 assert.equal(getEditableClip(t,'v:right').id,'v:right');
 assert.throws(()=>splitTrackClip(t,'v:right',6,'bad'),/cabezal/);
});
