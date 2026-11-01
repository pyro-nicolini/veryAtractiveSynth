/** Assemble 2-channel master PCM, retaining the limiter output and headroom. */
export function assembleSessionStereo(ctx,chunks,expectedFrames){
  const frames=Math.floor(Number(expectedFrames));
  if(!Number.isFinite(frames)||frames<=0||frames>ctx.sampleRate*600)
    throw Error('Duración de sesión inválida');
  const buffer=ctx.createBuffer(2,frames,ctx.sampleRate),left=buffer.getChannelData(0),right=buffer.getChannelData(1);
  let offset=0;
  for(const item of chunks){
    if(offset>=frames)break;
    const count=Math.min(frames-offset,item.left.length,item.right.length);
    left.set(item.left.subarray(0,count),offset);
    right.set(item.right.subarray(0,count),offset);
    offset+=count;
  }
  if(offset!==frames)throw Error('La sesión perdió muestras durante la captura');
  return buffer;
}
