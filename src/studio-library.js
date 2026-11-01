/** Offline, original procedural groove library. No copyrighted samples or network assets. */
import {clamp} from './dsp.js';
export const GROOVES=Object.freeze([
  {id:'pop',name:'Pop luminoso',category:'Pop',bpm:112,bars:8,kick:[0,2],snare:[1,3],hat:2,bass:0.42,icon:'☀'},
  {id:'house',name:'House flotante',category:'Electrónica',bpm:124,bars:8,kick:[0,1,2,3],snare:[1,3],hat:2,bass:0.5,icon:'✦'},
  {id:'trap',name:'Trap pausado',category:'Urbano',bpm:140,bars:8,kick:[0,2.5],snare:[2],hat:4,bass:0.8,icon:'◆'},
  {id:'lofi',name:'Lo-fi de tarde',category:'Suave',bpm:82,bars:8,kick:[0,2.5],snare:[1,3],hat:2,bass:0.3,icon:'☕'},
  {id:'reggaeton',name:'Dembow cálido',category:'Urbano',bpm:96,bars:8,kick:[0,1.5,2.75],snare:[1.5,3],hat:2,bass:0.65,icon:'◉'},
  {id:'breakbeat',name:'Breakbeat libre',category:'Electrónica',bpm:132,bars:8,kick:[0,1.75,2.5],snare:[1,2.75],hat:4,bass:0.54,icon:'⚡'},
  {id:'soul',name:'Neo soul',category:'Suave',bpm:92,bars:8,kick:[0,2.25],snare:[1,3],hat:2,bass:0.58,icon:'♡'},
  {id:'dance',name:'Dance brillante',category:'Pop',bpm:128,bars:8,kick:[0,1,2,3],snare:[1,3],hat:4,bass:0.46,icon:'♫'},
  {id:'ambient',name:'Pulso ambiental',category:'Suave',bpm:72,bars:8,kick:[0,2],snare:[],hat:1,bass:0.24,icon:'☁'},
  {id:'funk',name:'Funk saltarín',category:'Pop',bpm:108,bars:8,kick:[0,1.75,2.5],snare:[1,3],hat:4,bass:0.6,icon:'◐'}
]);
export const VOICE_STYLES=Object.freeze([
  {id:'air',name:'Aire suave',emoji:'☁',description:'Voz delicada y espaciosa',autotune:12,retune:24,clean:42,brightness:62,warmth:18,echo:6,space:27,drive:0},
  {id:'bright',name:'Pop claro',emoji:'✦',description:'Voz protagonista con presencia',autotune:74,retune:68,clean:58,brightness:76,warmth:18,echo:10,space:18,drive:3},
  {id:'urban',name:'Urbano preciso',emoji:'◆',description:'Afinación marcada y eco corto',autotune:95,retune:92,clean:50,brightness:60,warmth:20,echo:24,space:13,drive:10},
  {id:'velvet',name:'Terciopelo',emoji:'♡',description:'Cálido para R&B y soul',autotune:44,retune:35,clean:48,brightness:45,warmth:68,echo:11,space:25,drive:4},
  {id:'harmony',name:'Coros de nube',emoji:'❋',description:'Coros suaves y lejanos',autotune:57,retune:55,clean:51,brightness:66,warmth:30,echo:15,space:61,drive:0},
  {id:'radio',name:'Radio vintage',emoji:'◌',description:'Color antiguo y saturación',autotune:0,retune:20,clean:34,brightness:27,warmth:78,echo:8,space:9,drive:38},
  {id:'robot',name:'Robot divertido',emoji:'◈',description:'Corrección rápida y fuerte',autotune:100,retune:100,clean:40,brightness:65,warmth:12,echo:17,space:16,drive:15},
  {id:'dream',name:'Sueño espacial',emoji:'☾',description:'Cola larga y movimiento',autotune:60,retune:47,clean:40,brightness:64,warmth:36,echo:32,space:76,drive:0},
  {id:'dry',name:'Cerca de ti',emoji:'◎',description:'Natural, seco y directo',autotune:0,retune:25,clean:66,brightness:53,warmth:25,echo:0,space:0,drive:0},
  {id:'edge',name:'Borde eléctrico',emoji:'⚡',description:'Saturación brillante',autotune:68,retune:78,clean:45,brightness:77,warmth:12,echo:19,space:20,drive:47}
]);
export const AUTO_TRANSITIONS=Object.freeze([
  {id:'in',name:'Aparecer suave',emoji:'↗',hint:'Entrada gradual de un tiempo musical'},
  {id:'out',name:'Despedida suave',emoji:'↘',hint:'Salida gradual de un tiempo musical'},
  {id:'both',name:'Entrada y salida',emoji:'⌁',hint:'Fundidos de medio tiempo al principio y al final'},
  {id:'cross',name:'Cruce con siguiente',emoji:'⇄',hint:'Solapa con el clip posterior y mezcla ambos suavemente'},
  {id:'reset',name:'Sin transición',emoji:'○',hint:'Quita fundidos, conserva el audio original'}
]);
const norm=(v)=>Math.max(0,Math.min(1,Number(v)||0));
function seeded(id){let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function makeGroove(id,rate=48000,bars=8){
  const groove=GROOVES.find(g=>g.id===id);
  if(!groove)throw Error('Ritmo desconocido');
  if(rate<8000||rate>192000||bars<1||bars>16||!Number.isInteger(bars))throw Error('Formato de ritmo inválido');
  const beat=60/groove.bpm,frames=Math.ceil(beat*4*bars*rate);
  const left=new Float32Array(frames),right=new Float32Array(frames),random=seeded(id);
  const hit=(time,length,fn,pan=0)=>{
    const start=Math.floor(time*rate),size=Math.ceil(length*rate);
    for(let k=0;k<size&&start+k<frames;k++){
      const v=fn(k/rate,k)*.85;
      left[start+k]+=v*(pan>0?1-pan:1);
      right[start+k]+=v*(pan<0?1+pan:1);
    }
  };
  for(let bar=0;bar<bars;bar++){
    const base=bar*4*beat;
    for(let i=0;i<4;i++){
      for(const off of groove.kick){
        if(Math.abs(off-i)<.0001||i===0&&off%1!==0){
          const moment=base+off*beat;
          if(i===0||Number.isInteger(off))hit(moment,.35,t=>Math.sin(2*Math.PI*(48+100*Math.exp(-t*30))*t)*Math.exp(-t*19)*.72);
        }
      }
      if(groove.snare.includes(i)){
        const moment=base+i*beat;
        hit(moment,.19,t=>(random()-.5)*2*Math.exp(-t*27)*.31+Math.sin(2*Math.PI*190*t)*Math.exp(-t*20)*.22);
      }
      for(let h=0;h<groove.hat;h++){
        const step=1/groove.hat,moment=base+(i+h*step)*beat;
        hit(moment,.074,t=>(random()-.5)*2*Math.exp(-t*74)*.14,bar%2===0?.17:-.17);
      }
    }
    for(let n=0;n<4;n++){
      const notes=[55,55,65,49],frequency=notes[(n+bar)%notes.length];
      hit(base+n*beat,.31,t=>Math.sin(2*Math.PI*frequency*t)*Math.exp(-t*8)*groove.bass);
    }
  }
  for(let i=0;i<frames;i++){left[i]=Math.tanh(left[i]*.95);right[i]=Math.tanh(right[i]*.95);}
  return {groove,channels:[left,right],sampleRate:rate};
}
export function applyVoiceStyle(track,id){
  const preset=VOICE_STYLES.find(x=>x.id===id);
  if(!preset)throw Error('Estilo de voz desconocido');
  for(const field of ['autotune','retune','clean','brightness','warmth','echo','space','drive'])track[field]=preset[field];
  track.preset='custom';
  track.voiceStyle=id;
  track.bypassEffects=false;
  track.fxBypass={};
  track.tuneX=(((track.retune-5)/95)*2-1);
  track.tuneY=track.autotune/50-1;
  return track;
}
export function applyAutoTransition(track,clipId,id,bpm=104){
  const choices=AUTO_TRANSITIONS.map(t=>t.id);
  if(!choices.includes(id))throw Error('Transición desconocida');
  const clips=Array.isArray(track.clips)?track.clips:[track];
  const target=clips.find(c=>c.id===clipId)||clips[0];
  if(!target)throw Error('Elige un clip primero');
  const length=Math.max(.02,(target.loop?.repeats?((target.loop.to-target.loop.from)*target.loop.repeats):
     (target.buffer.duration-(target.trimStart||0)-(target.trimEnd||0))));
  const beat=60/clamp(bpm,40,240),fade=Math.min(length/2,beat);
  if(id==='reset'){target.fadeIn=0;target.fadeOut=0;}
  if(id==='in'){target.fadeIn=fade;target.fadeOut=0;}
  if(id==='out'){target.fadeIn=0;target.fadeOut=fade;}
  if(id==='both'){target.fadeIn=fade*.5;target.fadeOut=fade*.5;}
  if(id==='cross'){
    const next=clips.filter(c=>c!==target&&c.offset>=target.offset).sort((a,b)=>a.offset-b.offset)[0];
    if(!next)throw Error('Añade otro clip a la pista para crear un cruce');
    const nextLen=Math.max(.02,next.buffer.duration-(next.trimStart||0)-(next.trimEnd||0));
    const overlap=Math.min(fade,length*.45,nextLen*.45);
    target.fadeOut=overlap;
    next.fadeIn=overlap;
    next.offset=Math.max(0,(target.offset||0)+length-overlap);
  }
  return target;
}
