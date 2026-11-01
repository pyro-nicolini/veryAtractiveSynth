/** Source-preserving clips within each mixer track.
 * A legacy track is one virtual clip; we migrate only when edited.
 * Each clip references an AudioBuffer; effects and routing belong to the track.
 */
const seconds=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
export function clipDuration(clip){
  return Math.max(0,(clip.buffer?.duration||0)-seconds(clip.trimStart)-seconds(clip.trimEnd));
}
export function clipsOf(track){
  if(Array.isArray(track.clips))return track.clips;
  return track.buffer?[{id:track.id+':original',name:track.name,buffer:track.buffer,
    offset:seconds(track.offset),trimStart:seconds(track.trimStart),trimEnd:seconds(track.trimEnd),
    fadeIn:seconds(track.fadeIn),fadeOut:seconds(track.fadeOut)}]:[];
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
  const clip=clips[index],duration=clipDuration(clip),at=playhead-seconds(clip.offset);
  if(at<=.05||at>=duration-.05)throw Error('Coloca el cabezal dentro del clip para dividir');
  const left={...clip,trimEnd:seconds(clip.trimEnd)+(duration-at),fadeOut:0};
  const right={...clip,id:newId,name:clip.name+' · 2',offset:playhead,
    trimStart:seconds(clip.trimStart)+at,fadeIn:0};
  clips.splice(index,1,left,right);return [left,right];
}
export function cloneTrackMetadata(track){
  return {...track,clips:Array.isArray(track.clips)?track.clips.map(clip=>({...clip})):undefined};
}
