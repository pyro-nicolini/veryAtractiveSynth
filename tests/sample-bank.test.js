import test from 'node:test';import assert from 'node:assert/strict';
import {PAD_COUNT,safePadName,copySample,padBounds,waveformPoints,signalQuality} from '../src/sample-bank.js';
function ctx(rate=8000){
 return {createBuffer(channels,length,sampleRate){
  const data=Array.from({length:channels},()=>new Float32Array(length));
  return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,
   getChannelData:i=>data[i],copyToChannel:(values,i)=>data[i].set(values)};
 }};
}
test('sample copies a selected region without changing original samples',()=>{
 const c=ctx(),b=c.createBuffer(1,16000,8000);
 for(let i=0;i<b.length;i++)b.getChannelData(0)[i]=Math.sin(i/10)*.5;
 const x=copySample(c,b,.5,1);
 assert.equal(x.length,4000);
 assert.equal(x.getChannelData(0)[0],b.getChannelData(0)[4000]);
 assert.equal(b.length,16000);
 assert.equal(waveformPoints(x).length,38);
 assert.equal(PAD_COUNT,12);
});
test('empty or silent recordings cannot create blank tracks/pads',()=>{
 const c=ctx(),silence=c.createBuffer(1,8000,8000);
 assert.equal(signalQuality(silence).valid,false);
 const live=c.createBuffer(1,8000,8000);
 live.getChannelData(0).fill(.06);
 assert.equal(signalQuality(live).valid,true);
 assert.throws(()=>padBounds(silence,1,.5));
 assert.equal(safePadName('  Kick  ',0),'Kick');
});

test('can crop phrase from a 90-second source without storing entire source',()=>{
 const c=ctx(),b=c.createBuffer(1,8000*90,8000);
 b.getChannelData(0).set(Float32Array.from({length:8000},(_,i)=>Math.sin(i/20)*.25),160000);
 const cut=copySample(c,b,20,22);assert.equal(cut.duration,2);
 assert.throws(()=>copySample(c,b,0,40),/fragmento/);
});
