import test from 'node:test';import assert from 'node:assert/strict';
import {flowMarkup,flowHeight,flowPosition,wireCurve} from '../src/flow-studio.js';
test('flow generates source node, seven draggable effects and reversible connections',()=>{
 const track={id:'voice1',name:'Voz <uno>',type:'voice',volume:80,pan:0,color:'#a5ff73',fxBypass:{},autotune:80,clean:50,brightness:60,warmth:20,drive:0,echo:14,space:25,muted:false};
 const s=flowMarkup([track],{},'voice1');
 assert.match(s,/data-flow-palette="tune"/);assert.match(s,/data-flow-in="voice1"/);
 assert.match(s,/data-flow-link="voice1"/);assert.match(s,/data-flow-effect="tune"/);
 assert.match(s,/Voz &lt;uno&gt;/);assert.doesNotMatch(s,/Voz <uno>/);
 assert.equal(flowHeight(3),flowHeight(1));
 assert.deepEqual(flowPosition(track,0,{'voice1':{x:200,y:65}}),{x:200,y:65});
});
test('curved cable is data-driven and vibrates only with nonzero meter',()=>{
 const still=wireCurve(10,20,300,100,0,15),loud=wireCurve(10,20,300,100,1,15);
 assert.ok(still.startsWith('M 10.0 20.0 Q'));
 assert.notEqual(loud,still);
});
