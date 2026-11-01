import test from 'node:test';
import assert from 'node:assert/strict';
import {exportProject,importProject} from '../src/portable-project.js';
import {setClipLoop,duplicateLoop,clipsOf,clipDuration} from '../src/track-clips.js';
import {projectDuration} from '../src/dsp.js';
function ctx(){return {createBuffer:(channels,length,sampleRate)=>{
 const data=Array.from({length:channels},()=>new Float32Array(length));
 return {length,numberOfChannels:channels,sampleRate,duration:length/sampleRate,
 getChannelData:c=>data[c],copyToChannel:(values,c)=>data[c].set(values)};
}}}
test('loop fragments and duplicates persist through .vasproject with source dedupe',async()=>{
 const context=ctx(),buffer=context.createBuffer(2,480000,48000);
 buffer.getChannelData(0)[20]=.65;
 const track={id:'main',name:'Loops',type:'audio',color:'#a5ff73',buffer,offset:0};
 const [first]=clipsOf(track);track.clips=[first];setClipLoop(first,2,3,4);
 const copies=duplicateLoop(track,first.id,2,i=>'copy'+i);
 assert.deepEqual(copies.map(c=>c.offset),[4,8]);
 assert.equal(projectDuration([track]),12);
 const file=await exportProject([track],85,{bpm:110});
 const result=await importProject(file,context);
 assert.equal(result.tracks[0].clips.length,3);
 assert.equal(result.tracks[0].clips[0].loop.repeats,4);
 assert.deepEqual(result.tracks[0].clips.slice(1).map(c=>c.offset),[4,8]);
 assert.strictEqual(result.tracks[0].clips[0].buffer,result.tracks[0].clips[1].buffer);
 assert.equal(clipDuration(result.tracks[0].clips[1]),4);
});
test('AudioWorklet schedule loops one source per repeating clip in both paths',async()=>{
 const {readFileSync}=await import('node:fs');
 const engine=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(engine,/src\.loop=true/);
 assert.match(engine,/src\.loopStart=loop\.from/);
 assert.match(engine,/src\.loopEnd=loop\.to/);
 assert.match(engine,/src\.stop\(contextStart\+remaining\)/);
 assert.match(engine,/for\(const clip of clipsOf\(track\)\)[\s\S]{0,220}scheduleClip\(offline/);
 assert.match(engine,/async startSessionCapture\(\)/);
 assert.match(engine,/async stopSessionCapture\(\)/);
});
