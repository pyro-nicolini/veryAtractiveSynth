import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateFlowWires,invalidateFlowWireGeometry} from '../src/flow-studio.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function scene(){
  const paths=[],attrs={};let layoutReads=0,meterReads=0;
  const classBag=()=>({active:new Set(),add(name){this.active.add(name);},toggle(name,on){if(on)this.active.add(name);else this.active.delete(name);}});
  const node={dataset:{flowTrack:'beat'},getBoundingClientRect(){layoutReads++;return {left:30,top:110,right:245,height:125};},
    querySelector:selector=>selector==='.flow-source-icon'?glow:null};
  const glow={style:{transform:''}};
  const board={getBoundingClientRect(){layoutReads++;return {left:0,top:0,width:830,height:420};},
    querySelectorAll:selector=>selector==='[data-flow-track]'?[node]:[]};
  const master={getBoundingClientRect(){layoutReads++;return {left:700,top:180,height:100};}};
  const svg={setAttribute(name,value){attrs[name]=value;},
    querySelectorAll:selector=>selector==='[data-flow-wire]'?paths:[],
    appendChild(path){paths.push(path);}};
  const root={querySelector:selector=>({'#flowBoard':board,'#flowWires':svg,'#flowMaster':master})[selector]};
  const doc={createElementNS:()=>({
    dataset:{},attrs:{},style:{setProperty(){},strokeWidth:''},
    classList:classBag(),setAttribute(name,value){this.attrs[name]=value;if(name==='data-flow-wire')this.dataset.flowWire=value;},
    remove(){const i=paths.indexOf(this);if(i>=0)paths.splice(i,1);}
  })};
  const engine={getTrackMeter(){meterReads++;return {rms:.14};}};
  const track={id:'beat',color:'#37afff',muted:false};
  return {root,board,svg,paths,engine,track,doc,attrs,
    reads:()=>layoutReads,meterReads:()=>meterReads};
}
test('cables animate from live RMS at multiple frames without drag or rerender',()=>{
  const s=scene(),previous=globalThis.document;
  globalThis.document=s.doc;
  try{
    updateFlowWires(s.root,[s.track],s.engine,true,1000);
    assert.equal(s.paths.length,1);
    const first=s.paths[0].attrs.d,layoutReads=s.reads();
    assert.ok(layoutReads>0);
    updateFlowWires(s.root,[s.track],s.engine,true,1017);
    assert.notEqual(s.paths[0].attrs.d,first,'same DOM node, new waveform geometry');
    assert.equal(s.reads(),layoutReads,'no forced layout on every animation frame');
    assert.equal(s.meterReads(),2,'each active frame reads the real channel analyser');
    assert.equal(s.paths.length,1,'do not recreate SVG paths per frame');
    invalidateFlowWireGeometry(s.root);
    updateFlowWires(s.root,[s.track],s.engine,true,1034);
    assert.ok(s.reads()>layoutReads,'drag/resize explicitly invalidates geometry cache');
  }finally{globalThis.document=previous;}
});
test('pause and mute leave stable, visually disconnected cables without reading audio',()=>{
  const s=scene(),previous=globalThis.document;
  globalThis.document=s.doc;
  try{
    updateFlowWires(s.root,[s.track],s.engine,false,1000);
    const first=s.paths[0].attrs.d;
    updateFlowWires(s.root,[s.track],s.engine,false,2000);
    assert.equal(s.paths[0].attrs.d,first);
    assert.equal(s.meterReads(),0);
    s.track.muted=true;
    updateFlowWires(s.root,[s.track],s.engine,true,3000);
    assert.equal(s.paths[0].attrs.d,first);
    assert.equal(s.paths[0].classList.active.has('flow-wire-off'),true);
    assert.equal(s.meterReads(),0);
  }finally{globalThis.document=previous;}
});
test('transport cannot halt the visualizer by iterating a single HTMLElement',()=>{
  const source=read('src/app.js');
  assert.match(source,/for\(const line of \$\$\('\.wave-playhead'\)\)/);
  assert.doesNotMatch(source,/for\(const line of \$\('\.wave-playhead'\)\)/);
  assert.match(source,/function startFlowMotion\(\)/);
  assert.match(source,/function stopFlowMotion\(\)/);
  assert.match(source,/FLOW_FRAME_MS=1000\/60/);
  assert.match(source,/IntersectionObserver/);
  assert.match(source,/document\.addEventListener\('visibilitychange'/);
  assert.match(source,/for\(const el of \$\$\('\.wave-viewport'\)\)/);
  const ticker=source.slice(source.indexOf('function runTicker(){'),source.indexOf('async function playPause(){'));
  assert.doesNotMatch(ticker,/paintFlow\(/,'cable animation is not coupled to transport loop');
});
