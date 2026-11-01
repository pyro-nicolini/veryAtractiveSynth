/** Pure local audio utilities; no dependencies or network calls. */
export const KEYS = ['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];
export const SCALES = ['Mayor','Menor','Cromática'];
export const COLORS = ['#a5ff73','#a778ff','#59caff','#ff73b7','#ffb56b','#67f6e7'];
export const PRESETS = {
  natural: { label:'Natural', autotune:0,retune:40,clean:15,brightness:50,warmth:15,echo:0,space:5,drive:0 },
  clean: {label:'Voz limpia',autotune:0,retune:40,clean:65,brightness:58,warmth:20,echo:0,space:8,drive:0},
  star: {label:'Pop brillante',autotune:85,retune:78,clean:50,brightness:72,warmth:20,echo:12,space:23,drive:4},
  robot: {label:'Robot pop',autotune:100,retune:100,clean:40,brightness:64,warmth:8,echo:16,space:18,drive:16},
  dream: {label:'Sueño espacial',autotune:65,retune:50,clean:38,brightness:60,warmth:38,echo:32,space:68,drive:0},
  vintage: {label:'Radio vintage',autotune:0,retune:35,clean:28,brightness:33,warmth:68,echo:5,space:10,drive:25},
};
export function defaults() {return {autotune:0,retune:60,clean:25,brightness:50,warmth:20,echo:0,space:8,drive:0,volume:85,pan:0,fadeIn:0,fadeOut:0,trimStart:0,trimEnd:0,offset:0,key:0,scale:0,muted:false,solo:false,bypassEffects:false,tuneX:.16,tuneY:-1,tunePreset:'natural',preset:'natural'};}
export function clamp(value,min,max) {return Math.min(max,Math.max(min,Number(value)||0));}
export function clock(seconds) { const s=Math.max(0,Math.floor(seconds||0)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
export function effectiveDuration(track) {return Math.max(0,track.buffer.duration-(track.trimStart||0)-(track.trimEnd||0));}
export function projectDuration(tracks) {return tracks.reduce((a,t)=>Math.max(a,(t.offset||0)+effectiveDuration(t)),0);}
export function nearestNote(midi,key=0,scale=0) {
  const allowed=scale===1?[0,2,3,5,7,8,10]:scale===2?[0,1,2,3,4,5,6,7,8,9,10,11]:[0,2,4,5,7,9,11];
  let closest=Math.round(midi),diff=Infinity;
  for(let n=Math.floor(midi)-12;n<=Math.ceil(midi)+12;n++){
    if(!allowed.includes(((n-key)%12+12)%12))continue;
    const d=Math.abs(n-midi); if(d<diff){diff=d;closest=n;}
  }
  return closest;
}
export function synthBeat(sampleRate=48000,bpm=104,bars=8) {
  const duration=bars*4*60/bpm, length=Math.ceil(duration*sampleRate);
  const left=new Float32Array(length),right=new Float32Array(length);
  const beat=60/bpm;
  let seed=1337;
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  function strike(start,duration,fn,pan=0){
    const off=Math.floor(start*sampleRate),count=Math.floor(duration*sampleRate);
    for(let j=0;j<count && j+off<length;j++){
      const value=fn(j/sampleRate,j);
      left[j+off]+=value*(pan>0?1-pan:1);
      right[j+off]+=value*(pan<0?1+pan:1);
    }
  }
  for(let i=0;i<bars*4;i++){
    const t=i*beat;
    if(i%4===0||i%4===2)strike(t,.42,(x)=>Math.sin(2*Math.PI*(59*x+44*x*Math.exp(-x*28)))*Math.exp(-x*18)*.72);
    if(i%4===1||i%4===3)strike(t,.23,(x)=>noise()*Math.exp(-x*24)*.22+Math.sin(x*2*Math.PI*188)*Math.exp(-x*26)*.15);
    strike(t,.13,(x)=>noise()*Math.exp(-x*55)*.095, i%2===0?-.25:.25);
    strike(t+beat/2,.09,(x)=>noise()*Math.exp(-x*72)*.065, i%2===0?.3:-.3);
  }
  return [left,right];
}
export function encodeWav(buffer,depth=24){
  if(![16,24,32].includes(depth)) throw Error('Profundidad WAV inválida');
  const channels=Math.min(2,buffer.numberOfChannels),rate=buffer.sampleRate,bytes=depth/8,size=buffer.length*channels*bytes;
  const data=new ArrayBuffer(44+size),view=new DataView(data);
  const writeString=(index,s)=>{for(let i=0;i<s.length;i++)view.setUint8(index+i,s.charCodeAt(i));};
  writeString(0,'RIFF');view.setUint32(4,36+size,true);writeString(8,'WAVE');writeString(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,depth===32?3:1,true);view.setUint16(22,channels,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*channels*bytes,true);view.setUint16(32,channels*bytes,true);
  view.setUint16(34,depth,true);writeString(36,'data');view.setUint32(40,size,true);
  const samples=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));
  let pos=44;
  for(let i=0;i<buffer.length;i++)for(let c=0;c<channels;c++){
    const x=clamp(samples[c][i],-1,1);
    if(depth===16){view.setInt16(pos,x<0?Math.round(x*32768):Math.round(x*32767),true);pos+=2;}
    else if(depth===24){const v=x<0?Math.round(x*8388608):Math.round(x*8388607);view.setUint8(pos++,v&255);view.setUint8(pos++,(v>>8)&255);view.setUint8(pos++,(v>>16)&255);}
    else {view.setFloat32(pos,x,true);pos+=4;}
  }
  return new Blob([data],{type:'audio/wav'});
}
export function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
}
export function safeFilename(value){return String(value||'mi-cancion').replace(/[^a-zA-Z0-9À-ÿ _-]/g,'').trim().replace(/\s+/g,'-').slice(0,70)||'mi-cancion';}
export function peaks(buffer,count=350){
  const result=new Float32Array(count),data=buffer.getChannelData(0),step=Math.max(1,Math.floor(data.length/count));
  for(let i=0;i<count;i++){let max=0;const start=i*step,end=Math.min(data.length,start+step);for(let j=start;j<end;j+=3)max=Math.max(max,Math.abs(data[j]));result[i]=max;}
  return result;
}
