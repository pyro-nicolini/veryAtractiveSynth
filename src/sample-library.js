/** Persistent reusable sample collection, separate from the 12 hot pads.
 * Metadata and PCM live in independent IndexedDB stores so listing hundreds
 * of assets never loads every AudioBuffer into RAM. Nothing is uploaded.
 */
import {padBounds} from './sample-bank.js';
import {reviveSample} from './sample-pad-store.js';
const DB='vas-sample-library',ENTRIES='entries',AUDIO='audio';
function openLibrary(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in globalThis))return reject(Error('IndexedDB no disponible'));
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(ENTRIES))db.createObjectStore(ENTRIES,{keyPath:'id'});
   if(!db.objectStoreNames.contains(AUDIO))db.createObjectStore(AUDIO);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('No se pudo abrir la biblioteca'));
 });
}
const validId=id=>typeof id==='string'&&/^[a-z0-9-]{6,80}$/i.test(id);
const makeId=()=>globalThis.crypto?.randomUUID?.()||'sample-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
export async function saveLibrarySample(pad){
 const {buffer}=pad||{};if(!buffer)throw Error('Primero carga un audio');
 const {from,to}=padBounds(buffer,pad.from??0,pad.to??buffer.duration);
 const start=Math.floor(from*buffer.sampleRate),end=Math.min(buffer.length,Math.ceil(to*buffer.sampleRate));
 const length=end-start;
 if(length<1)throw Error('Recorte vacío');
 const channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,c)=>buffer.getChannelData(c).slice(start,end));
 const id=makeId(),name=String(pad.name||'Sample').trim().slice(0,60);
 const metadata={id,name,duration:length/buffer.sampleRate,fx:String(pad.fx||'original').slice(0,20),createdAt:new Date().toISOString()};
 const db=await openLibrary();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction([ENTRIES,AUDIO],'readwrite');
  tx.objectStore(ENTRIES).put(metadata);
  tx.objectStore(AUDIO).put({name,fx:metadata.fx,from:0,to:metadata.duration,sampleRate:buffer.sampleRate,length,channels},id);
  tx.oncomplete=()=>{db.close();resolve(metadata);};
  tx.onabort=()=>{db.close();reject(tx.error||Error('No hay espacio disponible para el sample'));};
  tx.onerror=()=>{}; // onabort owns cleanup and error notification
 });
}
export async function listLibrarySamples(){
 const db=await openLibrary();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ENTRIES,'readonly'),req=tx.objectStore(ENTRIES).getAll();
  req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
  req.onerror=()=>reject(req.error||Error('No se pudo consultar la biblioteca'));
  tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
 });
}
export async function loadLibrarySample(id){
 if(!validId(id))throw Error('Identificador de sample inválido');
 const db=await openLibrary();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(AUDIO,'readonly'),req=tx.objectStore(AUDIO).get(id);
  req.onsuccess=()=>{try{if(!req.result)throw Error('Sample ya no disponible');resolve(reviveSample(req.result));}catch(e){reject(e);}};
  req.onerror=()=>reject(req.error||Error('No se pudo leer el sample'));
  tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
 });
}
export async function deleteLibrarySample(id){
 if(!validId(id))throw Error('Identificador de sample inválido');
 const db=await openLibrary();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction([ENTRIES,AUDIO],'readwrite');
  tx.objectStore(ENTRIES).delete(id);tx.objectStore(AUDIO).delete(id);
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onabort=()=>{db.close();reject(tx.error||Error('No se pudo eliminar el sample'));};
 });
}
