/* IndexedDB snapshots stay on the current device. Nothing leaves the browser. */
const DB='veryatractivesynth',VERSION=1;
function openDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in globalThis))return reject(Error('Este navegador no admite guardado local'));
    const request=indexedDB.open(DB,VERSION);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('projects'))request.result.createObjectStore('projects');};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function transact(db,mode,method,value){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('projects',mode),store=tx.objectStore('projects');
    const req=method==='put'?store.put(value,'last-session'):store.get('last-session');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    tx.oncomplete=()=>db.close();tx.onerror=()=>db.close();
  });
}
export async function saveSession(tracks,master,options={}){
  const data={
    savedAt:new Date().toISOString(),master,options,
    tracks:tracks.map(t=>({
      id:t.id,name:t.name,color:t.color,type:t.type,
      settings:(( {buffer,peaks,...rest} )=>rest)(t),
      rate:t.buffer.sampleRate,channels:Array.from({length:t.buffer.numberOfChannels},(_,c)=>t.buffer.getChannelData(c).slice()),
    }))
  };
  const db=await openDB();await transact(db,'readwrite','put',data);return data.savedAt;
}
export async function loadSession(ctx){
  const db=await openDB(),data=await transact(db,'readonly','get');
  if(!data)return null;
  return {
    master:data.master,options:data.options||{},
    tracks:data.tracks.map(t=>{
      const buffer=ctx.createBuffer(t.channels.length,t.channels[0].length,t.rate);
      t.channels.forEach((channel,c)=>buffer.copyToChannel(channel,c));
      return {...t.settings,id:t.id,name:t.name,color:t.color,type:t.type,buffer};
    })
  };
}
