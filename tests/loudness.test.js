import test from 'node:test';
import assert from 'node:assert/strict';
import {loudnessStats,formatLoudness} from '../src/loudness.js';
function buffer(values,rate=100){return {length:values.length,sampleRate:rate,numberOfChannels:1,getChannelData:()=>Float32Array.from(values)};}
test('loudness meter reports finite integrated loudness and true peak',()=>{
 const stats=loudnessStats(buffer([.5,.5,.5,.5]));
 assert.ok(Number.isFinite(stats.lufs));assert.equal(stats.peak,.5);assert.equal(stats.truePeakDbtp,20*Math.log10(.5));
 assert.match(formatLoudness(stats),/LUFS/);assert.match(formatLoudness(stats),/dBTP/);
});
test('true peak catches intersample overshoot and silence remains bounded',()=>{
 const stats=loudnessStats(buffer([1,-1]));assert.ok(stats.truePeakDbtp>=0);
 const silent=loudnessStats(buffer([0,0]));assert.equal(silent.lufs,-Infinity);assert.equal(silent.truePeakDbtp,-Infinity);
});
