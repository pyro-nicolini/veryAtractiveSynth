import test from 'node:test';import assert from 'node:assert/strict';
import {copyClip,pasteClip,pasteAfterClip} from '../src/clip-clipboard.js';
const buffer={duration:4};
test('copy and paste preserves shared PCM while cloning editable metadata',()=>{
 const source={id:'a',name:'Voz',buffer,offset:1,speed:1,loop:{from:1,to:2,repeats:2},pitchRegions:[{from:1,to:1.5,semitones:2}]};
 const track={clips:[source]},saved=copyClip(track,'a');
 const pasted=pasteClip({clips:[]},saved,8,i=>'b');
 assert.equal(pasted.buffer,buffer);assert.notEqual(pasted,saved);assert.notEqual(pasted.loop,saved.loop);assert.notEqual(pasted.pitchRegions,saved.pitchRegions);assert.equal(pasted.offset,8);
});
test('paste after places a clip at the audible end and enforces clip limits',()=>{
 const source={id:'a',name:'Base',buffer,offset:2,trimStart:0,trimEnd:0};const track={clips:[source]};
 const pasted=pasteAfterClip(track,copyClip(track,'a'),'a',()=> 'b');assert.equal(pasted.offset,6);
 const full={clips:Array.from({length:128},(_,i)=>({...source,id:String(i)}))};assert.throws(()=>pasteClip(full,source,0,()=> 'x'),/Límite/);
});
