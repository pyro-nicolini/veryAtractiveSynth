import {AudioEngine} from './engine.js';
import {KEYS,SCALES,COLORS,PRESETS,defaults,clock,clamp,projectDuration,effectiveDuration,peaks,synthBeat,downloadBlob,safeFilename} from './dsp.js';
import {saveSession,loadSession,listNamedProjects,saveNamedProject,deleteNamedProject} from './project-store.js';
import {MAX_RECORDING_SECONDS,meterLevel,audioFileHint} from './recording-utils.js';
import {exportProject,importProject} from './portable-project.js';
import {zipStore} from './zip-store.js';
import {TUNE_POINTS,normalizeTune,tunePointFromManual,applyTunePoint,findTunePreset} from './tune-lab.js';
import {tuneLabMarkup,updateTuneLabView,loadUserTunes,saveUserTune,customTuneMarkup} from './tune-lab-ui.js';
import {timelineSpan,pointerTime,setOffset,splitClip} from './timeline.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const engine=new AudioEngine();
const state={tracks:[],selected:null,position:0,recording:null,preview:null,recordMeterHistory:[],meterFrame:0,preferredInput:'',scrubbing:false,dragClip:null,bpm:104,metronome:false,snap:false,loop:false,recordShiftMs:0,master:85,busy:false};
const HELP={
  studio:['Bienvenido a tu estudio','1. Importa una base o prueba un ritmo. 2. Pulsa Grabar mi voz y canta. 3. Selecciona una capa para modificarla. 4. Dale Play y exporta tu mezcla. Todo el audio se procesa en tu equipo.'],
  tracks:['Capas de sonido','Cada capa es independiente. Puedes combinar voz, batería, música y efectos. Toca una para modificarla. M silencia, S deja escuchar solo esa capa. La flecha abre las acciones de la capa.'],
  timeline:['Línea de tiempo','Cada forma de onda representa un sonido. Toca o arrastra el cabezal verde en la regla de tiempo para adelantar o retroceder. También puedes tocar una onda. Usa las flechas izquierda y derecha del teclado para avanzar o retroceder 1 segundo. En AJUSTAR TIEMPOS puedes desplazar, recortar y suavizar entradas y salidas.'],
  inspector:['Ajustes de la capa','Los tres controles principales son volumen, afinación y limpieza. Prueba un estilo predefinido si no sabes por dónde empezar. Los efectos adicionales se encuentran en MÁS EFECTOS.'],
  volume:['Volumen de esta capa','Sube o baja únicamente el sonido seleccionado. No cambia el volumen de las otras pistas.'],
  master:['Volumen final','Controla lo que escuchas y lo que sale en el archivo exportado. Evita subirlo tanto que distorsione.'],
  autotune:['Afinación automática','Hace que las notas de la voz se acerquen a una escala musical. 0% es voz original; 100% es un efecto pronunciado. Funciona mejor con una voz individual y clara. El algoritmo actual es experimental, no equivale a un procesador vocal profesional.'],
  retune:['Velocidad de afinación','Alta: efecto robótico y cambios más rápidos. Baja: transiciones más suaves y naturales.'],
  clean:['Eliminar ruido suave','Reduce ruido de fondo durante los silencios y corta frecuencias graves indeseadas. No recupera detalles que una grabación perdió, ni separa voces del ruido fuerte. Usa un valor moderado para no cortar palabras bajas.'],
  key:['Tono de la canción','Elige la nota raíz de la música. Si no lo sabes, prueba Do. Para afinar correctamente, la escala debe coincidir con la de tu canción.'],
  scale:['Escala musical','Mayor suena alegre, menor suele sentirse más melancólica. Cromática utiliza las doce notas. La voz se ajusta a las notas de la escala elegida.'],
  brightness:['Brillo','Agrega o reduce presencia en las frecuencias altas. Si se oye áspero, bájalo.'],
  warmth:['Calidez','Da más cuerpo a las frecuencias bajas de la voz o el instrumento.'],
  echo:['Eco','Repite parte del sonido después de una fracción de segundo.'],
  space:['Espacio','Agrega reverberación, como si cantaras en una sala grande.'],
  drive:['Distorsión','Añade saturación suave para voces vintage o efectos más intensos.'],
  pan:['Dirección','Coloca el sonido un poco hacia el lado izquierdo o derecho del estéreo.'],
  position:['Mover sonido','Retrasa esta capa respecto al comienzo de la canción. Útil para sincronizar una voz grabada con una base.'],
  trims:['Recortar','Oculta parte del inicio o del final del clip sin modificar el audio original. Puedes volver a recuperarla.'],
  fades:['Transiciones suaves','Entrada: el sonido aparece progresivamente. Salida: desaparece progresivamente. Ideal para introducciones y finales.'],
  presets:['Estilos listos para usar','Selecciona un estilo para ajustar varios efectos de la capa de una vez. Después puedes modificar cualquier control por separado.'],
  export:['Exportación WAV','Se genera una mezcla estéreo WAV con los efectos aplicados. 16-bit es compatible con casi todos los equipos; 24-bit se usa habitualmente para producción; 32-bit float sirve para continuar mezclando. Una calidad de salida alta no puede recuperar detalle perdido en una grabación original.'],
  recording:['Grabar con el micrófono','Selecciona el micrófono, presiona PROBAR ENTRADA y comprueba que el medidor se mueve con tu voz. Después comienza a grabar: se dibujará una forma de onda mientras cantas. La captura es PCM local (sin incompatibilidades del archivo comprimido de MediaRecorder). Usa auriculares para cantar sobre la base.'],
  monitor:['Escucharme con efectos','Si activas esta opción oirás tu micrófono con efectos. Usa auriculares cableados para evitar acoples y reducir la latencia. Para activar o desactivar esta opción, vuelve a probar la entrada.'],
  offline:['Tus sonidos son privados','Nada se envía a servidores. Guarda la sesión en este navegador con GUARDAR. El almacenamiento local puede borrarse al limpiar los datos del navegador; exporta tus mezclas importantes.'],
  microphone:['Elegir la entrada de sonido','Elige entre los micrófonos detectados. Pulsa PROBAR ENTRADA para conceder permiso: los nombres completos suelen aparecer solo después de autorizarlo. Si conectas otro micrófono, vuelve a seleccionarlo.'],
  signal:['Comprobar que llega sonido','Habla al micrófono. La barra y la onda deberían moverse. Verde: señal correcta. Rosado: nivel alto. Si no se mueven, cambia micrófono o revisa los permisos del sistema.'],
  seek:['Mover el momento actual','Toca o arrastra la regla superior de la línea de tiempo. Puedes usar las flechas del teclado (1 segundo) y Mayús + flecha (5 segundos).'],
  tempo:['BPM / velocidad','La velocidad de la canción en pulsos por minuto. Activa ♩ para escuchar un metrónomo durante la reproducción. No modifica automáticamente la velocidad de los archivos importados.'],
  snap:['Ajustar al ritmo','Cuando está activado, mover una capa con ↔ la coloca en el pulso musical más cercano según los BPM. Desactívalo para moverla libremente.'],
  clip:['Mover una capa','Arrastra el símbolo ↔ sobre la forma de onda para cambiar su posición en el tiempo. El sonido original se conserva.'],
  loop:['Repetir mezcla','Al llegar al final, vuelve a comenzar automáticamente. Útil para probar cambios y efectos sin detenerte.'],
  tuneLab:['TUNE LAB — experimento musical','Mueve el nodo en el plano: izquierda = transiciones naturales, derecha = cambios robóticos rápidos; abajo = poca afinación, arriba = mucha afinación. También modifica ligeramente brillo y saturación para descubrir colores. El sonido cambia mientras reproduces. Usa los botones de destinos y guarda los que te gusten. No es todavía un autotune profesional.'],
  alignment:['Ajustar la sincronía','Si al escuchar tu grabación queda después del ritmo, mueve el control hacia Adelantar (valores negativos). Si quedó demasiado temprano, muévelo hacia Retrasar (positivos). El ajuste queda guardado en este dispositivo. No sustituye una calibración automática del hardware.'],
  original:['Comparar sonido original','Alterna entre el audio sin efectos y el audio procesado. El volumen y la dirección se mantienen. Es una comparación A/B no destructiva: los efectos siguen guardados aunque escuches el original.']
};
let toastTimer,raf=0,autosaveTimer=null,autosaveBusy=false,autosaveQueued=false;
let tuneGesture=null,tuneFrame=0;
const modalStack=[];
const history={past:[],future:[]};
function getProjectOptions(){
  return {bpm:state.bpm,metronome:state.metronome,snap:state.snap,loop:state.loop,recordShiftMs:state.recordShiftMs};
}
function applyProjectOptions(options={}){
  state.bpm=clamp(options.bpm??104,40,240);
  state.metronome=!!options.metronome;state.snap=!!options.snap;state.loop=!!options.loop;
  state.recordShiftMs=Math.round(clamp(options.recordShiftMs??0,-300,300));
  const bpm=$('#bpmInput');if(bpm)bpm.value=String(state.bpm);
  $('#metronomeBtn')?.setAttribute('aria-pressed',String(state.metronome));
  $('#snapBtn')?.setAttribute('aria-pressed',String(state.snap));
  $('#loopBtn')?.setAttribute('aria-pressed',String(state.loop));
  engine.setMetronome(state.metronome,state.bpm);
}
function captureState(){
  return {tracks:state.tracks.map(t=>({...t})),selected:state.selected,position:state.position,master:state.master,options:getProjectOptions()};
}
function historyUI(){
  if($('#undoBtn'))$('#undoBtn').disabled=!history.past.length||!!state.recording;
  if($('#redoBtn'))$('#redoBtn').disabled=!history.future.length||!!state.recording;
}
function checkpoint(){
  if(state.recording)return;
  history.past.push(captureState());if(history.past.length>25)history.past.shift();
  history.future=[];historyUI();
}
function restoreState(snapshot){
  const wasPlaying=engine.playing;engine.stop();cancelAnimationFrame(raf);
  state.tracks=snapshot.tracks.map(t=>({...t}));state.selected=snapshot.selected;state.position=snapshot.position;
  state.master=snapshot.master;engine.setMaster(state.master);applyProjectOptions(snapshot.options);
  $('#masterVolume').value=state.master;$('#volumeValue').textContent=state.master+'%';
  render();if(wasPlaying)engine.play(state.tracks,state.position).then(()=>{render();runTicker();}).catch(e=>toast(e.message));
}
function undo(){
  if(!history.past.length||state.recording)return;
  history.future.push(captureState());restoreState(history.past.pop());historyUI();
}
function redo(){
  if(!history.future.length||state.recording)return;
  history.past.push(captureState());restoreState(history.future.pop());historyUI();
}
function saveStatus(label,kind=''){
  const el=$('#saveStatus');if(!el)return;
  el.textContent=label;el.className='save-status '+kind;
}
function queueAutosave(){
  if(!state.tracks.length||state.recording)return;
  clearTimeout(autosaveTimer);
  saveStatus('CAMBIOS SIN GUARDAR','saving');
  autosaveTimer=setTimeout(async()=>{
    if(state.recording||!state.tracks.length)return;
    if(autosaveBusy){autosaveQueued=true;return;}
    autosaveBusy=true;
    saveStatus('GUARDANDO EN ESTE EQUIPO...','saving');
    try{
      await saveSession(state.tracks,state.master,getProjectOptions());
      saveStatus('✓ RESPALDO AUTOMÁTICO LOCAL','saved');
    }catch(error){
      saveStatus('ERROR AL GUARDAR','failed');
      toast('Guardado automático: '+error.message);
    }finally{
      autosaveBusy=false;
      if(autosaveQueued){autosaveQueued=false;queueAutosave();}
    }
  },3800);
}
const html=(text)=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trackColor=(t)=>COLORS.includes(t.color)?t.color:COLORS[0];
const current=()=>state.tracks.find(t=>t.id===state.selected);
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function buttonInfo(key){return '<button class="mini-action info-button" type="button" data-info="'+key+'" title="¿Cómo funciona?">i</button>';}
function help(key){
  const [title,body]=HELP[key]||HELP.studio;
  modal(title,'<p>'+html(body)+'</p>',[{label:'ENTENDIDO',type:'close',primary:true}]);
}
function modal(title,content,actions=[]){
  if($('#modalRoot').innerHTML)modalStack.push($('#modalRoot').innerHTML);
  $('#modalRoot').innerHTML='<div class="modal-backdrop" id="modalBackdrop"><section class="focus-panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1"><div class="focus-header"><div><div class="section-overline">VERY ATRACTIVE / FOCUS MODE</div><h2 id="modalTitle">'+html(title)+'</h2></div><button type="button" class="focus-close" data-action="close-modal" title="Cerrar">×</button></div><div class="focus-content">'+content+'</div><div class="focus-footer">'+actions.map(a=>'<button class="button '+(a.primary?'button-primary':'button-muted')+'" type="button" data-action="'+a.type+'">'+html(a.label)+'</button>').join('')+'</div></section></div>';
  $('.focus-panel')?.focus();
}
function closeModal(){
  finishTuneGesture();
  if(modalStack.length){$('#modalRoot').innerHTML=modalStack.pop();$('.focus-panel')?.focus();if(state.preview)drawMicPreview();if($('#tuneLab'))$('.focus-panel')?.classList.add('tune-focus');return;}
  if(state.recording){toast('Detén la grabación antes de cerrar');return;}
  cancelAnimationFrame(state.meterFrame);
  state.preview=null;
  engine.stopMic();
  $('#modalRoot').innerHTML='';
}
function dial(label,key,value,color='var(--green)',min=0,max=100){
  const pct=((value-min)/(max-min))*100;
  const readout=key==='pan'?(value<0?'IZQ '+Math.abs(value):value>0?'DER '+value:'CENTRO'):Math.round(value)+'%';
  return '<div class="dial-wrap" style="--dial-color:'+color+'">'+buttonInfo(key)+'<div class="dial" style="--fill:'+Math.round(pct*.78)+'%"><div class="dial-inner"><span>'+readout+'</span><small>AJUSTE</small></div></div><label for="dial-'+key+'">'+label+'</label><input id="dial-'+key+'" type="range" data-setting="'+key+'" min="'+min+'" max="'+max+'" value="'+value+'" aria-label="'+label+'"></div>';
}
function addTrack(buffer,name,type='audio',offset=0){
  const id=globalThis.crypto?.randomUUID?.()||'track-'+Date.now()+'-'+Math.random();
  const t={id,buffer,name:name.slice(0,80),type,color:COLORS[state.tracks.length%COLORS.length],...defaults(),offset:Math.max(0,offset)};
  checkpoint();state.tracks.push(t);state.selected=id;render();if(engine.playing)restartPlayback();
  return t;
}
function render(){
  $('#trackCount').textContent=String(state.tracks.length).padStart(2,'0');
  const duration=projectDuration(state.tracks);
  const span=timelineSpan(state.tracks);
  $('#endTimeLabel').textContent=clock(span);
  $('#ruler').setAttribute('aria-valuemax',String(Math.ceil(duration)));
  $('#ruler').setAttribute('aria-valuenow',String(Math.round(state.position)));
  $('#emptyState').classList.toggle('hidden',state.tracks.length>0);
  $('#tracks').innerHTML=state.tracks.map((t,i)=>{
    const active=t.id===state.selected;
    return '<article class="track-card'+(active?' selected':'')+'" style="--track-color:'+trackColor(t)+'" data-track="'+html(t.id)+'" tabindex="0" aria-label="Seleccionar capa '+html(t.name)+'">'+
      '<div class="vinyl'+(engine.playing&&!t.muted?' spinning':'')+'" aria-hidden="true"><div class="vinyl-center"></div></div>'+
      '<div class="track-info"><strong class="track-name" title="'+html(t.name)+'">'+html(t.name)+'</strong><div class="track-sub">'+(t.type==='voice'?'◉ VOZ':t.type==='demo'?'♫ BEAT':'≋ AUDIO')+' · '+clock(effectiveDuration(t))+'</div><div class="track-buttons"><button class="small-toggle'+(t.muted?' active':'')+'" data-track-action="mute" data-id="'+html(t.id)+'" title="Silenciar" aria-label="Silenciar '+html(t.name)+'">M</button><button class="small-toggle solo'+(t.solo?' active':'')+'" data-track-action="solo" data-id="'+html(t.id)+'" title="Escuchar solo" aria-label="Escuchar solo '+html(t.name)+'">S</button></div></div>'+
      '<div class="track-wave" data-wave="'+html(t.id)+'" title="Toca para moverte en la mezcla"><canvas data-canvas="'+html(t.id)+'" aria-label="Forma de onda"></canvas><div class="wave-label">'+(t.offset>0?'+'+t.offset.toFixed(1)+'s':'WAV')+'</div><button class="clip-move" type="button" style="left:'+Math.max(0,Math.min(95,(t.offset||0)/span*100))+'%" data-drag-offset="'+html(t.id)+'" title="Arrastrar este sonido" aria-label="Mover capa '+html(t.name)+'">↔</button></div>'+
      '<div class="track-tail"><button type="button" class="mini-action" data-track-action="edit" data-id="'+html(t.id)+'" aria-label="Opciones de la capa">⋯</button><span class="track-number">'+String(i+1).padStart(2,'0')+'</span></div></article>';
  }).join('');
  renderInspector();requestAnimationFrame(drawWaves);updateTransport();queueAutosave();
}
function drawWaves(){
  const full=timelineSpan(state.tracks);
  $$('#tracks canvas').forEach(canvas=>{
    const t=state.tracks.find(x=>x.id===canvas.dataset.canvas);if(!t)return;
    const rect=canvas.getBoundingClientRect();if(!rect.width)return;
    const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.floor(rect.width*dpr),h=Math.floor(rect.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const context=canvas.getContext('2d');context.clearRect(0,0,w,h);
    context.strokeStyle='#ffffff14';context.beginPath();context.moveTo(0,h/2);context.lineTo(w,h/2);context.stroke();
    const left=Math.floor((t.offset/full)*w),width=Math.max(1,Math.round((effectiveDuration(t)/full)*w));
    context.fillStyle=trackColor(t)+'14';context.fillRect(left,0,width,h);
    const channel=t.buffer.getChannelData(0),trimStart=Math.floor((t.trimStart||0)*t.buffer.sampleRate);
    const usable=Math.floor(effectiveDuration(t)*t.buffer.sampleRate),samplesPerX=usable/width;
    context.fillStyle=trackColor(t);
    for(let x=0;x<width;x+=2){
      const from=trimStart+Math.floor(x*samplesPerX),to=Math.min(channel.length,from+Math.max(1,Math.floor(samplesPerX*2)));
      let peak=0;
      for(let j=from;j<to;j+=Math.max(1,Math.floor((to-from)/12)))peak=Math.max(peak,Math.abs(channel[j]||0));
      const amplitude=Math.max(1,Math.min(.98,peak)*h*.44);
      context.globalAlpha=t.muted?.27:.85;
      context.fillRect(left+x,h/2-amplitude,Math.max(1,1.6*dpr),amplitude*2);
    }
    context.globalAlpha=1;
  });
}
function renderInspector(){
  const t=current();if(!t){$('#inspectorBody').innerHTML='<div class="inspector-placeholder"><div class="orb"></div><strong>Selecciona una capa</strong><p>Su volumen, voz y efectos aparecerán aquí.</p></div>';return;}
  const presets=Object.keys(PRESETS).map(id=>'<button class="preset-chip'+(t.preset===id?' active':'')+'" data-preset="'+id+'">'+PRESETS[id].label+'</button>').join('');
  $('#inspectorBody').innerHTML='<div class="selected-head" style="--track-color:'+trackColor(t)+'"><strong>'+html(t.name)+'</strong><span class="track-color-pill"></span></div>'+
    '<div class="hint" style="margin:7px 0 14px">Cada cambio afecta solo esta capa.</div>'+
    '<div class="control-heading"><strong>ESTILOS RÁPIDOS</strong>'+buttonInfo('presets')+'</div><div class="preset-list">'+presets+'</div>'+
    '<button class="wide-button" data-action="toggle-bypass" aria-pressed="'+!!t.bypassEffects+'">'+(t.bypassEffects?'▶ VOLVER A MIS EFECTOS':'◉ ESCUCHAR ORIGINAL / COMPARAR')+'</button>'+
    '<div class="inspector-divider"></div><div class="control-heading"><strong>TUS 3 CONTROLES</strong>'+buttonInfo('inspector')+'</div>'+
    '<div class="control-grid">'+dial('Volumen','volume',t.volume)+dial('Afinación','autotune',t.autotune,'var(--purple)')+dial('Limpieza','clean',t.clean,'var(--blue)')+'</div>'+
    '<div class="control-row"><label for="tuneKey">Tono</label><select data-setting="key" id="tuneKey">'+KEYS.map((x,i)=>'<option value="'+i+'"'+(i===t.key?' selected':'')+'>'+x+'</option>').join('')+'</select>'+buttonInfo('key')+'</div>'+
    '<div class="control-row"><label for="tuneScale">Escala</label><select data-setting="scale" id="tuneScale">'+SCALES.map((x,i)=>'<option value="'+i+'"'+(i===t.scale?' selected':'')+'>'+x+'</option>').join('')+'</select>'+buttonInfo('scale')+'</div>'+
    '<div class="tune-mini"><div class="tune-mini-chart"><span class="tune-mini-node" style="left:'+(((Number.isFinite(t.tuneX)?t.tuneX:tunePointFromManual(t.autotune,t.retune).x)+1)*50)+'%;top:'+((1-(Number.isFinite(t.tuneY)?t.tuneY:tunePointFromManual(t.autotune,t.retune).y))*50)+'%"></span></div>'+
      '<div class="tune-mini-body"><strong>✦ TUNE LAB</strong><small>Descubre nuevos estilos moviendo un nodo</small></div></div>'+
    '<button class="wide-button tune-launch" data-action="tune-open">✧ EXPLORAR TUNE LAB →</button>'+
    '<button class="wide-button" data-action="effects">✦ MÁS EFECTOS →</button><button class="wide-button" data-action="timing">◷ AJUSTAR TIEMPOS →</button>';
}
function updateTransport(){
  const duration=projectDuration(state.tracks),pos=engine.playing?engine.position():state.position;
  $('#timeDisplay').innerHTML=clock(pos)+' <span>/ '+clock(duration)+'</span>';
  $('#ruler').setAttribute('aria-valuenow',String(Math.round(pos)));
  $('#ruler').setAttribute('aria-valuetext',clock(pos));
  $('#playBtn').textContent=engine.playing?'Ⅱ':'▶';
  $('#playBtn').setAttribute('aria-label',engine.playing?'Pausar':'Reproducir');
  const percent=duration>0?clamp(pos/timelineSpan(state.tracks)*100,0,100):0;
  $('#playhead').style.left=percent+'%';$('#playhead').style.opacity=state.tracks.length?1:0;
}
function updateMasterMeter(){
  const {peak,rms}=engine.getMasterMeter();
  const fill=$('#masterMeter'),label=$('#masterPeak');
  if(fill)fill.style.height=Math.round(Math.min(1,Math.sqrt(rms)*1.8)*100)+'%';
  if(label){label.textContent=peak>.94?'ALTO':Math.round(peak*100)+'%';label.classList.toggle('clip-warning',peak>.94);}
}
function runTicker(){
  cancelAnimationFrame(raf);
  const tick=()=>{
    if(engine.playing){
      const p=engine.position();state.position=p;updateTransport();updateMasterMeter();
      if(p>=projectDuration(state.tracks)-.015){
        engine.stop();state.position=0;
        if(state.loop&&state.tracks.length){
          engine.play(state.tracks,0).then(()=>{render();runTicker();}).catch(error=>toast(error.message));
        }else render();
        return;
      }
      raf=requestAnimationFrame(tick);
    }
  };
  raf=requestAnimationFrame(tick);
}
async function playPause(){
  if(!state.tracks.length)return toast('Agrega un sonido para comenzar');
  if(engine.playing){state.position=engine.pause();render();return;}
  try{await engine.play(state.tracks,state.position);render();runTicker();}
  catch(error){toast('No se pudo reproducir: '+error.message);}
}
async function restartPlayback(){
  if(!engine.playing)return;
  const p=engine.position();
  try{await engine.play(state.tracks,p);runTicker();}
  catch(error){toast(error.message);}
}
function stop(){engine.stop();state.position=0;cancelAnimationFrame(raf);render();updateMasterMeter();}
async function importFiles(files){
  if(!files?.length)return;
  toast('Preparando sonidos del teléfono o computador...');
  let imported=0;const failures=[];
  for(const file of Array.from(files)){
    try{
      const b=await engine.decode(file);
      addTrack(b,file.name.replace(/\.[^.]+$/,''));
      imported++;
    }catch(error){failures.push(file.name+': '+error.message+' '+audioFileHint(file));}
  }
  if(failures.length){
    modal('Algunos audios no se pudieron abrir','<p>Se importaron '+imported+' archivo(s). Estos formatos necesitan atención:</p>'+
      '<div class="note">'+failures.map(x=>'<p>'+html(x)+'</p>').join('')+'</div>'+
      '<p>Prueba a exportar las notas de voz desde tu teléfono como WAV PCM o M4A AAC. No subimos tus archivos a ningún servidor.</p>',
      [{label:'ENTENDIDO',type:'close',primary:true}]);
  }else if(imported)toast('Sonido listo. ¡Ya puedes crear!');
}
async function demo(){
  try{
    const ctx=await engine.ready(),channels=synthBeat(ctx.sampleRate,104,8);
    const buffer=ctx.createBuffer(2,channels[0].length,ctx.sampleRate);
    channels.forEach((c,i)=>buffer.copyToChannel(c,i));
    const track=addTrack(buffer,'Ritmo neón · 104 BPM','demo');track.clean=0;track.space=0;track.volume=66;
    render();toast('Base original agregada. ¡Ahora graba tu voz!');
  }catch(e){toast(e.message);}
}

/* TUNE LAB — XY controls actual AudioWorklet and WebAudio parameters. */
function tuneRefresh(track){
  if(tuneFrame)return;
  tuneFrame=requestAnimationFrame(()=>{
    tuneFrame=0;
    engine.updateTrack(track);
    updateTuneLabView($('#tuneLab'),track);
  });
}
function tuneChange(x,y,preset='custom',store=false){
  const track=current();if(!track)return;
  const p=normalizeTune(x,y);
  applyTunePoint(track,p.x,p.y,preset);
  tuneRefresh(track);
  if(store){renderInspector();queueAutosave();}
}
function tuneFromPad(event){
  const pad=$('#tunePad');if(!pad)return null;
  const rect=pad.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  return normalizeTune(((event.clientX-rect.left)/rect.width)*2-1,
    (1-(event.clientY-rect.top)/rect.height)*2-1);
}
function openTuneLab(){
  const track=current();if(!track)return toast('Selecciona un sonido antes de explorar');
  if(!Number.isFinite(track.tuneX)||!Number.isFinite(track.tuneY)){
    const point=tunePointFromManual(track.autotune,track.retune);
    track.tuneX=point.x;track.tuneY=point.y;
    track.tunePreset='custom';
  }
  modal('Tune Lab · Explora tu voz',tuneLabMarkup(track,loadUserTunes()),
    [{label:'LISTO / VOLVER A MI MEZCLA',type:'tune-done',primary:true}]);
  $('.focus-panel')?.classList.add('tune-focus');
  updateTuneLabView($('#tuneLab'),track);
}
function finishTuneGesture(){
  if(!tuneGesture)return;
  const track=current();
  tuneGesture=null;
  if(track){tuneRefresh(track);renderInspector();queueAutosave();}
}
function installTuneGestures(){
  document.addEventListener('pointerdown',event=>{
    const pad=event.target.closest('#tunePad');
    if(!pad||event.target.closest('[data-tune-preset]')||event.button!==0)return;
    const track=current();if(!track)return;
    event.preventDefault();
    checkpoint();
    tuneGesture={pointerId:event.pointerId};
    pad.setPointerCapture(event.pointerId);
    const p=tuneFromPad(event);if(p)tuneChange(p.x,p.y);
  });
  document.addEventListener('pointermove',event=>{
    if(!tuneGesture||event.pointerId!==tuneGesture.pointerId)return;
    const p=tuneFromPad(event);if(p)tuneChange(p.x,p.y);
  });
  document.addEventListener('pointerup',event=>{
    if(tuneGesture&&event.pointerId===tuneGesture.pointerId)finishTuneGesture();
  });
  document.addEventListener('pointercancel',event=>{
    if(tuneGesture&&event.pointerId===tuneGesture.pointerId)finishTuneGesture();
  });
  document.addEventListener('keydown',event=>{
    if(event.target.id!=='tunePad'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    const track=current();if(!track)return;
    event.preventDefault();checkpoint();
    const p=normalizeTune(track.tuneX,track.tuneY),step=event.shiftKey?.15:.04;
    const x=event.key==='Home'?0:p.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0);
    const y=event.key==='Home'?0:p.y+(event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0);
    tuneChange(x,y,'custom',true);
  });
  document.addEventListener('pointerdown',event=>{
    if(event.target.matches('[data-tune-axis]'))checkpoint();
  });
  document.addEventListener('keydown',event=>{
    if(event.target.matches('[data-tune-axis]') &&
      ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key) &&
      !event.repeat)checkpoint();
  });
  document.addEventListener('change',event=>{
    if(event.target.matches('[data-tune-axis]')){renderInspector();queueAutosave();}
  });
}
function tuneAction(action){
  const track=current();if(!track)return;
  if(action==='tune-done'){finishTuneGesture();closeModal();renderInspector();return;}
  if(action==='tune-preview'){
    if(!state.tracks.length)return toast('Agrega audio para escuchar');
    if(engine.playing){toast('La mezcla ya está sonando. Mueve el nodo.');return;}
    if(state.position>=projectDuration(state.tracks)-.02)state.position=0;
    playPause();return;
  }
  if(action==='tune-ab'){
    checkpoint();track.bypassEffects=!track.bypassEffects;
    tuneRefresh(track);renderInspector();queueAutosave();return;
  }
  if(action==='tune-surprise'){
    checkpoint();
    tuneChange(Math.random()*2-1,Math.random()*2-1,'custom',true);return;
  }
  if(action==='tune-reset'){
    checkpoint();tuneChange(-.75,-1,'natural',true);return;
  }
  if(action==='tune-save'){
    try{
      const name=$('#labPresetName')?.value||'';
      const saved=saveUserTune(name,track.tuneX,track.tuneY);
      const list=$('#labUserPresets');
      if(list)list.innerHTML=customTuneMarkup(loadUserTunes());
      track.tunePreset='user:'+saved.name;queueAutosave();renderInspector();
      const input=$('#labPresetName');if(input)input.value='';
      toast('Estilo '+saved.name+' guardado solo en este navegador.');
    }catch(error){toast(error.message);}
  }
}

