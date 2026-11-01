import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSession,loadSession,listNamedProjects,saveNamedProject,deleteNamedProject} from '../src/project-store.js';

// Dependency-free IndexedDB model: exercises actual async get/put/cursor flows,
// v1 migration and copy-on-first-save storage (not just source-code inspection).
function fakeIndexedDB(){
  const tables=new Map(),stats={audioWrites:0};
  const db={
    objectStoreNames:{contains:name=>tables.has(name)},
    createObjectStore:name=>{tables.set(name,new Map());},
    close(){},
    transaction(names){
      let pending=0,completed=false;
      const tx={oncomplete:null,onerror:null,onabort:null};
      const done=()=>{
        if(!pending&&!completed){completed=true;tx.oncomplete?.();}
      };
      const request=(fn)=>{
        pending++;
        const req={result:undefined,onerror:null,onsuccess:null};
        queueMicrotask(()=>{
          try{req.result=fn();req.onsuccess?.();}
          catch(error){req.error=error;req.onerror?.();}
          pending--;queueMicrotask(done);
        });
        return req;
      };
      const store=name=>{
        const map=tables.get(name);
        return {
          get:key=>request(()=>map.get(key)),
          put:(value,key)=>request(()=>{map.set(key,value);if(name==='audio')stats.audioWrites++;return key;}),
          delete:key=>request(()=>{map.delete(key);}),
          getAll:()=>request(()=>Array.from(map.values())),
          openCursor(){
            pending++;
            const req={result:null,onsuccess:null,onerror:null};
            const entries=Array.from(map.entries());
            let index=0;
            const next=()=>{
              if(index>=entries.length){
                req.result=null;req.onsuccess?.();pending--;queueMicrotask(done);return;
              }
              const [key,value]=entries[index++];
              req.result={key,value,continue:()=>queueMicrotask(next),delete:()=>map.delete(key)};
              req.onsuccess?.();
            };
            queueMicrotask(next);return req;
          }
        };
      };
      tx.objectStore=store;return tx;
    }
  };
  return {
    stats,tables,
    open(){
      const req={result:db,onsuccess:null,onerror:null,onupgradeneeded:null};
      queueMicrotask(()=>{req.onupgradeneeded?.();req.onsuccess?.();});
      return req;
    }
  };
}
const makeContext=()=>({
  createBuffer(channels,length,rate){
    const a=Array.from({length:channels},()=>new Float32Array(length));
    return {sampleRate:rate,length,duration:length/rate,numberOfChannels:channels,
      getChannelData:c=>a[c],copyToChannel:(samples,c)=>a[c].set(samples)};
  }
});
test('incremental save reuses PCM, reloads projects and deletes named snapshots',async()=>{
  const idb=fakeIndexedDB();globalThis.indexedDB=idb;
  const ctx=makeContext(),buffer=ctx.createBuffer(1,4,8000);
  buffer.getChannelData(0).set([.1,.2,.3,.4]);
  const tracks=[{id:'voice-1',name:'Mi voz',type:'voice',color:'#a5ff73',buffer,volume:85,offset:0}];
  await saveSession(tracks,80,{bpm:110});
  assert.equal(idb.stats.audioWrites,1);
  tracks[0].volume=40;
  await saveSession(tracks,80,{bpm:120});
  assert.equal(idb.stats.audioWrites,1,'updating a knob must not duplicate PCM');
  const loaded=await loadSession(ctx);
  assert.equal(loaded.tracks[0].volume,40);
  assert.equal(loaded.options.bpm,120);
  assert.ok(Math.abs(loaded.tracks[0].buffer.getChannelData(0)[2]-.3)<1e-5);
  const key=await saveNamedProject(tracks,80,{bpm:100},'Mi primera canción');
  assert.equal(idb.stats.audioWrites,1,'named project reuses original buffer');
  assert.equal((await listNamedProjects())[0].name,'Mi primera canción');
  const named=await loadSession(ctx,key);
  assert.equal(named.options.bpm,100);
  await deleteNamedProject(key);
  assert.equal((await listNamedProjects()).length,0);
  assert.equal(idb.tables.get('audio').size,1,'PCM still referenced by last session');
});
test('v1 sessions load without deleting legacy channel data',async()=>{
  const idb=fakeIndexedDB();globalThis.indexedDB=idb;
  const ctx=makeContext();
  await saveSession([],85);
  idb.tables.get('projects').set('last-session',{
    savedAt:'2026-10-31',master:75,tracks:[{
      id:'old',name:'Vieja voz',color:'#a5ff73',type:'voice',
      settings:{volume:55},rate:8000,channels:[Float32Array.of(.2,-.2)]
    }]
  });
  const original=await loadSession(ctx);
  assert.equal(original.master,75);
  assert.equal(original.tracks[0].name,'Vieja voz');
  assert.equal(original.tracks[0].buffer.length,2);
});
