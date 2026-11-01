/** Source-preserving clips within each mixer track.
 * A legacy track is one virtual clip; we migrate only when edited.
 * Each clip references an AudioBuffer; effects and routing belong to the track.
 */
import {clipSpeed} from './clip-edit.js';
const seconds=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
export const MAX_LOOP_REPEATS=64;
export function clipSourceBounds(clip){
  const duration=clip.buffer?.duration||0;
  const start=Math.min(duration,seconds(clip.trimStart));
  return {start,end:Math.max(start,duration-seconds(clip.trimEnd))};
}
export function validLoop(clip){
  const bounds=clipSourceBounds(clip),loop=clip.loop;
  if(!loop||!Number.isFinite(loop.from)||!Number.isFinite(loop.to)||
     !Number.isInteger(loop.repeats)||loop.repeats<1||loop.repeats>MAX_LOOP_REPEATS||
     loop.from<bounds.start||loop.to>bounds.end||loop.to-loop.from<.02)return null;
  return loop;
}
export function clipDuration(clip){
  const loop=validLoop(clip);
  return (loop?(loop.to-loop.from)*loop.repeats:
    Math.max(0,(clip.buffer?.duration||0)-seconds(clip.trimStart)-seconds(clip.trimEnd)))/clipSpeed(clip);
}
export function setClipLoop(clip,from,to,repeats){
  const bounds=clipSourceBounds(clip);
  const config={from:Number(from),to:Number(to),repeats:Number(repeats)};
  if(!Number.isFinite(config.from)||!Number.isFinite(config.to)||
     config.from<bounds.start||config.to>bounds.end||
     config.to-config.from<.02||!Number.isInteger(config.repeats)||
     config.repeats<1||config.repeats>MAX_LOOP_REPEATS)
    throw Error('Selecciona un fragmento válido (mínimo 0,02 s) y de 1 a 64 repeticiones');
  clip.loop=config;return config;
}
export function removeClipLoop(clip){delete clip.loop;}
/** Clone the pattern to the right on the same mixer track, zero-copy PCM. */
export function duplicateLoop(track,clipId,count,makeId){
  const clips=ensureClips(track),original=clips.find(c=>c.id===clipId);
  if(!original)throw Error('No se encontró el clip');
  if(!validLoop(original))throw Error('Primero crea un loop en el clip');
  const n=Number(count);
  if(!Number.isInteger(n)||n<1||n>16||clips.length+n>128)
    throw Error('Puedes duplicar entre 1 y 16 loops, con máximo de 128 clips en el canal');
  const copies=[],length=clipDuration(original);
  for(let i=0;i<n;i++)copies.push({...original,id:makeId(i),name:(original.name||'Loop')+' · copia '+(i+1),
    offset:seconds(original.offset)+length*(i+1),loop:{...original.loop}});
  clips.push(...copies);return copies;
}
export function clipsOf(track){
  if(Array.isArray(track.clips))return track.clips;
  return track.buffer?[{id:track.id+':original',name:track.name,buffer:track.buffer,
    offset:seconds(track.offset),trimStart:seconds(track.trimStart),trimEnd:seconds(track.trimEnd),
    fadeIn:seconds(track.fadeIn),fadeOut:seconds(track.fadeOut),...(track.loop?{loop:{...track.loop}}:{})}]:[];
}
export function ensureClips(track){
  if(!Array.isArray(track.clips))track.clips=clipsOf(track);
  return track.clips;
}
export function projectEnd(tracks){
  return tracks.reduce((duration,track)=>Math.max(duration,...clipsOf(track).map(clip=>seconds(clip.offset)+clipDuration(clip))),0);
}
export function addTrackClip(track,buffer,offset,id,name='Nueva toma'){
  if(!buffer||buffer.duration<=.01)throw Error('Audio demasiado corto');
  const clips=ensureClips(track);
  if(clips.length>=128)throw Error('Límite de 128 clips por pista');
  const clip={id,name:String(name).slice(0,80),buffer,offset:Math.min(3600,seconds(offset)),
    trimStart:0,trimEnd:0,fadeIn:0,fadeOut:0};
  clips.push(clip);return clip;
}
export function getEditableClip(track,clipId){
  const clips=clipsOf(track);
  return clips.find(c=>c.id===clipId)||clips[0]||null;
}
export function splitTrackClip(track,clipId,playhead,newId){
  const clips=ensureClips(track),index=clips.findIndex(clip=>clip.id===clipId);
  if(index<0)throw Error('Clip no encontrado');
  const clip=clips[index],duration=clipDuration(clip),at=playhead-seconds(clip.offset),sourceAt=at*clipSpeed(clip);
  if(at<=.05||at>=duration-.05)throw Error('Coloca el cabezal dentro del clip para dividir');
  const left={...clip,trimEnd:seconds(clip.trimEnd)+(duration-at)*clipSpeed(clip),fadeOut:0};
  const right={...clip,id:newId,name:clip.name+' · 2',offset:playhead,
    trimStart:seconds(clip.trimStart)+sourceAt,fadeIn:0};
  clips.splice(index,1,left,right);return [left,right];
}
export function cloneTrackMetadata(track){
  return {...track,loop:track.loop?{...track.loop}:undefined,clips:Array.isArray(track.clips)?track.clips.map(clip=>({...clip,loop:clip.loop?{...clip.loop}:undefined,pitchRegions:Array.isArray(clip.pitchRegions)?clip.pitchRegions.map(r=>({...r})):undefined})):undefined};
}
