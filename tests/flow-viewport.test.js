import test from 'node:test';
import assert from 'node:assert/strict';
import {clampFlowZoom,screenToGraph,graphViewportSize,fitFlowZoom,zoomAroundPoint,flowWorkspaceMetrics} from '../src/flow-viewport.js';
import {flowMarkup} from '../src/flow-studio.js';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const track={id:'v1',name:'Voz principal',type:'voice',bus:'vocals',volume:75,autotune:40,retune:65,clean:35,brightness:55,warmth:30,drive:10,echo:12,space:18,muted:false,fxBypass:{}};
test('zoom clamps and converts screen deltas into graph coordinates',()=>{
 assert.equal(clampFlowZoom(.1),.45);assert.equal(clampFlowZoom(8),1.8);
 assert.deepEqual(screenToGraph(90,60,.5),{x:180,y:120});
 assert.deepEqual(graphViewportSize(1200,900,.5),{width:600,height:450});
 assert.equal(fitFlowZoom(1200,900,900,600),.6333333333333333);
 const point=zoomAroundPoint({scrollLeft:200,scrollTop:100,x:100,y:80,oldZoom:1,newZoom:1.5});
 assert.deepEqual(point,{left:350,top:190});
});
test('FX controls live in floating layer rather than nested inside a source card',()=>{
 const markup=flowMarkup([track],{},'v1',[],[],[],['v1','master'],{},85,{v1:{x:160,y:90}},'v1');
 assert.match(markup,/id="flowCanvasScroller"/);
 assert.match(markup,/id="flowCanvasSpace"/);
 assert.match(markup,/id="flowFxLayer"/);
 assert.match(markup,/data-flow-fx-window="v1"/);
 assert.match(markup,/data-flow-fx-move="v1"/);
 assert.match(markup,/data-flow-fx-param="autotune"/);
 assert.match(markup,/data-flow-fx-param="retune"/);
 assert.match(markup,/data-flow-fx-maximize="v1"/);
 assert.match(markup,/data-master-fx-panel/);
 assert.match(markup,/data-flow-zoom-in/);
 assert.match(markup,/class="flow-floating-panel is-maximized"/);
 const sourceCard=markup.slice(markup.indexOf('data-flow-track="v1"'),markup.indexOf('data-flow-track="v1"')+1700);
 assert.doesNotMatch(sourceCard,/flow-fx-drawer/);
});
test('canvas persists independent zoom and FX positions; geometry uses unscaled units',()=>{
 const app=source('src/app.js'),flow=source('src/flow-studio.js'),css=source('src/flow-canvas-v3.css'),sw=source('sw.js');
 assert.match(app,/flowCanvasZoom:state\.flowCanvasZoom/);
 assert.match(app,/flowFxWindows:\{\.\.\.state\.flowFxWindows\}/);
 assert.match(app,/function setFlowZoom/);
 assert.match(app,/function fitFlowCanvas/);
 assert.match(app,/screenToGraph\(event\.clientX-drag\.startX/);
 assert.match(flow,/scale=rect\.width\/Math\.max\(1,width\)/);
 assert.match(css,/#flowArea \.flow-fx-layer/);
 assert.ok(sw.includes('src/flow-viewport.js'));
 assert.ok(sw.includes('src/flow-canvas-v3.css'));
});

test('each processor owns its toggle and adjustable parameters in one card',()=>{
 const markup=flowMarkup([track],{},'v1',[],[],[],['v1'],{},85);
 for(const effect of ['tune','clean','eq','drive','compressor','delay','reverb']){
  assert.match(markup,new RegExp('data-flow-fx-unit="'+effect+'"'));
  assert.match(markup,new RegExp('data-flow-effect-toggle="'+effect+'"'));
 }
 assert.match(markup,/data-flow-fx-id="tune"/);
 assert.match(markup,/data-flow-fx-id="eq"/);
 assert.match(markup,/data-flow-fx-id="delay"/);
 const start=markup.indexOf('data-flow-fx-unit="tune"'),end=markup.indexOf('data-flow-fx-unit="clean"');
 const tune=markup.slice(start,end);
 assert.match(tune,/data-flow-effect-toggle="tune"/);
 assert.match(tune,/data-flow-fx-param="autotune"/);
 assert.match(tune,/data-flow-fx-param="retune"/);
 assert.doesNotMatch(tune,/data-flow-fx-param="drive"/);
});
test('moving an FX slider enables its processor and updates indicator in place',()=>{
 const app=source('src/app.js');
 assert.match(app,/track\.fxBypass=\{\.\.\.track\.fxBypass,\[fxId\]:false\}/);
 assert.match(app,/unit\.classList\.toggle\('is-active',active\)/);
 assert.match(app,/button\.setAttribute\('aria-pressed',String\(active\)\)/);
 assert.match(app,/engine\.updateTrack\(track\)/);
});

test('canvas offers free pan even beyond small zoomed graph and keeps pointer anchored',()=>{
 const bounds=flowWorkspaceMetrics(1200,920,1920,1080,.45);
 assert.ok(bounds.width>3840,'scrollable stage must extend beyond a wide monitor');
 assert.ok(bounds.height>2160,'stage must allow dragging vertically');
 assert.ok(bounds.originX>=1920,'the board should start beyond one viewport of pan margin');
 assert.ok(bounds.originY>=1080);
 const old=flowWorkspaceMetrics(1200,920,1920,1080,1);
 const newBounds=flowWorkspaceMetrics(1200,920,1920,1080,1.4);
 const scroll=zoomAroundPoint({scrollLeft:old.originX+100,scrollTop:old.originY+70,x:90,y:50,
  oldZoom:1,newZoom:1.4,oldOriginX:old.originX,oldOriginY:old.originY,
  newOriginX:newBounds.originX,newOriginY:newBounds.originY});
 assert.equal(scroll.left,Math.round(newBounds.originX+190*1.4-90));
 assert.equal(scroll.top,Math.round(newBounds.originY+120*1.4-50));
});
