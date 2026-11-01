import {encodeWav,defaults,clamp,COLORS} from './dsp.js';
import {zipStore,unzipStore} from './zip-store.js';
import {setClipLoop} from './track-clips.js';
import {clipSpeed} from './clip-edit.js';

const textEncoder=new TextEncoder(),textDecoder=new TextDecoder();

/** Decode the exact IEEE float WAV that this app writes. This does not depend
    on native mobile decodeAudioData support for 32-bit float WAV. */
export function decodeProjectWav(bytes,ctx){
  if(bytes.length<44)throw Error('WAV de respaldo demasiado corto');
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const tag=(i)=>String.fromCharCode(bytes[i],bytes[i+1],bytes[i+2],bytes[i+3]);
  if(tag(0)!=='RIFF'||tag(8)!=='WAVE'||tag(12)!=='fmt '||tag(36)!=='data')throw Error('WAV de respaldo inválido');
  const format=dv.getUint16(20,true),channels=dv.getUint16(22,true),rate=dv.getUint32(24,true),depth=dv.getUint16(34,true);
  const size=dv.getUint32(40,true);
  if(format!==3||depth!==32||(channels!==1&&channels!==2)||rate<8000||rate>192000)
    throw Error('Formato de WAV de respaldo no admitido');
  if(size+44!==bytes.byteLength||size%(channels*4)!==0)throw Error('WAV de respaldo incompleto');
  const frames=size/(channels*4);
  if(frames>rate*1200)throw Error('La pista del respaldo es demasiado larga');
  const buffer=ctx.createBuffer(channels,frames,rate);
  const outputs=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));
  for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){
    const value=dv.getFloat32(44+(i*channels+c)*4,true);
    outputs[c][i]=Number.isFinite(value)?value:0;
  }
  return buffer;
}

export async function exportProject(tracks,master,options={}){
  if(!tracks.length)throw Error('Agrega una pista antes de respaldar');
  const manifest={format:'veryAtractiveSynth-project',version:2,createdAt:new Date().toISOString(),
    master,options,tracks:[]};
  const entries=[],media=new Map();
  const audioFile=buffer=>{
    if(media.has(buffer))return media.get(buffer);
    const file='audio/'+String(media.size+1).padStart(3,'0')+'.wav';
    media.set(buffer,file);
    entries.push({name:file,data:encodeWav(buffer,32)});
    return file;
  };
  for(const track of tracks){
    const {buffer,clips,...settings}=track;
    const file=audioFile(buffer);
    const exported={...settings,file};
    if(Array.isArray(clips))exported.clips=clips.map(clip=>{
      const {buffer:clipBuffer,...props}=clip;
      return {...props,file:audioFile(clipBuffer)};
    });
    manifest.tracks.push(exported);
  }
  entries.unshift({name:'project.json',data:textEncoder.encode(JSON.stringify(manifest))});
  return zipStore(entries);
}
export async function importProject(file,ctx){
  const entries=await unzipStore(file);
  const raw=entries.get('project.json');
  if(!raw||raw.byteLength>2e6)throw Error('Falta el manifiesto del proyecto');
  let manifest;try{manifest=JSON.parse(textDecoder.decode(raw));}
  catch{throw Error('Manifiesto del proyecto inválido');}
  if(manifest.format!=='veryAtractiveSynth-project'||![1,2].includes(manifest.version)||!Array.isArray(manifest.tracks)||manifest.tracks.length>80)
    throw Error('Este proyecto no es compatible con esta versión');
  const tracks=[],mediaCache=new Map();
  const loadAudio=file=>{
    if(!mediaCache.has(file))mediaCache.set(file,decodeProjectWav(entries.get(file),ctx));
    return mediaCache.get(file);
  };
  for(const t of manifest.tracks){
    if(typeof t.file!=='string'||!/^audio\/\d{3}\.wav$/.test(t.file)||!entries.has(t.file))
      throw Error('Falta un archivo de sonido del proyecto');
    const bin=entries.get(t.file);
    const buffer=loadAudio(t.file);
    if(buffer.duration>60*20)throw Error('Pista demasiado larga para este estudio');
    const restoredClips=Array.isArray(t.clips)?t.clips.map(clip=>{
      if(typeof clip.file!=='string'||!/^audio\/\d{3}\.wav$/.test(clip.file)||!entries.has(clip.file))
        throw Error('Falta un clip de audio en el respaldo');
      const clipBuffer=loadAudio(clip.file);
      const restored={id:String(clip.id||'clip-'+tracks.length).slice(0,128),name:String(clip.name||'Toma').slice(0,80),buffer:clipBuffer,
        offset:clamp(clip.offset,0,3600),trimStart:clamp(clip.trimStart,0,clipBuffer.duration),trimEnd:clamp(clip.trimEnd,0,clipBuffer.duration),
        fadeIn:clamp(clip.fadeIn,0,30),fadeOut:clamp(clip.fadeOut,0,30),speed:clipSpeed(clip)};
      if(clip.loop){
        try{setClipLoop(restored,clip.loop.from,clip.loop.to,clip.loop.repeats);}
        catch{throw Error('El respaldo contiene un loop inválido');}
      }
      return restored;
    }):null;
    if(restoredClips&&restoredClips.length>128)throw Error('Demasiados clips en una pista');
    tracks.push({...defaults(),
      id:typeof t.id==='string'&&t.id.length<128?t.id:globalThis.crypto?.randomUUID?.()||'track-'+Date.now()+tracks.length,
      name:String(t.name||'Pista').slice(0,80),
      type:['voice','audio','demo'].includes(t.type)?t.type:'audio',
      color:COLORS.includes(t.color)?t.color:COLORS[tracks.length%COLORS.length],
      volume:clamp(t.volume,0,100),autotune:clamp(t.autotune,0,100),retune:clamp(t.retune,0,100),
      clean:clamp(t.clean,0,100),brightness:clamp(t.brightness,0,100),
      warmth:clamp(t.warmth,0,100),echo:clamp(t.echo,0,100),space:clamp(t.space,0,100),
      drive:clamp(t.drive,0,100),pan:clamp(t.pan,-100,100),key:clamp(t.key,0,11),
      scale:clamp(t.scale,0,2),trimStart:clamp(t.trimStart,0,buffer.duration),
      trimEnd:clamp(t.trimEnd,0,buffer.duration),offset:clamp(t.offset,0,3600),
      fadeIn:clamp(t.fadeIn,0,30),fadeOut:clamp(t.fadeOut,0,30),
      muted:!!t.muted,solo:!!t.solo,bypassEffects:!!t.bypassEffects,
      fxBypass:Object.fromEntries(['tune','clean','eq','drive','compressor','delay','reverb'].map(id=>[id,t.fxBypass?.[id]===true])),
      bus:['music','vocals','fx'].includes(t.bus)?t.bus:(t.type==='voice'?'vocals':'music'),
      tuneX:clamp(t.tuneX??((clamp(t.retune??60,5,100)-5)/95*2-1),-1,1),tuneY:clamp(t.tuneY??(clamp(t.autotune,0,100)/50-1),-1,1),
      tunePreset:typeof t.tunePreset==='string'&&t.tunePreset.length<42?t.tunePreset:'custom',
      preset:typeof t.preset==='string'?t.preset:'natural',voiceStyle:typeof t.voiceStyle==='string'&&t.voiceStyle.length<60?t.voiceStyle:null,buffer,
      ...(restoredClips?{clips:restoredClips}:{})
    });
  }
  return {master:clamp(manifest.master??85,0,100),options:manifest.options||{},tracks};
}
