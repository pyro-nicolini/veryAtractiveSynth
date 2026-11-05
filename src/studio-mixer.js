/** Mixer routing and gain conversion. All values are private project metadata. */
export const BUS_IDS=Object.freeze(['music','vocals','samples','fx']);
export const BUS_LABELS=Object.freeze({music:'MÚSICA',vocals:'VOCES',samples:'SAMPLES',fx:'EFECTOS'});
export const DEFAULT_BUSES=Object.freeze({music:100,vocals:100,samples:100,fx:100});
export function busForTrack(track){
  return BUS_IDS.includes(track?.bus)?track.bus:(track?.type==='voice'?'vocals':'music');
}
export function sanitiseBuses(value){
  return Object.fromEntries(BUS_IDS.map(id=>[id,Math.max(0,Math.min(100,Number.isFinite(Number(value?.[id]))?Number(value[id]):100))]));
}
export function percentToDb(value){
  const gain=Math.max(0,Math.min(100,Number(value)||0))/100;
  return gain<=.00001?null:20*Math.log10(gain);
}
export function dbToPercent(db){
  if(db===null||db===-Infinity)return 0;
  const n=Number(db);
  return Math.max(0,Math.min(100,Math.round(Math.pow(10,n/20)*1000)/10));
}
export function formatDb(value){
  const db=percentToDb(value);
  return db===null?'−∞ dB':db.toFixed(1)+' dB';
}
export function meterStats(samples){
  if(!samples?.length)return {peak:0,rms:0,db:null};
  let peak=0,sum=0;
  for(const n of samples){
    const sample=Number.isFinite(n)?n:0;
    peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;
  }
  return {peak,rms:Math.sqrt(sum/samples.length),db:peak>0?20*Math.log10(peak):null};
}
