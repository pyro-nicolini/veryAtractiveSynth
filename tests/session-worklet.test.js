import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/worklets/session-processor.js',import.meta.url),'utf8');
function instance(limitFrames=1024){
  let Processor;
  class Stub{constructor(){this.messages=[];this.port={onmessage:null,postMessage:(msg)=>this.messages.push(msg)};}}
  runInNewContext(source,{AudioWorkletProcessor:Stub,sampleRate:48000,
    registerProcessor:(name,C)=>{assert.equal(name,'vas-session-capture');Processor=C;},Float32Array,Math,Number});
  return new Processor({processorOptions:{limitFrames}});
}
function block(n=128){return [[Float32Array.from({length:n},(_,i)=>i/n),
  Float32Array.from({length:n},(_,i)=>-i/n)]];}
test('stereo master capture preserves each channel and flushes last partial block',()=>{
 const p=instance(1000);
 p.process(block(128),[[new Float32Array(128),new Float32Array(128)]]);
 p.port.onmessage({data:{type:'stop'}});
 const chunks=p.messages.filter(m=>m.type==='chunk');
 assert.equal(chunks.length,1);
 assert.equal(chunks[0].frames,128);
 assert.equal(chunks[0].left.length,128);
 assert.ok(chunks[0].left[100]>.7&&chunks[0].right[100]<-.7);
 assert.equal(p.messages.at(-1).frames,128);
 p.port.onmessage({data:{type:'stop'}});
 assert.equal(p.messages.filter(m=>m.type==='complete').length,1);
});
test('session recorder enforces a maximum duration even without UI timers',()=>{
 const p=instance(200);
 p.process(block(),[[new Float32Array(128)]]);
 p.process(block(),[[new Float32Array(128)]]);
 assert.equal(p.frames,200);
 assert.equal(p.active,false);
 assert.equal(p.messages.at(-1).frames,200);
});
