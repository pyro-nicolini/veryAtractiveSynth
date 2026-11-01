import test from 'node:test';
import assert from 'node:assert/strict';
import {exportProject,importProject} from '../src/portable-project.js';
import {projectDuration} from '../src/dsp.js';
import {addTrackClip,splitTrackClip,ensureClips,clipDuration} from '../src/track-clips.js';
function context(){return {createBuffer:(channels,length,sampleRate)=>{
  const samples=Array.from({length:channels},()=>new Float32Array(length));
  return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,
    getChannelData:i=>samples[i],copyToChannel:(data,i)=>samples[i].set(data)};
}}}
test('multi-clip tracks round-trip with two audio sources and independent offsets',async()=>{
 const ctx=context(),base=ctx.createBuffer(1,8000,8000),second=ctx.createBuffer(1,16000,8000);
 base.getChannelData(0)[20]=.4;second.getChannelData(0)[30]=-.8;
 const track={id:'a',name:'Voz',type:'voice',bus:'vocals',buffer:base,
   offset:0,trimStart:0,trimEnd:0,fadeIn:0,fadeOut:0,volume:85};
 const added=addTrackClip(track,second,12,'another','Otra toma');
 assert.equal(added.offset,12);
 const [left,right]=splitTrackClip(track,'another',13,'split');
 assert.equal(clipDuration(left),1);assert.equal(clipDuration(right),1);
 assert.equal(projectDuration([track]),14);
 const packed=await exportProject([track],70,{buses:{music:75,vocals:60,fx:100}});
 const restored=await importProject(packed,ctx);
 const result=restored.tracks[0];
 assert.equal(result.clips.length,3);
 assert.equal(result.clips[1].offset,12);assert.equal(result.clips[2].offset,13);
 assert.equal(result.clips[1].buffer.getChannelData(0)[30],result.clips[2].buffer.getChannelData(0)[30]);
 assert.equal(result.clips[0].buffer.getChannelData(0)[20],base.getChannelData(0)[20]);
 assert.equal(result.bus,'vocals');
 assert.equal(restored.options.buses.vocals,60);
});
