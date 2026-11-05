import {clipsOf,ensureClips} from './track-clips.js';
import {clipSpeed,MIN_SPEED,MAX_SPEED} from './clip-edit.js';

/** Retimes all clips and timeline automation together. Original buffers stay untouched. */
export function retimeProject(tracks,oldBpm,newBpm){
  const old=Number(oldBpm),next=Number(newBpm);
  if(!Number.isFinite(old)||!Number.isFinite(next)||old<40||next<40||old>240||next>240)throw Error('El tempo debe estar entre 40 y 240 BPM');
  const factor=next/old;
  if(Math.abs(factor-1)<1e-10)return factor;
  for(const track of tracks)for(const clip of clipsOf(track)){
    const speed=clipSpeed(clip)*factor;
    if(speed<MIN_SPEED-1e-9||speed>MAX_SPEED+1e-9)throw Error('Esta velocidad supera el límite de un clip (0,5× a 2×). Ajusta ese clip o elige un BPM más cercano.');
    if((clip.offset||0)/factor>3600)throw Error('La nueva velocidad dejaría un clip fuera de la línea de tiempo.');
  }
  for(const track of tracks){
    for(const clip of ensureClips(track)){
      clip.speed=Math.min(MAX_SPEED,Math.max(MIN_SPEED,clipSpeed(clip)*factor));
      clip.offset=(clip.offset||0)/factor;
      clip.fadeIn=(clip.fadeIn||0)/factor;clip.fadeOut=(clip.fadeOut||0)/factor;
    }
    if(track.automation)track.automation=Object.fromEntries(Object.entries(track.automation).map(([key,points])=>[
      key,Array.isArray(points)?points.map(point=>Number.isFinite(point.time)?{...point,time:point.time/factor}:point):points
    ]));
  }
  return factor;
}
