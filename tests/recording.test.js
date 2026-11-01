import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {assembleRecording,meterLevel,audioFileHint,preferredAudioMime} from '../src/recording-utils.js';
test('mono recording preserves every chunk, including short final chunk',()=>{
  const ctx={sampleRate:48000,createBuffer:(channels,frames,rate)=>{
    assert.equal(channels,1); assert.equal(rate,48000);
    const data=new Float32Array(frames); return {length:frames,getChannelData:()=>data};
  }};
  const recording=assembleRecording(ctx,[Float32Array.of(.5,-.3),Float32Array.of(.25)],3);
  assert.deepEqual(Array.from(recording.getChannelData(0)).map(x=>Math.round(x*100)),[50,-30,25]);
  assert.throws(()=>assembleRecording(ctx,[Float32Array.of(1)],2),/Faltan muestras/);
});
test('meter measures visible microphone input',()=>{
  const level=meterLevel(Float32Array.of(0,.5,-.5,0));
  assert.equal(level.peak,.5);assert.ok(level.rms>.3);
  assert.deepEqual(meterLevel(new Float32Array(0)),{rms:0,peak:0});
});
test('phone import failure has actionable local alternatives',()=>{
  assert.match(audioFileHint({name:'whatsapp.opus'}),/WAV PCM/);
  assert.match(audioFileHint({name:'iPhone.m4a'}),/WAV PCM/);
});
test('MIME preference follows browser capabilities',()=>{
  assert.equal(preferredAudioMime({isTypeSupported:s=>s==='audio/webm;codecs=opus'}),'audio/webm;codecs=opus');
});
test('capture worklet flushes PCM and returns sample-accurate frame count',()=>{
  let Capture;
  const src=readFileSync(new URL('../src/worklets/capture-processor.js',import.meta.url),'utf8');
  runInNewContext(src,{AudioWorkletProcessor:class{constructor(){this.port={onmessage:null,postMessage:(m)=>this.messages.push(m)};this.messages=[]}},registerProcessor:(n,c)=>{assert.equal(n,'vas-capture');Capture=c;},Float32Array,Math});
  const p=new Capture(),a=Float32Array.from({length:128},()=>.25);
  p.process([[a]],[[new Float32Array(128)]]);
  p.port.onmessage({data:{type:'stop'}});
  const chunks=p.messages.filter(x=>x.type==='chunk'),done=p.messages.find(x=>x.type==='complete');
  assert.equal(done.frames,128);assert.equal(chunks.length,1);assert.equal(chunks[0].samples.length,128);
});
