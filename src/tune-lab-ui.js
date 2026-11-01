import {TUNE_POINTS,normalizeTune,describeTune,tunePointFromManual,validSavedTune} from './tune-lab.js';
import {VOICE_CHARACTERS} from './voice-characters.js';
const escapeHTML = value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent=value=>((value+1)*50).toFixed(2)+'%';
const vertical=value=>((1-value)*50).toFixed(2)+'%';
export const USER_TUNE_KEY='vas-tune-presets-v1';
export function loadUserTunes(){
  try{
    const raw=JSON.parse(localStorage.getItem(USER_TUNE_KEY)||'[]');
    if(!Array.isArray(raw))return [];
    return raw.map(validSavedTune).filter(Boolean).slice(0,12);
  }catch{return [];}
}
export function saveUserTune(name,x,y){
  const entry=validSavedTune({name,x,y});
  if(!entry)throw Error('Escribe un nombre corto para el estilo (hasta 40 letras)');
  const current=loadUserTunes();
  const without=current.filter(p=>p.name.toLowerCase()!==entry.name.toLowerCase());
  without.push(entry);
  if(without.length>12)without.shift();
  try{localStorage.setItem(USER_TUNE_KEY,JSON.stringify(without));}
  catch{throw Error('No se pudo guardar este estilo en el navegador');}
  return entry;
}
export function customTuneMarkup(presets){
  if(!presets.length)return '<span class="lab-empty-presets">Aquí aparecerán tus estilos guardados.</span>';
  return presets.map((p,i)=>'<button type="button" class="lab-preset lab-user-preset" data-user-tune="'+i+'" title="Cargar '+escapeHTML(p.name)+'">✧ '+escapeHTML(p.name)+'</button>').join('');
}
export function tuneLabMarkup(track,userPresets=[],mode='track',hasTrack=true){
  const p=Number.isFinite(track.tuneX)&&Number.isFinite(track.tuneY)?
    normalizeTune(track.tuneX,track.tuneY):
    tunePointFromManual(track.autotune,track.retune);
  const presets=TUNE_POINTS.map(point=>'<button type="button" class="lab-anchor" data-tune-preset="'+point.id+'"'+
    ' style="left:'+percent(point.x)+';top:'+vertical(point.y)+'" title="'+escapeHTML(point.name)+'" aria-label="Probar '+escapeHTML(point.name)+'">'+
    '<span class="lab-anchor-dot">'+point.emoji+'</span><span class="lab-anchor-label">'+escapeHTML(point.name)+'</span></button>').join('');
  const chips=TUNE_POINTS.map(point=>'<button type="button" class="lab-preset" data-tune-preset="'+point.id+'">'+point.emoji+' '+escapeHTML(point.name)+'</button>').join('');
  return '<section class="tune-lab" id="tuneLab">'+
    '<div class="lab-intro"><div><div class="section-overline">EXPERIMENTAL / LOCAL AUDIO</div>'+
    '<p>Juega con el nodo en vivo: canta con un micrófono y auriculares, o transforma una pista mientras suena.</p></div>'+
    '<button type="button" class="mini-action" data-info="tuneLab" aria-label="Información sobre Tune Lab">i</button></div>'+
    '<div class="lab-mode-switch" role="group" aria-label="Fuente del Voice Playground">'+
      '<button type="button" class="lab-mode '+(mode==='track'?'active':'')+'" data-action="tune-source-track" aria-pressed="'+(mode==='track')+'" '+(!hasTrack?'disabled':'')+'>♫ PISTA</button>'+
      '<button type="button" class="lab-mode '+(mode==='live'?'active':'')+'" data-action="tune-source-live" aria-pressed="'+(mode==='live')+'">◉ MI VOZ EN VIVO</button>'+
    '</div>'+
    '<div class="lab-live-controls" id="labLiveControls" '+(mode==='live'?'':'hidden')+'>'+
      '<label for="labMicSelect">ENTRADA DE MICRÓFONO</label>'+
      '<select id="labMicSelect" aria-label="Elegir micrófono para Voice Playground"><option value="">Micrófono predeterminado</option></select>'+
      '<button type="button" class="lab-action lab-play" data-action="tune-live-start">◉ ACTIVAR MI VOZ</button>'+
      '<button type="button" class="lab-action" data-action="tune-live-stop">■ DETENER MICRÓFONO</button>'+
      '<div class="lab-live-gains"><label>ENTRADA <input id="labLiveInputGain" type="range" min="0" max="150" step="5" value="100" aria-label="Ganancia de entrada"></label><output id="labLiveInputValue">100%</output>'+
      '<label>MONITOR <input id="labLiveMonitor" type="range" min="0" max="80" step="5" value="'+Math.min(80,track.volume??60)+'" aria-label="Volumen de escucha en vivo"></label><output id="labLiveMonitorValue">'+Math.min(80,track.volume??60)+'%</output></div>'+
      '<div class="lab-live-meter"><span id="labLiveMeter"></span></div>'+
      '<p id="labLiveStatus" role="status">Usa auriculares. Presiona activar para escuchar tu voz procesada; no se graba nada automáticamente.</p>'+
    '</div>'+
    '<div class="lab-play-tools"><button type="button" class="lab-action lab-play" data-action="tune-preview" '+(mode==='live'?'hidden':'')+'>▶ ESCUCHAR CAMBIOS</button>'+
      '<button type="button" class="lab-action" data-action="tune-apply" '+(mode==='live'&&hasTrack?'':'hidden')+'>⇢ APLICAR A PISTA</button>'+
    '<button type="button" class="lab-action" data-action="tune-ab">'+(track.bypassEffects?'↪ VOLVER A EFECTOS':'◉ A/B ORIGINAL')+'</button>'+
    '<button type="button" class="lab-action" data-action="tune-surprise">✦ SORPRÉNDEME</button>'+
    '<button type="button" class="lab-action lab-session-record" data-action="session-record" aria-pressed="false">● GRABAR LO QUE ESCUCHO</button></div>'+
    '<div class="lab-top-axis"><span>↑ MÁS INTENSO</span><span>Y / FUERZA DE AFINACIÓN</span></div>'+
    '<div class="lab-pad" id="tunePad" role="group" tabindex="0" aria-label="Explorar autotune por coordenadas. Flechas izquierda y derecha cambian lo natural o robótico; arriba y abajo cambian intensidad." aria-describedby="labHint">'+
    '<div class="lab-grid"></div><div class="lab-axis-h"></div><div class="lab-axis-v"></div>'+
    '<span class="lab-quadrant q-nw">R&B / EMOTIVO</span><span class="lab-quadrant q-ne">TRAP / ROBOT</span>'+
    '<span class="lab-quadrant q-sw">SUAVE / HUMANO</span><span class="lab-quadrant q-se">GLITCH / DIGITAL</span>'+
    presets+
    '<div class="lab-crosshair lab-crosshair-x" id="labCrossX"></div><div class="lab-crosshair lab-crosshair-y" id="labCrossY"></div>'+
    '<div class="lab-node" id="labNode" style="left:'+percent(p.x)+';top:'+vertical(p.y)+'" aria-hidden="true"><span class="lab-node-core"></span></div>'+
    '</div><div class="lab-bottom-axis"><span>← NATURAL</span><span>ROBOT →</span></div>'+
    '<div class="lab-coordinates" role="status" aria-live="off"><span id="labXCoord">X '+p.x.toFixed(2)+'</span>'+
    '<span id="labYCoord">Y '+p.y.toFixed(2)+'</span><span id="labTuningReadout">AFINACIÓN</span></div>'+
    '<div class="lab-pitch-monitor" id="labPitchMonitor" aria-label="Analizador de nota estimada durante la reproducción">'+
    '<div class="lab-pitch-labels"><span>NOTA DETECTADA <button class="mini-action info-button" data-info="pitchReading" type="button" title="Cómo leer el indicador">i</button></span><span id="labPitchStatus">PULSA ESCUCHAR CAMBIOS</span></div>'+
    '<div class="lab-pitch-main"><strong id="labPitchNote">—</strong><small id="labPitchHz">—</small><span>NOTA MÁS CERCANA</span><strong id="labPitchTarget">—</strong></div>'+
    '<div class="lab-pitch-scale"><span>♭</span><div class="lab-pitch-scale-line"><i id="labPitchNeedle" style="left:50%"></i></div><span>♯</span></div>'+
    '<div class="lab-pitch-cents" id="labPitchCents">—</div>'+
    '</div>'+
    '<div class="lab-mood"><span class="lab-mood-spark">✦</span><div><strong id="labMoodTitle"></strong><p id="labMoodDetail"></p></div></div>'+
    '<div class="lab-axes-controls"><label for="labXInput">Natural <span>↔</span> Robótico</label>'+
    '<input id="labXInput" type="range" min="-100" max="100" step="1" value="'+Math.round(p.x*100)+'" data-tune-axis="x" aria-label="Natural o robótico">'+
    '<label for="labYInput">Sutil <span>↔</span> Intenso</label>'+
    '<input id="labYInput" type="range" min="-100" max="100" step="1" value="'+Math.round(p.y*100)+'" data-tune-axis="y" aria-label="Intensidad de afinación"></div>'+
    '<div class="lab-divider"></div><section class="character-studio" aria-label="Personajes de voz"><div class="lab-presets-head"><strong>✧ PERSONAJES · CAMBIA TU VOZ</strong><small>Experimental · sin preservar formantes</small></div>'+    '<p>Explora tonos graves, agudos y distorsiones. Son personajes sonoros, no conversiones reales de edad o identidad vocal.</p>'+    '<div class="character-pad" id="characterPad" role="group" tabindex="0" aria-label="Arrastra el punto: izquierda grave, derecha agudo, abajo limpio, arriba distorsionado"><div class="character-grid"></div><span class="char-corner char-nw">MONSTRUO</span><span class="char-corner char-ne">MARCIANO</span><span class="char-corner char-sw">GIGANTE</span><span class="char-corner char-se">HELIO</span><div id="characterNode" class="character-node" style="left:'+((Math.max(-12,Math.min(12,track.pitchShift||0))+12)/24*100)+'%;top:'+(100-Math.max(0,Math.min(100,track.drive||0)))+'%"></div></div>'+    '<div class="character-hint">← VOZ GRAVE <span id="characterReadout">Altura '+(track.pitchShift||0)+' semitonos · distorsión '+(track.drive||0)+'%</span> VOZ AGUDA →</div>'+    '<div class="character-presets">'+VOICE_CHARACTERS.map(c=>'<button type="button" class="lab-preset" data-voice-character="'+c.id+'">'+c.icon+' '+c.name+'</button>').join('')+'</div></section>'+    '<div class="lab-divider"></div><div class="lab-presets-head"><strong>DESTINOS PARA EXPLORAR</strong><small>Un clic para saltar</small></div>'+
    '<div class="lab-presets">'+chips+'</div>'+
    '<div class="lab-presets-head"><strong>TUS DESCUBRIMIENTOS</strong><small>Hasta 12 estilos locales</small></div>'+
    '<div id="labUserPresets" class="lab-presets">'+customTuneMarkup(userPresets)+'</div>'+
    '<div class="lab-save-style"><label for="labPresetName" class="sr-lab">Nombre del estilo</label>'+
    '<input id="labPresetName" maxlength="40" placeholder="Ej: Mi voz galáctica" autocomplete="off">'+
    '<button type="button" class="lab-action lab-save" data-action="tune-save">＋ GUARDAR ESTILO</button></div>'+
    '<button type="button" class="lab-reset" data-action="tune-reset">↺ Reiniciar el nodo</button>'+
    '<p id="labHint" class="lab-caution">El corrector de tono todavía es experimental. Este plano controla afinación, velocidad y un leve color del sonido; no recupera grabaciones dañadas ni reemplaza un autotune de estudio. Si no hay audio reproduciéndose, presiona ESCUCHAR CAMBIOS.</p>'+
  '</section>';
}
export function updateTuneLabView(root,track){
  if(!root)return;
  const p=Number.isFinite(track.tuneX)&&Number.isFinite(track.tuneY)?
    normalizeTune(track.tuneX,track.tuneY):
    tunePointFromManual(track.autotune,track.retune);
  const node=root.querySelector('#labNode'),cx=root.querySelector('#labCrossX'),cy=root.querySelector('#labCrossY');
  if(node){node.style.left=percent(p.x);node.style.top=vertical(p.y);}
  if(cx)cx.style.top=vertical(p.y);
  if(cy)cy.style.left=percent(p.x);
  const mood=describeTune(p.x,p.y);
  const put=(id,value)=>{const el=root.querySelector(id);if(el)el.textContent=value;};
  put('#labXCoord','X '+p.x.toFixed(2));
  put('#labYCoord','Y '+p.y.toFixed(2));
  put('#labTuningReadout',Math.round(track.autotune)+'% AFINACIÓN · '+Math.round(track.retune)+'% VELOCIDAD');
  put('#labMoodTitle',mood.title);put('#labMoodDetail',mood.detail);
  const x=root.querySelector('#labXInput'),y=root.querySelector('#labYInput');
  if(x&&document.activeElement!==x)x.value=String(Math.round(p.x*100));
  if(y&&document.activeElement!==y)y.value=String(Math.round(p.y*100));
  root.querySelectorAll('[data-tune-preset]').forEach(button=>{
    button.classList.toggle('is-active',track.tunePreset===button.dataset.tunePreset);
    button.setAttribute('aria-pressed',String(track.tunePreset===button.dataset.tunePreset));
  });
  const ab=root.querySelector('[data-action="tune-ab"]');
  if(ab){ab.textContent=track.bypassEffects?'↪ VOLVER A EFECTOS':'◉ A/B ORIGINAL';ab.setAttribute('aria-pressed',String(!!track.bypassEffects));}
}
