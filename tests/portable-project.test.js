import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/dsp.js';
import {decodeProjectWav,exportProject,importProject} from '../src/portable-project.js';
import {zipStore,unzipStore} from '../src/zip-store.js';
test('Project WAV 32-bit float can be restored without browser codecs',async()=>{
  const sound={sampleRate:48000,numberOfChannels:1,length:4,
    getChannelData:()=>Float32Array.of(0,.125,-.5,.75)};
  const wave=new Uint8Array(await encodeWav(sound,32).arrayBuffer());
  const ctx={createBuffer:(channels,frames,rate)=>{
    assert.equal(channels,1);assert.equal(rate,48000);
    const data=new Float32Array(frames);
    return {length:frames,getChannelData:()=>data};
  }};
  const restored=decodeProjectWav(wave,ctx);
  assert.deepEqual(Array.from(restored.getChannelData(0)),[0,.125,-.5,.75]);
});

test('portable project preserves pad audio and selection and old projects do not replace pads',async()=>{
 const ctx={createBuffer:(channels,length,sampleRate)=>{
  const data=Array.from({length:channels},()=>new Float32Array(length));
  return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,getChannelData:i=>data[i]};
 }};
 const sound=ctx.createBuffer(1,8000,8000);sound.getChannelData(0)[7]=.75;
 const tracks=[{id:'t1',name:'Track',type:'audio',buffer:sound}];
 const pads=Array(12).fill(null);pads[3]={buffer:sound,name:'Kick',fx:'original',from:.1,to:.9};
 const library=[{buffer:sound,name:'Sample largo con nombre para conservar más de treinta y seis',fx:'original',from:0,to:1}];
 const result=await importProject(await exportProject(tracks,85,{},pads,library),ctx);
 assert.equal(result.pads.length,12);assert.equal(result.pads[3].name,'Kick');
 assert.equal(result.pads[3].from,.1);assert.equal(result.pads[3].to,.9);
 assert.equal(result.pads[3].buffer.getChannelData(0)[7],.75);
 assert.equal(result.pads[3].buffer,result.tracks[0].buffer);
 assert.equal(result.sampleLibrary[0].name,library[0].name);
 assert.equal(result.sampleLibrary[0].buffer,result.tracks[0].buffer);
 assert.equal((await importProject(await exportProject(tracks,85,{}),ctx)).pads,undefined);
 const entries=await unzipStore(await exportProject(tracks,85,{},pads));
 const manifest=JSON.parse(new TextDecoder().decode(entries.get('project.json')));manifest.pads[3].to=999;
 entries.set('project.json',new TextEncoder().encode(JSON.stringify(manifest)));
 await assert.rejects(importProject(await zipStore([...entries].map(([name,data])=>({name,data}))),ctx),/pad inválido/);
});

test('oversized backups are rejected before copying or encoding audio',async()=>{
 let read=false;
 const large={sampleRate:192000,numberOfChannels:2,length:192000*1199,getChannelData(){read=true;throw Error('PCM was read');}};
 await assert.rejects(exportProject([{id:'long',buffer:large}],85),/550 MB/);
 assert.equal(read,false);
 const tooLong={...large,length:192000*1201};
 await assert.rejects(exportProject([{id:'long',buffer:tooLong}],85),/20 minutos/);
});
