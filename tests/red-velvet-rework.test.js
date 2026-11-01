import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {flowMarkup,flowPosition} from '../src/flow-studio.js';
import {SAMPLE_FX,sampleEffect} from '../src/sample-bank.js';
import {storageRecord,reviveSample} from '../src/sample-pad-store.js';
import {VOICE_CHARACTERS,applyVoiceCharacter} from '../src/voice-characters.js';
import {defaults} from '../src/dsp.js';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('real vocal and music bus lanes render with routing controls and bus to master',()=>{
  const make=(id,type)=>({id,name:id,type,volume:80,clean:0,brightness:50,warmth:20,
    autotune:0,drive:0,echo:0,space:0,muted:false,fxBypass:{}});
  const voices=make('lead','voice'),music=make('beat','audio');
  const markup=flowMarkup([voices,music]);
  for(const id of ['vocals','music','fx'])
    assert.ok(markup.includes('data-flow-bus="'+id+'"'),id);
  assert.match(markup,/data-flow-route-select="lead"/);
  assert.match(markup,/data-flow-route="vocals"/);
  assert.match(markup,/data-flow-route="music"/);
  assert.match(markup,/flow-bus-wire|SUMA REAL/);
  assert.equal(flowPosition(voices,0).y,100);
  assert.equal(flowPosition(music,0).y,340);
});

test('sample FX presets are non-destructive data and stored pads retain selection',()=>{
  assert.ok(Object.keys(SAMPLE_FX).length>=6);
  assert.equal(sampleEffect('missing'),SAMPLE_FX.original);
  const fake={numberOfChannels:1,duration:1,sampleRate:48000,length:48000,
    getChannelData:()=>new Float32Array(48000)};
  const record=storageRecord(fake,'Pad',0,.5,'velvet');
  assert.equal(record.fx,'velvet');
  assert.equal(record.to,.5);
  assert.equal(record.channels[0].length,48000);
  const prior=globalThis.AudioBuffer;
  globalThis.AudioBuffer=class {
    constructor({numberOfChannels,length,sampleRate}){
      this.numberOfChannels=numberOfChannels;this.length=length;this.sampleRate=sampleRate;
      this.duration=length/sampleRate;
    }
    copyToChannel(data){this.samples=data;}
  };
  try{assert.equal(reviveSample(record).fx,'velvet');}
  finally{globalThis.AudioBuffer=prior;}
});

test('additional stylized vocal presets use parameters of the existing audio engine',()=>{
  for(const id of ['fem-bright','fem-soft','masc-baritone','masc-deep','bronx-rap','cartoon-duck','pixie']){
    assert.ok(VOICE_CHARACTERS.find(v=>v.id===id),id);
    const track=defaults();
    applyVoiceCharacter(track,id);
    assert.ok(track.pitchShift>=-12&&track.pitchShift<=12);
    assert.equal(track.voiceCharacter,id);
    assert.equal(track.bypassEffects,false);
  }
});

test('Red Velvet startup, per-track export and samples are connected and included offline',()=>{
  const html=file('index.html'),app=file('src/app.js'),deck=file('src/sample-deck.js'),
    theme=file('src/red-velvet.css'),sw=file('sw.js'),engine=file('src/engine.js');
  assert.match(html,/Bienvenue\./);
  assert.match(html,/id="splashSkip"/);
  assert.match(html,/id="flowArrange"/);
  assert.match(html,/src\/red-velvet\.css/);
  assert.match(app,/data-track-action="export-track"/);
  assert.match(app,/async function performTrackExport/);
  assert.match(app,/data-flow-route-select/);
  assert.match(deck,/data-pad-export="dry"/);
  assert.match(deck,/data-pad-export="wet"/);
  assert.match(deck,/this\.engine\.previewSample/);
  assert.match(engine,/createDryGraph/);
  assert.match(theme,/prefers-reduced-motion/);
  for(const path of ['src/splash.js','src/red-velvet.css'])
    assert.ok(sw.includes(path),'offline asset absent: '+path);
});
