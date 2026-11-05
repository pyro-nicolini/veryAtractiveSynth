import {clipsOf,ensureClips,clipDuration} from './track-clips.js';

export function copyClip(track,clipId){
 const clip=clipsOf(track).find(item=>item.id===clipId)||clipsOf(track)[0];
 if(!clip)throw Error('No hay un clip seleccionado');
 return {...clip,loop:clip.loop?{...clip.loop}:undefined,pitchRegions:Array.isArray(clip.pitchRegions)?clip.pitchRegions.map(region=>({...region})):undefined};
}

export function pasteClip(track,clipboard,offset,makeId){
 if(!clipboard?.buffer)throw Error('No hay un clip copiado');
 const clips=ensureClips(track);
 if(clips.length>=128)throw Error('Límite de 128 clips por pista');
 const position=Number(offset);
 if(!Number.isFinite(position)||position<0||position>3600)throw Error('Posición de pegado inválida');
 const clip={...clipboard,id:makeId(),offset:position,name:String(clipboard.name||'Clip')+' · pegado',loop:clipboard.loop?{...clipboard.loop}:undefined,pitchRegions:Array.isArray(clipboard.pitchRegions)?clipboard.pitchRegions.map(region=>({...region})):undefined};
 clips.push(clip);return clip;
}

export function pasteAfterClip(track,clipboard,clipId,makeId){
 const source=clipsOf(track).find(item=>item.id===clipId);
 if(!source)throw Error('No hay un clip de destino');
 return pasteClip(track,clipboard,(Number(source.offset)||0)+clipDuration(source),makeId);
}
