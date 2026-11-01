/** Offline/live, approximate monophonic pitch detection. Never uploads audio.
 * Autocorrelation with energy gate; not polyphonic, not medical or pro tuning.
 */
export const SOLFEGE=Object.freeze(['DO','DO♯','RE','RE♯','MI','FA','FA♯','SOL','SOL♯','LA','LA♯','SI']);
export const midiFrequency=midi=>440*Math.pow(2,(midi-69)/12);
export function solfege(midi){if(!Number.isFinite(midi))return '—';return SOLFEGE[((Math.round(midi)%12)+12)%12];}
export function estimateNote(samples,sampleRate=48000,{low=85,high=800}={}){
  if(!samples?.length||!Number.isFinite(sampleRate)||sampleRate<8000)return null;
  const n=samples.length,step=4;
  let sum=0,peak=0;
  for(let i=0;i<n;i+=step){const x=samples[i]||0;sum+=x*x;peak=Math.max(peak,Math.abs(x));}
  const rms=Math.sqrt(sum/Math.ceil(n/step));
  if(rms<.012||peak<.025)return null;
  const lo=Math.max(16,Math.floor(sampleRate/high)),hi=Math.min(Math.floor(sampleRate/low),n-150);
  let best={lag:0,confidence:.63};
  const candidates=[];
  for(let lag=lo;lag<=hi;lag+=2){
    let numerator=0,energy1=0,energy2=0;
    for(let i=0;i<n-lag;i+=step){
      const a=samples[i]||0,b=samples[i+lag]||0;
      numerator+=a*b;energy1+=a*a;energy2+=b*b;
    }
    const confidence=numerator/Math.sqrt(energy1*energy2+1e-9);
    if(confidence>.63)candidates.push({lag,confidence});
    if(confidence>best.confidence+.0004)best={lag,confidence};
  }
  if(!best.lag)return null;
  // Shortest near-optimal period avoids confusing harmonics with octaves.
  // Pure stable notes often correlate marginally better at 2× or 3× periods.
  best=candidates.find(c=>c.confidence>=best.confidence-.018)||best;
  const frequency=sampleRate/best.lag,midi=69+12*Math.log2(frequency/440);
  if(!Number.isFinite(midi)||midi<25||midi>105)return null;
  const nearest=Math.round(midi),cents=Math.round((midi-nearest)*100);
  return {frequency,midi,nearest,cents,confidence:best.confidence,rms,
    name:solfege(nearest),octave:Math.floor(nearest/12)-1};
}
export function noteRegions(buffer,{step=.40,maxRegions=550}={}){
  if(!buffer?.numberOfChannels||!buffer.sampleRate)throw Error('Se necesita una pista de audio');
  const sr=buffer.sampleRate,source=buffer.getChannelData(0),window=4096,regions=[];
  const limit=Math.min(maxRegions,Math.ceil(buffer.duration/step));
  for(let k=0;k<limit;k++){
    const sec=k*step,index=Math.floor(sec*sr),samples=new Float32Array(window);
    if(index>=source.length)break;
    samples.set(source.subarray(index,Math.min(source.length,index+window)));
    const note=estimateNote(samples,sr);
    if(note&&note.confidence>=.68)regions.push({from:sec,to:Math.min(buffer.duration,sec+step),
      detected:note.midi,confidence:Math.round(note.confidence*100)/100});
  }
  return regions;
}
export const AUTO_TUNE_MODES=Object.freeze([
  {id:'gentle',label:'Natural',strength:34,retune:32,maxShift:2},
  {id:'studio',label:'Estudio',strength:74,retune:75,maxShift:4},
  {id:'electro',label:'Electrónico',strength:100,retune:99,maxShift:7}
]);
export function targetForNote(midi,key=0,scale=2){
  const allowed=scale===0?[0,2,4,5,7,9,11]:scale===1?[0,2,3,5,7,8,10]:[0,1,2,3,4,5,6,7,8,9,10,11];
  let best=Math.round(midi),distance=Infinity;
  for(let n=Math.floor(midi)-7;n<=Math.ceil(midi)+7;n++){
    if(!allowed.includes(((n-key)%12+12)%12))continue;
    const delta=Math.abs(n-midi);
    if(delta<distance){best=n;distance=delta;}
  }
  return best;
}
export function autoTuneSegments(clip,regions,mode='gentle',key=0,scale=2){
  const preset=AUTO_TUNE_MODES.find(m=>m.id===mode);if(!preset)throw Error('Modo de afinación desconocido');
  if(!Array.isArray(regions))throw Error('Regiones inválidas');
  const output=regions.slice(0,550).filter(r=>Number.isFinite(r.detected)&&r.to>r.from).map(r=>{
    const target=targetForNote(r.detected,key,scale),semitones=Math.max(-preset.maxShift,Math.min(preset.maxShift,target-r.detected));
    return {from:r.from,to:r.to,semitones,target,detected:r.detected};
  });
  clip.pitchRegions=output;clip.autoTuneMode=mode;return output;
}
export function setNoteMask(clip,from,to,semitones){
  const a=Number(from),b=Number(to),shift=Number(semitones),dur=clip.buffer?.duration||0;
  if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(shift)||a<0||b>dur||
     b-a<.025||shift< -12||shift>12)throw Error('Selecciona un fragmento válido y desplazamiento entre −12 y +12 semitonos');
  clip.pitchRegions=[...(clip.pitchRegions||[]).filter(r=>r.to<=a||r.from>=b),
    {from:a,to:b,semitones:shift}].sort((x,y)=>x.from-y.from).slice(0,550);
  return clip.pitchRegions;
}
