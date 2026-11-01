import test from 'node:test';
import assert from 'node:assert/strict';
import {noteName,pitchReadout} from '../src/pitch-display.js';
test('Spanish musical notes and octave are correctly reported',()=>{
  assert.equal(noteName(60),'Do4');assert.equal(noteName(69),'La4');
  assert.equal(noteName(61),'Do♯4');
});
test('live pitch readout validates telemetry and clamps visual coordinate',()=>{
  const good=pitchReadout({voiced:true,midi:69.12,target:69,cents:12,frequency:443,confidence:.87});
  assert.equal(good.note,'La4');assert.equal(good.target,'La4');assert.equal(good.cents,'+12 cents');
  assert.equal(good.position,56);
  assert.equal(pitchReadout({voiced:true,midi:1e9,target:69,cents:20,frequency:0,confidence:.9}).voiced,false);
  assert.equal(pitchReadout({voiced:false}).status,'SIN NOTA CLARA');
  assert.equal(pitchReadout({voiced:true,midi:70,target:69,cents:500,frequency:450,confidence:.9}).position,100);
});
