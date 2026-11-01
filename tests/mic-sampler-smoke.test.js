import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const r=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('microphone grant button, recording safeguards and lab capture are wired',()=>{
 const app=r('src/app.js'),ui=r('src/tune-lab-ui.js'),eng=r('src/engine.js');
 assert.match(app,/PERMITIR MICRÓFONO/);assert.match(app,/signalQuality\(buffer\)/);
 assert.match(app,/for\(const step of \$\$\('#noteSteps/);
 assert.match(app,/state\.noteHistory/);
 assert.match(ui,/data-action="tune-live-record"/);
 assert.match(ui,/data-action="tune-live-save"/);
 assert.match(app,/function startLiveRecording\(\)/);
 assert.match(eng,/onprocessorerror/);assert.match(eng,/No llegaron muestras completas/);
});
test('12 independent pads with waveform, local persistence and source-to-track actions',()=>{
 const app=r('src/app.js'),html=r('index.html'),sw=r('sw.js'),bank=r('src/sample-deck.js');
 assert.match(html,/id="sampleToggle"/);assert.match(html,/id="sampleDeck"/);
 assert.match(app,/function setupSamples\(\)/);assert.match(bank,/Array\(12\)\.fill\(null\)/);
 assert.match(bank,/padWaveSVG/);assert.match(bank,/data-pad-import/);
 assert.match(bank,/data-pad-from-track/);assert.match(bank,/data-pad-save/);
 assert.match(bank,/data-pad-insert/);
 for(const path of ['sample-bank.js','sample-deck.js','sample-pad-store.js'])
   assert.ok(sw.includes(path),path+' missing from offline cache');
});
