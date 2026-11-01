import test from 'node:test';import assert from 'node:assert/strict';
import {estimateNote} from '../src/pitch-coach.js';
function tone(hz,rate=48000,{harmonic=0,noise=0}={}){
 let seed=12345;
 return Float32Array.from({length:4096},(_,i)=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return .32*Math.sin(2*Math.PI*hz*i/rate)+harmonic*Math.sin(4*Math.PI*hz*i/rate)+noise*((seed/4294967296)*2-1);
 });
}
test('YIN-style live note detector resolves all natural notes at 48 kHz',()=>{
 const notes=[[261.63,'DO'],[293.66,'RE'],[329.63,'MI'],[349.23,'FA'],[392,'SOL'],[440,'LA'],[493.88,'SI']];
 for(const [freq,name] of notes){
  const n=estimateNote(tone(freq));assert.ok(n,'missing '+name);
  assert.equal(n.name,name);assert.equal(n.octave,4);
  assert.ok(Math.abs(n.cents)<8,name+' '+n.cents+' cents');
 }
});
test('fundamentals are retained with strong harmonics and noisy input',()=>{
 const low=estimateNote(tone(220,48000,{harmonic:.35,noise:.015}));
 assert.ok(low);assert.equal(low.name,'LA');assert.equal(low.octave,3);
 assert.equal(estimateNote(new Float32Array(4096)),null);
});
