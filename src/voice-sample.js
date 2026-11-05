import {defaults,safeFilename} from './dsp.js';
import {saveLibrarySample} from './sample-library.js';

/** Render only this vocal take through its saved processing, then store the actual PCM. */
export async function saveProcessedVoiceSample(engine,buffer,settings,name,save=saveLibrarySample){
  const source={...defaults(),...settings,id:'live-sample',name,type:'voice',buffer,offset:0,bus:'vocals',muted:false,solo:false};
  const wav=await engine.exportMix([source],{depth:32,rate:48000});
  const processed=await engine.decode(new File([wav],safeFilename(name)+'.wav',{type:'audio/wav'}));
  return save({buffer:processed,from:0,to:processed.duration,name,fx:'rendered'});
}
