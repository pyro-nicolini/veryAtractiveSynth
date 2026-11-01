import test from 'node:test';
import assert from 'node:assert/strict';
import {routeFor,routeMap,canConnect,chainLane,wireAudioGraphs} from '../src/flow-routing.js';
import {patchValues,applyPatchPreset} from '../src/patch-presets.js';
import {readFileSync} from 'node:fs';
const track=(id,bus='music',flowTo)=>({id,type:bus==='vocals'?'voice':'audio',bus,flowTo});
test('legacy project audio retains direct-to-bus routing',()=>{
 const tracks=[track('first','vocals'),track('second','vocals'),track('beat','music')];
 assert.equal(routeFor(tracks[0],tracks),'bus:vocals');
 assert.equal(routeFor(tracks[2],tracks),'bus:music');
 assert.equal(routeMap(tracks).size,3);
});
test('real serial connections support same-lane links and block cycles and cross-lane paths',()=>{
 const tracks=[track('voice1','vocals','track:voice2'),track('voice2','vocals','bus:vocals'),track('drums','music','bus:music')];
 assert.equal(canConnect(tracks,'voice2','track:voice1'),false);
 assert.equal(canConnect(tracks,'drums','track:voice1'),false);
 assert.equal(canConnect(tracks,'voice1','track:voice2'),true);
 assert.equal(canConnect(tracks,'voice1','master'),true);
 assert.equal(canConnect(tracks,'voice2','bus:vocals'),true);
 const chain=chainLane(tracks,'vocals');
 assert.equal(chain.get('voice1'),'track:voice2');
 assert.equal(chain.get('voice2'),'bus:vocals');
});
test('track DSP output physically connects into next track input before entering master bus',()=>{
 const tracks=[track('a','vocals','track:b'),track('b','vocals','bus:vocals'),track('c','music')];
 const mk=()=>({destinations:[],disconnect(){this.destinations=[];},connect(n){this.destinations.push(n);}});
 const graphs=new Map(tracks.map(t=>[t.id,{input:mk(),meter:mk()}]));
 const buses=new Map([['vocals',{gain:mk()}],['music',{gain:mk()}]]);
 const master=mk();
 wireAudioGraphs(tracks,graphs,buses,master);
 assert.deepEqual(graphs.get('a').meter.destinations,[graphs.get('b').input]);
 assert.deepEqual(graphs.get('b').meter.destinations,[buses.get('vocals').gain]);
 assert.deepEqual(graphs.get('c').meter.destinations,[buses.get('music').gain]);
 const cyclic=[track('a','vocals','track:b'),track('b','vocals','track:a')];
 assert.throws(()=>wireAudioGraphs(cyclic,graphs,buses,master),/ciclo/i);
});
test('patch presets sanitize values before reuse and copy object state',()=>{
 const t={autotune:300,retune:60,pitchShift:32,drive:50,fxBypass:{eq:true}};
 const patch={values:patchValues(t)};
 const target={};
 applyPatchPreset(target,patch);
 assert.equal(target.autotune,100);
 assert.equal(target.pitchShift,12);
 assert.equal(target.fxBypass.eq,true);
 target.fxBypass.eq=false;
 assert.equal(patch.values.fxBypass.eq,true);
});
test('patchbay source code keeps exports and persisted assets wired',()=>{
 const file=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
 assert.match(file('src/engine.js'),/wireAudioGraphs\(tracks/);
 assert.match(file('src/engine.js'),/wireAudioGraphs\(active/);
 assert.match(file('src/portable-project.js'),/flowTo:/);
 assert.match(file('src/sample-library.js'),/saveLibrarySample/);
 assert.match(file('src/sample-deck.js'),/data-pad-to-library/);
 assert.match(file('index.html'),/id="flowChain"/);
 assert.match(file('sw.js'),/src\/patch-presets\.js/);
});
