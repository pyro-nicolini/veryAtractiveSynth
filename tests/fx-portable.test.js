import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/dsp.js';
import {exportProject,importProject} from '../src/portable-project.js';
import {toggleTrackFx} from '../src/fx-rack.js';
function context(){return {createBuffer:(channels,length,sampleRate)=>{
 const a=Array.from({length:channels},()=>new Float32Array(length));
 return {numberOfChannels:channels,sampleRate,length,duration:length/sampleRate,
   getChannelData:c=>a[c],copyToChannel:(x,c)=>a[c].set(x)};
}}}
test('individual effect bypass persists without losing knob settings',async()=>{
 const ctx=context(),buffer=ctx.createBuffer(1,100,8000);
 const t={...defaults(),buffer,id:'a',name:'Voz',type:'voice',color:'#a5ff73',clean:80,echo:44,space:50};
 toggleTrackFx(t,'delay');toggleTrackFx(t,'tune');
 const blob=await exportProject([t],90,{bpm:104});
 const restored=(await importProject(blob,ctx)).tracks[0];
 assert.equal(restored.fxBypass.delay,true);
 assert.equal(restored.fxBypass.tune,true);
 assert.equal(restored.fxBypass.reverb,false);
 assert.equal(restored.echo,44);
 assert.equal(restored.clean,80);
});
