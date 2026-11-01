import test from 'node:test';import assert from 'node:assert/strict';
import {PAD_COUNT} from '../src/sample-bank.js';
import {padWaveSVG} from '../src/sample-deck.js';
import {storageRecord} from '../src/sample-pad-store.js';
test('glass pads visualize their PCM waveform and save exact samples',()=>{
 const data=Float32Array.from({length:800},(_,i)=>Math.sin(i/20)*.6);
 const b={duration:.1,length:800,sampleRate:8000,numberOfChannels:1,getChannelData:()=>data};
 const svg=padWaveSVG(b);assert.match(svg,/viewBox="0 0 120 40"/);assert.match(svg,/path d="M/);
 assert.equal(PAD_COUNT,12);
 const saved=storageRecord(b,'Kick',0,.1);
 assert.equal(saved.channels[0][0],data[0]);assert.equal(saved.name,'Kick');
});
