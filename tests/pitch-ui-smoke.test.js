import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Tune Lab shows actual pitch telemetry and recording has optional countdown',()=>{
  const ui=read('src/tune-lab-ui.js'),app=read('src/app.js'),engine=read('src/engine.js'),sw=read('sw.js');
  for(const id of ['labPitchNote','labPitchHz','labPitchTarget','labPitchCents','labPitchNeedle','labPitchStatus'])
    assert.ok(ui.includes('id="'+id+'"'),id);
  assert.ok(app.includes('id="recordCountIn"'));
  assert.ok(app.includes('cancel-countin'));
  assert.ok(engine.includes('watchPitch(trackId,callback)'));
  assert.ok(engine.includes('async countIn(bpm=104,beats=4'));
  assert.ok(sw.includes('src/pitch-display.js'));
});
