import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveTuneNoteMask,normaliseTuneNoteMask,scaleNoteMask,toggleTuneNote} from '../src/tune-targets.js';
import {tuneLabMarkup} from '../src/tune-lab-ui.js';
import {defaults} from '../src/dsp.js';

test('note matrix follows key and scale, then accepts a nonempty custom selection',()=>{
  const gMajor=scaleNoteMask(7,0);
  assert.equal(gMajor,(1<<7)|(1<<9)|(1<<11)|(1<<0)|(1<<2)|(1<<4)|(1<<6));
  assert.equal(scaleNoteMask(0,2),4095);
  assert.equal(effectiveTuneNoteMask({key:7,scale:0}),gMajor);
  const custom=toggleTuneNote(gMajor,1);
  assert.equal(custom,gMajor|(1<<1));
  assert.equal(toggleTuneNote(1,0),1,'the final allowed note must stay on');
  assert.equal(normaliseTuneNoteMask(0),null);
  assert.equal(normaliseTuneNoteMask(4096),null);
  const html=tuneLabMarkup({...defaults(),key:7,tuneNoteMask:custom});
  assert.equal((html.match(/data-tune-note=/g)||[]).length,12);
  assert.match(html,/MODO PERSONALIZADO/);
  assert.match(html,/data-tune-note="1" aria-pressed="true"/);
});
