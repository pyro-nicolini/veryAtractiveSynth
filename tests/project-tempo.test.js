import test from 'node:test';
import assert from 'node:assert/strict';
import {retimeProject} from '../src/project-tempo.js';
import {clipsOf,clipDuration} from '../src/track-clips.js';
import {scheduleClip} from '../src/engine.js';

test('changing BPM retimes a legacy track and other clips together without changing source audio',()=>{
  const buffer={duration:8};
  const tracks=[{id:'v',name:'voice',buffer,offset:2,speed:1,fadeIn:1,pitchRegions:[{from:1,to:2,semitones:1}],
    automation:{pitchShift:[{time:4,value:2}]}},
    {id:'beat',buffer,clips:[{id:'beat-1',buffer,offset:4,speed:.8,fadeOut:2}]}];
  const factor=retimeProject(tracks,100,125);
  assert.equal(factor,1.25);
  const voice=clipsOf(tracks[0])[0],beat=tracks[1].clips[0];
  assert.equal(voice.buffer,buffer);assert.equal(voice.speed,1.25);
  assert.equal(voice.offset,1.6);assert.equal(clipDuration(voice),6.4);
  assert.equal(voice.pitchRegions[0].from,1);
  assert.equal(beat.speed,1);assert.equal(beat.offset,3.2);
  assert.equal(tracks[0].automation.pitchShift[0].time,3.2);
  retimeProject(tracks,125,100);
  assert.equal(voice.speed,1);assert.equal(voice.offset,2);
});
test('an invalid change leaves every clip unchanged',()=>{
  const buffer={duration:3},tracks=[{id:'a',buffer,speed:1},{id:'b',buffer,clips:[{id:'b1',buffer,speed:2,offset:3}]}];
  assert.throws(()=>retimeProject(tracks,100,150),/límite/);
  assert.equal(tracks[0].clips,undefined);assert.equal(tracks[1].clips[0].speed,2);
});
test('retimed clip actually schedules a faster Web Audio source at the synchronized time',()=>{
  const buffer={duration:8},track={id:'t',name:'base',buffer,offset:2,speed:1,trimStart:0,trimEnd:0};
  retimeProject([track],100,125);
  const clip=clipsOf(track)[0],events=[];
  const param={setValueAtTime:(value,time)=>events.push(['set',value,time]),linearRampToValueAtTime:()=>{}};
  const ctx={createBufferSource:()=>({playbackRate:{setValueAtTime:(value,time)=>events.push(['rate',value,time])},connect(){},start:(...args)=>events.push(['start',...args]),stop(){}}),createGain:()=>({gain:param,connect(){}})};
  scheduleClip(ctx,clip,{input:{}},0,10);
  assert.deepEqual(events.find(x=>x[0]==='rate'),['rate',1.25,11.6]);
  assert.deepEqual(events.find(x=>x[0]==='start'),['start',11.6,0,8]);
});
