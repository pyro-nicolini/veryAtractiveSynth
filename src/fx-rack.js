/** Non-destructive per-effect bypass switches for the current fixed-order rack.
 * These controls do not reorder processor nodes or reset saved knob settings. */
export const FX_CHAIN=Object.freeze([
  {id:'tune',label:'Afinación',hint:'Corrección del tono de voz'},
  {id:'clean',label:'Limpieza',hint:'Puerta de ruido y filtros'},
  {id:'eq',label:'Ecualizador',hint:'Brillo y calidez'},
  {id:'drive',label:'Saturación',hint:'Distorsión suave'},
  {id:'compressor',label:'Compresor',hint:'Control de dinámica'},
  {id:'delay',label:'Eco',hint:'Repeticiones'},
  {id:'reverb',label:'Reverberación',hint:'Espacio'}
]);
export const FX_IDS=Object.freeze(FX_CHAIN.map(f=>f.id));
export function normaliseFxBypass(value){
  return Object.fromEntries(FX_IDS.map(id=>[id,value?.[id]===true]));
}
export function isFxBypassed(track,id){
  return FX_IDS.includes(id)&&track?.fxBypass?.[id]===true;
}
export function toggleTrackFx(track,id){
  if(!FX_IDS.includes(id))throw Error('Procesador desconocido');
  track.fxBypass={...normaliseFxBypass(track.fxBypass),[id]:!isFxBypassed(track,id)};
  return track.fxBypass[id];
}
