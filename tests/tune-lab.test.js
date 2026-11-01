import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNE_POINTS,mapTunePoint,normalizeTune,describeTune,tunePointFromManual,validSavedTune,applyTunePoint,findTunePreset} from '../src/tune-lab.js';
test('XY nodes clamp, scale, and drive actual sound parameters',()=>{
  const a=mapTunePoint(-1,-1),b=mapTunePoint(1,1);
  assert.equal(a.retune,5);assert.equal(a.autotune,0);
  assert.equal(b.retune,100);assert.equal(b.autotune,100);
  assert.ok(b.drive>a.drive);assert.ok(b.brightness>a.brightness);
  assert.deepEqual(normalizeTune(20,-8),{x:1,y:-1});
});
test('six coordinates are distinct and produce distinct voice settings',()=>{
  assert.equal(TUNE_POINTS.length,6);
  const unique=new Set(TUNE_POINTS.map(p=>JSON.stringify([p.x,p.y])));
  assert.equal(unique.size,6);
  for(const p of TUNE_POINTS){
    assert.equal(findTunePreset(p.id),p);
    assert.ok(describeTune(p.x,p.y).title);
    const settings=mapTunePoint(p.x,p.y);
    assert.ok(settings.retune>=5&&settings.retune<=100);
    assert.ok(settings.autotune>=0&&settings.autotune<=100);
  }
});
test('manual controls project back to XY graph without moving other settings',()=>{
  const p=tunePointFromManual(85,78);
  const mapped=mapTunePoint(p.x,p.y);
  assert.ok(Math.abs(mapped.autotune-85)<=1);
  assert.ok(Math.abs(mapped.retune-78)<=1);
  const track={volume:68,clean:47,echo:29,space:17,key:5,scale:1};
  applyTunePoint(track,p.x,p.y,'star');
  assert.equal(track.volume,68);assert.equal(track.clean,47);
  assert.equal(track.echo,29);assert.equal(track.key,5);
  assert.equal(track.tunePreset,'star');assert.equal(track.preset,'custom');
});
test('stored user presets validated, no markup injection or NaN',()=>{
  assert.equal(validSavedTune({name:'',x:.1,y:.2}),null);
  assert.equal(validSavedTune({name:'Weird',x:3,y:.2}),null);
  assert.equal(validSavedTune({name:'Bug',x:NaN,y:.2}),null);
  assert.deepEqual(validSavedTune({name:'  Voz mía  ',x:.555,y:-.333}),{name:'Voz mía',x:.56,y:-.33});
});
