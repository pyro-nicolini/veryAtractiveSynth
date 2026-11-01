/** Pure, read-only presentation of estimated fundamental pitch.
 * All values are observations from the experimental voice AudioWorklet,
 * not pitch accuracy measurements or real-time "auto key detection". */
const NOTES=['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];
export function noteName(midi){
  if(!Number.isFinite(midi))return '—';
  const rounded=Math.round(midi);
  return NOTES[((rounded%12)+12)%12]+String(Math.floor(rounded/12)-1);
}
export function pitchReadout(message){
  if(!message?.voiced || !Number.isFinite(message.midi)||
      !Number.isFinite(message.target) || !Number.isFinite(message.cents) ||
      !Number.isFinite(message.frequency) || !Number.isFinite(message.confidence) ||
      message.frequency<65||message.frequency>1200 || message.confidence<.57){
    return {voiced:false,note:'—',target:'—',cents:'—',hertz:'—',position:50,status:'SIN NOTA CLARA'};
  }
  const cents=Math.max(-100,Math.min(100,Math.round(message.cents)));
  return {voiced:true,
    note:noteName(message.midi),target:noteName(message.target),
    cents:(cents>=0?'+':'')+cents+' cents',
    hertz:Math.round(message.frequency)+' Hz',
    position:Math.max(0,Math.min(100,50+cents*.5)),
    status:Math.abs(cents)<=15?'CASI AFINADO':Math.abs(cents)<=40?'CERCA DE LA NOTA':'CORRIGIENDO NOTA'};
}
