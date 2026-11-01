/** Explicit independent clip operations, with original PCM never changed. */
export const MIN_SPEED=.5,MAX_SPEED=2;
export function clipSpeed(clip){return Math.max(MIN_SPEED,Math.min(MAX_SPEED,Number(clip?.speed)||1));}
export function setClipSpeed(clip,value){
  const speed=Number(value);
  if(!Number.isFinite(speed)||speed<MIN_SPEED||speed>MAX_SPEED)throw Error('Velocidad permitida: 0,5× a 2×');
  clip.speed=speed;return speed;
}
export function moveClip(clip,offset){
  const n=Number(offset);if(!Number.isFinite(n)||n<0||n>3600)throw Error('Posición fuera del proyecto');
  clip.offset=n;return n;
}
export function trimClip(clip,edge,seconds){
  if(!['start','end'].includes(edge))throw Error('Extremo inválido');
  if(clip.loop)throw Error('Desactiva el loop antes de recortar este fragmento');
  const value=Number(seconds),max=clip.buffer.duration;
  if(!Number.isFinite(value)||value<0||value>max)throw Error('Recorte inválido');
  const other=edge==='start'?Number(clip.trimEnd||0):Number(clip.trimStart||0);
  if(value+other>max-.02)throw Error('El fragmento debe conservar al menos 0,02 segundos');
  if(edge==='start')clip.trimStart=value;else clip.trimEnd=value;
  return clip;
}
export function editClipRegion(clip,{start,end,speed}){
  if(speed!==undefined)setClipSpeed(clip,speed);
  if(start!==undefined)trimClip(clip,'start',start);
  if(end!==undefined)trimClip(clip,'end',end);
  return clip;
}
