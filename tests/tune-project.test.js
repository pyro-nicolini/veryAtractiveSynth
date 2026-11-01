import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/dsp.js';
import {exportProject,importProject} from '../src/portable-project.js';
import {applyTunePoint} from '../src/tune-lab.js';
function makeContext(){
  return {createBuffer(channels,length,sampleRate){
    const data=Array.from({length:channels},()=>new Float32Array(length));
    return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,
      getChannelData:channel=>data[channel],copyToChannel:(values,channel)=>data[channel].set(values)};
  }};
}
test('portable project keeps Tune Lab coordinates and real DSP knobs across roundtrip',async()=>{
  const ctx=makeContext(),buffer=ctx.createBuffer(1,100,8000);
  buffer.getChannelData(0)[1]=.4;
  const track={...defaults(),id:'lead',name:'Voz principal',type:'voice',color:'#a5ff73',buffer};
  applyTunePoint(track,.48,.77,'user:Mi Voz Alien');
  track.key=4;track.clean=61;track.volume=75;
  const original={...track};
  const blob=await exportProject([track],85,{bpm:130});
  assert.ok(blob.size>44);
  const restored=await importProject(blob,ctx);
  assert.equal(restored.tracks.length,1);
  const result=restored.tracks[0];
  for(const key of ['tuneX','tuneY','tunePreset','autotune','retune','drive','brightness','warmth','clean','key','volume'])
    assert.equal(result[key],original[key],key);
  assert.equal(restored.options.bpm,130);
  assert.ok(Math.abs(result.buffer.getChannelData(0)[1]-.4)<.00001);
});
