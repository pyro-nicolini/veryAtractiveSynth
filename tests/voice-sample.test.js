import test from 'node:test';
import assert from 'node:assert/strict';
import {saveProcessedVoiceSample} from '../src/voice-sample.js';

test('a standalone vocal sample renders the take and saves the processed audio with its actual settings',async()=>{
  const original={duration:2},processed={duration:2.08};
  const engine={
    async exportMix(tracks,options){
      assert.equal(tracks.length,1);assert.equal(tracks[0].buffer,original);
      assert.equal(tracks[0].autotune,75);assert.equal(tracks[0].tuneNoteMask,5);
      assert.equal(tracks[0].pitchCalibration,-4);assert.equal(tracks[0].offset,0);
      assert.deepEqual(options,{depth:32,rate:48000});
      return new Blob(['processed']);
    },
    async decode(file){assert.equal(await file.text(),'processed');return processed;}
  };
  let stored;
  const result=await saveProcessedVoiceSample(engine,original,{autotune:75,tuneNoteMask:5,pitchCalibration:-4},'Mi voz',async value=>(stored=value,{id:'sample-1'}));
  assert.equal(result.id,'sample-1');assert.equal(stored.buffer,processed);
  assert.equal(stored.to,processed.duration);assert.equal(stored.fx,'rendered');
});
