import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/dsp.js';
import {decodeWav,isWav} from '../src/audio-import.js';
const ctx={createBuffer:(ch,length,rate)=>{
 const c=Array.from({length:ch},()=>new Float32Array(length));
 return {sampleRate:rate,length,numberOfChannels:ch,getChannelData:i=>c[i]};
}};
test('round-trip WAV 16, 24, and float32 bit stereo even without browser decoder',async()=>{
 const audio={sampleRate:48000,numberOfChannels:2,length:4,getChannelData:channel=>new Float32Array(channel?[.1,-.2,.3,-.4]:[0,.5,-.5,1])};
 for(const depth of [16,24,32]){
  const bytes=new Uint8Array(await encodeWav(audio,depth).arrayBuffer());
  assert.equal(isWav(bytes),true);
  const decoded=decodeWav(bytes,ctx);
  assert.equal(decoded.numberOfChannels,2);
  assert.equal(decoded.sampleRate,48000);
  assert.equal(decoded.length,4);
  for(let c=0;c<2;c++)for(let i=0;i<4;i++)
    assert.ok(Math.abs(decoded.getChannelData(c)[i]-audio.getChannelData(c)[i])<=.00005);
 }
});
test('rejects truncated or invalid RIFF safely',()=>{
 assert.equal(isWav(new Uint8Array(5)),false);
 assert.throws(()=>decodeWav(new Uint8Array(8),ctx),/No es/);
});
test('handles unsigned 8-bit PCM',()=>{
 const bytes=new Uint8Array(48),v=new DataView(bytes.buffer);
 ['RIFF','WAVE','fmt ','data'].forEach((chunk,index)=>{
  const at=[0,8,12,36][index];for(let i=0;i<4;i++)bytes[at+i]=chunk.charCodeAt(i);
 });
 v.setUint32(4,40,true);v.setUint32(16,16,true);v.setUint16(20,1,true);
 v.setUint16(22,1,true);v.setUint32(24,8000,true);
 v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);
 v.setUint32(40,4,true);bytes.set([0,128,255,128],44);
 const out=decodeWav(bytes,ctx).getChannelData(0);
 assert.ok(out[0]<-.99);assert.equal(out[1],0);assert.ok(out[2]>.98);
});
