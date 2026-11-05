import test from 'node:test';
import assert from 'node:assert/strict';
import {MASTER_FX_DEFAULTS,MASTER_FX_CHAIN,sanitiseMasterFx,masterFxActive} from '../src/master-fx.js';
import {readFileSync} from 'node:fs';
test('master FX defaults are transparent and bounded values are sanitized',()=>{
 assert.deepEqual(sanitiseMasterFx(),{...MASTER_FX_DEFAULTS});
 const fx=sanitiseMasterFx({low:30,high:-30,drive:150,compression:-1,delay:35,reverb:90,bypass:false});
 assert.deepEqual(fx,{low:12,high:-12,drive:100,compression:0,delay:35,reverb:90,bypass:false});
 assert.equal(masterFxActive({}),false);
 assert.equal(masterFxActive({drive:40}),true);
 assert.equal(masterFxActive({drive:40,bypass:true}),false);
 assert.equal(MASTER_FX_CHAIN.length,6);
});
test('master bus processing is applied before the final output fader in realtime and offline WAV render',()=>{
 const engine=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(engine,/function makeMaster\(ctx,destination,masterVolume,settings=MASTER_FX_DEFAULTS\)/);
 assert.match(engine,/const gain=ctx\.createGain\(\);gain\.gain\.value=1;\s*const masterFader=ctx\.createGain\(\);masterFader\.gain\.value=masterVolume\/100;/);
 assert.match(engine,/gain\.connect\(low\);low\.connect\(high\);high\.connect\(drive\);drive\.connect\(compressor\)/);
 assert.match(engine,/reverbSum\.connect\(limiter\);limiter\.connect\(masterFader\);masterFader\.connect\(meter\)/);
 assert.match(engine,/this\.output\.masterFader\.gain\.setTargetAtTime/);
 assert.match(engine,/gain\.connect\(this\.output\.masterFader\)/);
 assert.match(engine,/setMasterFx\(settings\)/);
 assert.match(engine,/makeMaster\(offline,offline\.destination,this\.masterVolume,dry\?MASTER_FX_DEFAULTS:this\.masterFx\)/);
 assert.match(app,/masterFx:\{\.\.\.state\.masterFx\}/);
 assert.match(app,/engine\.setMasterFx\(state\.masterFx\)/);
});
