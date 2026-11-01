import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEngine} from '../src/engine.js';
test('count in emits four beats and reports remaining beats',async()=>{
  const engine=new AudioEngine(),beats=[],clicks=[];
  engine.ctx={currentTime:1};
  engine.ready=async()=>engine.ctx;
  engine.scheduleClick=(time,accent)=>clicks.push({time,accent});
  const result=await engine.countIn(240,4,beat=>beats.push(beat));
  assert.equal(result,true);
  assert.deepEqual(beats,[4,3,2,1]);
  assert.equal(clicks.length,4);assert.equal(clicks.filter(x=>x.accent).length,1);
});
test('cancelled count in cannot start microphone capture',async()=>{
  const engine=new AudioEngine(),beats=[];
  engine.ready=async()=>({currentTime:0});engine.scheduleClick=()=>{throw Error('must not click');};
  const result=await engine.countIn(120,4,v=>beats.push(v),()=>true);
  assert.equal(result,false);assert.deepEqual(beats,[]);
});
