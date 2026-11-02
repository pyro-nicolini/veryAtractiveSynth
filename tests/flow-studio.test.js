import test from 'node:test';import assert from 'node:assert/strict';
import {flowMarkup,flowHeight,flowPosition,wireCurve} from '../src/flow-studio.js';
import {MASTER_FX_DEFAULTS} from '../src/master-fx.js';
const track={id:'voice1',name:'Voz <uno>',type:'voice',bus:'vocals',volume:80,pan:0,color:'#a5ff73',fxBypass:{},autotune:80,clean:50,brightness:60,warmth:20,drive:0,echo:14,space:25,muted:false};
test('main graph keeps FX collapsed inside each parent node by default',()=>{
 const s=flowMarkup([track],{},'voice1');
 assert.match(s,/data-flow-in="voice1"/);assert.match(s,/data-flow-out="voice1"/);
 assert.match(s,/data-flow-expand-fx="voice1"/);assert.match(s,/data-flow-link="voice1"/);
 assert.doesNotMatch(s,/flow-fx-drawer/);
 assert.match(s,/Voz &lt;uno&gt;/);assert.doesNotMatch(s,/Voz <uno>/);
 assert.match(s,/data-flow-sample-dock/);assert.match(s,/data-flow-bus="samples"/);
 assert.equal(flowHeight(),920);
 assert.deepEqual(flowPosition(track,0,{'voice1':{x:200,y:65}}),{x:200,y:65});
 assert.equal(flowPosition(track,0).y,125);
});
test('opening a parent exposes only its own FX subnodes and master has separate global FX',()=>{
 const s=flowMarkup([track],{},'voice1',[],[],[],['voice1','master'],MASTER_FX_DEFAULTS);
 assert.match(s,/data-flow-fx-drawer="voice1"/);
 assert.match(s,/data-flow-effect-toggle="tune"/);
 assert.match(s,/data-flow-effect-toggle="reverb"/);
 assert.match(s,/data-master-fx-panel/);
 assert.match(s,/data-master-fx="compression"/);
 assert.match(s,/MASTER FX/);
});
test('curved cable is data-driven and vibrates only with nonzero meter',()=>{
 const still=wireCurve(10,20,300,100,0,15),loud=wireCurve(10,20,300,100,1,15);
 assert.ok(still.startsWith('M 10.0 20.0 Q'));assert.notEqual(loud,still);
});

test('sample identity stays visible when inserted into a voice bus',()=>{
 const routedSample={...track,id:'one-shot',name:'One shot',type:'audio',bus:'vocals',sourceKind:'sample'};
 const markup=flowMarkup([track,routedSample]);
 assert.match(markup,/class="flow-node [^"]*flow-node-sample[^"]*" data-flow-track="one-shot"/);
 assert.equal(flowPosition(routedSample,0).y,125);
});
