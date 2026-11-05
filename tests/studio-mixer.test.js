import test from 'node:test';
import assert from 'node:assert/strict';
import {BUS_IDS,busForTrack,sanitiseBuses,percentToDb,dbToPercent,formatDb,meterStats} from '../src/studio-mixer.js';
test('mixer defaults remain backwards compatible',()=>{
 assert.deepEqual(BUS_IDS,['music','vocals','samples','fx']);
 assert.equal(busForTrack({type:'voice'}),'vocals');
 assert.equal(busForTrack({type:'audio'}),'music');
 assert.equal(busForTrack({type:'voice',bus:'fx'}),'fx');
 assert.deepEqual(sanitiseBuses({music:50,vocals:-15,fx:999}),{music:50,vocals:0,samples:100,fx:100});
 assert.equal(busForTrack({type:'audio',bus:'samples'}),'samples');
});
test('channel gain dB mapping is stable and handles silence',()=>{
 assert.equal(percentToDb(0),null);
 assert.equal(formatDb(0),'−∞ dB');
 assert.equal(formatDb(100),'0.0 dB');
 assert.ok(Math.abs(percentToDb(dbToPercent(-6))-(-6))<.05);
 assert.equal(dbToPercent(-Infinity),0);
});
test('meters handle peaks, silence, negative waveforms and nonfinite input',()=>{
 const m=meterStats(Float32Array.of(-.5,.5,-.25,.25));
 assert.equal(m.peak,.5);
 assert.ok(m.rms>0&&m.db<0);
 assert.equal(meterStats([]).db,null);
 assert.equal(meterStats([NaN,0]).peak,0);
});
