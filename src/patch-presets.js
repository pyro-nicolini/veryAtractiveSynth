/* Reusable, device-local FX patches (no audio or network data). */
import {normaliseFxBypass} from './fx-rack.js';
import {normaliseTuneNoteMask} from './tune-targets.js';
const KEY='vas-fx-patches-v1';
export const FX_PATCH_FIELDS=Object.freeze(['autotune','retune','pitchShift','clean','brightness','warmth','drive','echo','space','key','scale']);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
export function patchValues(track){
 const out={};
 for(const key of FX_PATCH_FIELDS)out[key]=key==='pitchShift'?clamp(track?.[key],-12,12):key==='key'?clamp(track?.[key],0,11):key==='scale'?clamp(track?.[key],0,2):clamp(track?.[key],0,100);
 out.fxBypass=normaliseFxBypass(track?.fxBypass);
 out.tuneNoteMask=normaliseTuneNoteMask(track?.tuneNoteMask);
 out.pitchCalibration=clamp(track?.pitchCalibration??0,-12,12);
 out.bypassEffects=!!track?.bypassEffects;
 return out;
}
export function listPatchPresets(){
 try{const json=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(json)?json.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.values).slice(0,100):[];}
 catch{return [];}
}
export function savePatchPreset(name,track){
 if(typeof localStorage==='undefined')throw Error('Almacenamiento local no disponible');
 const n=String(name||'').trim().slice(0,42);
 if(!n)throw Error('Escribe un nombre para el preset');
 const all=listPatchPresets();
 if(all.length>=100)throw Error('Máximo 100 presets locales. Elimina uno que ya no utilices.');
 const id=globalThis.crypto?.randomUUID?.()||'fx-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 const preset={id,name:n,values:patchValues(track)};
 localStorage.setItem(KEY,JSON.stringify([preset,...all]));return preset;
}
export function deletePatchPreset(id){
 if(typeof localStorage==='undefined')return;
 localStorage.setItem(KEY,JSON.stringify(listPatchPresets().filter(x=>x.id!==id)));
}
export function applyPatchPreset(track,preset){
 if(!preset?.values)throw Error('Preset desconocido');
 const values=patchValues(preset.values);
 Object.assign(track,values,{fxBypass:{...values.fxBypass}});
 return track;
}