function openEffects(){
  const t=current();if(!t)return;
  modal('Efectos de '+t.name,
    '<p>Experimenta sin perder el sonido original. Cada efecto se aplica solo a esta capa.</p>'+
    '<div class="control-grid">'+dial('Velocidad','retune',t.retune,'var(--purple)')+dial('Brillo','brightness',t.brightness,'var(--blue)')+dial('Calidez','warmth',t.warmth,'var(--orange)')+'</div>'+
    '<div class="inspector-divider"></div><div class="control-grid">'+dial('Eco','echo',t.echo,'var(--pink)')+dial('Espacio','space',t.space,'var(--purple)')+dial('Distorsión','drive',t.drive,'var(--orange)')+'</div>'+
    '<div class="inspector-divider"></div><div class="control-grid">'+dial('Dirección','pan',t.pan,'var(--blue)',-100,100)+'</div>',
    [{label:'LISTO',type:'close',primary:true}]);
}
function openTiming(){
  const t=current();if(!t)return;
  checkpoint();
  const avail=t.buffer.duration,controls=[
    ['offset','Mover sonido (segundos)','position',Math.max(180,Math.ceil(projectDuration(state.tracks))),.05],
    ['trimStart','Recortar inicio (segundos)','trims',Math.max(0,avail-(t.trimEnd||0)-.01),.05],
    ['trimEnd','Recortar final (segundos)','trims',Math.max(0,avail-(t.trimStart||0)-.01),.05],
    ['fadeIn','Entrada suave (segundos)','fades',Math.min(30,avail),.1],
    ['fadeOut','Salida suave (segundos)','fades',Math.min(30,avail),.1]
  ];
  modal('Ajustar '+t.name,
    '<p>Mueve tu clip y crea transiciones. Puedes cambiar estos valores cuantas veces quieras.</p>'+
    '<div class="focus-stack">'+controls.map(([id,label,info,max,step])=>'<div class="compact-field"><label for="timing-'+id+'">'+label+'</label><input id="timing-'+id+'" data-timing="'+id+'" type="number" min="0" max="'+max+'" step="'+step+'" value="'+(t[id]||0)+'" style="width:75px;padding:7px"></div>').join('')+'</div>'+
    '<p class="hint" style="margin-top:15px">Duración audible: '+clock(effectiveDuration(t))+' · Original: '+clock(t.buffer.duration)+'</p>',
    [{label:'LISTO',type:'close',primary:true}]);
}
function openTrackActions(id){
  state.selected=id;render();
  const t=current();
  modal('Opciones de la capa',
    '<div class="field"><label>Nombre de la capa</label><input type="text" id="renameInput" maxlength="80" value="'+html(t.name)+'" style="background:#1b222b;border:1px solid #495362;border-radius:7px;padding:11px;color:white"></div>'+
    '<p style="margin-top:14px">Duplica una capa para crear armonías o combinar efectos distintos sin cambiar el audio original.</p>',
    [{label:'ELIMINAR',type:'delete-track'},{label:'✂ DIVIDIR',type:'split-track'},{label:'DUPLICAR',type:'duplicate-track'},{label:'GUARDAR NOMBRE',type:'rename-track',primary:true}]);
}

