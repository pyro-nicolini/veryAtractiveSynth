/** Helpers for captured PCM; pure and testable without browser audio I/O. */
export const MAX_RECORDING_SECONDS=300;
export function assembleRecording(ctx,chunks,expectedFrames){
  if(!chunks.length||!expectedFrames)throw Error('No se detectó audio grabado. Comprueba el micrófono.');
  const count=Math.max(0,Math.floor(expectedFrames));
  const buffer=ctx.createBuffer(1,count,ctx.sampleRate);
  const dest=buffer.getChannelData(0);
  let position=0;
  for(const chunk of chunks){
    if(position>=count)break;
    const length=Math.min(count-position,chunk.length);
    dest.set(chunk.subarray(0,length),position);
    position+=length;
  }
  if(position<count)throw Error('Faltan muestras de la grabación. Intenta de nuevo.');
  return buffer;
}
export function meterLevel(samples) {
  if(!samples.length)return {rms:0,peak:0};
  let sum=0,peak=0;
  for(const value of samples){const a=Math.abs(value);peak=Math.max(peak,a);sum+=value*value;}
  return {rms:Math.sqrt(sum/samples.length),peak};
}
export function preferredAudioMime(MediaRecorderClass){
  if(!MediaRecorderClass||typeof MediaRecorderClass.isTypeSupported!=='function')return '';
  return ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']
    .find(type=>MediaRecorderClass.isTypeSupported(type))||'';
}
export function audioFileHint(file){
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(['amr','3gp','3gpp','caf','opus','oga'].includes(ext))
    return 'Este formato de teléfono puede no estar disponible en tu navegador. Convierte el archivo localmente a WAV PCM o M4A (AAC) y vuelve a importarlo.';
  if(['m4a','mp4','aac','heic'].includes(ext))
    return 'Algunas grabaciones del teléfono usan códecs que este navegador no puede decodificar. Prueba importarlas en Safari/Chrome actualizado o convertirlas localmente a WAV PCM.';
  return 'Este navegador no pudo decodificar el audio. Prueba un archivo WAV PCM o MP3.';
}
