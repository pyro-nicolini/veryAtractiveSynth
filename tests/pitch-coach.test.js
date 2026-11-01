import test from 'node:test';import assert from 'node:assert/strict';
import {estimateNote,solfege,noteRegions,setNoteMask,autoTuneSegments} from '../src/pitch-coach.js';
test('singing coach reads the DO RE MI LA sequence from synthetic steady voice',()=>{
 const sr=16000;
 for(const [hz,name] of [[261.63,'DO'],[293.66,'RE'],[329.63,'MI'],[349.23,'FA'],[392,'SOL'],[440,'LA'],[493.88,'SI']]){
  const wave=Float32Array.from({length:4096},(_,i)=>Math.sin(2*Math.PI*hz*i/sr)*.6);
  const p=estimateNote(wave,sr);assert.ok(p,name);assert.equal(p.name,name);
 }
 assert.equal(estimateNote(new Float32Array(4096),sr),null);
 assert.equal(solfege(60),'DO');
});
test('note masks store source-time ranges without touching PCM',()=>{
 const buffer={duration:6},clip={buffer};
 setNoteMask(clip,1,2,5);assert.deepEqual(clip.pitchRegions.map(r=>r.semitones),[5]);
 setNoteMask(clip,1,2,-3);assert.equal(clip.pitchRegions.length,1);
 setNoteMask(clip,1.25,1.5,6);
 assert.equal(clip.pitchRegions.length,3);
 assert.deepEqual(clip.pitchRegions.map(r=>r.semitones),[-3,6,-3]);
 assert.throws(()=>setNoteMask(clip,1,10,1),/fragmento/);
});
test('offline scan returns bounded intervals, preset target range and mode',()=>{
 const rate=16000,buffer={duration:2,sampleRate:rate,numberOfChannels:1,
  getChannelData:()=>Float32Array.from({length:32000},(_,i)=>Math.sin(2*Math.PI*440*i/rate)*.4)};
 const regions=noteRegions(buffer,{step:.5,maxRegions:4});
 assert.ok(regions.length>0);
 const clip={buffer};autoTuneSegments(clip,regions,'studio',0,0);
 assert.equal(clip.autoTuneMode,'studio');
 assert.ok(clip.pitchRegions.every(p=>p.semitones>=-4&&p.semitones<=4));
});
