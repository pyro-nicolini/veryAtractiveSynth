/* PCM capture from the same AudioContext used by playback.
   The microphone stays on-device. Mono Float32 chunks are transferred to
   the UI thread; MediaRecorder container/codec support is not required. */
class VasCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 2048;
    this.chunk = new Float32Array(this.size);
    this.index = 0;
    this.frames = 0;
    this.active = true;
    this.port.onmessage = event => {
      if (event.data?.type !== 'stop' || !this.active) return;
      this.active = false;
      this.flush();
      this.port.postMessage({ type: 'complete', frames: this.frames });
    };
  }
  flush() {
    if (!this.index) return;
    const values = this.chunk.slice(0,this.index);
    this.port.postMessage({ type:'chunk', samples: values, frames: values.length }, [values.buffer]);
    this.chunk = new Float32Array(this.size);
    this.index = 0;
  }
  process(inputs, outputs) {
    const input=inputs[0]||[], output=outputs[0]||[];
    // Do not echo microphone input to the loudspeakers.
    for(const channel of output)channel.fill(0);
    if (!this.active) return true;
    const left=input[0],right=input[1];
    const length=output[0]?.length||left?.length||128;
    for(let i=0;i<length;i++){
      const x=left?.[i]||0, y=right?.[i]??x;
      this.chunk[this.index++]=Math.max(-1,Math.min(1,(x+y)*.5));
      this.frames++;
      if(this.index===this.size)this.flush();
    }
    return true;
  }
}
registerProcessor('vas-capture',VasCapture);
