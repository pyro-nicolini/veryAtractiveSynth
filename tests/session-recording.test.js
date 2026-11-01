import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleSessionStereo} from '../src/session-recording.js';
import {encodeWav} from '../src/dsp.js';
test('session recorder assembles stereo exactly and produces WAV bytes',async()=>{
 const ctx={sampleRate:48000,createBuffer:(channels,length,sampleRate)=>{
  const data=Array.from({length:channels},()=>new Float32Array(length));
  return {numberOfChannels:channels,length,sampleRate,getChannelData:c=>data[c]};
 }};
 const audio=assembleSessionStereo(ctx,[
  {left:Float32Array.of(.5,.2),right:Float32Array.of(-.5,-.2)},
  {left:Float32Array.of(.9),right:Float32Array.of(-.9)}],3);
 assert.equal(audio.getChannelData(0)[2],Math.fround(.9));
 assert.equal(audio.getChannelData(1)[2],Math.fround(-.9));
 const blob=encodeWav(audio,24),view=new DataView(await blob.arrayBuffer());
 assert.equal(view.getUint16(22,true),2);
 assert.equal(view.getUint32(40,true),3*2*3);
 assert.throws(()=>assembleSessionStereo(ctx,[],8),/perdió muestras/);
});
