import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/dsp.js';
import {exportProject,importProject} from '../src/portable-project.js';
function context(){return {createBuffer:(channels,length,sampleRate)=>{
 const data=Array.from({length:channels},()=>new Float32Array(length));
 return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,
 getChannelData:i=>data[i],copyToChannel:(samples,i)=>data[i].set(samples)};
}}}
test('project roundtrip stores clip speed, pitch masks, and voice character',async()=>{
 const ctx=context(),audio=ctx.createBuffer(1,16000,8000);
 const track={...defaults(),id:'one',name:'Voz afinada',type:'voice',color:'#a5ff73',
   buffer:audio,pitchShift:-5,voiceCharacter:'monster',flowHidden:true};
 track.clips=[{id:'clip1',name:'Frase',buffer:audio,offset:3,trimStart:0,trimEnd:0,
   speed:1.5,pitchRegions:[{from:.3,to:.9,semitones:-2.5}]}];
 const bytes=await exportProject([track],85,{zoom:4});
 const result=await importProject(bytes,ctx);
 assert.equal(result.tracks[0].pitchShift,-5);
 assert.equal(result.tracks[0].voiceCharacter,'monster');
 assert.equal(result.tracks[0].clips[0].speed,1.5);
 assert.equal(result.tracks[0].clips[0].pitchRegions[0].semitones,-2.5);
 assert.equal(result.options.zoom,4);
});
