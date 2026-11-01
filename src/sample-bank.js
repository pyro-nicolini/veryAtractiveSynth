/** 12-pad private sample bank. PCM is copied only when a source is imported.
 * Pad trims remain non-destructive, and 12 audio buffers are bounded to 30s each.
 */
export const PAD_COUNT=12;
export const MAX_SAMPLE_SECONDS=30;
export const PAD_KEYS=Object.freeze(['1','2','3','4','5','6','7','8','9','0','-','=']);
export function safePadName(name,index){
  return String(name||'Sample '+String(index+1).padStart(2,'0')).replace(/[\u0000-\u001f]/g,'').trim().slice(0,36)||'Sample '+(index+1);
}
export function padBounds(buffer,from=0,to=buffer?.duration){
  if(!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0)
    throw Error('Cada sample debe durar entre 0 y 30 segundos. Recorta primero la pista original.');
  const a=Number(from),b=Number(to);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b>buffer.duration+.000001||b-a<.02||b-a>MAX_SAMPLE_SECONDS)
    throw Error('Selecciona un fragmento de al menos 0,02 segundos');
  return {from:a,to:Math.min(b,buffer.duration),duration:b-a};
}
export function copySample(ctx,buffer,from=0,to=buffer.duration){
  const bounds=padBounds(buffer,from,to);
  const start=Math.floor(bounds.from*buffer.sampleRate),end=Math.min(buffer.length,Math.ceil(bounds.to*buffer.sampleRate));
  const length=end-start;
  if(length<=0)throw Error('El fragmento no contiene muestras');
  const channels=Math.min(2,buffer.numberOfChannels);
  const copy=ctx.createBuffer(channels,length,buffer.sampleRate);
  for(let i=0;i<channels;i++)
    copy.copyToChannel(buffer.getChannelData(i).subarray(start,end),i);
  return copy;
}
export function waveformPoints(buffer,{count=38,from=0,to=buffer?.duration}={}){
  if(!buffer)return [];
  const bounds=padBounds(buffer,from,to),source=buffer.getChannelData(0);
  const start=Math.floor(bounds.from*buffer.sampleRate),end=Math.min(source.length,Math.ceil(bounds.to*buffer.sampleRate));
  return Array.from({length:count},(_,i)=>{
    const a=Math.floor(start+(end-start)*i/count),b=Math.min(end,Math.ceil(start+(end-start)*(i+1)/count));
    let peak=0;
    for(let k=a;k<b;k+=Math.max(1,Math.floor((b-a)/26)))peak=Math.max(peak,Math.abs(source[k]||0));
    return Math.min(1,peak);
  });
}
export function signalQuality(buffer){
  if(!buffer||buffer.length===0)return {valid:false,rms:0,peak:0};
  const channels=Math.min(buffer.numberOfChannels||1,2),stride=Math.max(1,Math.floor(buffer.length/24000));
  let sum=0,peak=0,count=0;
  for(let c=0;c<channels;c++){
    const data=buffer.getChannelData(c);
    for(let i=0;i<data.length;i+=stride){
      const v=data[i]||0;sum+=v*v;peak=Math.max(peak,Math.abs(v));count++;
    }
  }
  const rms=Math.sqrt(sum/Math.max(1,count));
  return {valid:buffer.duration>=.08&&rms>=.0008&&peak>=.004,rms,peak};
}
