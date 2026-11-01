/** Offline/live, approximate monophonic pitch detection. Never uploads audio.
 * Autocorrelation with energy gate; not polyphonic, not medical or pro tuning.
 */
export const SOLFEGE=Object.freeze(['DO','DO♯','RE','RE♯','MI','FA','FA♯','SOL','SOL♯','LA','LA♯','SI']);
export const midiFrequency=midi=>440*Math.pow(2,(midi-69)/12);
export function solfege(midi){if(!Number.isFinite(midi))return '—';return SOLFEGE[((Math.round(midi)%12)+12)%12];}
/** YIN-like normalized-difference detector, A4=440 Hz.
 * Detects a stable monophonic fundamental, rejecting harmonics and silence.
 */
export function estimateNote(samples,sampleRate=48000,{low=80,high=800}={}){
 if(!samples?.length||!Number.isFinite(sampleRate)||sampleRate<8000)return null;
 const n=samples.length;
 let rms=0,peak=0,mean=0;
 for(let i=0;i<n;i++){const v=samples[i]||0;rms+=v*v;mean+=v;peak=Math.max(peak,Math.abs(v));}
 rms=Math.sqrt(rms/n);mean/=n;
 if(rms<.016||peak<.04)return null;
 // Work on a decimated, DC-corrected signal to bound CPU work on phones.
 const decimate=sampleRate>=32000?2:1,rate=sampleRate/decimate;
 const length=Math.floor(n/decimate),data=new Float32Array(length);
 for(let i=0;i<length;i++)data[i]=(samples[i*decimate]||0)-mean;
 const minLag=Math.max(8,Math.floor(rate/high)),maxLag=Math.min(Math.ceil(rate/low),Math.floor(length*.48));
 if(maxLag<=minLag)return null;
 const differences=new Float32Array(maxLag+1),cmnd=new Float32Array(maxLag+1);
 let cumulative=0;
 for(let tau=1;tau<=maxLag;tau++){
  let difference=0;
  const last=length-tau;
  for(let i=0;i<last;i+=2){
   const d=data[i]-data[i+tau];difference+=d*d;
  }
  differences[tau]=difference;cumulative+=difference;
  cmnd[tau]=cumulative>1e-8?difference*tau/cumulative:1;
 }
 let candidate=-1;
 const threshold=.13;
 for(let tau=minLag;tau<=maxLag;tau++){
  if(cmnd[tau]>=threshold)continue;
  while(tau+1<=maxLag&&cmnd[tau+1]<cmnd[tau])tau++;
  candidate=tau;break;
 }
 if(candidate<0){
  let best=1;
  for(let tau=minLag;tau<=maxLag;tau++)if(cmnd[tau]<cmnd[best])best=tau;
  if(cmnd[best]>.19)return null;
  candidate=best;
 }
 const previous=cmnd[Math.max(1,candidate-1)],middle=cmnd[candidate],next=cmnd[Math.min(maxLag,candidate+1)];
 const denominator=previous-2*middle+next;
 const correction=Math.abs(denominator)>1e-8?Math.max(-1,Math.min(1,.5*(previous-next)/denominator)):0;
 const refined=candidate+correction;
 const frequency=rate/refined,midi=69+12*Math.log2(frequency/440);
 const confidence=1-middle;
 if(!Number.isFinite(midi)||midi<25||midi>105||confidence<.80||frequency<low||frequency>high)return null;
 const nearest=Math.round(midi),cents=Math.round((midi-nearest)*100);
 return {frequency,midi,nearest,cents,confidence,rms,name:solfege(nearest),octave:Math.floor(nearest/12)-1};
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
  const retained=[];
  for(const region of clip.pitchRegions||[]){
    if(region.to<=a||region.from>=b){retained.push({...region});continue;}
    if(region.from<a)retained.push({...region,to:a});
    if(region.to>b)retained.push({...region,from:b});
  }
  clip.pitchRegions=[...retained,{from:a,to:b,semitones:shift}]
    .sort((x,y)=>x.from-y.from).slice(0,550);
  return clip.pitchRegions;
}