async function listMicrophones(){
  try{return (await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');}
  catch{return [];}
}
async function updateMicrophoneChoices(preferred=state.preferredInput){
  const select=$('#micSelect');if(!select)return;
  const devices=await listMicrophones();
  if(!$('#micSelect'))return;
  select.innerHTML='<option value="">Micrófono predeterminado</option>'+devices
    .filter(d=>d.deviceId && d.deviceId!=='default')
    .map((d,i)=>'<option value="'+html(d.deviceId)+'">'+html(d.label||'Micrófono '+(i+1))+'</option>').join('');
  const known=Array.from(select.options).some(option=>option.value===preferred);
  select.value=known?preferred:'';
  state.preferredInput=select.value;
}
function drawMicPreview(){
  const preview=state.preview;
  if(!preview)return;
  if(!$('#recordMeter'))return;
  const samples=new Float32Array(2048);
  if(engine.getMicMeterData(samples)){
    const {rms,peak}=meterLevel(samples);
    const level=Math.min(100,Math.round(Math.sqrt(rms)*170));
    $('#recordMeter').style.width=level+'%';
    $('#recordMeter').style.background=peak>.92?'var(--pink)':'var(--green)';
    $('#recordPeak').textContent=peak>.92?'¡MUY ALTO!':rms>.006?'ENTRADA ACTIVA':'SIN SEÑAL';
    state.recordMeterHistory.push(Math.min(1,peak));
    if(state.recordMeterHistory.length>180)state.recordMeterHistory.shift();
    const canvas=$('#recordWave');
    if(canvas){
      const bounds=canvas.getBoundingClientRect(),scale=Math.min(2,devicePixelRatio||1);
      const width=Math.max(1,Math.round(bounds.width*scale)),height=Math.max(1,Math.round(bounds.height*scale));
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      const g=canvas.getContext('2d');g.clearRect(0,0,width,height);
      g.strokeStyle='#4e6059';g.beginPath();g.moveTo(0,height/2);g.lineTo(width,height/2);g.stroke();
      g.strokeStyle=peak>.92?'#ff73b7':'#a5ff73';g.lineWidth=Math.max(1,2*scale);g.beginPath();
      const history=state.recordMeterHistory,span=width/Math.max(1,history.length);
      history.forEach((value,i)=>{
        const x=i*span+span/2,h=Math.max(2,value*height*.43);
        g.moveTo(x,height/2-h);g.lineTo(x,height/2+h);
      });
      g.stroke();
    }
  }
  if(state.recording){
    const seconds=state.recording.seconds || (performance.now()-state.recording.started)/1000;
    const timer=$('#recordTimer');
    if(timer)timer.textContent='● '+clock(seconds)+' · GRABANDO';
    const ghost=$('#recordingGhost');
    if(ghost && (!state.lastGhostPaint || performance.now()-state.lastGhostPaint>140)){
      state.lastGhostPaint=performance.now();
      ghost.innerHTML='<div class="recording-ghost"><span class="recording-live">● REC</span><span>Mi voz se está capturando</span><span>'+clock(seconds)+'</span><span class="ghost-level">'+Array.from({length:13},(_,i)=>'<b style="height:'+Math.max(3,Math.round((state.recordMeterHistory.at(-(13-i))||0)*29))+'px"></b>').join('')+'</span></div>';
    }
  }
  state.meterFrame=requestAnimationFrame(drawMicPreview);
}
async function prepareSelectedMic(){
  if(state.recording)return;
  if(!navigator.mediaDevices?.getUserMedia)return toast('Se requiere HTTPS o localhost y un navegador compatible');
  const selected=$('#micSelect')?.value||'',monitor=!!$('#monitorToggle')?.checked;
  const tune=Number($('#recordTune')?.value??80),clean=Number($('#recordClean')?.value??35);
  state.preferredInput=selected;
  const status=$('#micStatus');if(status)status.textContent='Solicitando permiso al micrófono...';
  let stream;
  try{
    // Release the previous device before opening a different one.
    cancelAnimationFrame(state.meterFrame);engine.stopMic();state.preview=null;
    await engine.ready(); // Resume audio while the PROBAR button still has user activation.
    stream=await navigator.mediaDevices.getUserMedia({audio:{
      ...(selected?{deviceId:{exact:selected}}:{}),
      echoCancellation:!monitor,noiseSuppression:!monitor,autoGainControl:false
    },video:false});
    if(!$('#micSelect')){stream.getTracks().forEach(t=>t.stop());return;}
    const monitorTrack={...defaults(),autotune:tune,clean,space:8,volume:75};
    await engine.prepareMic(stream,monitorTrack,monitor);
    state.preview={stream,monitorTrack,monitor};
    stream.getAudioTracks()[0]?.addEventListener('ended',()=>{
      if(state.recording)stopRecording();
      else {state.preview=null;$('#micStatus').textContent='Micrófono desconectado: vuelve a probar la entrada.';}
    },{once:true});
    const actualId=stream.getAudioTracks()[0]?.getSettings?.().deviceId || selected;
    await updateMicrophoneChoices(actualId);
    if($('#micStatus'))$('#micStatus').textContent='ENTRADA CONECTADA · HABLA PARA PROBAR';
    const start=$('[data-action="start-record"]');if(start)start.disabled=false;
    const test=$('[data-action="test-mic"]');if(test)test.textContent='↻ CAMBIAR / PROBAR';
    state.recordMeterHistory=[];drawMicPreview();
  }catch(error){
    stream?.getTracks().forEach(t=>t.stop());
    const msg=error.name==='NotAllowedError'?'Permiso denegado. Activa el micrófono en el navegador y en tu sistema.':
      error.name==='OverconstrainedError'?'El dispositivo elegido ya no está disponible. Selecciona el predeterminado.':
      error.name==='NotFoundError'?'No se encontró ningún micrófono conectado.':error.message;
    if($('#micStatus'))$('#micStatus').textContent=msg;
    toast(msg);
  }
}
async function openRecording(){
  if(state.recording)return;
  if(!navigator.mediaDevices?.getUserMedia){
    modal('Micrófono no disponible','<p>Para grabar desde el teléfono, abre el estudio en HTTPS. En computador utiliza http://127.0.0.1:4173. Revisa también los permisos del navegador.</p>',[{label:'ENTENDIDO',type:'close',primary:true}]);
    return;
  }
  modal('Grabar tu voz',
    '<p>Elige tu micrófono, pruébalo y comprueba que llega señal. Después graba sobre tu base.</p>'+
    '<div class="field"><label for="micSelect">MICRÓFONO '+buttonInfo('microphone')+'</label><select id="micSelect" class="modal-select"><option value="">Micrófono predeterminado</option></select></div>'+
    '<div id="micStatus" class="mic-status" role="status">Selecciona y prueba tu micrófono</div>'+
    '<div class="record-visual record-visual-v2"><div class="rec-title"><span id="recordTimer">LISTO PARA GRABAR</span><span id="recordPeak">SIN SEÑAL</span></div><canvas id="recordWave" class="record-wave" aria-label="Onda de entrada del micrófono"></canvas><div class="record-meter-shell"><span id="recordMeter"></span></div></div>'+
    '<div class="control-row"><label for="monitorToggle">Escucharme con efectos (auriculares)</label><input type="checkbox" class="toggle-switch" id="monitorToggle">'+buttonInfo('monitor')+'</div>'+
    '<div class="control-row"><label for="recordTune">Afinación al escucharme</label><input type="range" min="0" max="100" value="80" id="recordTune">'+buttonInfo('autotune')+'</div>'+
    '<div class="control-row"><label for="recordClean">Limpieza al escucharme</label><input type="range" min="0" max="100" value="35" id="recordClean">'+buttonInfo('clean')+'</div>'+
    '<div class="control-row"><label for="recordBacking">Reproducir base al grabar</label><input type="checkbox" class="toggle-switch" id="recordBacking" '+(state.tracks.length?'checked':'')+'></div>'+
    '<div class="control-row"><label for="recordShift">Ajuste de sincronía de tu voz</label><input id="recordShift" type="range" min="-300" max="300" step="25" value="'+state.recordShiftMs+'"><output id="recordShiftValue">'+(state.recordShiftMs===0?'Sin ajuste':state.recordShiftMs+' ms')+'</output>'+buttonInfo('alignment')+'</div>'+
    '<div class="note">Grabación PCM sin compresión intermedia. Si tu voz queda desfasada al escucharla, puedes adelantarla o retrasarla con el ajuste de sincronía. Duración máxima: 5 minutos.</div>',
    [{label:'PROBAR ENTRADA',type:'test-mic'},{label:'● GRABAR',type:'start-record',primary:true}]);
  const start=$('[data-action="start-record"]');if(start)start.disabled=true;
  await updateMicrophoneChoices();
}
async function startRecording(){
  if(state.recording||!state.preview)return toast('Primero presiona PROBAR ENTRADA');
  const tune=Number($('#recordTune')?.value??80),clean=Number($('#recordClean')?.value??35);
  state.recordShiftMs=Math.round(Number($('#recordShift')?.value||0));
  state.preview.monitorTrack.autotune=tune;state.preview.monitorTrack.clean=clean;
  engine.updateMic(state.preview.monitorTrack);
  if($('#recordBacking')?.checked && state.tracks.length && !engine.playing){
    try{await engine.play(state.tracks,state.position);runTicker();render();}
    catch(error){toast('No se pudo reproducir la base: '+error.message);}
  }
  const offset=engine.playing?engine.position():state.position;
  const data={offset,started:performance.now(),seconds:0,tune,clean,stopping:false};
  try{
    state.recording=data;
    const capture=await engine.startCapture(seconds=>{
      if(state.recording)state.recording.seconds=seconds;
      if(seconds>=MAX_RECORDING_SECONDS&&!state.recording?.stopping)stopRecording();
    });
    // Align against the shared AudioContext clock, not a wall-clock stopwatch.
    const clockOffset=engine.playing?engine.from+capture.startedAt-engine.startCtxTime:data.offset;
    state.recording={...data,capture,offset:Math.max(0,clockOffset),recordShiftMs:state.recordShiftMs};
    if($('#recordTimer'))$('#recordTimer').textContent='● 00:00 · GRABANDO';
    if($('#micStatus'))$('#micStatus').textContent='GRABACIÓN ACTIVA · LA ONDA SE ESTÁ DIBUJANDO';
    const select=$('#micSelect');if(select)select.disabled=true;
    const actions=$('.focus-footer');
    if(actions)actions.innerHTML='<button class="button button-primary" data-action="stop-record">■ DETENER Y AGREGAR</button>';
  }catch(error){state.recording=null;toast('No se pudo comenzar: '+error.message);}
}
async function stopRecording(){
  const recording=state.recording;
  if(!recording||recording.stopping)return;
  recording.stopping=true;
  if($('#recordTimer'))$('#recordTimer').textContent='PREPARANDO EL AUDIO...';
  try{
    const buffer=await engine.stopCapture();
    if(!buffer||buffer.duration<.05)throw Error('La toma es demasiado corta o quedó vacía');
    state.recording=null; // capture is finished; allow undo of the newly created take
    const adjustedStart=recording.offset+(recording.recordShiftMs||0)/1000;
    const track=addTrack(buffer,'Mi voz '+(state.tracks.filter(t=>t.type==='voice').length+1),'voice',Math.max(0,adjustedStart));
    if(adjustedStart<0)track.trimStart=Math.min(buffer.duration-.02,-adjustedStart);
    Object.assign(track,{autotune:recording.tune,clean:recording.clean,retune:70,space:12,preset:'custom'});
    toast('¡Toma grabada! La capa de voz ya aparece en tu mezcla.');
  }catch(error){toast('No se pudo finalizar la grabación: '+error.message);}
  finally{
    state.recording=null;
    cancelAnimationFrame(state.meterFrame);
    engine.stopMic();state.preview=null;
    modalStack.length=0;$('#modalRoot').innerHTML='';
    const ghost=$('#recordingGhost');if(ghost)ghost.innerHTML='';
    render();
  }
}

function openExport(){
  if(!state.tracks.length)return toast('Agrega un sonido antes de exportar');
  modal('Exportar mi canción',
    '<p>Elige cómo quieres recibir tu sonido. Se crea un archivo WAV local con tus efectos.</p>'+
    '<div class="field"><label>Qué quieres exportar</label><select id="exportScope" class="modal-select"><option value="mix">Toda la mezcla WAV</option><option value="stems">Pistas separadas (ZIP)</option><option value="project">Proyecto editable (.vasproject)</option>'+(current()?'<option value="selected">Solo capa: '+html(current().name)+'</option>':'')+'</select></div>'+
    '<div class="field"><label>Calidad</label><select id="exportDepth" class="modal-select"><option value="24">WAV 24-bit · Producción (recomendado)</option><option value="16">WAV 16-bit · Compatible</option><option value="32">WAV 32-bit float · Continuar mezclando</option></select></div>'+
    '<div class="field"><label>Frecuencia</label><select id="exportRate" class="modal-select"><option value="48000">48 kHz · Video y producción</option><option value="44100">44.1 kHz · Música</option></select></div>'+
    '<div class="note" style="margin-top:16px">No se puede convertir una grabación de baja calidad en una fuente realmente profesional solo aumentando los bits. Se respetarán los efectos que escuchas.</div>',
    [{label:'CREAR MI WAV',type:'do-export',primary:true}]);
}
async function performExport(){
  if(state.busy)return;
  state.busy=true;const btn=$('[data-action="do-export"]');if(btn)btn.textContent='PROCESANDO...';
  const depth=Number($('#exportDepth')?.value||24),rate=Number($('#exportRate')?.value||48000);
  const onlyId=$('#exportScope')?.value==='selected'?state.selected:null;
  try{
    const scope=$('#exportScope')?.value||'mix';
    if(scope==='project'){
      const blob=await exportProject(state.tracks,state.master,getProjectOptions());
      downloadBlob(blob,'veryAtractiveSynth-proyecto.vasproject');
      toast('Proyecto editable respaldado con los audios originales.');
    }else if(scope==='stems'){
      const entries=[];
      for(let i=0;i<state.tracks.length;i++){
        const track={...state.tracks[i],muted:false,solo:false};
        const data=await engine.exportMix([track],{depth,rate});
        entries.push({name:'pistas/'+String(i+1).padStart(2,'0')+'-'+safeFilename(track.name)+'.wav',data});
      }
      downloadBlob(await zipStore(entries),'veryAtractiveSynth-pistas-separadas.zip');
      toast('Pistas separadas listas en un archivo ZIP.');
    }else{
      const blob=await engine.exportMix(state.tracks,{depth,rate,onlyId});
      downloadBlob(blob,safeFilename(onlyId?current().name:'veryAtractiveSynth-mi-mezcla')+'-'+rate/1000+'k-'+depth+'bit.wav');
      toast('Tu WAV está listo.');
    }
    modalStack.length=0;$('#modalRoot').innerHTML='';
  }catch(e){toast('Exportación: '+e.message);}
  finally{state.busy=false;if(btn)btn.textContent='CREAR MI WAV';}
}
async function save(){
  if(state.busy)return;
  if(!state.tracks.length)return toast('No hay pistas para guardar');
  try{state.busy=true;clearTimeout(autosaveTimer);saveStatus('GUARDANDO...','saving');await saveSession(state.tracks,state.master,getProjectOptions());saveStatus('✓ GUARDADO LOCAL','saved');toast('Sesión guardada en este navegador');}
  catch(e){toast('No se pudo guardar: '+e.message);}
  finally{state.busy=false;}
}
async function load(){
  if(state.tracks.length&&!confirm('¿Reemplazar las capas actuales por la última sesión guardada?'))return;
  try{
    engine.stop();const ctx=await engine.ready(),data=await loadSession(ctx);
    if(!data)return toast('Todavía no tienes una sesión guardada');
    checkpoint();state.tracks=data.tracks;state.selected=state.tracks[0]?.id||null;state.master=data.master??85;applyProjectOptions(data.options);
    engine.setMaster(state.master);$('#masterVolume').value=state.master;$('#volumeValue').textContent=state.master+'%';
    state.position=0;render();toast('Sesión recuperada. Todo está en este dispositivo.');
  }catch(e){toast('No se pudo recuperar: '+e.message);}
}
async function openProjectMenu(){
  modal('Tus proyectos',
    '<p>Guarda distintas canciones en este dispositivo o abre tu última sesión. Los audios son privados y no se suben a ningún servidor.</p>'+
    '<div id="namedProjectsList" class="named-projects"><span class="hint">Buscando proyectos guardados...</span></div>'+
    '<div class="note">Para proteger tus canciones, crea además un archivo de respaldo desde EXPORTAR → Proyecto editable. Los datos del navegador pueden borrarse.</div>',
    [{label:'ABRIR ARCHIVO',type:'browse-project'},{label:'GUARDAR NUEVO',type:'save-named'},{label:'ÚLTIMA SESIÓN',type:'load-local',primary:true}]);
  try{
    const projects=await listNamedProjects();
    const area=$('#namedProjectsList');if(!area)return;
    area.innerHTML=projects.length?projects.map(project=>
      '<div class="named-project"><div><strong>'+html(project.name)+'</strong><small>'+project.tracks+' capas · '+html(project.savedAt.slice(0,16).replace('T',' '))+'</small></div>'+
      '<button class="mini-action" data-project-open="'+html(project.id)+'" aria-label="Abrir '+html(project.name)+'">ABRIR</button>'+
      '<button class="mini-action" data-project-delete="'+html(project.id)+'" aria-label="Eliminar '+html(project.name)+'">×</button></div>'
    ).join(''):'<p class="hint">Todavía no tienes proyectos guardados con nombre. Puedes guardar el primero desde aquí.</p>';
  }catch(error){
    const area=$('#namedProjectsList');if(area)area.textContent='No se pudo acceder a los proyectos locales: '+error.message;
  }
}
async function saveNewNamed(){
  if(!state.tracks.length)return toast('Agrega primero algún sonido');
  modal('Guardar como proyecto',
    '<p>Dale un nombre fácil de reconocer. Conservarás esta canción y sus capas para abrirla después.</p>'+
    '<div class="field"><label for="newProjectName">Nombre del proyecto</label><input id="newProjectName" type="text" maxlength="72" placeholder="Mi primera canción" value="Mi canción" class="project-name-input"></div>',
    [{label:'GUARDAR PROYECTO',type:'confirm-save-named',primary:true}]);
  $('#newProjectName')?.focus();
}
async function confirmSaveNamed(){
  const name=$('#newProjectName')?.value.trim();
  if(!name)return toast('Escribe un nombre para tu proyecto');
  if(state.busy)return;
  state.busy=true;
  try{
    await saveNamedProject(state.tracks,state.master,getProjectOptions(),name);
    toast('Proyecto "'+name+'" guardado en este dispositivo');
    modalStack.length=0;$('#modalRoot').innerHTML='';
  }catch(error){toast('No se pudo guardar: '+error.message);}
  finally{state.busy=false;}
}
async function openNamed(id){
  if(state.recording)return toast('Termina la grabación primero');
  if(state.tracks.length&&!confirm('¿Abrir el proyecto y reemplazar la mezcla actual? Guarda un respaldo si lo necesitas.'))return;
  try{
    const ctx=await engine.ready();
    const data=await loadSession(ctx,id);
    if(!data)throw Error('Proyecto no encontrado');
    checkpoint();clearTimeout(autosaveTimer);
    engine.stop();state.tracks=data.tracks;state.selected=data.tracks[0]?.id||null;
    state.position=0;state.master=data.master??85;
    engine.setMaster(state.master);applyProjectOptions(data.options);
    $('#masterVolume').value=state.master;$('#volumeValue').textContent=state.master+'%';
    modalStack.length=0;$('#modalRoot').innerHTML='';render();toast('Proyecto cargado correctamente');
  }catch(error){toast('No se pudo cargar: '+error.message);}
}
async function removeNamed(id){
  if(!confirm('¿Eliminar este proyecto guardado? La sesión actual y tus archivos exportados no se eliminan.'))return;
  try{await deleteNamedProject(id);await openProjectMenu();toast('Proyecto eliminado');}
  catch(error){toast('No se pudo eliminar: '+error.message);}
}
async function loadPortable(file){
  if(!file)return;
  if(state.tracks.length&&!confirm('¿Reemplazar la mezcla actual por el proyecto de respaldo?'))return;
  try{
    const ctx=await engine.ready(),bundle=await importProject(file,ctx);
    checkpoint();engine.stop();state.tracks=bundle.tracks;state.selected=bundle.tracks[0]?.id||null;
    state.position=0;state.master=bundle.master;engine.setMaster(state.master);applyProjectOptions(bundle.options);
    $('#masterVolume').value=state.master;$('#volumeValue').textContent=state.master+'%';
    modalStack.length=0;$('#modalRoot').innerHTML='';render();
    toast('Proyecto recuperado desde tu respaldo.');
  }catch(error){toast('No se pudo abrir el proyecto: '+error.message);}
}
async function setSetting(key,value,element){
  const t=current();if(!t||!(key in defaults()))return;
  t[key]=clamp(value,key==='pan'?-100:0,key==='pan'?100:key==='key'?11:key==='scale'?2:100);
  t.preset='custom';
  if(key==='retune'||key==='autotune'){
    const point=tunePointFromManual(t.autotune,t.retune);
    t.tuneX=point.x;t.tuneY=point.y;t.tunePreset='custom';
  }
  engine.updateTrack(t);queueAutosave();
  if(element&&element.type==='range'){
    const dialNode=element.closest('.dial-wrap')?.querySelector('.dial');
    const inner=element.closest('.dial-wrap')?.querySelector('.dial-inner span');
    const min=Number(element.min),max=Number(element.max);
    if(dialNode)dialNode.style.setProperty('--fill',Math.round((t[key]-min)/(max-min)*78)+'%');
    if(inner)inner.textContent=key==='pan'?(t.pan<0?'IZQ '+Math.abs(t.pan):t.pan>0?'DER '+t.pan:'CENTRO'):Math.round(t[key])+'%';
  }
}
async function setTiming(key,value){
  const t=current();if(!t)return;
  const n=clamp(value,0,key==='offset'?3600:t.buffer.duration);
  t[key]=n;
  const maxTrim=t.buffer.duration-.02;
  if(t.trimStart+t.trimEnd>maxTrim){if(key==='trimStart')t.trimEnd=Math.max(0,maxTrim-t.trimStart);else t.trimStart=Math.max(0,maxTrim-t.trimEnd);}
  t.fadeIn=clamp(t.fadeIn,0,effectiveDuration(t));t.fadeOut=clamp(t.fadeOut,0,effectiveDuration(t));
  queueAutosave();
  const note=$('.focus-content .hint');
  if(note)note.textContent='Duración audible: '+clock(effectiveDuration(t))+' · Original: '+clock(t.buffer.duration);
}
function handleTrackAction(action,id){
  const t=state.tracks.find(x=>x.id===id);if(!t)return;
  if(action==='edit'){openTrackActions(id);return;}
  if(action==='mute'||action==='solo'){
    checkpoint();t[action==='mute'?'muted':'solo']=!t[action==='mute'?'muted':'solo'];
    render();restartPlayback();
  }
}
function handleModalAction(action){
  if(action==='close-modal'||action==='close'){closeModal();return;}
  if(action==='tune-open'){openTuneLab();return;}
  if(action.startsWith('tune-')){tuneAction(action);return;}
  if(action==='effects'){openEffects();return;}
  if(action==='toggle-bypass'){
    const t=current();if(!t)return;
    checkpoint();t.bypassEffects=!t.bypassEffects;
    engine.updateTrack(t);renderInspector();queueAutosave();
    toast(t.bypassEffects?'Escuchando audio original':'Escuchando efectos de esta capa');return;
  }
  if(action==='timing'){openTiming();return;}
  if(action==='save-named'){saveNewNamed();return;}
  if(action==='confirm-save-named'){confirmSaveNamed();return;}
  if(action==='load-local'){modalStack.length=0;$('#modalRoot').innerHTML='';load();return;}
  if(action==='browse-project'){$('#projectInput').click();return;}
  if(action==='test-mic'){prepareSelectedMic();return;}
  if(action==='start-record'){startRecording();return;}
  if(action==='stop-record'){stopRecording();return;}
  if(action==='do-export'){performExport();return;}
  const t=current();if(!t)return;
  if(action==='rename-track'){const name=$('#renameInput')?.value.trim();if(!name)return toast('Escribe un nombre');checkpoint();t.name=name.slice(0,80);modalStack.length=0;$('#modalRoot').innerHTML='';render();}
  if(action==='split-track'){
    try{
      const id=globalThis.crypto?.randomUUID?.()||'split-'+Date.now();
      const [left,right]=splitClip(t,state.position,id);
      checkpoint();
      const index=state.tracks.findIndex(x=>x.id===t.id);
      right.color=COLORS[(COLORS.indexOf(t.color)+1)%COLORS.length];
      state.tracks.splice(index,1,left,right);
      state.selected=id;
      modalStack.length=0;$('#modalRoot').innerHTML='';
      render();restartPlayback();
      toast('Pista dividida en el marcador, sin modificar el audio original.');
    }catch(error){toast(error.message);}
    return;
  }
  if(action==='duplicate-track'){
    const clone={...t,id:globalThis.crypto?.randomUUID?.()||'copy-'+Date.now(),name:t.name+' · copia',color:COLORS[state.tracks.length%COLORS.length]};
    checkpoint();state.tracks.push(clone);state.selected=clone.id;modalStack.length=0;$('#modalRoot').innerHTML='';render();restartPlayback();toast('Capa duplicada. Puedes darle otros efectos.');
  }
  if(action==='delete-track'){
    if(!confirm('¿Eliminar la capa "'+t.name+'"?'))return;
    checkpoint();state.tracks=state.tracks.filter(x=>x.id!==t.id);state.selected=state.tracks[0]?.id||null;
    modalStack.length=0;$('#modalRoot').innerHTML='';render();restartPlayback();toast('Capa eliminada');
  }
}

function setupScrubber(){
  const ruler=$('#ruler');
  let active=null, resume=false;
  const seekPoint=clientX=>{
    const duration=projectDuration(state.tracks);
    if(!duration)return;
    const rect=ruler.getBoundingClientRect();
    state.position=Math.min(duration,pointerTime(clientX,rect,timelineSpan(state.tracks)));
    updateTransport();
  };
  ruler.addEventListener('pointerdown',event=>{
    if(!state.tracks.length || event.button!==0)return;
    event.preventDefault();
    active=event.pointerId;resume=engine.playing;
    if(resume){state.position=engine.pause();cancelAnimationFrame(raf);}
    state.scrubbing=true;
    ruler.setPointerCapture(event.pointerId);
    seekPoint(event.clientX);
  });
  ruler.addEventListener('pointermove',event=>{
    if(active!==event.pointerId)return;
    seekPoint(event.clientX);
  });
  const end=()=>{
    if(active===null)return;
    active=null;state.scrubbing=false;
    if(resume){
      resume=false;
      engine.play(state.tracks,state.position).then(()=>{render();runTicker();}).catch(err=>toast(err.message));
    }else updateTransport();
  };
  ruler.addEventListener('pointerup',end);
  ruler.addEventListener('pointercancel',end);
  ruler.addEventListener('keydown',event=>{
    if(!state.tracks.length)return;
    const length=projectDuration(state.tracks),step=event.shiftKey?5:1;
    if(event.key==='ArrowRight')state.position=Math.min(length,state.position+step);
    else if(event.key==='ArrowLeft')state.position=Math.max(0,state.position-step);
    else if(event.key==='Home')state.position=0;
    else if(event.key==='End')state.position=length;
    else return;
    event.preventDefault();
    if(engine.playing)engine.play(state.tracks,state.position).then(()=>{render();runTicker();}).catch(err=>toast(err.message));
    updateTransport();
  });
}

function setupClipDragging(){
  const tracks=$('#tracks');
  tracks.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('[data-drag-offset]');
    if(!handle||event.button!==0||state.recording)return;
    const track=state.tracks.find(t=>t.id===handle.dataset.dragOffset);
    if(!track)return;
    event.preventDefault();event.stopPropagation();
    checkpoint();
    state.dragClip={id:track.id,startX:event.clientX,original:track.offset||0,
      span:timelineSpan(state.tracks),width:handle.closest('.track-wave').getBoundingClientRect().width,
      handle};
    state.selected=track.id;
    handle.setPointerCapture(event.pointerId);
    handle.closest('.track-wave').classList.add('is-moving');
  });
  tracks.addEventListener('pointermove',event=>{
    const drag=state.dragClip;
    if(!drag)return;
    const track=state.tracks.find(t=>t.id===drag.id);
    if(!track)return;
    const delta=(event.clientX-drag.startX)/Math.max(1,drag.width)*drag.span;
    setOffset(track,Math.max(0,drag.original+delta),state.bpm,state.snap);
    const span=timelineSpan(state.tracks);
    drag.handle.style.left=Math.max(0,Math.min(95,track.offset/span*100))+'%';
    const label=drag.handle.parentElement.querySelector('.wave-label');
    if(label)label.textContent='+'+track.offset.toFixed(2)+'s';
    drawWaves();
  });
  const finish=event=>{
    if(!state.dragClip)return;
    const drag=state.dragClip;
    if(event.type==='pointercancel'){
      const track=state.tracks.find(t=>t.id===drag.id);
      if(track)track.offset=drag.original;
    }
    state.dragClip=null;
    render();restartPlayback();
  };
  tracks.addEventListener('pointerup',finish);
  tracks.addEventListener('pointercancel',finish);
}

