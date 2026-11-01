import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeCaf,isCaf} from '../src/audio-import.js';
const ctx={createBuffer:(channels,length,rate)=>{
  const data=Array.from({length:channels},()=>new Float32Array(length));
  return {sampleRate:rate,length,numberOfChannels:channels,getChannelData:c=>data[c]};
}};
function makeCaf({codec='lpcm',flags=14,bits=16,channels=1}={}){
  const size=8+12+32+12+4+8,bytes=new Uint8Array(size),view=new DataView(bytes.buffer);
  const tag=(i,s)=>{for(let j=0;j<4;j++)bytes[i+j]=s.charCodeAt(j);};
  tag(0,'caff');view.setUint16(4,1,false);
  tag(8,'desc');view.setBigInt64(12,32n,false);
  view.setFloat64(20,48000,false);tag(28,codec);
  view.setUint32(32,flags,false);view.setUint32(36,channels*bits/8,false);
  view.setUint32(40,1,false);view.setUint32(44,channels,false);view.setUint32(48,bits,false);
  tag(52,'data');view.setBigInt64(56,12n,false);
  view.setUint32(64,0,false);
  view.setInt16(68,16384,true);view.setInt16(70,-16384,true);
  view.setInt16(72,0,true);view.setInt16(74,32767,true);
  return bytes;
}
test('CAF LPCM little-endian 16-bit mono decode on device',()=>{
  const bytes=makeCaf();
  assert.ok(isCaf(bytes));
  const b=decodeCaf(bytes,ctx);
  assert.equal(b.numberOfChannels,1);assert.equal(b.length,4);
  const x=b.getChannelData(0);
  assert.equal(x[0],.5);assert.equal(x[1],-.5);
  assert.ok(x[3]>.99);
});
test('CAF compressed codec cannot be claimed as supported',()=>{
  assert.throws(()=>decodeCaf(makeCaf({codec:'alac'}),ctx),/comprimido/);
});
test('CAF parser rejects malformed chunks',()=>{
  const bytes=makeCaf();
  bytes[56]=255;
  assert.throws(()=>decodeCaf(bytes,ctx),/Chunk CAF inválido/);
});
