import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineSpan,pointerTime,snappedTime,setOffset,adjustTrim,beatsForSpan} from '../src/timeline.js';
test('timeline leaves room to move clips to the right',()=>{
  const tracks=[{buffer:{duration:8},offset:0,trimStart:0,trimEnd:0}];
  assert.equal(timelineSpan(tracks),20);
  assert.equal(pointerTime(90,{left:10,width:100},20),16);
  assert.equal(pointerTime(-50,{left:10,width:100},20),0);
});
test('snap turns time into simple beats',()=>{
  assert.equal(snappedTime(1.13,120,true),1);
  assert.equal(snappedTime(1.13,120,false),1.13);
  const t={buffer:{duration:10},offset:0,trimStart:0,trimEnd:0};
  assert.equal(setOffset(t,1.26,120,true),1.5);
});
test('trims always retain nonnegative audible duration',()=>{
  const t={buffer:{duration:10},trimStart:3,trimEnd:2,fadeIn:4,fadeOut:4};
  adjustTrim(t,'start',9);
  assert.ok(t.trimStart+t.trimEnd<=9.981);
  assert.ok(t.fadeIn<=10-t.trimStart-t.trimEnd);
});
test('beat markers include downbeats',()=>{
  const beats=beatsForSpan(3,120);
  assert.equal(beats[0].second,0);assert.equal(beats[4].second,2);
  assert.equal(beats[4].strong,true);
});
