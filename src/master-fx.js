/** Master-bus processor settings shared by realtime playback and offline render. */
export const MASTER_FX_DEFAULTS=Object.freeze({
  low:0,high:0,drive:0,compression:0,delay:0,reverb:0,bypass:false
});
export const MASTER_FX_CHAIN=Object.freeze([
  {id:'low',label:'LOW',hint:'Ajusta el cuerpo de toda la mezcla',min:-12,max:12,step:1},
  {id:'high',label:'HIGH',hint:'Ajusta el brillo de toda la mezcla',min:-12,max:12,step:1},
  {id:'drive',label:'DRIVE',hint:'Añade saturación armónica global',min:0,max:100,step:1},
  {id:'compression',label:'COMP',hint:'Controla los picos de la mezcla',min:0,max:100,step:1},
  {id:'delay',label:'DELAY',hint:'Añade eco global con mezcla moderada',min:0,max:100,step:1},
  {id:'reverb',label:'REVERB',hint:'Añade espacio a la mezcla completa',min:0,max:100,step:1}
]);
const number=(value,min,max,fallback=0)=>{
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
export function sanitiseMasterFx(value={}){
  return {
    low:number(value.low,-12,12),high:number(value.high,-12,12),
    drive:number(value.drive,0,100),compression:number(value.compression,0,100),
    delay:number(value.delay,0,100),reverb:number(value.reverb,0,100),
    bypass:!!value.bypass
  };
}
export function masterFxActive(settings={}){
  const fx=sanitiseMasterFx(settings);
  return !fx.bypass&&(fx.low!==0||fx.high!==0||fx.drive>0||fx.compression>0||fx.delay>0||fx.reverb>0);
}
