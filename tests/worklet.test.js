import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const code=readFileSync(new URL('../src/worklets/voice-processor.js',import.meta.url),'utf8');
test('voice worklet registers and processes buffers without NaNs',()=>{
  let Voice;
  runInNewContext(code,{
    AudioWorkletProcessor:class{},
    registerProcessor:(name,klass)=>{assert.equal(name,'vas-voice');Voice=klass;},
    sampleRate:48000,Float32Array,Math
  });
  const p=new Voice();let outRms=0;
  const params={strength:[.7],retune:[.8],clean:[0],key:[0],scale:[0]};
  for(let block=0;block<100;block++){
    const input=[new Float32Array(128),new Float32Array(128)];
    for(let i=0;i<128;i++){const t=(block*128+i)/48000;input[0][i]=.3*Math.sin(2*Math.PI*470*t);input[1][i]=input[0][i];}
    const output=[new Float32Array(128),new Float32Array(128)];
    assert.equal(p.process([[...input]],[[...output]],params),true);
    assert.ok(output[0].every(Number.isFinite));outRms+=output[0].reduce((s,v)=>s+v*v,0);
  }
  assert.ok(outRms>1);
  assert.ok(p.targetRatio>.65&&p.targetRatio<1.46);
});