function wire(){
  installTuneGestures();
  setupScrubber();
  setupClipDragging();
  const bpm=$('#bpmInput'),metro=$('#metronomeBtn'),snapBtn=$('#snapBtn');
  bpm.addEventListener('change',()=>{
    checkpoint();state.bpm=Math.max(40,Math.min(240,Math.round(Number(bpm.value)||104)));
    bpm.value=String(state.bpm);
    engine.setMetronome(state.metronome,state.bpm);
    toast('Velocidad: '+state.bpm+' BPM');
  });
  metro.addEventListener('click',()=>{
    checkpoint();state.metronome=!state.metronome;metro.setAttribute('aria-pressed',String(state.metronome));
    engine.setMetronome(state.metronome,state.bpm);
    toast(state.metronome?'Metrónomo activado':'Metrónomo desactivado');
  });
  snapBtn.addEventListener('click',()=>{
    checkpoint();state.snap=!state.snap;snapBtn.setAttribute('aria-pressed',String(state.snap));
    toast(state.snap?'Ajuste al ritmo activado':'Movimiento libre activado');
  });
  $('#importBtn').onclick=$('#addTrackBtn').onclick=$('#emptyImportBtn').onclick=()=>$('#fileInput').click();
  $('#fileInput').onchange=async e=>{await importFiles(e.target.files);e.target.value='';};
  $('#demoBtn').onclick=demo;$('#recordBtn').onclick=openRecording;
  $('#loopBtn').onclick=()=>{checkpoint();state.loop=!state.loop;$('#loopBtn').setAttribute('aria-pressed',String(state.loop));toast(state.loop?'Repetición activada':'Repetición desactivada');};
  $('#playBtn').onclick=playPause;$('#stopBtn').onclick=stop;$('#backBtn').onclick=()=>{if(engine.playing){engine.pause();state.position=0;restartPlaybackAtZero();}else{state.position=0;updateTransport();}};
  $('#exportBtn').onclick=openExport;$('#saveBtn').onclick=save;$('#loadBtn').onclick=openProjectMenu;
  $('#projectInput').onchange=async event=>{await loadPortable(event.target.files?.[0]);event.target.value='';};
  $('#undoBtn').onclick=undo;$('#redoBtn').onclick=redo;
  document.addEventListener('pointerdown',event=>{if(event.target.matches('[data-setting], #masterVolume'))checkpoint();});
  $('#bpmInput').title='BPM: Velocidad musical, no acelera automáticamente las pistas';
  $('#helpBtn').onclick=()=>help('studio');$('#tracksInfo').onclick=()=>help('tracks');
  $('#timelineInfo').onclick=()=>help('timeline');$('#inspectorInfo').onclick=()=>help('inspector');$('#masterInfo').onclick=()=>help('master');
  $('#masterVolume').oninput=e=>{state.master=Number(e.target.value);engine.setMaster(state.master);$('#volumeValue').textContent=state.master+'%';queueAutosave();};
  $('#tracks').addEventListener('click',e=>{
    const toggle=e.target.closest('[data-track-action]');if(toggle){handleTrackAction(toggle.dataset.trackAction,toggle.dataset.id);return;}
    if(e.target.closest('[data-drag-offset]'))return;
    const wave=e.target.closest('[data-wave]');
    if(wave){
      const rect=wave.getBoundingClientRect(),full=projectDuration(state.tracks);
      state.position=Math.min(full,pointerTime(e.clientX,rect,timelineSpan(state.tracks)));
      if(engine.playing)engine.play(state.tracks,state.position).then(()=>{render();runTicker();}).catch(err=>toast(err.message));
      updateTransport();return;
    }
    const card=e.target.closest('[data-track]');if(card){state.selected=card.dataset.track;render();}
  });
  $('#tracks').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.track-card')){e.preventDefault();state.selected=e.target.dataset.track;render();}});
  document.addEventListener('click',e=>{
    const opening=e.target.closest('[data-project-open]');if(opening){openNamed(opening.dataset.projectOpen);return;}
    const deletion=e.target.closest('[data-project-delete]');if(deletion){removeNamed(deletion.dataset.projectDelete);return;}
    const info=e.target.closest('[data-info]');if(info){help(info.dataset.info);return;}
    const action=e.target.closest('[data-action]');if(action){handleModalAction(action.dataset.action);return;}
    const tunePreset=e.target.closest('[data-tune-preset]');
    if(tunePreset){
      const point=findTunePreset(tunePreset.dataset.tunePreset);
      if(point){checkpoint();tuneChange(point.x,point.y,point.id,true);}return;
    }
    const userPoint=e.target.closest('[data-user-tune]');
    if(userPoint){
      const point=loadUserTunes()[Number(userPoint.dataset.userTune)];
      if(point){checkpoint();tuneChange(point.x,point.y,'user:'+point.name,true);}return;
    }
    const preset=e.target.closest('[data-preset]');if(preset){
      const t=current(),p=PRESETS[preset.dataset.preset];if(!t||!p)return;
      checkpoint();Object.assign(t,p,{preset:preset.dataset.preset});
      const tuneXY=tunePointFromManual(t.autotune,t.retune);
      Object.assign(t,{tuneX:tuneXY.x,tuneY:tuneXY.y,tunePreset:'custom'});
      engine.updateTrack(t);renderInspector();queueAutosave();toast('Estilo aplicado: '+p.label);return;
    }
    if(e.target.id==='modalBackdrop')closeModal();
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-tune-axis]')){
      const t=current();if(t){
        const x=e.target.dataset.tuneAxis==='x'?Number(e.target.value)/100:t.tuneX;
        const y=e.target.dataset.tuneAxis==='y'?Number(e.target.value)/100:t.tuneY;
        tuneChange(x,y);
      }
    }
    if(e.target.matches('[data-setting]'))setSetting(e.target.dataset.setting,Number(e.target.value),e.target);
    if(e.target.matches('[data-timing]'))setTiming(e.target.dataset.timing,Number(e.target.value));
    if(e.target.id==='recordShift'){
      const output=$('#recordShiftValue'),value=Number(e.target.value);
      if(output)output.textContent=value===0?'Sin ajuste':(value<0?'Adelantar ':'Retrasar ')+Math.abs(value)+' ms';
    }
    if(e.target.id==='recordTune'||e.target.id==='recordClean'){
      if(state.preview){
        state.preview.monitorTrack[e.target.id==='recordTune'?'autotune':'clean']=Number(e.target.value);
        engine.updateMic(state.preview.monitorTrack);
      }
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('select[data-setting]'))renderInspector();
    if(e.target.matches('[data-timing]')){render();restartPlayback();}
    if(e.target.id==='micSelect' && state.preview)prepareSelectedMic();
    if(e.target.id==='monitorToggle' && state.preview)prepareSelectedMic();
  });
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!document.activeElement?.matches('input[type="text"],textarea')){
      e.preventDefault();if(e.shiftKey)redo();else undo();return;
    }
    if(e.key==='Tab'&&$('#modalBackdrop')){
      const targets=$('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',$('.focus-panel'));
      if(targets.length){const first=targets[0],last=targets[targets.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    }
    if(e.key==='Escape'&&$('#modalBackdrop')){closeModal();return;}
    if(e.key===' '&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName||'')&&!$('#modalBackdrop')){e.preventDefault();playPause();}
  });
  navigator.mediaDevices?.addEventListener?.('devicechange',()=>{if($('#micSelect')&&!state.recording)updateMicrophoneChoices();});
  window.addEventListener('resize',()=>requestAnimationFrame(drawWaves));
  document.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault();});
  document.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length){e.preventDefault();importFiles(e.dataTransfer.files);}});
  window.addEventListener('beforeunload',e=>{if(state.recording){e.preventDefault();e.returnValue='';}});
}
async function restartPlaybackAtZero(){
  try{await engine.play(state.tracks,0);render();runTicker();}catch(err){toast(err.message);}
}
wire();render();historyUI();
if('serviceWorker' in navigator&&window.isSecureContext){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
