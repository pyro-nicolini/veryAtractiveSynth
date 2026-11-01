import test from 'node:test';
import assert from 'node:assert/strict';
import {tuneLabMarkup,loadUserTunes,saveUserTune,USER_TUNE_KEY} from '../src/tune-lab-ui.js';
import {defaults} from '../src/dsp.js';
test('XY interface has draggable pad, two accessible axes and six clickable destinations',()=>{
  const markup=tuneLabMarkup({...defaults(),name:'Voz'});
  assert.match(markup,/id="tunePad"/);
  assert.match(markup,/tabindex="0"/);
  assert.match(markup,/id="labNode"/);
  assert.match(markup,/data-tune-axis="x"/);
  assert.match(markup,/data-tune-axis="y"/);
  assert.equal((markup.match(/data-tune-preset=/g)||[]).length,12); // six nodes + six buttons
  for(const action of ['tune-preview','tune-surprise','tune-ab','tune-reset','tune-save'])
    assert.ok(markup.includes('data-action="'+action+'"'));
});
test('custom styles are local only and escaped before HTML injection',()=>{
  const data=new Map();
  globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  const entry=saveUserTune('<svg/onload=alert(1)>',.45,.55);
  assert.equal(entry.x,.45);
  assert.equal(loadUserTunes().length,1);
  assert.ok(data.get(USER_TUNE_KEY));
  const rendered=tuneLabMarkup(defaults(),loadUserTunes());
  assert.ok(!rendered.includes('<svg/onload'));
  assert.ok(rendered.includes('&lt;svg'));
  assert.throws(()=>saveUserTune('  ',0,0),/nombre/);
});
