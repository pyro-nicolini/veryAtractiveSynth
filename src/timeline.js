/** Timeline utilities are pure: edits remain non-destructive and testable. */
import {clamp,effectiveDuration,projectDuration} from './dsp.js';
export const MIN_TIMELINE_SECONDS=20;
export function timelineSpan(tracks,extra=8){
  const total=projectDuration(tracks);
  return Math.max(MIN_TIMELINE_SECONDS,total+Math.max(extra,total*.12));
}
export function pointerTime(clientX,rect,span){
  if(!rect.width||!Number.isFinite(rect.width))return 0;
  return clamp((clientX-rect.left)/rect.width,0,1)*Math.max(0,span);
}
export function snappedTime(time,bpm,snap=false){
  const value=Math.max(0,time);
  if(!snap||!Number.isFinite(bpm)||bpm<40||bpm>240)return Math.round(value*100)/100;
  const step=60/bpm;
  return Math.max(0,Math.round(value/step)*step);
}
export function setOffset(track,time,bpm=120,snap=false){
  track.offset=Math.min(3600,snappedTime(time,bpm,snap));
  return track.offset;
}
export function adjustTrim(track,side,seconds){
  if(!['start','end'].includes(side))throw Error('Selección inválida');
  const duration=track.buffer.duration;
  const current=side==='start'?(track.trimEnd||0):(track.trimStart||0);
  const max=Math.max(0,duration-current-.02);
  track[side==='start'?'trimStart':'trimEnd']=clamp(seconds,0,max);
  track.fadeIn=Math.min(track.fadeIn||0,effectiveDuration(track));
  track.fadeOut=Math.min(track.fadeOut||0,effectiveDuration(track));
}
export function beatsForSpan(span,bpm,maxLines=240){
  if(!Number.isFinite(bpm)||bpm<=0)return [];
  const step=60/bpm,lines=[];
  for(let i=0;i<=maxLines&&i*step<=span;i++)lines.push({second:i*step,measure:Math.floor(i/4)+1,strong:i%4===0});
  return lines;
}

/** Split an AudioBuffer-backed clip non-destructively at the playhead.
    Both resulting clips reference the original buffer and have separate settings.
    New ID is supplied by caller to keep this helper deterministic. */
export function splitClip(track,playhead,newId){
  const offset=track.offset||0,total=effectiveDuration(track);
  const at=playhead-offset;
  if(at<=.05||at>=total-.05)throw Error('Mueve el marcador dentro del sonido para dividirlo');
  const left={...track,trimEnd:(track.trimEnd||0)+(total-at),fadeOut:0};
  const right={...track,id:newId,name:track.name+' · 2',offset:playhead,
    trimStart:(track.trimStart||0)+at,fadeIn:0};
  left.fadeIn=Math.min(left.fadeIn||0,effectiveDuration(left));
  right.fadeOut=Math.min(right.fadeOut||0,effectiveDuration(right));
  return [left,right];
}
