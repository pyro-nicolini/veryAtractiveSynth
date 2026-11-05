export function beatSeconds(bpm,division=4){
  const value=Number(bpm),sub=Number(division);
  if(!Number.isFinite(value)||value<=0||!Number.isFinite(sub)||sub<=0)throw Error('BPM y división inválidos');
  return 60/value*4/sub;
}
export function quantizeOffset(offset,bpm,division=4){
  const step=beatSeconds(bpm,division),value=Number(offset);
  if(!Number.isFinite(value)||value<0)return 0;
  return Math.max(0,Math.round(value/step)*step);
}
export function quantizeClip(clip,bpm,division=4){
  if(!clip||typeof clip!=='object')throw Error('Clip inválido');
  return {...clip,offset:quantizeOffset(clip.offset||0,bpm,division)};
}
