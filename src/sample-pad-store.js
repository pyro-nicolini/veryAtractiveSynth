/** Twelve reusable local-only samples. Independent IndexedDB from sessions. */
const DB='vas-personal-samples',STORE='pads';
export function storageRecord(buffer,name,from=0,to=buffer.duration,fx='original'){
 if(!buffer||buffer.numberOfChannels<1||buffer.numberOfChannels>2||buffer.duration>30)throw Error('Sample demasiado largo');
 return {name:String(name||'Sample').slice(0,36),from,to,fx:String(fx||'original').slice(0,20),sampleRate:buffer.sampleRate,length:buffer.length,
  channels:Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c).slice())};
}
export function reviveSample(record){
 if(!record||!Number.isFinite(record.sampleRate)||record.sampleRate<8000||record.sampleRate>192000||
   !Number.isInteger(record.length)||record.length<1||record.length>record.sampleRate*30||
   !Array.isArray(record.channels)||record.channels.length<1||record.channels.length>2)throw Error('Sample inválido');
 const audio=new AudioBuffer({numberOfChannels:record.channels.length,length:record.length,sampleRate:record.sampleRate});
 for(let i=0;i<record.channels.length;i++){
  if(record.channels[i].length!==record.length)throw Error('Sample incompleto');
  audio.copyToChannel(record.channels[i],i);
 }
 return {name:String(record.name||'Sample').slice(0,36),fx:String(record.fx||'original').slice(0,20),buffer:audio,
  from:Math.max(0,Math.min(audio.duration,record.from||0)),
  to:Math.min(audio.duration,record.to||audio.duration)};
}
function open(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in globalThis))return reject(Error('No se puede guardar samples en este navegador'));
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('No se pudo abrir la biblioteca'));
 });
}
export async function savePad(index,pad){
 if(!Number.isInteger(index)||index<0||index>=12)throw Error('Pad inválido');
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  if(pad)store.put(storageRecord(pad.buffer,pad.name,pad.from,pad.to,pad.fx),index);
  else store.delete(index);
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onerror=()=>{db.close();reject(tx.error||Error('Error de almacenamiento'))};
 });
}
export async function loadPads(){
 const db=await open();
 return new Promise((resolve,reject)=>{
  const pads=Array(12).fill(null),tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
  const req=store.openCursor();
  req.onsuccess=()=>{
   const cursor=req.result;if(!cursor)return;
   const key=cursor.key;
   if(Number.isInteger(key)&&key>=0&&key<12){try{pads[key]=reviveSample(cursor.value);}catch{}}
   cursor.continue();
  };
  tx.oncomplete=()=>{db.close();resolve(pads);};
  tx.onerror=()=>{db.close();reject(tx.error||Error('No se pudieron leer los samples'))};
 });
}
