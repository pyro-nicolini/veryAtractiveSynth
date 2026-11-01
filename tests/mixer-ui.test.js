import test from 'node:test';
import assert from 'node:assert/strict';
import {mixerMarkup} from '../src/studio-mixer-ui.js';
import {readFileSync} from 'node:fs';
test('mixer renders channels, three buses and accessible routing',()=>{
 const t={id:'v-1',name:'Voz <principal>',color:'#a5ff73',type:'voice',volume:85,pan:-30,solo:true,muted:false};
 const html=mixerMarkup([t],{music:100,vocals:75,fx:100},'v-1');
 assert.match(html,/data-mix-volume="v-1"/);
 assert.match(html,/data-mix-pan="v-1"/);
 assert.match(html,/data-mix-route="v-1"/);
 assert.match(html,/data-mix-solo="v-1"/);
 assert.match(html,/data-mix-bus-volume="music"/);
 assert.match(html,/data-mix-bus-volume="vocals"/);
 assert.match(html,/data-mix-bus-volume="fx"/);
 assert.match(html,/Voz &lt;principal&gt;/);
 assert.ok(!html.includes('Voz <principal>'));
});
test('mixer integrates transport and local project format',()=>{
 const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const index=read('index.html'),app=read('src/app.js'),eng=read('src/engine.js'),sw=read('sw.js');
 for(const id of ['mixerToggle','mixerArea','mixerBody','mixerClose','mixerHelp'])assert.ok(index.includes('id="'+id+'"'));
 assert.match(app,/engine\.setBuses\(state\.buses\)/);
 assert.match(app,/state\.buses=sanitiseBuses\(options\.buses\)/);
 assert.match(eng,/this\.buses\.get\(busForTrack\(track\)\)/);
 assert.match(eng,/exportBuses\.get\(busForTrack\(track\)\)/);
 for(const file of ['src/studio-mixer.js','src/studio-mixer-ui.js','src/studio-mixer.css'])assert.ok(sw.includes(file));
});
