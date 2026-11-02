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
  const voices=make('lead','voice'),music=make('beat','audio'),fx=make('fx-return','audio');fx.bus='fx';
  const markup=flowMarkup([voices,music,fx]);
  for(const id of ['vocals','music','samples','fx'])
    assert.ok(markup.includes('data-flow-bus="'+id+'"'),id);
  assert.match(markup,/data-flow-destination="lead"/);
  assert.match(markup,/data-flow-route="bus:vocals"/);
  assert.match(markup,/data-flow-route="bus:music"/);
  assert.match(markup,/SUMADOR|PATCHBAY/);
  assert.match(markup,/data-flow-out="lead"/);
  assert.match(markup,/data-flow-in="lead"/);
  assert.equal(flowPosition(voices,0).y,125);
  assert.equal(flowPosition(music,0).y,520);
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
    theme=file('src/signal-flow-v2.css'),sw=file('sw.js'),engine=file('src/engine.js'),portable=file('src/portable-project.js');
  assert.match(html,/Bienvenue\./);
  assert.match(html,/id="splashSkip"/);
  assert.match(html,/id="flowArrange"/);assert.match(html,/id="flowFullscreen"/);
  assert.match(html,/src\/studio-console\.css/);assert.match(html,/src\/signal-flow-v2\.css/);
  assert.match(app,/data-track-action="export-track"/);
  assert.match(app,/async function performTrackExport/);
  assert.match(app,/data-flow-destination/);assert.match(app,/async function saveTrackAsSample/);assert.match(app,/engine\.setMasterFx/);assert.match(app,/function addTrack\(buffer,name,type='audio',offset=0,bus=null,chain=true,deferRender=false\)/);assert.match(app,/options\.route\|\|'samples'/);
  assert.match(deck,/data-pad-export="dry"/);
  assert.match(deck,/data-pad-export="wet"/);assert.match(deck,/sample-library-item/);assert.doesNotMatch(deck,/data-saved-sample/);
  assert.match(deck,/data-library-route="samples"/);assert.match(deck,/data-library-route="selected"/);assert.match(deck,/data-library-route="master"/);
  assert.match(deck,/sampleInsertRoute/);assert.match(deck,/addLibrary\(id,route='samples'\)/);assert.match(deck,/this\.onAdd\(buffer,pad\.name,sampleEffect\(pad\.fx\)\.settings,\{route\}\)/);
  assert.match(portable,/bus:\(music\|vocals\|samples\|fx\)/);
  assert.match(deck,/this\.engine\.previewSample/);
  assert.match(engine,/createDryGraph/);assert.match(engine,/setMasterFx\(settings\)/);assert.match(engine,/makeMaster\(offline,offline\.destination,this\.masterVolume,dry\?MASTER_FX_DEFAULTS:this\.masterFx\)/);
  assert.match(theme,/prefers-reduced-motion/);assert.match(theme,/RED VELVET art direction/);
  for(const path of ['src/splash.js','src/studio-console.css','src/signal-flow-v2.css','src/flow-routing.js','src/sample-library.js','src/patch-presets.js','src/master-fx.js'])
    assert.ok(sw.includes(path),'offline asset absent: '+path);
});
