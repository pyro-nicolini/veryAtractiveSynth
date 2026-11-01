import {clamp,effectiveDuration,projectDuration,encodeWav} from './dsp.js';
import {assembleRecording} from './recording-utils.js';
import {decodeWav,isWav,decodeCaf,isCaf} from './audio-import.js';
import {BUS_IDS,busForTrack,sanitiseBuses,meterStats} from './studio-mixer.js';
import {clipsOf,clipDuration,validLoop} from './track-clips.js';
import {assembleSessionStereo} from './session-recording.js';
import {loopBoundaryFades} from './loop-guard.js';
import {clipSpeed} from './clip-edit.js';

const WORKLET_URL = new URL('./worklets/voice-processor.js',import.meta.url);
const CAPTURE_URL = new URL('./worklets/capture-processor.js',import.meta.url);
const SESSION_URL = new URL('./worklets/session-processor.js',import.meta.url);

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
  const meter=ctx.createAnalyser();meter.fftSize=1024;meter.smoothingTimeConstant=.35;
  gain.connect(limiter);limiter.connect(meter);meter.connect(destination);
  return {gain,limiter,meter};
}
function makeBus(ctx,destination,percent){
  const gain=ctx.createGain(),meter=ctx.createAnalyser();
  gain.gain.value=percent/100;meter.fftSize=1024;meter.smoothingTimeConstant=.4;
  gain.connect(meter);meter.connect(destination);
  return {gain,meter,data:new Float32Array(1024)};
}
function setParams(graph,track,ctx){
  const now=ctx.currentTime||0,settle=.016;
  const set=(param,value)=>param.setTargetAtTime(value,now,settle);
  set(graph.volume.gain,track.muted?0:clamp(track.volume,0,100)/100);
  set(graph.processedBus.gain,track.bypassEffects?0:1);
  set(graph.bypassBus.gain,track.bypassEffects?1:0);
  set(graph.pan.pan,clamp(track.pan,-100,100)/100);
  const disabled=track.fxBypass||{};
  set(graph.hp.frequency,disabled.clean?20:65+clamp(track.clean,0,100)*.55);
  set(graph.lp.frequency,disabled.clean?Math.min(ctx.sampleRate*.48,20000):19000-clamp(track.clean,0,100)*23);
  set(graph.low.gain,disabled.eq?0:(clamp(track.warmth,0,100)-20)*.09);
  set(graph.high.gain,disabled.eq?0:(clamp(track.brightness,0,100)-50)*.14);
  set(graph.compressor.ratio,disabled.compressor?1:3.2);
  set(graph.compressor.threshold,disabled.compressor?0:-21);
  const driveAmount=disabled.drive?0:clamp(track.drive,0,100);
  if(graph.lastDriveAmount!==driveAmount){
    graph.drive.curve=saturationCurve(driveAmount);
    graph.lastDriveAmount=driveAmount;
  }
  set(graph.delayWet.gain,disabled.delay?0:clamp(track.echo,0,100)/100*.43);
  set(graph.reverbWet.gain,disabled.reverb?0:clamp(track.space,0,100)/100*.65);
  // Smooth live XY moves to reduce parameter discontinuities during playback.
  graph.voice.parameters.get('strength').setTargetAtTime(disabled.tune?0:clamp(track.autotune,0,100)/100,now,.013);
  graph.voice.parameters.get('retune').setTargetAtTime(clamp(track.retune,0,100)/100,now,.013);
  graph.voice.parameters.get('shift').setTargetAtTime(clamp(track.pitchShift||0,-12,12),now,.018);
  graph.voice.parameters.get('clean').setTargetAtTime(disabled.clean?0:clamp(track.clean,0,100)/100,now,.013);
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
  const processedBus=ctx.createGain(),bypassBus=ctx.createGain();
  const pan=ctx.createStereoPanner(),volume=ctx.createGain();
  input.connect(voice);voice.connect(hp);hp.connect(lp);lp.connect(low);
  low.connect(high);high.connect(drive);drive.connect(compressor);
  compressor.connect(dry);dry.connect(processedBus);
  compressor.connect(delay);delay.connect(delayWet);delayWet.connect(processedBus);
  delay.connect(delayFeedback);delayFeedback.connect(delay);
  compressor.connect(convolver);convolver.connect(reverbWet);reverbWet.connect(processedBus);
  input.connect(bypassBus);bypassBus.connect(sum);processedBus.connect(sum);
  const meter=ctx.createAnalyser();meter.fftSize=1024;meter.smoothingTimeConstant=.4;
  sum.connect(pan);pan.connect(volume);volume.connect(meter);meter.connect(destination);
  const graph={input,voice,hp,lp,low,high,drive,compressor,pan,volume,delayWet,reverbWet,processedBus,bypassBus,meter,meterData:new Float32Array(1024),
    nodes:[input,voice,hp,lp,low,high,drive,compressor,dry,delay,delayWet,delayFeedback,convolver,reverbWet,sum,processedBus,bypassBus,pan,volume,meter]};
  setParams(graph,track,ctx);
  return graph;
}
function disposeGraph(graph){
  if(!graph)return;
  try{graph.voice.port.onmessage=null;graph.voice.port.postMessage({type:'monitor',enabled:false});}catch{}
  for(const node of graph.nodes||[graph.input,graph.volume])try{node.disconnect();}catch{}
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
  const src=ctx.createBufferSource(),fade=ctx.createGain(),splice=ctx.createGain(),speed=clipSpeed(track);
  src.buffer=track.buffer;src.playbackRate.setValueAtTime(speed,contextStart);
  // Segment masks use a dedicated voice DSP before track-wide FX.
  const regions=Array.isArray(track.pitchRegions)?track.pitchRegions.slice(0,550):[];
  const usePitch=regions.length||Math.abs(track.pitchShift||0)>.02;
  if(usePitch){
    const pitchNode=new AudioWorkletNode(ctx,'vas-voice',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
    src.connect(pitchNode);pitchNode.connect(splice);
    const shifted=pitchNode.parameters.get('shift');
    shifted.setValueAtTime(clamp(track.pitchShift||0,-12,12),contextStart);
    const loopRegion=validLoop(track),sourceStart=loopRegion?.from??(track.trimStart||0),sourceEnd=loopRegion?.to??(track.buffer.duration-(track.trimEnd||0));
    const cycleDuration=sourceEnd-sourceStart,cycles=loopRegion?.repeats||1;
    let count=0;
    for(let cycle=0;cycle<cycles;cycle++)for(const r of regions){
      if(count>=4500)break;
      const lo=Math.max(sourceStart,r.from),hi=Math.min(sourceEnd,r.to);
      if(!(hi>lo)||!Number.isFinite(r.semitones))continue;
      const timelineLo=(cycle*cycleDuration+lo-sourceStart)/speed-offsetInClip;
      const timelineHi=(cycle*cycleDuration+hi-sourceStart)/speed-offsetInClip;
      if(timelineHi<=0||timelineLo>=remaining)continue;
      shifted.setValueAtTime(clamp(r.semitones,-12,12),contextStart+Math.max(0,timelineLo));
      shifted.setValueAtTime(0,contextStart+Math.max(0,Math.min(remaining,timelineHi)));
      count+=2;
    }
  }else src.connect(splice);
  splice.connect(fade);fade.connect(graph.input);
  splice.gain.setValueAtTime(1,contextStart);
  const v=fade.gain;v.setValueAtTime(fadeValue(track,offsetInClip,total),contextStart);
  const initial=offsetInClip;
  const fadeIn=Math.min(track.fadeIn||0,total),fadeOut=Math.min(track.fadeOut||0,total);
  // Correctly schedule fades even when playback starts from the middle of a clip.
  if(fadeIn>initial&&fadeIn>0)v.linearRampToValueAtTime(fadeValue(track,fadeIn,total),contextStart+(fadeIn-initial));
  const fadeOutStart=total-fadeOut;
  if(fadeOut>0 && fadeOutStart>initial)v.setValueAtTime(fadeValue(track,fadeOutStart,total),contextStart+(fadeOutStart-initial));
  if(fadeOut>0&&total>initial)v.linearRampToValueAtTime(0,contextStart+(total-initial));
  const loop=validLoop(track);
  if(loop){
    // Repeat a source fragment with sample-accurate AudioBufferSource loop points.
    // Stop at the exact timeline end. Other tracks keep their own independent clock.
    const segment=loop.to-loop.from;
    // Tiny anti-click ramps at every interior repeat, independent of clip fades.
    // These are NOT overlapping crossfades or formant correction.
    for(const event of loopBoundaryFades(loop,offsetInClip*speed)){
      splice.gain.setValueAtTime(1,contextStart+event.before/speed);
      splice.gain.linearRampToValueAtTime(0,contextStart+event.center/speed);
      splice.gain.linearRampToValueAtTime(1,contextStart+event.after/speed);
    }
    src.loop=true;
    src.loopStart=loop.from;
    src.loopEnd=loop.to;
    const sourcePosition=loop.from+((offsetInClip*speed)%segment);
    src.start(contextStart,sourcePosition);
    src.stop(contextStart+remaining);
  }else{
    src.start(contextStart,(track.trimStart||0)+offsetInClip*speed,remaining*speed);
  }
  return src;
}
export class AudioEngine {
  constructor(){this.ctx=null;this.output=null;this.graphs=new Map();this.sources=[];this.playing=false;this.startCtxTime=0;this.from=0;this.duration=0;this.masterVolume=85;this.live=null;this.mic=null;this.capture=null;this.metronomeEnabled=false;this.bpm=104;this.metroTimer=null;this.nextBeatTime=0;this.beatIndex=0;this.masterData=new Float32Array(1024);this.pitchListener=null;this.pitchTrackId=null;this.busSettings=sanitiseBuses();this.buses=new Map();this.sessionCapture=null;}
  async ready(){
    if(!this.ctx){
      const context=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
      if(!context.audioWorklet)throw Error('El navegador no admite procesamiento de audio de baja latencia');
      await context.audioWorklet.addModule(WORKLET_URL);
      await context.audioWorklet.addModule(CAPTURE_URL);
      await context.audioWorklet.addModule(SESSION_URL);
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
      if(isWav(bytes)){
        try{return decodeWav(bytes,ctx);}
        catch(error){throw Error('WAV no compatible: '+error.message);}
      }
      if(isCaf(bytes)){
        try{return decodeCaf(bytes,ctx);}
        catch(error){throw Error('CAF no compatible: '+error.message);}
      }
      throw Error('El audio no es compatible con los códecs de este navegador.');
    }
  }

  setMaster(value){
    this.masterVolume=clamp(value,0,100);
    if(this.output)this.output.gain.gain.setTargetAtTime(this.masterVolume/100,this.ctx.currentTime,.02);
  }
  setBuses(settings){
    this.busSettings=sanitiseBuses(settings);
    for(const [id,bus] of this.buses)bus.gain.gain.setTargetAtTime(this.busSettings[id]/100,this.ctx.currentTime,.02);
  }
  getTrackMeter(id){
    const graph=this.graphs.get(id);
    if(!graph)return {peak:0,rms:0,db:null};
    graph.meter.getFloatTimeDomainData(graph.meterData);
    return meterStats(graph.meterData);
  }
  getBusMeter(id){
    const bus=this.buses.get(id);
    if(!bus)return {peak:0,rms:0,db:null};
    bus.meter.getFloatTimeDomainData(bus.data);
    return meterStats(bus.data);
  }
  getMasterMeter(){
    if(!this.output||!this.ctx)return {peak:0,rms:0};
    this.output.meter.getFloatTimeDomainData(this.masterData);
    let peak=0,sum=0;
    for(const sample of this.masterData){
      const v=Math.abs(sample);
      peak=Math.max(peak,v);sum+=sample*sample;
    }
    return {peak,rms:Math.sqrt(sum/this.masterData.length)};
  }
  setMetronome(enabled,bpm=this.bpm){
    this.metronomeEnabled=!!enabled;
    this.bpm=clamp(bpm,40,240);
    if(this.playing){this.stopMetronome();if(this.metronomeEnabled)this.startMetronome(this.position(),this.ctx.currentTime);}
  }
  stopMetronome(){
    if(this.metroTimer!==null){clearInterval(this.metroTimer);this.metroTimer=null;}
  }
  scheduleClick(time,accent){
    const ctx=this.ctx,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(accent?1380:950,time);
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(accent?.12:.08,time+.002);
    gain.gain.exponentialRampToValueAtTime(.0001,time+.055);
    osc.connect(gain);gain.connect(this.output.gain);
    osc.start(time);osc.stop(time+.065);
    osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch{}};
  }
  /** Optional four-beat preparation before starting playback and microphone.
      Scheduling uses AudioContext for audible clicks; UI timers are advisory
      and can drift in a throttled mobile browser. */
  async countIn(bpm=104,beats=4,onBeat=()=>{},isCancelled=()=>false){
    await this.ready();
    const total=Math.max(1,Math.min(8,Math.round(beats)));
    const delay=60000/Math.max(40,Math.min(240,bpm));
    for(let i=0;i<total;i++){
      if(isCancelled())return false;
      onBeat(total-i);
      this.scheduleClick(this.ctx.currentTime+.012,i===0);
      await new Promise(resolve=>setTimeout(resolve,delay));
    }
    return !isCancelled();
  }
  startMetronome(position=this.from,contextStart=this.ctx?.currentTime||0){
    if(!this.metronomeEnabled||!this.ctx)return;
    this.stopMetronome();
    const beat=60/this.bpm;
    this.beatIndex=Math.max(0,Math.ceil((position-1e-4)/beat));
    this.nextBeatTime=contextStart+this.beatIndex*beat-position;
    const schedule=()=>{
      if(!this.playing||!this.metronomeEnabled){this.stopMetronome();return;}
      while(this.nextBeatTime<this.ctx.currentTime+.16){
        if(this.nextBeatTime>=this.ctx.currentTime-.025)this.scheduleClick(Math.max(this.ctx.currentTime+.003,this.nextBeatTime),this.beatIndex%4===0);
        this.beatIndex++;this.nextBeatTime+=beat;
      }
    };
    schedule();
    this.metroTimer=setInterval(schedule,25);
  }

  async play(tracks,from=0){
    await this.ready();this.stop();
    const ctx=this.ctx;this.duration=projectDuration(tracks);
    if(this.duration<.01)return;
    this.from=Math.min(Math.max(0,from),Math.max(0,this.duration-.02));
    this.startCtxTime=ctx.currentTime+.06;
    const solo=tracks.some(t=>t.solo);
    const ir=impulse(ctx);
    for(const id of BUS_IDS)this.buses.set(id,makeBus(ctx,this.output.gain,this.busSettings[id]));
    for(const track of tracks){
      // Keep muted sources scheduled at zero channel gain so a disconnected
      // flow node can reconnect smoothly without resetting the timeline.
      if(solo&&!track.solo)continue;
      const segments=clipsOf(track).filter(clip=>clipDuration(clip)>=.002);
      if(!segments.length)continue;
      const graph=createGraph(ctx,track,this.buses.get(busForTrack(track)).gain,ir);
      this.graphs.set(track.id,graph);
      for(const clip of segments){
        const source=scheduleClip(ctx,clip,graph,this.from,this.startCtxTime);
        if(source)this.sources.push(source);
      }
    }
    this.playing=this.sources.length>0;
    this.syncPitchTelemetry();
    if(this.playing&&this.metronomeEnabled)this.startMetronome(this.from,this.startCtxTime);
  }
  position(){
    if(!this.playing||!this.ctx)return this.from;
    return Math.min(this.duration,Math.max(0,this.from+this.ctx.currentTime-this.startCtxTime));
  }
  pause(){const p=this.position();this.stop();this.from=p;return p;}
  stop(){
    this.stopMetronome();
    for(const source of this.sources){try{source.stop();}catch{}try{source.disconnect();}catch{}}
    for(const graph of this.graphs.values())disposeGraph(graph);
    for(const bus of this.buses.values()){try{bus.gain.disconnect();bus.meter.disconnect();}catch{}}
    this.sources=[];this.graphs.clear();this.buses.clear();this.playing=false;
  }
  updateTrack(track){
    const graph=this.graphs.get(track.id);
    if(graph)setParams(graph,track,this.ctx);
  }
  /** Opt-in pitch telemetry from the existing worklet. Never exported or stored. */
  watchPitch(trackId,callback){
    this.pitchTrackId=typeof trackId==='string'?trackId:null;
    this.pitchListener=typeof callback==='function'?callback:null;
    this.syncPitchTelemetry();
  }
  syncPitchTelemetry(){
    for(const [id,graph] of this.graphs){
      const active=!!this.pitchListener&&id===this.pitchTrackId;
      graph.voice.port.onmessage=active?event=>{
        if(event.data?.type==='pitch'&&this.pitchListener&&this.pitchTrackId===id)
          this.pitchListener(event.data);
      }:null;
      graph.voice.port.postMessage({type:'monitor',enabled:active});
    }
  }

  /** Connect microphone to a silent meter, with optional explicit monitoring.
      The stream is owned by the caller and its tracks are closed by stopMic. */
  async prepareMic(stream,settings,monitor=false){
    await this.ready();
    this.stopMic();
    const ctx=this.ctx,source=ctx.createMediaStreamSource(stream);
    const analyser=ctx.createAnalyser();
    analyser.fftSize=2048;analyser.smoothingTimeConstant=.3;
    const inputGain=ctx.createGain();inputGain.gain.value=1;
    source.connect(inputGain);inputGain.connect(analyser);
    const meterSilent=ctx.createGain();meterSilent.gain.value=0;
    analyser.connect(meterSilent);meterSilent.connect(ctx.destination);
    let monitorGraph=null;
    if(monitor){
      monitorGraph=createGraph(ctx,settings,this.output.gain,impulse(ctx));
      inputGain.connect(monitorGraph.input);
    }
    this.mic={stream,source,inputGain,analyser,meterSilent,monitorGraph};
    this.syncMicPitchTelemetry();
    return analyser;
  }
  watchMicPitch(callback){
    this.micPitchListener=typeof callback==='function'?callback:null;
    this.syncMicPitchTelemetry();
  }
  syncMicPitchTelemetry(){
    const voice=this.mic?.monitorGraph?.voice;
    if(!voice)return;
    const active=!!this.micPitchListener;
    voice.port.onmessage=active?event=>{
      if(event.data?.type==='pitch')this.micPitchListener?.(event.data);
    }:null;
    voice.port.postMessage({type:'monitor',enabled:active});
  }
  setMicGain(percent){
    if(this.mic?.inputGain)this.mic.inputGain.gain.setTargetAtTime(clamp(percent,0,200)/100,this.ctx.currentTime,.012);
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
    const ctx=this.ctx,source=this.mic.inputGain;
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
    this.watchMicPitch(null);
    const {source,inputGain,analyser,meterSilent,monitorGraph,stream}=this.mic;
    try{source.disconnect();inputGain.disconnect();analyser.disconnect();meterSilent.disconnect();}catch{}
    disposeGraph(monitorGraph);
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
    try{this.live.node.disconnect();}catch{}
    disposeGraph(this.live.graph);
    this.live=null;
  }

  /** Record post-limiter master stereo in local PCM, never a microphone recording.
      Maximum ten minutes protects memory on phones and desktops. */
  async startSessionCapture(){
    await this.ready();
    if(this.sessionCapture)throw Error('Ya se está grabando una sesión');
    if(!this.playing&&!this.mic?.monitorGraph)throw Error('Reproduce una pista o activa el micrófono de Voice Lab');
    const ctx=this.ctx,node=new AudioWorkletNode(ctx,'vas-session-capture',{
      numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],
      processorOptions:{limitFrames:Math.floor(ctx.sampleRate*600)}
    });
    const silent=ctx.createGain();silent.gain.value=0;
    const captured=[];
    let resolver,rejecter;
    const completion=new Promise((resolve,reject)=>{resolver=resolve;rejecter=reject;});
    node.port.onmessage=event=>{
      const message=event.data;
      if(message?.type==='chunk')captured.push({left:message.left,right:message.right});
      if(message?.type==='complete'){
        try{resolver(assembleSessionStereo(ctx,captured,message.frames));}
        catch(error){rejecter(error);}
        finally{
          try{this.output.meter.disconnect(node);node.disconnect();silent.disconnect();}catch{}
          if(this.sessionCapture?.node===node)this.sessionCapture=null;
        }
      }
    };
    node.onprocessorerror=()=>rejecter(Error('Se interrumpió la captura de la sesión'));
    node.connect(silent);silent.connect(ctx.destination);
    this.output.meter.connect(node);
    this.sessionCapture={node,silent,completion,startedAt:ctx.currentTime};
    return {completion,startedAt:ctx.currentTime};
  }
  async stopSessionCapture(){
    if(!this.sessionCapture)return null;
    const session=this.sessionCapture;
    session.node.port.postMessage({type:'stop'});
    let timer;
    try{
      return await Promise.race([
        session.completion,
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('No se pudo finalizar la grabación en tiempo real')),3500);})
      ]);
    }finally{
      clearTimeout(timer);
      try{this.output.meter.disconnect(session.node);session.node.disconnect();session.silent.disconnect();}catch{}
      if(this.sessionCapture===session)this.sessionCapture=null;
    }
  }

  async exportMix(tracks,{depth=24,rate=48000,onlyId=null}={}){
    if(!tracks.length)throw Error('Primero agrega sonidos');
    const included=onlyId?tracks.filter(t=>t.id===onlyId):tracks;
    const active=included.filter(t=>!t.muted&&(!included.some(x=>x.solo)||t.solo));
    if(!active.length)throw Error('No hay capas audibles');
    const duration=projectDuration(active);
    if(!duration)throw Error('No hay audio que exportar');
    if(duration>60*20)throw Error('El render local admite hasta 20 minutos por exportación');
    const hasReverb=active.some(track=>Number(track.space)>0);
    const hasDelay=active.some(track=>Number(track.echo)>0);
    const tail=hasReverb?1.9:hasDelay?1.1:.08;
    // Account for the effects tail so the end is not truncated.
    const offline=new OfflineAudioContext(2,Math.ceil((duration+tail)*rate),rate);
    if(!offline.audioWorklet)throw Error('Este navegador no permite aplicar afinación y limpieza durante la exportación. Usa Chrome o Edge actualizados.');
    try{await offline.audioWorklet.addModule(WORKLET_URL);}
    catch{throw Error('No se pudo cargar el motor de efectos para exportar. Nada se exportó sin efectos.');}
    const output=makeMaster(offline,offline.destination,this.masterVolume);
    const ir=impulse(offline);
    const exportBuses=new Map(BUS_IDS.map(id=>[id,makeBus(offline,output.gain,this.busSettings[id])]));
    for(const track of active){
      const graph=createGraph(offline,track,exportBuses.get(busForTrack(track)).gain,ir);
      for(const clip of clipsOf(track))scheduleClip(offline,clip,graph,0,0);
    }
    const rendered=await offline.startRendering();
    return encodeWav(rendered,depth);
  }
}
