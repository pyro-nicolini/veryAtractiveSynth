import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/worklets/voice-processor.js',import.meta.url),'utf8');
function processor(){
  let Type;
  class StubProcessor{
    constructor(){
      this.events=[];
      this.port={onmessage:null,postMessage:data=>this.events.push(data)};
    }
  }
  runInNewContext(source,{AudioWorkletProcessor:StubProcessor,registerProcessor:(name,klass)=>{
    assert.equal(name,'vas-voice');Type=klass;
  },Float32Array,Math,sampleRate:48000});
  return new Type();
}
test('worklet sends pitch telemetry only when explicitly enabled, and still processes sound',()=>{
  const voice=processor();
  const params={strength:[.85],retune:[.7],clean:[0],key:[0],scale:[2]};
  const feed=(blocks)=>{
    for(let b=0;b<blocks;b++){
      const left=new Float32Array(128),right=new Float32Array(128),output=[new Float32Array(128),new Float32Array(128)];
      for(let i=0;i<128;i++){
        const time=(b*128+i)/48000;
        left[i]=right[i]=.65*Math.sin(2*Math.PI*440*time);
      }
      voice.process([[left,right]],[output],params);
      assert.ok(output[0].every(Number.isFinite));
    }
  };
  feed(40);
  assert.equal(voice.events.length,0,'telemetry must be off by default');
  voice.port.onmessage({data:{type:'monitor',enabled:true}});
  feed(96);
  const detections=voice.events.filter(x=>x.type==='pitch'&&x.voiced);
  assert.ok(detections.length>0,'audible A440 should produce detected pitch');
  assert.ok(detections.some(x=>Math.abs(x.frequency-440)<30));
  assert.ok(detections.every(x=>Number.isFinite(x.cents)&&x.confidence>.57));
  voice.port.onmessage({data:{type:'monitor',enabled:false}});
  const old=voice.events.length;
  feed(40);
  assert.equal(voice.events.length,old,'telemetry must stop immediately when disabled');
});
test('silence reports no confident note rather than fictional target',()=>{
  const voice=processor();voice.port.onmessage({data:{type:'monitor',enabled:true}});
  const params={strength:[0],retune:[0],clean:[0],key:[0],scale:[0]};
  for(let i=0;i<64;i++){
    const silent=new Float32Array(128);
    voice.process([[silent]],[ [new Float32Array(128),new Float32Array(128)] ],params);
  }
  assert.ok(voice.events.some(x=>x.type==='pitch'&&x.voiced===false));
});
