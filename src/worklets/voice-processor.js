/* Lightweight experimental scale-aware pitch correction and gate.
   Runs entirely on the Web Audio render thread. Not a studio-grade phase vocoder.
   Granular overlap-add: two overlapping heads read from a short ring buffer.
*/
const RING_SIZE=32768,MAJOR=[0,2,4,5,7,9,11],MINOR=[0,2,3,5,7,8,10];
class VoiceProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(){return [
    {name:'strength',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},
    {name:'retune',defaultValue:.6,minValue:0,maxValue:1,automationRate:'k-rate'},
    {name:'key',defaultValue:0,minValue:0,maxValue:11,automationRate:'k-rate'},
    {name:'scale',defaultValue:0,minValue:0,maxValue:2,automationRate:'k-rate'},
    {name:'clean',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},
    {name:'shift',defaultValue:0,minValue:-12,maxValue:12,automationRate:'k-rate'}
  ];}
  constructor(){
    super();this.buffers=[new Float32Array(RING_SIZE),new Float32Array(RING_SIZE)];
    this.mono=new Float32Array(RING_SIZE);this.pos=0;this.phase=0;this.grain=1536;
    this.counter=0;this.ratio=1;this.targetRatio=1;this.envelope=0;this.gate=1;
    this.telemetry=false;this.telemetrySeq=0;
    if(this.port)this.port.onmessage=event=>{
      if(event.data?.type==='monitor')this.telemetry=!!event.data.enabled;
    };
  }
  reportPitch(data){
    if(!this.telemetry)return;
    this.port?.postMessage({type:'pitch',seq:++this.telemetrySeq,...data});
  }
  detect(key,scale){
    const r=this.mono,p=this.pos,limit=2048,hop=4;
    let energy=0;
    for(let j=0;j<limit;j+=hop){const v=r[(p-j-1+RING_SIZE)%RING_SIZE];energy+=v*v;}
    if(energy<.012){this.targetRatio=1;this.reportPitch({voiced:false});return;}
    const low=Math.floor(sampleRate/800),high=Math.min(590,Math.floor(sampleRate/85));
    // A periodic voice can correlate at 2×, 3× and 4× its true period.
    // Keep plausible candidates and select the shortest nearly-optimal lag;
    // otherwise strong pure notes can be displayed an octave or more too low.
    let bestLag=0,bestScore=.57;
    const candidates=[];
    for(let lag=low;lag<=high;lag+=2){
      let dot=0,e1=0,e2=0;
      for(let j=0;j<limit;j+=hop){
        const x=r[(p-j-1+RING_SIZE)%RING_SIZE],y=r[(p-j-1-lag+RING_SIZE*2)%RING_SIZE];
        dot+=x*y;e1+=x*x;e2+=y*y;
      }
      const score=dot/Math.sqrt(e1*e2+1e-9);
      if(score>.57)candidates.push({lag,score});
      if(score>bestScore){bestScore=score;bestLag=lag;}
    }
    if(bestLag){
      const strongestShortPeriod=candidates.find(c=>c.score>=bestScore-.01);
      if(strongestShortPeriod)bestLag=strongestShortPeriod.lag;
    }
    if(!bestLag){this.targetRatio=1;this.reportPitch({voiced:false});return;}
    const pitch=sampleRate/bestLag,midi=69+12*Math.log2(pitch/440);
    const notes=scale===1?MINOR:scale===2?null:MAJOR;
    let target=Math.round(midi);
    if(notes){
      let distance=Infinity;
      for(let n=Math.floor(midi)-7;n<=Math.ceil(midi)+7;n++){
        if(!notes.includes(((n-key)%12+12)%12))continue;
        const d=Math.abs(n-midi);if(d<distance){distance=d;target=n;}
      }
    }
    this.targetRatio=Math.max(.7,Math.min(1.45,Math.pow(2,(target-midi)/12)));
    this.reportPitch({voiced:true,midi,target,frequency:pitch,confidence:bestScore,cents:(midi-target)*100});
  }
  read(buf,index){
    const i=Math.floor(index),f=index-i;
    const a=buf[(i+RING_SIZE*4)%RING_SIZE],b=buf[(i+1+RING_SIZE*4)%RING_SIZE];
    return a+(b-a)*f;
  }
  process(inputs,outputs,params){
    const input=inputs[0],output=outputs[0];if(!output||!output.length)return true;
    const strength=params.strength[0],retune=params.retune[0],key=Math.round(params.key[0]),scale=Math.round(params.scale[0]),clean=params.clean[0];
    const shift=params.shift?.[0]||0;
    const len=output[0].length;
    for(let i=0;i<len;i++){
      const l=input?.[0]?.[i]||0,r=input?.[1]?.[i]??l;
      const mono=(l+r)*.5;this.mono[this.pos]=mono;
      this.buffers[0][this.pos]=l;this.buffers[1][this.pos]=r;
      if(++this.counter>=4096){this.counter=0;if(strength>.008||this.telemetry)this.detect(key,scale);else this.targetRatio=1;}
      this.ratio+=(this.targetRatio-this.ratio)*(.00016+retune*retune*.014);
      this.envelope+=(Math.abs(mono)-this.envelope)*(Math.abs(mono)>this.envelope?.08:.006);
      const threshold=clean*clean*.019;
      const gateTarget=clean<.01?1:this.envelope<threshold?.07:1;
      this.gate+=(gateTarget-this.gate)*(gateTarget>this.gate?.025:.002);
      let voiceL=l,voiceR=r;
      if(strength>.008||Math.abs(shift)>.012){
        const ratio=this.ratio*Math.pow(2,shift/12),grain=this.grain,ph=this.phase,ph2=(ph+.5)%1;
        const base=256+Math.max(0,ratio-1)*grain;
        const d1=base+(1-ratio)*ph*grain,d2=base+(1-ratio)*ph2*grain;
        const w1=.5-.5*Math.cos(2*Math.PI*ph),w2=.5-.5*Math.cos(2*Math.PI*ph2);
        const a1=this.read(this.buffers[0],this.pos-d1),a2=this.read(this.buffers[0],this.pos-d2);
        const b1=this.read(this.buffers[1],this.pos-d1),b2=this.read(this.buffers[1],this.pos-d2);
        const mix=Math.abs(shift)>.012?1:strength;
        voiceL=l*(1-mix)+(a1*w1+a2*w2)*mix;
        voiceR=r*(1-mix)+(b1*w1+b2*w2)*mix;
      }
      output[0][i]=voiceL*this.gate;
      if(output[1])output[1][i]=voiceR*this.gate;
      this.phase+=1/this.grain;if(this.phase>=1)this.phase-=1;
      this.pos=(this.pos+1)%RING_SIZE;
    }
    return true;
  }
}
registerProcessor('vas-voice',VoiceProcessor);
