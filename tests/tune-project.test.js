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
  track.key=4;track.clean=61;track.volume=75;track.speed=1.4;track.pitchCalibration=-4;track.tuneNoteMask=(1<<4)|(1<<7)|(1<<11);
  const original={...track};
  const blob=await exportProject([track],85,{bpm:130});
  assert.ok(blob.size>44);
  const restored=await importProject(blob,ctx);
  assert.equal(restored.tracks.length,1);
  const result=restored.tracks[0];
  for(const key of ['tuneX','tuneY','tunePreset','autotune','retune','drive','brightness','warmth','clean','key','tuneNoteMask','pitchCalibration','speed','volume'])
    assert.equal(result[key],original[key],key);
  assert.equal(restored.options.bpm,130);
  assert.ok(Math.abs(result.buffer.getChannelData(0)[1]-.4)<.00001);
});

test('v0.4 project imports preserve pitch/retune and locate XY point consistently',async()=>{
  const ctx=makeContext(),buffer=ctx.createBuffer(1,16,8000);
  const track={...defaults(),id:'old-voice',name:'Voz antigua',type:'voice',color:'#a5ff73',buffer,autotune:82,retune:90};
  delete track.tuneX;delete track.tuneY;delete track.tunePreset;
  const file=await exportProject([track],88);
  const loaded=(await importProject(file,ctx)).tracks[0];
  assert.equal(loaded.autotune,82);
  assert.equal(loaded.retune,90);
  assert.ok(Math.abs(loaded.tuneX - ((90-5)/95*2-1))<.02);
  assert.ok(Math.abs(loaded.tuneY-.64)<.001);
});
