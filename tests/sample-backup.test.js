import test from 'node:test';
import assert from 'node:assert/strict';
import {replacePads,loadPads} from '../src/sample-pad-store.js';
import {addLibrarySamples,listLibrarySamples,loadLibrarySample} from '../src/sample-library.js';

// Model transactions as a staged copy: an aborted transaction commits nothing.
function fakeDB(){
 const databases=new Map();let failNext=false;
 return {fail(){failNext=true;},open(name){
  const request={};queueMicrotask(()=>{
   const first=!databases.has(name),tables=databases.get(name)||new Map();databases.set(name,tables);
   const db={objectStoreNames:{contains:n=>tables.has(n)},createObjectStore:n=>tables.set(n,new Map()),close(){},
    transaction(names,mode){
     names=Array.isArray(names)?names:[names];
     const staged=new Map(names.map(n=>[n,new Map(tables.get(n))]));
     const tx={objectStore(n){const map=staged.get(n);return {
      put(value,key){map.set(key,value);},add(value,key){const k=key??value.id;if(map.has(k))throw Error('duplicate');map.set(k,value);},delete(key){map.delete(key);},
      get(key){const req={};queueMicrotask(()=>{req.result=map.get(key);req.onsuccess?.();});return req;},
      getAll(){const req={};queueMicrotask(()=>{req.result=[...map.values()];req.onsuccess?.();});return req;},
      openCursor(){const req={},items=[...map.entries()];let i=0;const next=()=>{const item=items[i++];req.result=item?{key:item[0],value:item[1],continue:()=>queueMicrotask(next)}:null;req.onsuccess?.();};queueMicrotask(next);return req;}
     };}};
     setTimeout(()=>{if(failNext&&mode==='readwrite'){failNext=false;tx.error=Error('quota');tx.onabort?.();return;}
      if(mode==='readwrite')for(const [key,value] of staged)tables.set(key,value);tx.oncomplete?.();},0);
     return tx;
    }};
   request.result=db;if(first)request.onupgradeneeded?.();request.onsuccess?.();
  });return request;}};
}
class FakeBuffer{
 constructor({numberOfChannels,length,sampleRate}){Object.assign(this,{numberOfChannels,length,sampleRate,duration:length/sampleRate});this.data=Array.from({length:numberOfChannels},()=>new Float32Array(length));}
 getChannelData(i){return this.data[i];}copyToChannel(a,i){this.data[i].set(a);}
}
test('sample restoration preserves existing data when a transaction aborts',async()=>{
 globalThis.indexedDB=fakeDB();globalThis.AudioBuffer=FakeBuffer;
 const buffer=new FakeBuffer({numberOfChannels:1,length:8000,sampleRate:8000});buffer.data[0][0]=.5;
 const sample={buffer,name:'Nombre largo de sample para probar persistencia completa',fx:'original',from:0,to:1};
 const pads=Array(12).fill(null);pads[0]=sample;
 await replacePads(pads);assert.equal((await loadPads({strict:true}))[0].buffer.data[0][0],.5);
 globalThis.indexedDB.fail();await assert.rejects(replacePads(Array(12).fill(null)),/quota/);
 assert.equal((await loadPads())[0].buffer.data[0][0],.5);
 await addLibrarySamples([sample]);const entries=await listLibrarySamples();assert.equal(entries.length,1);
 assert.equal((await loadLibrarySample(entries[0].id)).name,sample.name);
 globalThis.indexedDB.fail();await assert.rejects(addLibrarySamples([sample]),/quota/);
 assert.equal((await listLibrarySamples()).length,1);
});
