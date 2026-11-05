import {clipSpeed} from './clip-edit.js';
import {clipsOf,ensureClips,clipDuration} from './track-clips.js';
export function extractCompTake(track,clipId,from,to,makeId){
  const source=clipsOf(track).find(clip=>clip.id===clipId);
  if(!source)throw Error('Clip no encontrado');
  const start=Number(from),end=Number(to),clipStart=Number(source.offset)||0,clipEnd=clipStart+clipDuration(source);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<clipStart||end>clipEnd||end-start<.02)throw Error('Rango de comping inválido');
  const rate=clipSpeed(source),relativeStart=(start-clipStart)*rate,relativeEnd=(end-clipStart)*rate;
  const next={...source,id:makeId(),name:(source.name||'Toma')+' · comp',offset:start,trimStart:(source.trimStart||0)+relativeStart,trimEnd:(source.trimEnd||0)+Math.max(0,(clipEnd-end)*rate),loop:undefined};
  ensureClips(track).push(next);return next;
}
