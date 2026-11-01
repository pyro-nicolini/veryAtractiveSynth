import {clamp,effectiveDuration,projectDuration,encodeWav} from './dsp.js';
import {assembleRecording} from './recording-utils.js';

const WORKLET_URL = new URL('./worklets/voice-processor.js',import.meta.url);
const CAPTURE_URL = new URL('./worklets/capture-processor.js',import.meta.url);

function saturationCurve(amount){
  const samples=2048,curve=new Float32Array(samples),k=Math.max(0,amount)*.085;
  for(let i=0;i<samples;i++){
    const x=i*2/(samples-1)-1;
    curve[i]=k===0?x:((1+k)*x)/(1+k*Math.abs(x));
  }
  return curve;
}
function impulse(ctx,length=1.8){
  const rate=ctx.sampleRate,count=Math.floor(rate*length),buffer=ctx.createBuffer(2,count,rate);
  let seed=83021;
  for(let c=0;c<2;c++){
    const data=buffer.getChannelData(c);
    for(let i=0;i<count;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const rand=seed/2147483648-1;
      data[i]=rand*Math.exp(-6*i/count)*.45;
    }
  }
  return buffer;
}
function makeMaster(ctx,destination,volume){
  const gain=ctx.createGain();gain.gain.value=volume/100;
  const limiter=ctx.createDynamicsCompressor();
  limiter.threshold.value=-3;limiter.knee.value=3;limiter.ratio.value=16;
  limiter.attack.value=.003;limiter.release.value=.14;
  gain.connect(limiter);limiter.connect(destination);
  return {gain,limiter};
}
function setParams(graph,track,ctx){
  const now=ctx.currentTime||0,settle=.016;
  const set=(param,value)=>param.setTargetAtTime(value,now,settle);
  set(graph.volume.gain,track.muted?0:clamp(track.volume,0,100)/100);
  set(graph.pan.pan,clamp(track.pan,-100,100)/100);
  set(graph.hp.frequency,65+clamp(track.clean,0,100)*.55);
  set(graph.lp.frequency,19000-clamp(track.clean,0,100)*23);
  set(graph.low.gain,(clamp(track.warmth,0,100)-20)*.09);
  set(graph.high.gain,(clamp(track.brightness,0,100)-50)*.14);
  graph.drive.curve=saturationCurve(clamp(track.drive,0,100));
  set(graph.delayWet.gain,clamp(track.echo,0,100)/100*.43);
  set(graph.reverbWet.gain,clamp(track.space,0,100)/100*.65);
  graph.voice.parameters.get('strength').setValueAtTime(clamp(track.autotune,0,100)/100,now);
  graph.voice.parameters.get('retune').setValueAtTime(clamp(track.retune,0,100)/100,now);
  graph.voice.parameters.get('clean').setValueAtTime(clamp(track.clean,0,100)/100,now);
  graph.voice.parameters.get('key').setValueAtTime(clamp(track.key,0,11),now);
  graph.voice.parameters.get('scale').setValueAtTime(clamp(track.scale,0,2),now);
}
function createGraph(ctx,track,destination,ir){
  const input=ctx.createGain();
  const voice=new AudioWorkletNode(ctx,'vas-voice',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
  const hp=ctx.createBiquadFilter();hp.type='highpass';
  const lp=ctx.createBiquadFilter();lp.type='lowpass';
  const low=ctx.createBiquadFilter();low.type='lowshelf';low.frequency.value=260;
  const high=ctx.createBiquadFilter();high.type='highshelf';high.frequency.value=3600;
  const drive=ctx.createWaveShaper();drive.oversample='2x';
  const compressor=ctx.createDynamicsCompressor();
  compressor.threshold.value=-21;compressor.knee.value=12;compressor.ratio.value=3.2;
  compressor.attack.value=.008;compressor.release.value=.16;
  const dry=ctx.createGain(),delay=ctx.createDelay(1.5),delayWet=ctx.createGain();
  const delayFeedback=ctx.createGain();delayFeedback.gain.value=.27;delay.delayTime.value=.28;
  const convolver=ctx.createConvolver();convolver.buffer=ir;
  const reverbWet=ctx.createGain(),sum=ctx.createGain();
  const pan=ctx.createStereoPanner(),volume=ctx.createGain();
  input.connect(voice);voice.connect(hp);hp.connect(lp);lp.connect(low);
  low.connect(high);high.connect(drive);drive.connect(compressor);
  compressor.connect(dry);dry.connect(sum);
  compressor.connect(delay);delay.connect(delayWet);delayWet.connect(sum);
  delay.connect(delayFeedback);delayFeedback.connect(delay);
  compressor.connect(convolver);convolver.connect(reverbWet);reverbWet.connect(sum);
  sum.connect(pan);pan.connect(volume);volume.connect(destination);
  const graph={input,voice,hp,lp,low,high,drive,compressor,pan,volume,delayWet,reverbWet};
  setParams(graph,track,ctx);
  return graph;
}
function fadeValue(track,at,total){
  const fadeIn=Math.min(track.fadeIn||0,total),fadeOut=Math.min(track.fadeOut||0,total);
  let v=1;
  if(fadeIn>0)v=Math.min(v,Math.max(0,at/fadeIn));
  if(fadeOut>0)v=Math.min(v,Math.max(0,(total-at)/fadeOut));
  return v;
}
function scheduleClip(ctx,track,graph,from,timeOrigin){
  const total=effectiveDuration(track);
  if(total<=.002)return null;
  const start=track.offset||0,end=start+total;
  if(end<=from)return null;
  const offsetInClip=Math.max(0,from-start);
  const contextStart=timeOrigin+Math.max(0,start-from);
  const remaining=total-offsetInClip;
  if(remaining<=0)return null;
  const src=ctx.createBufferSource(),fade=ctx.createGain();
  src.buffer=track.buffer;src.connect(fade);fade.connect(graph.input);
  const v=fade.gain;v.setValueAtTime(fadeValue(track,offsetInClip,total),contextStart);
  const initial=offsetInClip;
  const fadeIn=Math.min(track.fadeIn||0,total),fadeOut=Math.min(track.fadeOut||0,total);
  // Correctly schedule fades even when playback starts from the middle of a clip.
  if(fadeIn>initial&&fadeIn>0)v.linearRampToValueAtTime(fadeValue(track,fadeIn,total),contextStart+(fadeIn-initial));
  const fadeOutStart=total-fadeOut;
  if(fadeOut>0 && fadeOutStart>initial)v.setValueAtTime(fadeValue(track,fadeOutStart,total),contextStart+(fadeOutStart-initial));
  if(fadeOut>0&&total>initial)v.linearRampToValueAtTime(0,contextStart+(total-initial));
  src.start(contextStart,(track.trimStart||0)+offsetInClip,remaining);
  return src;
}
export class AudioEngine {
  constructor(){this.ctx=null;this.output=null;this.graphs=new Map();this.sources=[];this.playing=false;this.startCtxTime=0;this.from=0;this.duration=0;this.masterVolume=85;this.live=null;this.mic=null;this.capture=null;}
  async ready(){
    if(!this.ctx){
      const context=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
      if(!context.audioWorklet)throw Error('El navegador no admite procesamiento de audio de baja latencia');
      await context.audioWorklet.addModule(WORKLET_URL);
      await context.audioWorklet.addModule(CAPTURE_URL);
      this.ctx=context;this.output=makeMaster(context,context.destination,this.masterVolume);
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
    return this.ctx;
  }
  async decode(file){
    const ctx=await this.ready();
    if(file.size>350*1024*1024)throw Error('El archivo supera el límite de 350 MB');
    const bytes=await file.arrayBuffer();
    try{return await ctx.decodeAudioData(bytes.slice(0));}
    catch{
      throw Error('El audio no es compatible con los códecs de este navegador.');
    }
  }
  setMaster(value){this.masterVolume=clamp(value,0,100);if(this.output)this.output.gain.gain.setTargetAtTime(this.masterVolume/100,this.ctx.currentTime,.02);}
  async play(tracks,from=0){
    await this.ready();this.stop();
    const ctx=this.ctx;this.duration=projectDuration(tracks);
    if(this.duration<.01)return;
    this.from=Math.min(Math.max(0,from),Math.max(0,this.duration-.02));
    this.startCtxTime=ctx.currentTime+.06;
    const solo=tracks.some(t=>t.solo);
    const ir=impulse(ctx);
    for(const track of tracks){
      if(track.muted || (solo&&!track.solo))continue;
      if(effectiveDuration(track)<.002)continue;
      const graph=createGraph(ctx,track,this.output.gain,ir);
      this.graphs.set(track.id,graph);
      const src=scheduleClip(ctx,track,graph,this.from,this.startCtxTime);
      if(src)this.sources.push(src);
    }
    this.playing=this.sources.length>0;
  }
  position(){
    if(!this.playing||!this.ctx)return this.from;
    return Math.min(this.duration,Math.max(0,this.from+this.ctx.currentTime-this.startCtxTime));
  }
  pause(){const p=this.position();this.stop();this.from=p;return p;}
  stop(){
    for(const source of this.sources){try{source.stop();}catch{}try{source.disconnect();}catch{}}
    for(const graph of this.graphs.values())try{graph.input.disconnect();graph.volume.disconnect();}catch{}
    this.sources=[];this.graphs.clear();this.playing=false;
  }
  updateTrack(track){
    const graph=this.graphs.get(track.id);
    if(graph)setParams(graph,track,this.ctx);
  }

  /** Connect microphone to a silent meter, with optional explicit monitoring.
      The stream is owned by the caller and its tracks are closed by stopMic. */
  async prepareMic(stream,settings,monitor=false){
    await this.ready();
    this.stopMic();
    const ctx=this.ctx,source=ctx.createMediaStreamSource(stream);
    const analyser=ctx.createAnalyser();
    analyser.fftSize=2048;analyser.smoothingTimeConstant=.3;
    source.connect(analyser);
    const meterSilent=ctx.createGain();meterSilent.gain.value=0;
    analyser.connect(meterSilent);meterSilent.connect(ctx.destination);
    let monitorGraph=null;
    if(monitor){
      monitorGraph=createGraph(ctx,settings,this.output.gain,impulse(ctx));
      source.connect(monitorGraph.input);
    }
    this.mic={stream,source,analyser,meterSilent,monitorGraph};
    return analyser;
  }
  updateMic(settings){
    if(this.mic?.monitorGraph)setParams(this.mic.monitorGraph,settings,this.ctx);
  }
  getMicMeterData(buffer){
    if(!this.mic)return false;
    this.mic.analyser.getFloatTimeDomainData(buffer);
    return true;
  }
  async startCapture(onProgress){
    if(!this.mic)throw Error('Primero selecciona y activa un micrófono');
    if(this.capture)throw Error('La grabación ya está activa');
    const ctx=this.ctx,source=this.mic.source;
    const node=new AudioWorkletNode(ctx,'vas-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
    // Keep worklet processing while routing guaranteed silence to destination.
    const silent=ctx.createGain();silent.gain.value=0;
    node.connect(silent);silent.connect(ctx.destination);
    const chunks=[];let frames=0;
    let resolver,rejecter;
    const completion=new Promise((resolve,reject)=>{resolver=resolve;rejecter=reject;});
    this.capture={node,silent,chunks,completion};
    node.port.onmessage=event=>{
      const message=event.data;
      if(message?.type==='chunk'){
        chunks.push(message.samples);frames+=message.frames;
        onProgress?.(frames/ctx.sampleRate);
      }
      if(message?.type==='complete'){
        const actual=message.frames;
        try{resolver(assembleRecording(ctx,chunks,actual));}
        catch(error){rejecter(error);}
        finally{
          try{source.disconnect(node);node.disconnect();silent.disconnect();}catch{}
          if(this.capture?.node===node)this.capture=null;
        }
      }
    };
    source.connect(node);
    return {startedAt:ctx.currentTime,completion};
  }
  async stopCapture(){
    if(!this.capture)return null;
    const capture=this.capture;
    capture.node.port.postMessage({type:'stop'});
    return await capture.completion;
  }
  stopMic(){
    if(this.capture)return; // do not cut a recording in progress
    if(!this.mic)return;
    const {source,analyser,meterSilent,monitorGraph,stream}=this.mic;
    try{source.disconnect();analyser.disconnect();meterSilent.disconnect();monitorGraph?.input.disconnect();monitorGraph?.volume.disconnect();}catch{}
    stream.getTracks().forEach(track=>track.stop());
    this.mic=null;
  }

  async monitor(stream,track){
    await this.ready();this.stopMonitor();
    const node=this.ctx.createMediaStreamSource(stream);
    const graph=createGraph(this.ctx,track,this.output.gain,impulse(this.ctx));
    node.connect(graph.input);this.live={node,graph};
  }
  updateMonitor(track){if(this.live)setParams(this.live.graph,track,this.ctx);}
  stopMonitor(){
    if(!this.live)return;
    try{this.live.node.disconnect();this.live.graph.input.disconnect();this.live.graph.volume.disconnect();}catch{}
    this.live=null;
  }
  async exportMix(tracks,{depth=24,rate=48000,onlyId=null}={}){
    if(!tracks.length)throw Error('Primero agrega sonidos');
    const included=onlyId?tracks.filter(t=>t.id===onlyId):tracks;
    const active=included.filter(t=>!t.muted&&(!included.some(x=>x.solo)||t.solo));
    if(!active.length)throw Error('No hay capas audibles');
    const duration=projectDuration(active);
    if(!duration)throw Error('No hay audio que exportar');
    if(duration>60*20)throw Error('El render local admite hasta 20 minutos por exportación');
    const offline=new OfflineAudioContext(2,Math.ceil((duration+.8)*rate),rate);
    if(!offline.audioWorklet)throw Error('Este navegador no permite aplicar afinación y limpieza durante la exportación. Usa Chrome o Edge actualizados.');
    try{await offline.audioWorklet.addModule(WORKLET_URL);}
    catch{throw Error('No se pudo cargar el motor de efectos para exportar. Nada se exportó sin efectos.');}
    const output=makeMaster(offline,offline.destination,this.masterVolume);
    const ir=impulse(offline);
    for(const track of active){
      const graph=createGraph(offline,track,output.gain,ir);
      scheduleClip(offline,track,graph,0,0);
    }
    const rendered=await offline.startRendering();
    return encodeWav(rendered,depth);
  }
}
