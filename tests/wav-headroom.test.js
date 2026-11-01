import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/dsp.js';
test('IEEE 32-bit float exports preserve source headroom above 0 dBFS',async()=>{
 const buffer={sampleRate:8000,length:3,numberOfChannels:1,getChannelData:()=>Float32Array.of(-1.25,.25,1.5)};
 const floatFile=await encodeWav(buffer,32).arrayBuffer(),floatView=new DataView(floatFile);
 assert.ok(Math.abs(floatView.getFloat32(44,true)-(-1.25))<1e-6);
 assert.ok(Math.abs(floatView.getFloat32(52,true)-1.5)<1e-6);
 const pcmFile=await encodeWav(buffer,16).arrayBuffer(),pcmView=new DataView(pcmFile);
 assert.equal(pcmView.getInt16(44,true),-32768);
 assert.equal(pcmView.getInt16(48,true),32767);
});
