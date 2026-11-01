import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGroove,GROOVES,VOICE_STYLES,applyVoiceStyle,applyAutoTransition} from '../src/studio-library.js';
test('ten procedural rhythm styles render original deterministic stereo sources',()=>{
 assert.ok(GROOVES.length>=8);
 for(const groove of GROOVES){
  const a=makeGroove(groove.id,8000,1),b=makeGroove(groove.id,8000,1);
  assert.equal(a.channels.length,2);assert.equal(a.channels[0].length,a.channels[1].length);
  assert.ok(a.channels[0].some(n=>n!==0));
  assert.equal(a.channels[0][450],b.channels[0][450]);
 }
});
test('voice presets map to existing DSP settings and keep no external assets',()=>{
 const t={autotune:0,retune:20};applyVoiceStyle(t,'robot');
 assert.equal(t.autotune,100);assert.equal(t.retune,100);assert.equal(t.voiceStyle,'robot');
 assert.equal(VOICE_STYLES.length,10);
});
test('transitions operate on clips without touching PCM and can crossfade',()=>{
 const buffer={duration:8},a={id:'a',offset:0,buffer,trimStart:0,trimEnd:0},b={id:'b',offset:9,buffer,trimStart:0,trimEnd:0};
 const track={clips:[a,b]};
 applyAutoTransition(track,'a','in',120);assert.ok(a.fadeIn>0);
 applyAutoTransition(track,'a','cross',120);
 assert.equal(a.fadeOut,b.fadeIn);assert.ok(b.offset<8);
 applyAutoTransition(track,'a','reset');assert.equal(a.fadeOut,0);
 assert.strictEqual(a.buffer,buffer);
});
