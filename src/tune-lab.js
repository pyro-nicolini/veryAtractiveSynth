/**
 * Tune Lab XY: pure deterministic mapping to actual v0.4 WebAudio parameters.
 * X (-1..1) => natural / tight-robotic tuning speed.
 * Y (-1..1) => subtle / strong pitch correction.
 * Tone coloration is intentionally mild: user's noise reduction, key, scale,
 * volume, echo and reverb stay intact.
 * No claims of formant-preserving/professional pitch shifting.
 */
const norm = value => Number.isFinite(Number(value)) ? Math.max(-1, Math.min(1, Number(value))) : 0;
const rounded = value => Math.round(value);
export const TUNE_POINTS = Object.freeze([
  {id:'natural',name:'Natural',x:-.75,y:-1,emoji:'◇'},
  {id:'pop',name:'Pop Clean',x:.18,y:.70,emoji:'✧'},
  {id:'rnb',name:'R&B suave',x:-.40,y:.38,emoji:'◌'},
  {id:'trap',name:'Trap Hard',x:.92,y:.95,emoji:'◆'},
  {id:'alien',name:'Alien',x:.98,y:.46,emoji:'✦'},
  {id:'weird',name:'Experimental',x:.45,y:-.56,emoji:'⁂'}
]);
export function normalizeTune(x,y) {
  return {x:rounded(norm(x)*100)/100,y:rounded(norm(y)*100)/100};
}
export function mapTunePoint(x,y) {
  const p=normalizeTune(x,y),rx=(p.x+1)/2,ry=(p.y+1)/2;
  return {
    tuneX:p.x,tuneY:p.y,
    retune:rounded(5+95*rx),
    autotune:rounded(100*ry),
    // Subtle coloration grounded in existing brightness/warmth/drive nodes.
    brightness:rounded(43+17*ry+10*rx),
    warmth:rounded(33-14*rx+5*(1-ry)),
    drive:rounded(22*rx*ry)
  };
}
export function tunePointFromManual(autotune,retune) {
  return normalizeTune((Math.max(5,Math.min(100,Number(retune)||5))-5)/95*2-1,
    Math.max(0,Math.min(100,Number(autotune)||0))/100*2-1);
}
export function describeTune(x,y) {
  const p=normalizeTune(x,y);
  if(p.y<=-.72)return {title:'Casi natural',detail:'Afinación mínima, conserva la personalidad de tu voz.'};
  if(p.x>=.65&&p.y>=.56)return {title:'Robot neón',detail:'Afinación intensa, cambios de nota rápidos.'};
  if(p.x>=.70&&p.y>=-.25)return {title:'Alien digital',detail:'Respuesta veloz con un toque de saturación.'};
  if(p.y>=.55&&p.x<-.30)return {title:'Balada suave',detail:'Afinación intensa con transiciones relajadas.'};
  if(p.x>=0&&p.y>=.25)return {title:'Pop brillante',detail:'Corrección presente con ataque definido.'};
  if(p.x<-.25&&p.y>.05)return {title:'R&B flotante',detail:'Transiciones suaves, color cálido.'};
  if(p.x>.15&&p.y<-.3)return {title:'Glitch ligero',detail:'Respuesta rápida y afinación sutil.'};
  return {title:'Exploración libre',detail:'Mueve el nodo y escucha cómo cambia tu voz.'};
}
export function findTunePreset(id){
  return TUNE_POINTS.find(p=>p.id===id)||null;
}
export function validSavedTune(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||
     typeof value.name!=='string'||value.name.trim().length<1||
     value.name.length>40||!Number.isFinite(value.x)||!Number.isFinite(value.y)||
     value.x < -1||value.x>1||value.y < -1||value.y>1)return null;
  return {name:value.name.trim(),...normalizeTune(value.x,value.y)};
}
export function applyTunePoint(track,x,y,id='custom'){
  const updated=mapTunePoint(x,y);
  Object.assign(track,updated,{tunePreset:id,preset:'custom',bypassEffects:false});
  return updated;
}
