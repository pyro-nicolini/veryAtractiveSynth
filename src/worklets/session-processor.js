/* Local stereo PCM recording of the post-limiter MASTER output.
 * Independent of microphone capture. No MediaRecorder, cloud, or codec.
 * Max 10 minutes, then self-stops; never forwards audio to destination.
 */
class VasSessionCapture extends AudioWorkletProcessor{
  constructor(options){
    super();
    this.size=2048;
    this.left=new Float32Array(this.size);
    this.right=new Float32Array(this.size);
    this.index=0;this.frames=0;this.active=true;
    this.limit=Math.max(1,Math.floor(options?.processorOptions?.limitFrames||sampleRate*600));
    this.port.onmessage=event=>{
      if(event.data?.type==='stop')this.finish();
    };
  }
  flush(){
    if(!this.index)return;
    const left=this.left.slice(0,this.index),right=this.right.slice(0,this.index);
    this.port.postMessage({type:'chunk',left,right,frames:this.index},[left.buffer,right.buffer]);
    this.index=0;
  }
  finish(){
    if(!this.active)return;
    this.active=false;this.flush();
    this.port.postMessage({type:'complete',frames:this.frames});
  }
  process(inputs,outputs){
    for(const channel of outputs[0]||[])channel.fill(0);
    if(!this.active)return true;
    const left=inputs[0]?.[0],right=inputs[0]?.[1]||left;
    if(!left)return true;
    for(let i=0;i<left.length;i++){
      if(this.frames>=this.limit){this.finish();break;}
      this.left[this.index]=Number.isFinite(left[i])?left[i]:0;
      this.right[this.index]=Number.isFinite(right?.[i])?right[i]:0;
      this.index++;this.frames++;
      if(this.index===this.size)this.flush();
    }
    return true;
  }
}
registerProcessor('vas-session-capture',VasSessionCapture);
