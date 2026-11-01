/* Local, incremental IndexedDB projects.
   Version 2 migrates the v1 full-session data without discarding it.
   PCM is stored once per AudioBuffer identity; changing a knob writes metadata,
   not a new clone of every audio sample. Everything stays on the device. */
const DB='veryatractivesynth', VERSION=2;
const MAX_NAMED_PROJECTS=30;
const keys=new WeakMap();
const id=()=>globalThis.crypto?.randomUUID?.()||('vas-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const normaliseId=value=>value==='last-session'?'last-session':typeof value==='string'&&/^named:[a-zA-Z0-9._-]{1,100}$/.test(value)?value:null;
const safeName=name=>String(name||'Proyecto sin nombre').trim().slice(0,72)||'Proyecto sin nombre';
function openDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in globalThis))return reject(Error('Este navegador no admite almacenamiento local'));
    const request=indexedDB.open(DB,VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects');
      if(!db.objectStoreNames.contains('audio'))db.createObjectStore('audio');
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||Error('No se pudo abrir la base local'));
    request.onblocked=()=>reject(Error('Cierra otras pestañas del estudio y vuelve a intentar'));
  });
}
function waitTx(tx,db){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=()=>{db.close();reject(tx.error||Error('Error de almacenamiento local'));};
    tx.onabort=()=>{db.close();reject(tx.error||Error('Operación cancelada'));};
  });
}
function getAudioKey(buffer){
  if(!keys.has(buffer))keys.set(buffer,id());
  return keys.get(buffer);
}
function metaFor(track){
  const {buffer,clips,...settings}=track;
  return {...settings,audioKey:getAudioKey(buffer),
    ...(Array.isArray(clips)?{clips:clips.map(({buffer,...clip})=>({...clip,audioKey:getAudioKey(buffer)}))}:{})};
}
function pcmFor(buffer){
  return {sampleRate:buffer.sampleRate,channels:Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c).slice())};
}
export async function saveSession(tracks,master,options={},key='last-session',name=''){
  const projectId=normaliseId(key);
  if(!projectId)throw Error('Identificador de proyecto inválido');
  const db=await openDB();
  const tx=db.transaction(['projects','audio'],'readwrite'),projects=tx.objectStore('projects'),audio=tx.objectStore('audio');
  const done=waitTx(tx,db);
  const savedAt=new Date().toISOString(),seen=new Set();
  const registerAudio=buffer=>{
    const audioKey=getAudioKey(buffer);
    if(seen.has(audioKey))return;
    seen.add(audioKey);
    const req=audio.get(audioKey);
    req.onsuccess=()=>{if(!req.result)audio.put(pcmFor(buffer),audioKey);};
  };
  const records=tracks.map(track=>{
    registerAudio(track.buffer);
    if(Array.isArray(track.clips))for(const clip of track.clips)registerAudio(clip.buffer);
    return metaFor(track);
  });
  projects.put({format:2,savedAt,name:safeName(name||'Sesión actual'),master,options,tracks:records},projectId);
  await done;
  return savedAt;
}
function buildSession(ctx,record,pcm){
  if(!record)return null;
  if(record.format!==2){
    // Backward compatibility: v1 saved channel arrays within each track.
    return {master:record.master,options:record.options||{},tracks:record.tracks.map(track=>{
      const buffer=ctx.createBuffer(track.channels.length,track.channels[0].length,track.rate);
      track.channels.forEach((samples,c)=>buffer.copyToChannel(samples,c));
      return {...track.settings,id:track.id,name:track.name,color:track.color,type:track.type,buffer};
    })};
  }
  const bufferCache=new Map();
  const getBuffer=audioKey=>{
    if(bufferCache.has(audioKey))return bufferCache.get(audioKey);
    const source=pcm.get(audioKey);
    if(!source)throw Error('El proyecto tiene un clip sin audio. Restaura un respaldo .vasproject');
    const buffer=ctx.createBuffer(source.channels.length,source.channels[0].length,source.sampleRate);
    source.channels.forEach((samples,c)=>buffer.copyToChannel(samples,c));
    keys.set(buffer,audioKey);bufferCache.set(audioKey,buffer);
    return buffer;
  };
  const tracks=record.tracks.map(track=>{
    const {audioKey,clips,...settings}=track;
    return {...settings,buffer:getBuffer(audioKey),
      ...(Array.isArray(clips)?{clips:clips.map(clip=>{
        const {audioKey,...meta}=clip;
        return {...meta,buffer:getBuffer(audioKey)};
      })}:{})};
  });
  return {master:record.master,options:record.options||{},tracks};
}
export async function loadSession(ctx,key='last-session'){
  const projectId=normaliseId(key);
  if(!projectId)throw Error('Proyecto inválido');
  const db=await openDB(),tx=db.transaction(['projects','audio'],'readonly');
  const projects=tx.objectStore('projects'),audio=tx.objectStore('audio');
  const done=waitTx(tx,db);
  const found=await new Promise((resolve,reject)=>{
    const req=projects.get(projectId);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  if(!found){await done;return null;}
  if(found.format!==2){await done;return buildSession(ctx,found,new Map());}
  const sounds=new Map();
  const needed=found.tracks.flatMap(t=>[t.audioKey,...(Array.isArray(t.clips)?t.clips.map(c=>c.audioKey):[])]);
  await Promise.all([...new Set(needed)].map(key=>new Promise((resolve,reject)=>{
    const req=audio.get(key);
    req.onsuccess=()=>{sounds.set(key,req.result);resolve();};
    req.onerror=()=>reject(req.error);
  })));
  await done;
  return buildSession(ctx,found,sounds);
}
export async function listNamedProjects(){
  const db=await openDB(),tx=db.transaction('projects','readonly'),store=tx.objectStore('projects');
  const done=waitTx(tx,db);
  const records=await new Promise((resolve,reject)=>{
    const out=[],cursor=store.openCursor();
    cursor.onsuccess=()=>{
      const value=cursor.result;
      if(!value){resolve(out);return;}
      if(typeof value.key==='string'&&value.key.startsWith('named:')){
        out.push({id:value.key,name:value.value.name||'Proyecto',savedAt:value.value.savedAt||'',tracks:value.value.tracks?.length||0});
      }
      value.continue();
    };
    cursor.onerror=()=>reject(cursor.error);
  });
  await done;
  return records.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
}
export async function saveNamedProject(tracks,master,options,name){
  const projects=await listNamedProjects();
  if(projects.length>=MAX_NAMED_PROJECTS)throw Error('Máximo de 30 proyectos locales. Borra uno o exporta su respaldo');
  const key='named:'+id();
  await saveSession(tracks,master,options,key,name);
  return key;
}
export async function deleteNamedProject(key){
  const projectId=normaliseId(key);
  if(!projectId||projectId==='last-session')throw Error('Proyecto no eliminable');
  const db=await openDB(),tx=db.transaction('projects','readwrite');
  const done=waitTx(tx,db);
  tx.objectStore('projects').delete(projectId);
  await done;
  await pruneOrphanAudio();
}

/** Reclaim PCM no longer referenced by any saved project. Run only on an
    explicit deletion or a maintenance action, not on every knob movement. */
export async function pruneOrphanAudio(){
  const db=await openDB(),tx=db.transaction(['projects','audio'],'readwrite');
  const done=waitTx(tx,db),projects=tx.objectStore('projects'),audio=tx.objectStore('audio');
  let deleted=0;
  const all=projects.getAll();
  all.onsuccess=()=>{
    const used=new Set();
    for(const record of all.result){
      if(record?.format!==2)continue;
      for(const track of record.tracks||[]){
        if(track.audioKey)used.add(track.audioKey);
        for(const clip of track.clips||[])if(clip.audioKey)used.add(clip.audioKey);
      }
    }
    const cursor=audio.openCursor();
    cursor.onsuccess=()=>{
      const item=cursor.result;
      if(!item)return;
      if(!used.has(item.key)){item.delete();deleted++;}
      item.continue();
    };
  };
  await done;return deleted;
}
