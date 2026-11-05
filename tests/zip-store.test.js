import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32,zipStore,unzipStore} from '../src/zip-store.js';
test('ZIP uncompressed format roundtrips audio bytes bit exactly',async()=>{
  const bytes=Uint8Array.from([0,1,2,3,127,128,255,0,88]);
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  const archive=await zipStore([{name:'audio/001.wav',data:bytes},{name:'project.json',data:new TextEncoder().encode('{"version":1}')}]);
  const contents=await unzipStore(archive);
  assert.deepEqual(Array.from(contents.get('audio/001.wav')),Array.from(bytes));
  assert.equal(new TextDecoder().decode(contents.get('project.json')),'{"version":1}');
});
test('Reject unsafe ZIP entries and corrupted CRC',async()=>{
  await assert.rejects(zipStore([{name:'../unsafe.wav',data:Uint8Array.of(1)}]),/inseguro/);
  const archive=await zipStore([{name:'safe.wav',data:Uint8Array.of(1,2)}]);
  const broken=new Uint8Array(await archive.arrayBuffer());
  broken[38]^=127;
  await assert.rejects(unzipStore(new Blob([broken])),/dañados/);
});

test('projects can contain more than 99 audio files',async()=>{
 const entries=Array.from({length:125},(_,i)=>({name:`audio/${String(i+1).padStart(3,'0')}.wav`,data:Uint8Array.of(i)}));
 const result=await unzipStore(await zipStore(entries));
 assert.equal(result.size,125);
 assert.equal(result.get('audio/125.wav')[0],124);
});
