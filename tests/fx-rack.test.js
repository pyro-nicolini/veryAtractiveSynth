import test from 'node:test';
import assert from 'node:assert/strict';
import {FX_CHAIN,FX_IDS,normaliseFxBypass,isFxBypassed,toggleTrackFx} from '../src/fx-rack.js';
test('7 independent effect switches, default to enabled',()=>{
 assert.equal(FX_CHAIN.length,7);assert.equal(new Set(FX_IDS).size,7);
 const track={autotune:88,echo:46,fxBypass:undefined};
 assert.equal(isFxBypassed(track,'tune'),false);
 assert.equal(toggleTrackFx(track,'tune'),true);
 assert.equal(isFxBypassed(track,'delay'),false);
 assert.equal(toggleTrackFx(track,'delay'),true);
 assert.equal(track.autotune,88);assert.equal(track.echo,46);
 assert.equal(toggleTrackFx(track,'tune'),false);
 assert.equal(isFxBypassed(track,'delay'),true);
});
test('bypass storage ignores unknown keys',()=>{
 assert.deepEqual(normaliseFxBypass({tune:1,eq:true,other:true}).eq,true);
 assert.equal(normaliseFxBypass({tune:1}).tune,false);
 assert.throws(()=>toggleTrackFx({},'unknown'),/desconocido/);
});
