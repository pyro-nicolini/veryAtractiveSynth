/** Non-destructive micro-fades across hard source loop boundaries.
 * Avoids discontinuity clicks without reallocating the original PCM.
 * Uses precise WebAudio gain envelopes, not JS playback timers.
 */
export function loopBoundaryFades(loop,offsetInClip=0){
  if(!loop||!Number.isFinite(loop.to)||!Number.isFinite(loop.from)||
     !Number.isInteger(loop.repeats)||loop.repeats<1||loop.repeats>64)return [];
  const cycle=loop.to-loop.from;
  if(cycle<.02)return [];
  const remains=cycle*loop.repeats-offsetInClip;
  const events=[];
  for(let i=Math.floor(offsetInClip/cycle)+1;i<loop.repeats;i++){
    const relative=i*cycle-offsetInClip;
    const width=Math.min(.008,cycle*.10,relative*.45,(remains-relative)*.45);
    if(relative>0&&width>=.00025)
      events.push({before:relative-width,center:relative,after:relative+width});
  }
  return events;
}
