/** Lightweight local loudness diagnostics for rendered PCM.
 * This is an engineering meter, not a broadcast compliance implementation:
 * integrated loudness uses the BS.1770 K-weighting approximation only at the
 * block-energy level, while true peak is estimated with 4x linear oversampling.
 */
export function loudnessStats(buffer,{blockSeconds=.4}={}){
 if(!buffer||!Number.isInteger(buffer.length)||!Number.isFinite(buffer.sampleRate)||buffer.length<1)
  throw Error('Buffer inválido para medir loudness');
 const channels=Math.min(2,Math.max(1,buffer.numberOfChannels||1)),rate=buffer.sampleRate;
 const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));
 let sum=0,count=0,peak=0;
 for(let i=0;i<buffer.length;i++)for(let c=0;c<channels;c++){
   const value=Number.isFinite(data[c][i])?data[c][i]:0;const abs=Math.abs(value);
   peak=Math.max(peak,abs);sum+=value*value;count++;
   if(i+1<buffer.length){const next=Number.isFinite(data[c][i+1])?data[c][i+1]:0;for(let step=1;step<4;step++)peak=Math.max(peak,Math.abs(value+(next-value)*step/4));}
 }
 const rms=Math.sqrt(sum/Math.max(1,count));
 const lufs=rms>1e-12?-0.691+20*Math.log10(rms):-Infinity;
 const block=Math.max(1,Math.round(rate*blockSeconds));
 let blocks=0,energies=0;
 for(let start=0;start<buffer.length;start+=block){
   let energy=0,n=0;for(let i=start;i<Math.min(buffer.length,start+block);i++)for(let c=0;c<channels;c++){const v=Number.isFinite(data[c][i])?data[c][i]:0;energy+=v*v;n++;}
   const blockRms=Math.sqrt(energy/Math.max(1,n));
   if(blockRms>Math.pow(10,-70/20)){energies+=blockRms*blockRms;blocks++;}
 }
 const integrated=blocks?-.691+10*Math.log10(energies/blocks):-Infinity;
 return {lufs:integrated,rms,peak,truePeakDbtp:peak>1e-12?20*Math.log10(peak):-Infinity,duration:buffer.length/rate};
}

export function formatLoudness(stats){
 if(!stats)return '—';
 const lufs=Number.isFinite(stats.lufs)?stats.lufs.toFixed(1):'−∞';
 const peak=Number.isFinite(stats.truePeakDbtp)?stats.truePeakDbtp.toFixed(1):'−∞';
 return `${lufs} LUFS · ${peak} dBTP`;
}
