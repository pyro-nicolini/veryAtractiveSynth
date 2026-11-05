// Twelve pitch classes, with C as bit zero. Null follows the selected key and scale.
const MAJOR=[0,2,4,5,7,9,11],MINOR=[0,2,3,5,7,8,10];
export const FULL_NOTE_MASK=0xfff;
export function normaliseTuneNoteMask(value){
  return Number.isInteger(value)&&value>0&&value<=FULL_NOTE_MASK?value:null;
}
export function scaleNoteMask(key=0,scale=0){
  const notes=scale===1?MINOR:scale===2?Array.from({length:12},(_,i)=>i):MAJOR;
  const root=((Math.trunc(Number(key)||0)%12)+12)%12;
  return notes.reduce((mask,n)=>mask|(1<<((root+n)%12)),0);
}
export function effectiveTuneNoteMask(track){
  return normaliseTuneNoteMask(track?.tuneNoteMask)??scaleNoteMask(track?.key,track?.scale);
}
export function toggleTuneNote(mask,note){
  if(!Number.isInteger(note)||note<0||note>11)return normaliseTuneNoteMask(mask);
  const next=mask^(1<<note);
  return next?next:mask;
}
