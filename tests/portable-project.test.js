import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/dsp.js';
import {decodeProjectWav} from '../src/portable-project.js';
test('Project WAV 32-bit float can be restored without browser codecs',async()=>{
  const sound={sampleRate:48000,numberOfChannels:1,length:4,
    getChannelData:()=>Float32Array.of(0,.125,-.5,.75)};
  const wave=new Uint8Array(await encodeWav(sound,32).arrayBuffer());
  const ctx={createBuffer:(channels,frames,rate)=>{
    assert.equal(channels,1);assert.equal(rate,48000);
    const data=new Float32Array(frames);
    return {length:frames,getChannelData:()=>data};
  }};
  const restored=decodeProjectWav(wave,ctx);
  assert.deepEqual(Array.from(restored.getChannelData(0)),[0,.125,-.5,.75]);
});
