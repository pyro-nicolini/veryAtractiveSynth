import test from 'node:test';import assert from 'node:assert/strict';
import {VOICE_CHARACTERS,applyVoiceCharacter,characterCoordinates} from '../src/voice-characters.js';
test('distinct fantasy voice personas change real DSP controls',()=>{
 const a={drive:0,fxBypass:{}};applyVoiceCharacter(a,'monster');
 assert.equal(a.pitchShift,-9);assert.ok(a.drive>0);
 applyVoiceCharacter(a,'helium');assert.equal(a.pitchShift,8);
 assert.ok(VOICE_CHARACTERS.length>=12);assert.equal(new Set(VOICE_CHARACTERS.map(c=>c.id)).size,VOICE_CHARACTERS.length);
});
test('voice character XY shifts pitch and drive within safe range',()=>{
 const a={};characterCoordinates(a,-1,1);assert.equal(a.pitchShift,-12);assert.equal(a.drive,100);
 characterCoordinates(a,1,-1);assert.equal(a.pitchShift,12);assert.equal(a.drive,0);
});
