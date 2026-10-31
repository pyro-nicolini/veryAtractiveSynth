import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestNote,clock,encodeWav,projectDuration,effectiveDuration,defaults,synthBeat,safeFilename} from '../src/dsp.js';
test('notes align with selected musical scale',()=>{
  assert.equal(nearestNote(61,0,0),60); // C# -> C major
  assert.equal(nearestNote(63,0,1),63); // Eb in C minor
  assert.equal(nearestNote(61,0,2),61); // chromatic
});
test('timing handles offsets and trims',()=>{
  const a={buffer:{duration:10},offset:4,trimStart:2,trimEnd:1};
  assert.equal(effectiveDuration(a),7);assert.equal(projectDuration([a]),11);
  assert.equal(clock(125.2),'02:05');
});
test('WAV encodes correct RIFF header and sizes',async()=>{
  const buffer={sampleRate:48000,numberOfChannels:2,length:5,getChannelData:c=>new Float32Array(5).fill(c?.4:-.4)};
  for(const depth of [16,24,32]){
    const blob=encodeWav(buffer,depth),bytes=new DataView(await blob.arrayBuffer());
    assert.equal(bytes.getUint32(4,true),36+5*2*(depth/8));assert.equal(bytes.getUint32(24,true),48000);
    assert.equal(bytes.getUint16(34,true),depth);assert.equal(bytes.getUint16(22,true),2);
  }
});
test('beat is deterministic and sound is not silent',()=>{
  const [l,r]=synthBeat(8000,120,2);
  assert.equal(l.length,32000);assert.equal(r.length,32000);
  assert.ok(l.some(x=>Math.abs(x)>.01));assert.ok(r.some(x=>Math.abs(x)>.01));
});
test('friendly defaults and safe filenames',()=>{
  assert.equal(defaults().muted,false);
  assert.equal(safeFilename('../test& hi?'),'test-hi');
});
