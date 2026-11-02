import {AudioEngine} from './engine.js';
import {KEYS,SCALES,COLORS,PRESETS,defaults,clock,clamp,projectDuration,effectiveDuration,peaks,synthBeat,downloadBlob,safeFilename} from './dsp.js';
import {saveSession,loadSession,listNamedProjects,saveNamedProject,deleteNamedProject} from './project-store.js';
import {MAX_RECORDING_SECONDS,meterLevel,audioFileHint} from './recording-utils.js';
import {exportProject,importProject} from './portable-project.js';
import {zipStore} from './zip-store.js';
import {TUNE_POINTS,normalizeTune,tunePointFromManual,applyTunePoint,findTunePreset} from './tune-lab.js';
import {pitchReadout} from './pitch-display.js';
import {tuneLabMarkup,updateTuneLabView,loadUserTunes,saveUserTune,customTuneMarkup} from './tune-lab-ui.js';
import {timelineSpan,pointerTime,setOffset,splitClip} from './timeline.js';
import {BUS_IDS,BUS_LABELS,busForTrack,sanitiseBuses,formatDb} from './studio-mixer.js';
import {mixerMarkup,updateMixerMeters} from './studio-mixer-ui.js';
import {clipsOf,ensureClips,clipDuration,addTrackClip,getEditableClip,splitTrackClip,cloneTrackMetadata,clipSourceBounds,validLoop,setClipLoop,removeClipLoop,duplicateLoop} from './track-clips.js';
import {FX_CHAIN,FX_IDS,normaliseFxBypass,toggleTrackFx,isFxBypassed} from './fx-rack.js';
import {GROOVES,VOICE_STYLES,AUTO_TRANSITIONS,makeGroove,applyVoiceStyle,applyAutoTransition} from './studio-library.js';
import {libraryMarkup} from './library-ui.js';
import {flowMarkup,flowHeight,flowPosition,updateFlowWires,invalidateFlowWireGeometry,wireCurve} from './flow-studio.js';
import {clampFlowZoom,graphViewportSize,screenToGraph,fitFlowZoom,zoomAroundPoint} from './flow-viewport.js';
import {canConnect,chainLane} from './flow-routing.js';
import {listLibrarySamples,loadLibrarySample,deleteLibrarySample,saveLibrarySample} from './sample-library.js';
import {copySample,sampleEffect} from './sample-bank.js';
import {listPatchPresets,savePatchPreset,deletePatchPreset,applyPatchPreset} from './patch-presets.js';
import {MASTER_FX_DEFAULTS,sanitiseMasterFx} from './master-fx.js';
import {clipSpeed,setClipSpeed,trimClip,moveClip} from './clip-edit.js';
import {estimateNote,solfege,noteRegions,autoTuneSegments,setNoteMask,AUTO_TUNE_MODES} from './pitch-coach.js';
import {VOICE_CHARACTERS,applyVoiceCharacter,characterCoordinates} from './voice-characters.js';
import {pitchReviewMarkup,drawPitchWave,selectionPercent,sourceTimeFromPointer} from './pitch-review-ui.js';
import {SampleDeck} from './sample-deck.js';
import {signalQuality} from './sample-bank.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const engine=new AudioEngine();
const state={tracks:[],selected:null,selectedClip:null,clipImportTrack:null,position:0,recording:null,tuneMode:'track',liveTuneTrack:null,liveMicActive:false,liveMicBusy:false,liveMicToken:0,liveMeterFrame:0,preview:null,recordMeterHistory:[],meterFrame:0,preferredInput:'',scrubbing:false,dragClip:null,bpm:104,metronome:false,snap:false,loop:false,recordShiftMs:0,countingIn:null,inputGain:100,monitorGain:75,master:85,masterFx:{...MASTER_FX_DEFAULTS},buses:sanitiseBuses(),mixerOpen:false,busy:false,sessionRecording:null,loopEdit:null,scrollX:0,libraryTab:'rhythms',flowOpen:true,flowFullscreen:false,flowExpandedFx:[],flowFxWindows:{},flowFxMaximized:null,flowCanvasZoom:1,flowPan:{left:0,top:0},flowPositions:{},flowArmedEffect:null,flowArmedPreset:null,flowArmedOutput:null,flowCableDrag:null,flowDrag:null,sampleAssets:[],zoom:1,recordNoteLast:0,micSignal:false,noteHistory:[],sampleDeck:null,pendingSampleTrackId:null,liveRecording:null,liveNoteLast:0};
const HELP={
  flowStudio:['Signal Flow','Cada tarjeta es una pista real. Arrastra su cabecera para moverla y conecta el puerto derecho con una entrada compatible. Abre FX dentro de una pista para activar sus efectos; esos efectos solo modifican esa pista. MASTER FX procesa toda la mezcla. SAMPLE DESK es una mesa independiente: arrastra el pequeño icono musical de un nodo hasta el botón SAMPLE DESK para guardar una copia. Desde la biblioteca o el editor de pads puedes enviarla al SAMPLE BUS, a la pista seleccionada o directamente a MASTER.'],
  masterFx:['Efectos globales','Estos controles se aplican después de sumar las voces, pistas y samples. LOW y HIGH ajustan el tono general; DRIVE añade saturación; COMP controla la dinámica; DELAY y REVERB añaden espacio. BYPASS desactiva estos efectos sin borrar sus ajustes. El limitador de seguridad permanece activo.'],
  library:['Tu biblioteca creativa','Los ritmos son originales y se generan completamente en tu dispositivo. Al tocarlos añades una base a la canción. Los estilos aplican valores reales a los controles de voz de una pista. Las transiciones generan fundidos y, cuando hay otro clip, cruces suaves sin modificar los archivos originales. Puedes arrastrar estilos o transiciones a los planetas de sonido.'],
  studio:['Bienvenido a tu estudio','1. Importa una base o prueba un ritmo. 2. Pulsa Grabar mi voz y canta. 3. Selecciona una capa para modificarla. 4. Dale Play y exporta tu mezcla. Todo el audio se procesa en tu equipo.'],
  clipLoop:['Loops de un clip','Selecciona un fragmento del archivo fuente con inicio y final (en segundos), y elige cuántas veces debe repetirse, hasta 64. El loop solo afecta ese clip; las demás pistas conservan su tiempo normal. Puedes duplicar el patrón a la derecha en la misma pista sin crear otra copia del sonido. Para evitar clicks, corta cerca de cruces por cero.'],
  sessionRecording:['Grabar sesión en tiempo real','Captura como WAV estéreo lo que escuchas saliendo del master, incluidos loops, buses y efectos, durante la reproducción. No pide micrófono ni graba automáticamente la señal de entrada: si quieres incluir tu voz, primero grábala como pista. Máximo 10 minutos. Para exportación reproducible sin esperar, utiliza EXPORTAR WAV.'],
  tracks:['Capas de sonido','Cada capa es independiente. Puedes combinar voz, batería, música y efectos. Toca una para modificarla. M silencia, S deja escuchar solo esa capa. La flecha abre las acciones de la capa.'],
  timeline:['Línea de tiempo','Cada forma de onda representa un sonido. Toca o arrastra el cabezal verde en la regla de tiempo para adelantar o retroceder. También puedes tocar una onda. Usa las flechas izquierda y derecha del teclado para avanzar o retroceder 1 segundo. En AJUSTAR TIEMPOS puedes desplazar, recortar y suavizar entradas y salidas.'],
  inspector:['Ajustes de la capa','Los tres controles principales son volumen, afinación y limpieza. Prueba un estilo predefinido si no sabes por dónde empezar. Los efectos adicionales se encuentran en MÁS EFECTOS.'],
  volume:['Volumen de esta capa','Sube o baja únicamente el sonido seleccionado. No cambia el volumen de las otras pistas.'],
  mixer:['Consola Studio','La consola agrupa cada capa y sus controles. Modifica su volumen, posición izquierda/derecha, silencia o escucha solo una pista; asigna música, voces o efectos a un BUS para ajustar un grupo entero de una vez. Cada bus llega al MASTER. El volumen indica dB relativos: 0 dB equivale a 100% de ganancia, y bajar a −∞ silencia la señal. El MASTER controla la salida final. Es un mezclador inicial de tres buses, aún sin envíos de efectos auxiliares ni automatización.'],
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
  countIn:['Cuenta de entrada','Antes de comenzar una nueva grabación, escucharás cuatro pulsos a los BPM elegidos. Canta después del último pulso. La base empieza junto con la grabación; los clics de preparación no quedan dentro del archivo digital. Usa auriculares para evitar que el micrófono recoja los clics.'],
  pitchReading:['Analizador de voz','Cuando reproduces una capa con Tune Lab abierto, el motor estima la frecuencia fundamental y la nota musical más cercana. El indicador de cents señala la desviación antes de la corrección. Si ves SIN NOTA CLARA, no es necesariamente un error: el sonido puede ser silencio, ruido, música con varias notas o una voz difícil de analizar. La medición es orientativa y todavía experimental.'],
  liveVoice:['Voice Playground en vivo','Activa el micrófono únicamente cuando quieras practicar con tus auriculares conectados. Mueve el nodo para modificar la afinación experimental y el color en tiempo real. La escucha puede tener retardo y causar acoples con altavoces. No graba ni cambia la pista seleccionada salvo que pulses APLICAR A PISTA. Cierra o detén el modo para liberar el micrófono.'],
  tuneLab:['TUNE LAB — experimento musical','Mueve el nodo en el plano: izquierda = transiciones naturales, derecha = cambios robóticos rápidos; abajo = poca afinación, arriba = mucha afinación. También modifica ligeramente brillo y saturación para descubrir colores. El sonido cambia mientras reproduces. Usa los botones de destinos y guarda los que te gusten. No es todavía un autotune profesional.'],
  alignment:['Ajustar la sincronía','Si al escuchar tu grabación queda después del ritmo, mueve el control hacia Adelantar (valores negativos). Si quedó demasiado temprano, muévelo hacia Retrasar (positivos). El ajuste queda guardado en este dispositivo. No sustituye una calibración automática del hardware.'],
  original:['Comparar sonido original','Alterna entre el audio sin efectos y el audio procesado. El volumen y la dirección se mantienen. Es una comparación A/B no destructiva: los efectos siguen guardados aunque escuches el original.']
};
let toastTimer,raf=0,autosaveTimer=null,autosaveBusy=false,autosaveQueued=false;
let tuneGesture=null,tuneFrame=0;
const modalStack=[];
const history={past:[],future:[]};
function getProjectOptions(){
  return {bpm:state.bpm,metronome:state.metronome,snap:state.snap,loop:state.loop,recordShiftMs:state.recordShiftMs,inputGain:state.inputGain,monitorGain:state.monitorGain,buses:{...state.buses},masterFx:{...state.masterFx},flowOpen:state.flowOpen,flowExpandedFx:[...state.flowExpandedFx],flowFxWindows:{...state.flowFxWindows},flowCanvasZoom:state.flowCanvasZoom,zoom:state.zoom,flowPositions:Object.fromEntries(Object.entries(state.flowPositions).map(([id,p])=>[id,{x:p.x,y:p.y}]))};
}
function applyProjectOptions(options={}){
  state.bpm=clamp(options.bpm??104,40,240);
  state.metronome=!!options.metronome;state.snap=!!options.snap;state.loop=!!options.loop;
  state.recordShiftMs=Math.round(clamp(options.recordShiftMs??0,-300,300));
  state.inputGain=clamp(options.inputGain??100,0,200);state.monitorGain=clamp(options.monitorGain??75,0,100);
  state.buses=sanitiseBuses(options.buses);engine.setBuses(state.buses);
  state.masterFx=sanitiseMasterFx(options.masterFx);engine.setMasterFx(state.masterFx);
  state.flowOpen=options.flowOpen!==false;state.flowExpandedFx=Array.isArray(options.flowExpandedFx)?options.flowExpandedFx.filter(x=>typeof x==='string'&&x.length<128).slice(0,80):[];
  state.flowFxWindows=Object.fromEntries(Object.entries(options.flowFxWindows&&typeof options.flowFxWindows==='object'?options.flowFxWindows:{}).filter(([id,p])=>typeof id==='string'&&id.length<128&&p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(([id,p])=>[id,{x:clamp(p.x,0,3000),y:clamp(p.y,0,1800)}]));
  state.flowCanvasZoom=clampFlowZoom(options.flowCanvasZoom??1);state.flowFxMaximized=null;state.zoom=clamp(Number(options.zoom)||1,1,8);
  state.flowPositions=Object.fromEntries(Object.entries(options.flowPositions&&typeof options.flowPositions==='object'?options.flowPositions:{}).filter(([id,p])=>typeof id==='string'&&id.length<128&&p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(([id,p])=>[id,{x:clamp(p.x,12,5000),y:clamp(p.y,12,3000)}]));
  const bpm=$('#bpmInput');if(bpm)bpm.value=String(state.bpm);
  $('#metronomeBtn')?.setAttribute('aria-pressed',String(state.metronome));
  $('#snapBtn')?.setAttribute('aria-pressed',String(state.snap));
  $('#loopBtn')?.setAttribute('aria-pressed',String(state.loop));
  engine.setMetronome(state.metronome,state.bpm);
}
function captureState(){
  return {tracks:state.tracks.map(cloneTrackMetadata),selected:state.selected,selectedClip:state.selectedClip,position:state.position,master:state.master,options:getProjectOptions()};
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
  const wasPlaying=engine.playing;engine.stop();stopFlowMotion();cancelAnimationFrame(raf);
  state.tracks=snapshot.tracks.map(cloneTrackMetadata);state.selected=snapshot.selected;state.selectedClip=snapshot.selectedClip??null;state.position=snapshot.position;
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
  if(state.recording)return;
  clearTimeout(autosaveTimer);
  saveStatus('CAMBIOS SIN GUARDAR','saving');
  autosaveTimer=setTimeout(async()=>{
    if(state.recording)return;
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
  if(state.liveRecording)return toast('Detén y guarda la toma antes de cerrar Voice Lab');
  const leavingTune=!!$('#tuneLab');
  if(state.countingIn){state.countingIn.cancelled=true;state.countingIn=null;}
  finishTuneGesture();
  if(modalStack.length){if(leavingTune&&state.tuneMode==='live')stopLiveTuneMic();$('#modalRoot').innerHTML=modalStack.pop();$('.focus-panel')?.focus();if(state.preview)drawMicPreview();if($('#tuneLab'))$('.focus-panel')?.classList.add('tune-focus');else engine.watchPitch(null,null);return;}
  if(state.recording){toast('Detén la grabación antes de cerrar');return;}
  if(leavingTune)stopLiveTuneMic();
  cancelAnimationFrame(state.meterFrame);
  state.preview=null;
  engine.stopMic();
  $('#modalRoot').innerHTML='';
  engine.watchPitch(null,null);
}
function dial(label,key,value,color='var(--green)',min=0,max=100){
  const pct=((value-min)/(max-min))*100;
  const readout=key==='pan'?(value<0?'IZQ '+Math.abs(value):value>0?'DER '+value:'CENTRO'):Math.round(value)+'%';
  return '<div class="dial-wrap" style="--dial-color:'+color+'">'+buttonInfo(key)+'<div class="dial" style="--fill:'+Math.round(pct*.78)+'%"><div class="dial-inner"><span>'+readout+'</span><small>AJUSTE</small></div></div><label for="dial-'+key+'">'+label+'</label><input id="dial-'+key+'" type="range" data-setting="'+key+'" min="'+min+'" max="'+max+'" value="'+value+'" aria-label="'+label+'"></div>';
}
function addTrack(buffer,name,type='audio',offset=0,bus=null,chain=true,deferRender=false){
  const id=globalThis.crypto?.randomUUID?.()||'track-'+Date.now()+'-'+Math.random();
  const t={id,buffer,name:name.slice(0,80),type,color:COLORS[state.tracks.length%COLORS.length],...defaults(),offset:Math.max(0,offset),bus:bus||(type==='voice'?'vocals':'music')};
  checkpoint();
  const previous=chain?state.tracks.filter(x=>!x.flowHidden&&busForTrack(x)===t.bus).at(-1):null;
  t.flowTo='bus:'+t.bus;
  if(previous&&(!previous.flowTo||previous.flowTo==='bus:'+t.bus))previous.flowTo='track:'+id;
  state.tracks.push(t);state.selected=id;state.selectedClip=null;if(!deferRender){render();if(engine.playing)restartPlayback();}
  return t;
}
function render(){
  $('#trackCount').textContent=String(state.tracks.length).padStart(2,'0');
  const duration=projectDuration(state.tracks);
  const span=timelineSpan(state.tracks);
  $('#endTimeLabel').textContent=clock(span);
  $('#ruler').setAttribute('aria-valuemax',String(Math.ceil(duration)));
  $('#timelineZoom').value=state.zoom;
  const tickStep=span/state.zoom>60?10:span/state.zoom>25?5:span/state.zoom>10?2:1;
  $('#rulerTicks').innerHTML=Array.from({length:Math.min(240,Math.ceil(span/tickStep))},(_,i)=>{
    const time=i*tickStep;return '<span style="left:'+(time/span*100)+'%">'+time+' s</span>';
  }).join('');
  $('#ruler').setAttribute('aria-valuenow',String(Math.round(state.position)));
  $('#zoomValue').textContent=state.zoom.toFixed(1)+'×';
  $('#emptyState').classList.toggle('hidden',state.tracks.length>0);
  $('#tracks').innerHTML=state.tracks.map((t,i)=>{
    const active=t.id===state.selected;
    return '<article class="track-card'+(active?' selected':'')+'" style="--track-color:'+trackColor(t)+'" data-track="'+html(t.id)+'" tabindex="0" aria-label="Seleccionar capa '+html(t.name)+'">'+
      '<div class="vinyl'+(engine.playing&&!t.muted?' spinning':'')+'" aria-hidden="true"><div class="vinyl-center"></div></div>'+
      '<div class="track-info"><strong class="track-name" title="'+html(t.name)+'">'+html(t.name)+'</strong><div class="track-sub">'+(t.type==='voice'?'◉ VOZ':t.type==='demo'?'♫ BEAT':'≋ AUDIO')+' · '+(Array.isArray(t.clips)?t.clips.length+' CLIPS · ':'')+clock(effectiveDuration(t))+'</div><div class="track-buttons"><button class="small-toggle'+(t.muted?' active':'')+'" data-track-action="mute" data-id="'+html(t.id)+'" title="Silenciar" aria-label="Silenciar '+html(t.name)+'">M</button><button class="small-toggle solo'+(t.solo?' active':'')+'" data-track-action="solo" data-id="'+html(t.id)+'" title="Escuchar solo" aria-label="Escuchar solo '+html(t.name)+'">S</button></div></div>'+
      '<div class="wave-viewport" data-wave-viewport="'+html(t.id)+'"><div class="track-wave" data-wave="'+html(t.id)+'" style="width:'+(state.zoom*100)+'%" title="Toca para moverte en la mezcla"><canvas data-canvas="'+html(t.id)+'" aria-label="Forma de onda"></canvas><div class="wave-playhead" aria-hidden="true"></div><div class="wave-label">'+(clipsOf(t).some(c=>validLoop(c))?'⟳ LOOP':t.offset>0?'+'+t.offset.toFixed(1)+'s':'WAV')+'</div>'+clipsOf(t).map((clip)=>'<div class="clip-region" style="left:'+Math.max(0,(clip.offset||0)/span*100)+'%;width:'+Math.max(.4,clipDuration(clip)/span*100)+'%" data-clip-region="'+html(clip.id)+'">'+
        '<button type="button" class="clip-edge clip-left" data-clip-control="start" data-clip-track="'+html(t.id)+'" data-clip-id="'+html(clip.id)+'" title="Recortar inicio · arrastrar">❮</button>'+
        '<button type="button" class="clip-grip" data-clip-control="move" data-clip-track="'+html(t.id)+'" data-clip-id="'+html(clip.id)+'" title="Mover clip completo en el tiempo">⠿ <span>'+Math.round(clipDuration(clip)*10)/10+' s · '+clipSpeed(clip).toFixed(2)+'×</span></button>'+
        '<button type="button" class="clip-edge clip-right" data-clip-control="end" data-clip-track="'+html(t.id)+'" data-clip-id="'+html(clip.id)+'" title="Recortar final · arrastrar">❯</button></div>').join('')+'</div></div>'+
      '<div class="track-tail"><button type="button" class="mini-action track-bounce" data-track-action="export-track" data-id="'+html(t.id)+'" title="Guardar o exportar esta pista · original o con FX" aria-label="Exportar pista '+html(t.name)+'">↓ WAV</button><button type="button" class="mini-action" data-track-action="move-track" data-id="'+html(t.id)+'" title="Mover pista completa en el tiempo" aria-label="Mover toda la pista">↠</button><button type="button" class="mini-action track-trash" data-track-action="delete" data-id="'+html(t.id)+'" aria-label="Eliminar pista '+html(t.name)+'" title="Eliminar pista">×</button>'+(t.flowHidden?'<button type="button" class="mini-action" data-track-action="restore-flow" data-id="'+html(t.id)+'" title="Restaurar en Flow Studio">↗</button>':'')+'<button type="button" class="mini-action loop-entry" data-track-action="clip-loop" data-id="'+html(t.id)+'" aria-label="Crear o editar loop de '+html(t.name)+'" title="Repetir fragmento del clip seleccionado">⟳</button><button type="button" class="mini-action" data-track-action="add-clip" data-id="'+html(t.id)+'" aria-label="Añadir clip a '+html(t.name)+'" title="Añadir clip a esta pista">＋</button><button type="button" class="mini-action" data-track-action="edit" data-id="'+html(t.id)+'" aria-label="Opciones de la capa">⋯</button><span class="track-number">'+String(i+1).padStart(2,'0')+'</span></div></article>';
  }).join('');
  renderInspector();renderMixer();renderFlow();requestAnimationFrame(()=>{drawWaves();alignWaveRuler();updateTransport();});updateTransport();queueAutosave();
}

function renderLibrary(){
  if($('#libraryBody'))$('#libraryBody').innerHTML=libraryMarkup(state.libraryTab);
}
function syncFlowTransport(){
  const button=$('[data-flow-play]');if(!button)return;
  button.textContent=engine.playing?'Ⅱ':'▶';
  button.setAttribute('aria-label',engine.playing?'Pausar reproducción':'Reproducir mezcla');
}
function applyFlowViewport(){
  const board=$('#flowBoard'),space=$('#flowCanvasSpace'),label=$('#flowZoomLabel');
  if(!board||!space)return;
  const z=clampFlowZoom(state.flowCanvasZoom),size=graphViewportSize(board.offsetWidth,board.offsetHeight,z);
  state.flowCanvasZoom=z;
  board.style.transform='scale('+z+')';
  space.style.width=size.width+'px';space.style.height=size.height+'px';
  if(label)label.textContent=Math.round(z*100)+'%';
  invalidateFlowWireGeometry($('#flowArea'));
  paintFlow(engine.playing);
}
function setFlowZoom(zoom,clientX=null,clientY=null){
  const scroller=$('#flowCanvasScroller');if(!scroller)return;
  const previous=state.flowCanvasZoom,next=clampFlowZoom(zoom),rect=scroller.getBoundingClientRect();
  if(Math.abs(previous-next)<.001)return;
  const x=clientX===null?scroller.clientWidth/2:clientX-rect.left;
  const y=clientY===null?scroller.clientHeight/2:clientY-rect.top;
  const scroll=zoomAroundPoint({scrollLeft:scroller.scrollLeft,scrollTop:scroller.scrollTop,x,y,oldZoom:previous,newZoom:next});
  state.flowCanvasZoom=next;applyFlowViewport();
  scroller.scrollLeft=scroll.left;scroller.scrollTop=scroll.top;
  state.flowPan={left:scroller.scrollLeft,top:scroller.scrollTop};
  queueAutosave();
}
function fitFlowCanvas(){
  const board=$('#flowBoard'),scroller=$('#flowCanvasScroller');if(!board||!scroller)return;
  state.flowCanvasZoom=fitFlowZoom(board.offsetWidth,board.offsetHeight,scroller.clientWidth,scroller.clientHeight);
  applyFlowViewport();scroller.scrollLeft=0;scroller.scrollTop=0;state.flowPan={left:0,top:0};queueAutosave();
}
function renderFlow(){
  const area=$('#flowArea'),body=$('#flowBody');
  if(!area||!body)return;
  const previousScroller=$('#flowCanvasScroller');
  if(previousScroller)state.flowPan={left:previousScroller.scrollLeft,top:previousScroller.scrollTop};
  area.hidden=!state.flowOpen;
  $('#flowToggle')?.setAttribute('aria-expanded',String(state.flowOpen));
  if(!state.flowOpen)return;
  body.innerHTML=flowMarkup(state.tracks,state.flowPositions,state.selected,state.sampleDeck?.pads||[],state.sampleAssets,listPatchPresets(),state.flowExpandedFx,state.masterFx,state.master,state.flowFxWindows,state.flowFxMaximized);
  syncFlowTransport();
  area.classList.toggle('is-fullscreen',state.flowFullscreen);
  $('#flowFullscreen')?.setAttribute('aria-pressed',String(state.flowFullscreen));
  $('#flowFullscreen')?.setAttribute('aria-label',state.flowFullscreen?'Salir de pantalla completa':'Pantalla completa');
  applyFlowViewport();
  const scroller=$('#flowCanvasScroller');
  if(scroller){scroller.scrollLeft=state.flowPan.left;scroller.scrollTop=state.flowPan.top;}
  if(engine.playing)startFlowMotion();
  else paintFlow(false);
}

function setFlowFullscreen(force){
  state.flowFullscreen=typeof force==='boolean'?force:!state.flowFullscreen;
  const area=$('#flowArea');
  area?.classList.toggle('is-fullscreen',state.flowFullscreen);
  document.body.classList.toggle('flow-fullscreen-open',state.flowFullscreen);
  $('#flowFullscreen')?.setAttribute('aria-pressed',String(state.flowFullscreen));
  const button=$('#flowFullscreen');if(button)button.textContent=state.flowFullscreen?'↙ VOLVER':'⛶ PANTALLA COMPLETA';
  requestAnimationFrame(()=>{invalidateFlowWireGeometry(area);paintFlow(engine.playing);});
}
async function openSampleDesk(){
  const area=$('#sampleDeck');if(!area)return;
  stopFlowMotion();
  area.hidden=false;area.classList.add('is-fullscreen');document.body.classList.add('sample-desk-open');
  $('#sampleToggle')?.setAttribute('aria-expanded','true');
  await state.sampleDeck?.load();
}
function closeSampleDesk(){
  const area=$('#sampleDeck');if(!area)return;
  area.classList.remove('is-fullscreen');area.hidden=true;document.body.classList.remove('sample-desk-open');
  $('#sampleToggle')?.setAttribute('aria-expanded','false');
  if(engine.playing)startFlowMotion();
}
function openTrackSampleDialog(trackId){
  const track=state.tracks.find(item=>item.id===trackId);
  if(!track?.buffer)return toast('No se encontró el audio de esta pista');
  if(state.recording||state.sessionRecording)return toast('Finaliza la grabación antes de guardar un sample');
  state.pendingSampleTrackId=trackId;
  modal('Guardar en Sample Desk',
    '<p>Crearás una copia reutilizable. La pista original y su posición no cambiarán.</p>'+
    '<div class="field"><label for="sampleExportName">Nombre del sample</label><input id="sampleExportName" maxlength="60" value="'+html(track.name)+'"></div>'+
    '<div class="note">CON FX incluye los efectos de esta pista y MASTER. ORIGINAL guarda el sonido sin procesar.</div>',
    [{label:'GUARDAR ORIGINAL',type:'save-sample-original'},{label:'GUARDAR CON FX',type:'save-sample-processed',primary:true}]);
}
async function saveTrackAsSample(trackId,processed,name){
  if(state.recording||state.sessionRecording)return toast('Finaliza la grabación antes de guardar un sample');
  const track=state.tracks.find(item=>item.id===trackId);if(!track?.buffer)return toast('No se encontró el audio de esta pista');
  const sampleName=String(name||'').trim().slice(0,60);if(!sampleName)return toast('El sample necesita un nombre');
  try{
    const source={...track,offset:0,muted:false,solo:false};
    const wav=await engine.exportMix([source],{depth:32,rate:48000,dry:!processed});
    const buffer=await engine.decode(new File([wav],safeFilename(sampleName)+'.wav',{type:'audio/wav'}));
    const saved=await saveLibrarySample({buffer,from:0,to:buffer.duration,name:sampleName,fx:processed?'rendered':'original'});
    state.pendingSampleTrackId=null;modalStack.length=0;$('#modalRoot').innerHTML='';
    await state.sampleDeck?.refreshAssets?.();await refreshFlowAssets();
    toast('Guardado en SAMPLE DESK: '+saved.name);
  }catch(error){toast('No se pudo guardar el sample: '+error.message);}
}

let flowMotionFrame=0;
let flowMotionLast=0;
let flowInViewport=true;
const FLOW_FRAME_MS=1000/60;
function flowMotionAllowed(){
  const sampleDeskOpen=$('#sampleDeck')?.classList.contains('is-fullscreen');
  return state.flowOpen&&!sampleDeskOpen&&engine.playing&&!document.hidden&&flowInViewport&&
    !!$('#flowBoard')&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function paintFlow(animate=flowMotionAllowed(),time=performance.now()){
  if(state.flowOpen)updateFlowWires($('#flowArea'),state.tracks,engine,animate,time);
}
function stopFlowMotion(){
  if(flowMotionFrame){cancelAnimationFrame(flowMotionFrame);flowMotionFrame=0;}
  flowMotionLast=0;
  if(state.flowOpen)paintFlow(false);
}
function startFlowMotion(){
  if(flowMotionFrame||!flowMotionAllowed())return;
  const frame=time=>{
    flowMotionFrame=0;
    if(!flowMotionAllowed()){stopFlowMotion();return;}
    if(!flowMotionLast||time-flowMotionLast>=FLOW_FRAME_MS-1){
      flowMotionLast=time;
      paintFlow(true,time);
    }
    flowMotionFrame=requestAnimationFrame(frame);
  };
  flowMotionFrame=requestAnimationFrame(frame);
}
function selectFlowTrack(id){
  if(state.flowArmedPreset){
    const idPreset=state.flowArmedPreset;state.flowArmedPreset=null;
    useFlowPreset(idPreset,id);return;
  }
  if(state.flowArmedEffect){
    const fx=state.flowArmedEffect;state.flowArmedEffect=null;
    applyFlowFx(id,fx,true);return;
  }
  if(state.flowArmedLibrary){
    const item=state.flowArmedLibrary;state.flowArmedLibrary=null;
    chooseLibraryItem(item.kind,item.id,id);return;
  }
  const track=state.tracks.find(t=>t.id===id);
  if(track){state.selected=id;state.selectedClip=null;renderInspector();renderFlow();}
}
function applyFlowFx(trackId,fx,enable){
  if(state.recording)return toast('Finaliza la toma antes de cambiar efectos');
  if(state.sessionRecording)return toast('Finaliza primero la captura de sesión para editar la cadena');
  const track=state.tracks.find(t=>t.id===trackId);
  if(!track||!FX_IDS.includes(fx))return toast('Selecciona una pista y un efecto');
  checkpoint();
  track.fxBypass={...track.fxBypass,[fx]:!enable};
  if(enable){
    track.bypassEffects=false;
    if(fx==='tune')track.autotune=Math.max(72,track.autotune);
    if(fx==='clean')track.clean=Math.max(50,track.clean);
    if(fx==='eq'){track.brightness=Math.max(63,track.brightness);track.warmth=Math.max(31,track.warmth);}
    if(fx==='drive')track.drive=Math.max(23,track.drive);
    if(fx==='delay')track.echo=Math.max(27,track.echo);
    if(fx==='reverb')track.space=Math.max(33,track.space);
    if(fx==='tune'){
      const coord=tunePointFromManual(track.autotune,track.retune);
      track.tuneX=coord.x;track.tuneY=coord.y;
    }
  }
  state.selected=track.id;
  engine.updateTrack(track);
  renderInspector();renderFlow();queueAutosave();
  toast(enable?'Efecto conectado a '+track.name:'Efecto retirado sin borrar sus ajustes');
}
async function chooseLibraryItem(kind,id,trackId=state.selected){
  if(state.recording||state.sessionRecording)return toast('Termina la grabación antes de cambiar el arreglo');
  if(kind==='rhythms'){
    try{
      const ctx=await engine.ready(),result=makeGroove(id,ctx.sampleRate,8),data=result.channels;
      const buffer=ctx.createBuffer(2,data[0].length,ctx.sampleRate);
      data.forEach((channel,index)=>buffer.copyToChannel(channel,index));
      const wasEmpty=!state.tracks.length;
      const track=addTrack(buffer,result.groove.name+' · '+result.groove.bpm+' BPM','demo');
      track.volume=67;track.clean=0;track.space=0;track.echo=0;track.bus='music';
      if(wasEmpty){state.bpm=result.groove.bpm;$('#bpmInput').value=String(state.bpm);engine.setMetronome(state.metronome,state.bpm);}
      render();restartPlayback();toast('Ritmo '+result.groove.name+' añadido. Puedes grabar encima.');
    }catch(error){toast('No se pudo crear el ritmo: '+error.message);}
    return;
  }
  const target=state.tracks.find(t=>t.id===trackId);
  if(!target){
    state.flowArmedLibrary={kind,id};state.flowOpen=true;renderFlow();
    $('#flowArea')?.scrollIntoView({behavior:'smooth',block:'start'});
    toast('Ahora elige el planeta de sonido donde aplicar '+(kind==='voices'?'el estilo':'la transición'));
    return;
  }
  if(kind==='voices'){
    try{checkpoint();applyVoiceStyle(target,id);engine.updateTrack(target);
      state.selected=target.id;renderInspector();renderFlow();queueAutosave();
      const name=VOICE_STYLES.find(p=>p.id===id)?.name||'Estilo';
      toast(name+' aplicado a '+target.name);
    }catch(error){toast(error.message);}return;
  }
  if(kind==='transitions'){
    try{
      const clips=clipsOf(target),chosen=getEditableClip(target,state.selectedClip);
      if(!chosen)throw Error('Esta pista aún no tiene clips');
      // Validate style and neighboring clip before altering the project.
      const probe={...target,clips:clips.map(c=>({...c}))};
      applyAutoTransition(probe,chosen.id,id,state.bpm);
      checkpoint();
      const clip=ensureClips(target).find(c=>c.id===chosen.id);
      applyAutoTransition(target,clip.id,id,state.bpm);
      state.selected=target.id;state.selectedClip=clip.id;
      render();restartPlayback();
      toast('Transición aplicada a '+target.name);
    }catch(error){toast(error.message);}
  }
}

function deleteFlowNode(id){
  if(state.recording||state.sessionRecording)return toast('Finaliza la grabación antes de editar el mapa');
  const t=state.tracks.find(x=>x.id===id);if(!t)return;
  checkpoint();
  if(!t.muted){t.muted=true;engine.updateTrack(t);toast('Conexión cortada. Supr de nuevo retira el nodo.');}
  else{
    const fallback='bus:'+busForTrack(t);
    for(const source of state.tracks)if(source.id!==t.id&&source.flowTo==='track:'+t.id){source.flowTo=fallback;engine.updateTrack(source);}
    t.flowHidden=true;state.flowExpandedFx=state.flowExpandedFx.filter(id=>id!==t.id);
    toast('Nodo retirado del mapa. Las pistas conectadas continúan hacia su bus; el audio original sigue en Tu mezcla.');
  }
  render();
  if(!t.flowHidden){
    requestAnimationFrame(()=>{
      const next=Array.from(document.querySelectorAll('[data-flow-track]')).find(el=>el.dataset.flowTrack===id);
      next?.querySelector('[data-flow-drag]')?.focus({preventScroll:true});
    });
  }else requestAnimationFrame(()=>$('#flowToggle')?.focus({preventScroll:true}));
}
function deleteTrack(id){
  if(state.recording||state.sessionRecording)return toast('Detén la grabación antes de borrar');
  const t=state.tracks.find(x=>x.id===id);if(!t)return;
  if(!window.confirm('¿Eliminar la pista "'+t.name+'"? Puedes deshacer con Ctrl+Z.'))return;
  checkpoint();for(const source of state.tracks)if(source.id!==id&&source.flowTo==='track:'+id){source.flowTo='bus:'+busForTrack(t);engine.updateTrack(source);}state.tracks=state.tracks.filter(x=>x.id!==id);delete state.flowPositions[id];state.flowExpandedFx=state.flowExpandedFx.filter(key=>key!==id);
  state.selected=state.tracks[0]?.id||null;state.selectedClip=null;
  if(engine.playing){engine.stop();state.position=0;cancelAnimationFrame(raf);}
  modalStack.length=0;$('#modalRoot').innerHTML='';render();toast('Pista eliminada. Puedes deshacer.');
}

function toggleFlowTrackLink(id){
  if(state.recording)return toast('Termina la toma antes de cambiar conexiones');
  const track=state.tracks.find(t=>t.id===id);
  if(!track)return;
  checkpoint();track.muted=!track.muted;state.selected=track.id;
  // Play schedules muted channels at zero gain so reconnecting is immediate.
  engine.updateTrack(track);
  renderInspector();renderMixer();renderFlow();queueAutosave();
  toast(track.muted?'Pista desconectada. Sus clips siguen guardados.':'Pista reconectada a tu canción.');
}

async function refreshFlowAssets(){
  try{state.sampleAssets=await listLibrarySamples();renderFlow();}
  catch(error){toast('Biblioteca no disponible: '+error.message);}
}
async function insertFlowSample(ref,targetId=null,targetRoute=null){
  if(state.recording||state.sessionRecording)return toast('Termina la grabación antes de añadir audio');
  try{
    await state.sampleDeck?.load();
    const pad=ref.startsWith('pad:')?state.sampleDeck?.pads[Number(ref.slice(4))]:await loadLibrarySample(ref.slice(4));
    if(!pad)throw Error('No se encontró el sample guardado');
    const ctx=await engine.ready(),buffer=copySample(ctx,pad.buffer,pad.from,pad.to);
    const dest=state.tracks.find(t=>t.id===targetId);
    const bus=dest?busForTrack(dest):targetRoute?.startsWith('bus:')?targetRoute.slice(4):'samples';
    const track=addTrack(buffer,pad.name,'audio',state.position,BUS_IDS.includes(bus)?bus:'samples',false,true);
    track.sourceKind='sample';
    if(dest){track.bus=busForTrack(dest);track.flowTo='track:'+dest.id;}
    else track.flowTo=targetRoute==='master'?'master':'bus:'+(BUS_IDS.includes(bus)?bus:'samples');
    Object.assign(track,sampleEffect(pad.fx).settings);
    engine.updateTrack(track);render();restartPlayback();queueAutosave();
    toast('Sample añadido a '+(dest?dest.name:targetRoute==='master'?'MASTER':BUS_LABELS[bus]||'SAMPLE BUS'));
  }catch(error){toast('No se pudo insertar el sample: '+error.message);}
}
function useFlowPreset(presetId,trackId){
  if(state.recording||state.sessionRecording)return toast('Detén la grabación antes de modificar FX');
  const preset=listPatchPresets().find(p=>p.id===presetId),track=state.tracks.find(t=>t.id===trackId);
  if(!preset||!track)return toast('Selecciona una pista y un preset guardado');
  checkpoint();applyPatchPreset(track,preset);state.selected=track.id;
  engine.updateTrack(track);renderInspector();renderFlow();queueAutosave();
  toast('Preset FX aplicado: '+preset.name);
}
function connectFlow(id,to){
  if(state.recording||state.sessionRecording)return toast('Finaliza la grabación antes de conectar');
  const track=state.tracks.find(t=>t.id===id);
  if(!track||!canConnect(state.tracks,id,to)){
    state.flowArmedOutput=null;$('#flowBody')?.classList.remove('patch-awaiting-connection');
    return toast('Ruta no válida: conecta pistas de la misma línea y evita ciclos.');
  }
  checkpoint();track.flowTo=to;
  state.flowArmedOutput=null;$('#flowBody')?.classList.remove('patch-awaiting-connection');
  renderFlow();restartPlayback();queueAutosave();
  toast('Audio conectado: '+track.name+' → '+(to==='master'?'MASTER':to.startsWith('bus:')?to.slice(4):state.tracks.find(t=>t.id===to.slice(6))?.name));
}

function setupFlow(){
  renderLibrary();
  const flowArea=$('#flowArea'),body=$('#flowBody'),library=$('#libraryBody');
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      flowInViewport=entries[0]?.isIntersecting??true;
      if(flowMotionAllowed())startFlowMotion();else stopFlowMotion();
    },{root:null,rootMargin:'120px 0px',threshold:0});
    observer.observe(flowArea);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopFlowMotion();else startFlowMotion();
  });
  $('#flowToggle').onclick=()=>{
    if(state.flowOpen&&state.flowFullscreen)setFlowFullscreen(false);
    state.flowOpen=!state.flowOpen;if(!state.flowOpen)stopFlowMotion();renderFlow();queueAutosave();
    if(state.flowOpen)flowArea.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  $('#flowFullscreen').onclick=()=>setFlowFullscreen();
  $('#flowHelp').onclick=()=>help('flowStudio');
  $('#flowChain').onclick=()=>{
    if(state.recording||state.sessionRecording)return toast('Termina la grabación antes de conectar');
    checkpoint();
    for(const bus of ['vocals','music','fx']){
      const links=chainLane(state.tracks,bus);
      for(const track of state.tracks)if(links.has(track.id))track.flowTo=links.get(track.id);
    }
    state.flowArmedOutput=null;state.flowPositions={};
    renderFlow();restartPlayback();queueAutosave();toast('Cadenas organizadas por tipo de sonido.');
  };
  $('#flowArrange').onclick=()=>{
    checkpoint();state.flowPositions={};renderFlow();queueAutosave();
    toast('Nodos ordenados por líneas de voz y pistas.');
  };
  $('#libraryHelp').onclick=()=>help('library');
  library.addEventListener('click',event=>{
    const tab=event.target.closest('[data-library-tab]');
    if(tab){state.libraryTab=tab.dataset.libraryTab;renderLibrary();return;}
    const item=event.target.closest('[data-library-item]');
    if(item)chooseLibraryItem(item.dataset.libraryKind,item.dataset.libraryItem);
  });
  body.addEventListener('click',event=>{
    if(event.target.closest('[data-flow-play]')){Promise.resolve(playPause()).finally(syncFlowTransport);return;}
    if(event.target.closest('[data-flow-stop]')){stop();syncFlowTransport();return;}
    if(event.target.closest('[data-flow-destination]'))return;
    const dock=event.target.closest('[data-flow-sample-dock]');
    if(dock){openSampleDesk();return;}
    if(event.target.closest('[data-flow-add-voice]')){$('#recordBtn')?.click();return;}
    if(event.target.closest('[data-flow-add-track]')){$('#importBtn')?.click();return;}
    const output=event.target.closest('[data-flow-out]');
    if(output){state.flowArmedOutput=output.dataset.flowOut;body.classList.add('patch-awaiting-connection');toast('Salida seleccionada · ahora elige una entrada compatible');return;}
    const input=event.target.closest('[data-flow-in]');
    if(input){if(state.flowArmedOutput)connectFlow(state.flowArmedOutput,input.dataset.flowIn.startsWith('bus:')||input.dataset.flowIn==='master'?input.dataset.flowIn:'track:'+input.dataset.flowIn);return;}
    const expand=event.target.closest('[data-flow-expand-fx]');
    if(expand){
      const id=expand.dataset.flowExpandFx,items=new Set(state.flowExpandedFx);
      if(items.has(id))items.delete(id);else items.add(id);
      state.flowExpandedFx=[...items];renderFlow();queueAutosave();return;
    }
    const effectToggle=event.target.closest('[data-flow-effect-toggle]');
    if(effectToggle){
      const active=effectToggle.getAttribute('aria-pressed')==='true';
      applyFlowFx(effectToggle.dataset.flowOwner,effectToggle.dataset.flowEffectToggle,!active);return;
    }
    if(event.target.closest('[data-flow-master-help]')){help('masterFx');return;}
    const masterBypass=event.target.closest('[data-master-fx-bypass]');
    if(masterBypass){
      checkpoint();state.masterFx=sanitiseMasterFx({...state.masterFx,bypass:masterBypass.checked});
      engine.setMasterFx(state.masterFx);renderFlow();queueAutosave();return;
    }
    const fxSave=event.target.closest('[data-flow-save-fx]');
    if(fxSave){
      const track=state.tracks.find(t=>t.id===fxSave.dataset.flowSaveFx);if(!track)return;
      const name=prompt('Nombre para esta cadena de efectos:',track.name+' · FX');
      if(name!==null)try{savePatchPreset(name,track);renderFlow();toast('Preset guardado en este equipo.');}
      catch(error){toast(error.message);}return;
    }
    const fxDelete=event.target.closest('[data-flow-delete-preset]');
    if(fxDelete){if(confirm('¿Eliminar este preset?')){deletePatchPreset(fxDelete.dataset.flowDeletePreset);renderFlow();}return;}
    const fxPreset=event.target.closest('[data-flow-preset]');
    if(fxPreset){if(fxPreset.dataset.flowOwner||state.selected)useFlowPreset(fxPreset.dataset.flowPreset,fxPreset.dataset.flowOwner||state.selected);else toast('Selecciona primero una pista.');return;}
    const sampleSave=event.target.closest('[data-flow-export-sample]');
    if(sampleSave){openTrackSampleDialog(sampleSave.dataset.flowExportSample);return;}
    const savedDelete=event.target.closest('[data-flow-remove-sample]');
    if(savedDelete){const id=savedDelete.dataset.flowRemoveSample;if(!confirm('¿Eliminar este sample guardado?'))return;deleteLibrarySample(id).then(refreshFlowAssets).catch(error=>toast(error.message));return;}
    const sample=event.target.closest('[data-flow-sample]');
    if(sample){insertFlowSample(sample.dataset.flowSample);return;}
    const deletion=event.target.closest('[data-flow-delete]');
    if(deletion){deleteFlowNode(deletion.dataset.flowDelete);return;}
    const link=event.target.closest('[data-flow-link]');
    if(link){toggleFlowTrackLink(link.dataset.flowLink);return;}
    const focus=event.target.closest('[data-flow-focus]');
    if(focus){selectFlowTrack(focus.dataset.flowFocus);return;}
    const node=event.target.closest('[data-flow-track]');
    if(node){selectFlowTrack(node.dataset.flowTrack);}
  });
  body.addEventListener('input',event=>{
    const masterVolume=event.target.closest('[data-flow-master-volume]');
    if(masterVolume){
      state.master=Number(masterVolume.value);engine.setMaster(state.master);
      $('#masterVolume').value=state.master;$('#volumeValue').textContent=state.master+'%';
      queueAutosave();return;
    }
    const control=event.target.closest('[data-master-fx]');
    if(!control)return;
    const key=control.dataset.masterFx;
    state.masterFx=sanitiseMasterFx({...state.masterFx,[key]:Number(control.value)});
    engine.setMasterFx(state.masterFx);
    const output=Array.from(body.querySelectorAll('[data-master-fx-value]')).find(el=>el.dataset.masterFxValue===key);
    if(output)output.textContent=control.value+(key==='low'||key==='high'?' dB':'%');
    queueAutosave();
  });
  body.addEventListener('change',event=>{
    const select=event.target.closest('[data-flow-destination]');
    if(select){connectFlow(select.dataset.flowDestination,select.value);return;}
    const control=event.target.closest('[data-master-fx]');
    if(control){queueAutosave();return;}
  });
  body.addEventListener('pointerdown',event=>{
    if(event.target.matches('[data-master-fx],[data-flow-master-volume]'))checkpoint();
  });
  body.addEventListener('keydown',event=>{
    if(event.target.matches('[data-master-fx],[data-flow-master-volume]')&&
       ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)&&!event.repeat)checkpoint();
  });
  let dragged=null;
  function startDrag(event){
    const sampleSave=event.target.closest('[data-flow-export-sample]');
    const fxPreset=event.target.closest('[data-flow-preset]');
    const libraryItem=event.target.closest('[data-library-item]');
    const chip=event.target.closest('[data-flow-effect]');
    dragged=sampleSave?{kind:'track',id:sampleSave.dataset.flowExportSample}:
      fxPreset?{kind:'preset',id:fxPreset.dataset.flowPreset}:
      libraryItem?{kind:libraryItem.dataset.libraryKind,id:libraryItem.dataset.libraryItem}:
      chip?{kind:'remove-fx',id:chip.dataset.flowEffect,owner:chip.dataset.flowOwner}:null;
    if(dragged&&event.dataTransfer){
      event.dataTransfer.effectAllowed='copyMove';
      event.dataTransfer.setData('text/plain','vas-flow');
    }
  }
  library.addEventListener('dragstart',startDrag);
  body.addEventListener('dragstart',startDrag);
  body.addEventListener('dragover',event=>{
    if(!dragged)return;
    if(event.target.closest('[data-flow-track],[data-flow-in],[data-flow-sample-dock],#flowBoard')){
      event.preventDefault();event.dataTransfer.dropEffect='copy';
    }
  });
  body.addEventListener('drop',event=>{
    if(!dragged)return;
    const item=dragged;dragged=null;event.preventDefault();
    const dock=event.target.closest('[data-flow-sample-dock]');
    const target=event.target.closest('[data-flow-track]');
    const input=event.target.closest('[data-flow-in]');
    const route=input?.dataset.flowIn||null;
    const removal=event.target.closest('#flowRemoveZone');
    if(dock&&item.kind==='track'){openTrackSampleDialog(item.id);return;}
    if(removal&&item.kind==='remove-fx'){applyFlowFx(item.owner,item.id,false);return;}
    if(item.kind==='sample'){
      insertFlowSample(item.id,target?.dataset.flowTrack||null,target?null:route);return;
    }
    if(item.kind==='preset'){if(target)useFlowPreset(item.id,target.dataset.flowTrack);else toast('Suelta el preset sobre una pista.');return;}
    if(!target&&item.kind==='rhythms'){chooseLibraryItem('rhythms',item.id);return;}
    if(!target)return toast('Arrastra un sample a una pista, bus o MASTER; o un nodo a SAMPLE DESK.');
    if(item.kind==='track')return;
    if(item.kind==='effect')applyFlowFx(target.dataset.flowTrack,item.id,true);
    else if(item.kind==='remove-fx')applyFlowFx(target.dataset.flowTrack,item.id,true);
    else chooseLibraryItem(item.kind,item.id,target.dataset.flowTrack);
  });
  body.addEventListener('dragend',()=>{dragged=null;});
  library.addEventListener('dragend',()=>{dragged=null;});
  body.addEventListener('keydown',event=>{
    const handle=event.target.closest('[data-flow-drag]');
    if(!handle||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    const board=$('#flowBoard'),id=handle.dataset.flowDrag,node=handle.closest('[data-flow-track]');
    if(!board||!node)return;
    event.preventDefault();
    const point={x:node.offsetLeft,y:node.offsetTop},step=event.shiftKey?40:12;
    const x=clamp(point.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),12,Math.max(12,board.clientWidth-440));
    const y=clamp(point.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0),12,Math.max(12,board.clientHeight-node.offsetHeight-12));
    if(x!==point.x||y!==point.y){
      checkpoint();state.flowPositions[id]={x,y};node.style.left=x+'px';node.style.top=y+'px';
      invalidateFlowWireGeometry(flowArea);paintFlow();queueAutosave();
    }
  });
  body.addEventListener('pointerdown',event=>{
    if(event.target.closest('[data-flow-export-sample]'))return;
    const out=event.target.closest('[data-flow-out]');
    if(out&&event.button===0){
      const board=$('#flowBoard'),svg=$('#flowWires');if(!board||!svg)return;
      const a=out.getBoundingClientRect(),r=board.getBoundingClientRect();
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.classList.add('flow-wire','patch-wire-preview');svg.appendChild(path);
      state.flowCableDrag={id:out.dataset.flowOut,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,
        x:a.right-r.left,y:a.top-r.top+a.height/2,moved:false,board,path};return;
    }
    const handle=event.target.closest('[data-flow-drag]');
    if(!handle||event.button!==0||state.recording)return;
    const node=handle.closest('[data-flow-track]'),board=$('#flowBoard');if(!node||!board)return;
    event.preventDefault();handle.setPointerCapture(event.pointerId);
    const position={x:node.offsetLeft,y:node.offsetTop};
    state.flowDrag={id:node.dataset.flowTrack,startX:event.clientX,startY:event.clientY,x:position.x,y:position.y,node,board};
    node.classList.add('is-dragging');
  });
  body.addEventListener('pointermove',event=>{
    const cable=state.flowCableDrag;
    if(cable&&event.pointerId===cable.pointerId){
      const r=cable.board.getBoundingClientRect();
      cable.moved=cable.moved||Math.hypot(event.clientX-cable.startX,event.clientY-cable.startY)>6;
      cable.path.setAttribute('d',wireCurve(cable.x,cable.y,event.clientX-r.left,event.clientY-r.top));return;
    }
    if(!state.flowDrag)return;
    const drag=state.flowDrag,board=drag.board;
    const x=clamp(drag.x+event.clientX-drag.startX,12,Math.max(12,board.clientWidth-440));
    const y=clamp(drag.y+event.clientY-drag.startY,12,Math.max(12,board.clientHeight-drag.node.offsetHeight-12));
    drag.node.style.left=x+'px';drag.node.style.top=y+'px';drag.next={x,y};
    invalidateFlowWireGeometry(flowArea);paintFlow();
  });
  const finish=event=>{
    const drag=state.flowDrag;if(!drag)return;
    state.flowDrag=null;drag.node.classList.remove('is-dragging');
    if(event.type!=='pointercancel'&&drag.next){
      const prior=state.flowPositions[drag.id]||{x:drag.x,y:drag.y};
      if(prior.x!==drag.next.x||prior.y!==drag.next.y){checkpoint();state.flowPositions[drag.id]=drag.next;queueAutosave();}
    }else{drag.node.style.left=drag.x+'px';drag.node.style.top=drag.y+'px';}
    invalidateFlowWireGeometry(flowArea);paintFlow();
  };
  body.addEventListener('pointerup',finish);body.addEventListener('pointercancel',finish);
  const finishCable=event=>{
    const cable=state.flowCableDrag;if(!cable||event.pointerId!==cable.pointerId)return;
    state.flowCableDrag=null;cable.path.remove();if(event.type==='pointercancel')return;
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-flow-in]');
    if(target){
      const raw=target.dataset.flowIn;
      connectFlow(cable.id,raw==='master'||raw.startsWith('bus:')?raw:'track:'+raw);return;
    }
    state.flowArmedOutput=cable.id;
    if(cable.moved)toast('Elige ahora una entrada compatible para completar la conexión.');
  };
  document.addEventListener('pointerup',finishCable);
  document.addEventListener('pointercancel',finishCable);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if($('#modalBackdrop')){closeModal();event.preventDefault();return;}
    if($('#sampleDeck')?.classList.contains('is-fullscreen')){closeSampleDesk();event.preventDefault();return;}
    if(state.flowFullscreen){setFlowFullscreen(false);event.preventDefault();}
  });
}

function alignWaveRuler(){
  const wave=$('.track-wave'),container=$('.timeline-ruler'),ruler=$('#ruler');
  if(!container||!ruler)return;
  if(!wave){ruler.style.left='';ruler.style.width='';return;}
  const viewport=$('.wave-viewport'),rulerViewport=$('#rulerViewport');
  if(!viewport||!rulerViewport)return;
  const r=viewport.getBoundingClientRect(),parent=container.getBoundingClientRect();
  rulerViewport.style.left=Math.max(0,r.left-parent.left)+'px';
  rulerViewport.style.width=Math.max(30,r.width)+'px';
  ruler.style.left='0px';ruler.style.width=(state.zoom*100)+'%';
  rulerViewport.scrollLeft=state.scrollX;
  for(const element of $('.wave-viewport'))element.scrollLeft=state.scrollX;
}
function renderMixer(){
  const area=$('#mixerArea'),body=$('#mixerBody');
  if(!area||!body)return;
  area.hidden=!state.mixerOpen;
  const toggle=$('#mixerToggle');
  if(toggle){toggle.setAttribute('aria-expanded',String(state.mixerOpen));toggle.setAttribute('aria-pressed',String(state.mixerOpen));}
  if(state.mixerOpen)body.innerHTML=mixerMarkup(state.tracks,state.buses,state.selected);
}
function paintMixerMeters(){
  if(state.mixerOpen)updateMixerMeters($('#mixerArea'),engine,state.tracks);
}
function openMixer(force){
  state.mixerOpen=typeof force==='boolean'?force:!state.mixerOpen;
  renderMixer();
}
function setupMixer(){
  $('#mixerToggle').onclick=()=>openMixer();
  $('#mixerClose').onclick=()=>openMixer(false);
  $('#mixerHelp').onclick=()=>help('mixer');
  const root=$('#mixerBody');
  root.addEventListener('pointerdown',event=>{
    if(event.target.matches('[data-mix-volume],[data-mix-pan],[data-mix-bus-volume]'))checkpoint();
  });
  root.addEventListener('keydown',event=>{
    if(event.target.matches('input[type="range"]')&&
       ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)&&!event.repeat)checkpoint();
  });
  root.addEventListener('click',event=>{
    const tSelect=event.target.closest('[data-mix-select]');
    if(tSelect){state.selected=tSelect.dataset.mixSelect;renderInspector();renderMixer();return;}
    const mute=event.target.closest('[data-mix-mute]');
    if(mute){handleTrackAction('mute',mute.dataset.mixMute);return;}
    const solo=event.target.closest('[data-mix-solo]');
    if(solo){handleTrackAction('solo',solo.dataset.mixSolo);return;}
  });
  root.addEventListener('input',event=>{
    const input=event.target;
    if(input.hasAttribute('data-mix-bus-volume')){
      const bus=input.dataset.mixBusVolume;
      if(!BUS_IDS.includes(bus))return;
      state.buses[bus]=clamp(input.value,0,100);
      engine.setBuses(state.buses);
      const label=Array.from(root.querySelectorAll('[data-mix-bus-value]')).find(e=>e.dataset.mixBusValue===bus);
      if(label)label.textContent=formatDb(state.buses[bus]);
      queueAutosave();return;
    }
    const volume=input.dataset.mixVolume,pan=input.dataset.mixPan,id=volume||pan;
    if(!id)return;
    const track=state.tracks.find(t=>t.id===id);if(!track)return;
    if(volume){
      track.volume=clamp(input.value,0,100);
      const label=Array.from(root.querySelectorAll('[data-mix-value]')).find(e=>e.dataset.mixValue===id);
      if(label)label.textContent=formatDb(track.volume);
    }else{
      track.pan=clamp(input.value,-100,100);
      const label=Array.from(root.querySelectorAll('[data-mix-pantext]')).find(e=>e.dataset.mixPantext===id);
      if(label)label.textContent=track.pan===0?'CENTRO':track.pan<0?'IZQ '+Math.abs(track.pan):'DER '+track.pan;
    }
    engine.updateTrack(track);queueAutosave();
  });
  root.addEventListener('change',event=>{
    const input=event.target;
    if(input.hasAttribute('data-mix-route')){
      const track=state.tracks.find(t=>t.id===input.dataset.mixRoute);
      if(!track||!BUS_IDS.includes(input.value))return;
      checkpoint();track.bus=input.value;
      renderMixer();restartPlayback();queueAutosave();
    }else if(input.matches('[data-mix-volume],[data-mix-pan],[data-mix-bus-volume]')){
      renderInspector();queueAutosave();
    }
  });
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
    for(const clip of clipsOf(t)){
      const len=clipDuration(clip);if(len<=0)continue;
      const left=Math.floor((clip.offset/full)*w),width=Math.max(1,Math.round((len/full)*w));
      context.fillStyle=trackColor(t)+'14';context.fillRect(left,0,width,h);
      const channel=clip.buffer.getChannelData(0),rate=clip.buffer.sampleRate,loop=validLoop(clip);
      const trimStart=(loop?.from??clip.trimStart??0)*rate;
      const segmentFrames=loop?Math.floor((loop.to-loop.from)*rate):0;
      const usable=Math.floor(len*rate*clipSpeed(clip)),samplesPerX=usable/width;
      context.fillStyle=trackColor(t);
      for(let x=0;x<width;x+=2){
        const local=loop?(Math.floor(x*samplesPerX)%Math.max(1,segmentFrames)):Math.floor(x*samplesPerX);
        const from=Math.floor(trimStart)+local,to=Math.min(channel.length,loop?Math.floor(loop.to*rate):channel.length,
          from+Math.max(1,Math.floor(samplesPerX*2)));
        let peak=0;
        for(let j=from;j<to;j+=Math.max(1,Math.floor((to-from)/12)))peak=Math.max(peak,Math.abs(channel[j]||0));
        const amplitude=Math.max(1,Math.min(.98,peak)*h*.44);
        context.globalAlpha=t.muted?.27:.85;
        context.fillRect(left+x,h/2-amplitude,Math.max(1,1.6*dpr),amplitude*2);
      }
      context.globalAlpha=1;
      if(loop){
        const segmentWidth=(loop.to-loop.from)/full*w;
        context.strokeStyle='#f5d675a6';context.lineWidth=Math.max(1,dpr);
        for(let n=1;n<loop.repeats;n++){
          const px=left+Math.floor(segmentWidth*n);
          if(px>left+width)break;
          context.beginPath();context.moveTo(px,0);context.lineTo(px,h);context.stroke();
        }
      }
    }
  });
}
function renderInspector(){
  const t=current();if(!t){$('#inspectorBody').innerHTML='<div class="inspector-placeholder"><div class="orb"></div><strong>Selecciona una capa</strong><p>Su volumen, voz y efectos aparecerán aquí.</p></div>';return;}
  const presets=Object.keys(PRESETS).map(id=>'<button class="preset-chip'+(t.preset===id?' active':'')+'" data-preset="'+id+'">'+PRESETS[id].label+'</button>').join('');
  $('#inspectorBody').innerHTML='<div class="selected-head" style="--track-color:'+trackColor(t)+'"><strong>'+html(t.name)+'</strong><span class="track-color-pill"></span></div>'+
    '<div class="hint" style="margin:7px 0 14px">Prueba un estilo, escucha el cambio y ajústalo a tu gusto. Siempre conservas el audio original.</div>'+
    '<div class="control-heading"><strong>01 · ELIGE UN ESTILO</strong>'+buttonInfo('presets')+'</div><div class="preset-list">'+presets+'</div>'+
    '<button class="wide-button" data-action="toggle-bypass" aria-pressed="'+!!t.bypassEffects+'">'+(t.bypassEffects?'▶ VOLVER A MIS EFECTOS':'◉ ESCUCHAR ORIGINAL / COMPARAR')+'</button>'+
    '<div class="inspector-divider"></div><div class="control-heading"><strong>02 · AJUSTA COMO QUIERAS</strong>'+buttonInfo('inspector')+'</div>'+
    '<div class="control-grid">'+dial('Volumen','volume',t.volume)+dial('Afinar','autotune',t.autotune,'var(--purple)')+dial('Limpiar','clean',t.clean,'var(--blue)')+'</div>'+
    '<details class="inspector-more"><summary>✦ Opciones musicales avanzadas</summary><div class="control-row"><label for="tuneKey">Tono</label><select data-setting="key" id="tuneKey">'+KEYS.map((x,i)=>'<option value="'+i+'"'+(i===t.key?' selected':'')+'>'+x+'</option>').join('')+'</select>'+buttonInfo('key')+'</div>'+
    '<div class="control-row"><label for="tuneScale">Escala</label><select data-setting="scale" id="tuneScale">'+SCALES.map((x,i)=>'<option value="'+i+'"'+(i===t.scale?' selected':'')+'>'+x+'</option>').join('')+'</select>'+buttonInfo('scale')+'</div></details>'+
    '<div class="tune-mini"><div class="tune-mini-chart"><span class="tune-mini-node" style="left:'+(((Number.isFinite(t.tuneX)?t.tuneX:tunePointFromManual(t.autotune,t.retune).x)+1)*50)+'%;top:'+((1-(Number.isFinite(t.tuneY)?t.tuneY:tunePointFromManual(t.autotune,t.retune).y))*50)+'%"></span></div>'+
      '<div class="tune-mini-body"><strong>✦ TUNE LAB</strong><small>Descubre nuevos estilos moviendo un nodo</small></div></div>'+
    '<button class="wide-button tune-launch" data-action="tune-open">✧ EXPLORAR TUNE LAB →</button>'+    '<button class="wide-button" data-action="pitch-review">♩ EDITAR NOTAS POR FRAGMENTOS →</button>'+
    '<button class="wide-button" data-action="effects">✦ EXPLORAR MÁS EFECTOS →</button><button class="wide-button" data-action="timing">◷ MOVER Y RECORTAR →</button>';
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
  for(const line of $$('.wave-playhead')){line.style.left=percent+'%';line.style.opacity=state.tracks.length?1:0;}
}
function updateMasterMeter(){
  const {peak,rms}=engine.getMasterMeter();
  const fill=$('#masterMeter'),label=$('#masterPeak');
  if(fill)fill.style.height=Math.round(Math.min(1,Math.sqrt(rms)*1.8)*100)+'%';
  if(label){label.textContent=peak>.94?'ALTO':Math.round(peak*100)+'%';label.classList.toggle('clip-warning',peak>.94);}
}
/** Capture the actual audible MASTER in real time, stereo local PCM.
 * The audio can include the live Voice Playground microphone if monitoring
 * has been explicitly enabled; otherwise it captures the prepared tracks. */
function sessionButton(){
  const btn=$('#sessionRecordBtn');
  if(!btn)return;
  const active=!!state.sessionRecording;
  btn.classList.toggle('is-recording',active);
  btn.textContent=active?'■ DETENER SESIÓN':'● GRABAR SESIÓN';
  btn.setAttribute('aria-pressed',String(active));
  btn.setAttribute('aria-label',active?'Detener y guardar grabación de sesión':'Grabar sesión en tiempo real');
  const secondary=$('[data-action="session-record"]');
  if(secondary){
    secondary.textContent=active?'■ DETENER Y GUARDAR WAV':'● GRABAR LO QUE ESCUCHO';
    secondary.setAttribute('aria-pressed',String(active));
  }
}
function finishSessionBuffer(session,buffer){
  if(state.sessionRecording!==session)return;
  state.sessionRecording=null;
  sessionButton();
  try{
    downloadBlob(encodeWav(buffer,24),
      'veryAtractiveSynth-sesion-'+new Date().toISOString().slice(0,19).replace(/[T:]/g,'-')+'.wav');
    toast('Sesión estéreo WAV grabada y guardada en este dispositivo.');
  }catch(error){toast('No se pudo descargar la sesión: '+error.message);}
}
async function startSessionRecording(){
  if(state.sessionRecording)return;
  if(state.recording)return toast('Finaliza la toma del micrófono antes de capturar la mezcla');
  if(!state.tracks.length&&!state.liveMicActive)return toast('Agrega pistas o activa tu voz en Voice Lab');
  try{
    if(!engine.playing&&state.tracks.length){
      if(state.position>=projectDuration(state.tracks)-.02)state.position=0;
      await engine.play(state.tracks,state.position);
      runTicker();updateTransport();
    }
    const captured=await engine.startSessionCapture();
    const session={startedAt:captured.startedAt,finishing:false,completion:captured.completion};
    state.sessionRecording=session;
    sessionButton();
    captured.completion.then(buffer=>{
      if(!session.finishing)finishSessionBuffer(session,buffer);
    }).catch(error=>{
      if(state.sessionRecording===session){
        state.sessionRecording=null;sessionButton();toast('Captura interrumpida: '+error.message);
      }
    });
    toast('◉ Grabando salida master en tiempo real · máximo 10 minutos');
  }catch(error){toast('No se pudo iniciar la sesión: '+error.message);}
}
async function stopSessionRecording(){
  const session=state.sessionRecording;
  if(!session||session.finishing)return;
  session.finishing=true;
  try{
    const buffer=await (engine.sessionCapture?engine.stopSessionCapture():session.completion);
    if(buffer)finishSessionBuffer(session,buffer);
  }catch(error){
    if(state.sessionRecording===session){
      state.sessionRecording=null;sessionButton();toast('Error guardando la sesión: '+error.message);
    }
  }
}
function toggleSessionRecording(){
  if(state.sessionRecording)stopSessionRecording();
  else startSessionRecording();
}

function runTicker(){
  cancelAnimationFrame(raf);
  const tick=()=>{
    if(engine.playing){
      const p=engine.position();state.position=p;updateTransport();updateMasterMeter();paintMixerMeters();
      if(p>=projectDuration(state.tracks)-.015){
        if(state.sessionRecording&&!state.loop)stopSessionRecording();
        engine.stop();stopFlowMotion();state.position=0;
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
  if(engine.playing){if(state.sessionRecording)await stopSessionRecording();state.position=engine.pause();stopFlowMotion();render();return;}
  try{await engine.play(state.tracks,state.position);render();startFlowMotion();runTicker();}
  catch(error){toast('No se pudo reproducir: '+error.message);}
}
async function restartPlayback(){
  if(!engine.playing)return;
  if(state.sessionRecording){toast('No se puede reconstruir la mezcla mientras se graba la sesión');return;}
  const p=engine.position();
  try{await engine.play(state.tracks,p);runTicker();}
  catch(error){toast(error.message);}
}
function stop(){
  if(state.sessionRecording)stopSessionRecording();
  engine.stop();stopFlowMotion();state.position=0;cancelAnimationFrame(raf);render();updateMasterMeter();
}
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
async function importClipIntoTrack(file,id){
  if(!file)return;
  const track=state.tracks.find(t=>t.id===id);
  if(!track)return toast('No existe el canal elegido');
  try{
    const buffer=await engine.decode(file);
    checkpoint();
    const clipId=globalThis.crypto?.randomUUID?.()||'clip-'+Date.now();
    addTrackClip(track,buffer,state.position,clipId,file.name.replace(/\.[^.]+$/,''));
    state.selected=track.id;state.selectedClip=clipId;
    render();restartPlayback();
    toast('Nuevo clip añadido a '+track.name+'. Muévelo con ↔.');
  }catch(error){toast('No se pudo añadir el clip: '+error.message);}
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
function getTuneTrack(){
  return state.tuneMode==='live'?state.liveTuneTrack:current();
}
function tuneRefresh(track){
  if(tuneFrame)return;
  tuneFrame=requestAnimationFrame(()=>{
    tuneFrame=0;
    if(state.tuneMode==='live')engine.updateMic(track);
    else engine.updateTrack(track);
    updateTuneLabView($('#tuneLab'),track);
  });
}
function tuneChange(x,y,preset='custom',store=false){
  const track=getTuneTrack();if(!track)return;
  const p=normalizeTune(x,y);
  applyTunePoint(track,p.x,p.y,preset);
  tuneRefresh(track);
  if(store&&state.tuneMode==='track'){renderInspector();queueAutosave();}
}
function tuneFromPad(event){
  const pad=$('#tunePad');if(!pad)return null;
  const rect=pad.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  return normalizeTune(((event.clientX-rect.left)/rect.width)*2-1,
    (1-(event.clientY-rect.top)/rect.height)*2-1);
}
function onTunePitch(message){
  const root=$('#labPitchMonitor');if(!root)return;
  const info=pitchReadout(message);
  root.classList.toggle('is-quiet',!info.voiced);
  const put=(id,value)=>{const node=root.querySelector(id);if(node)node.textContent=value;};
  put('#labPitchNote',info.note);put('#labPitchTarget',info.target);
  put('#labPitchHz',info.hertz);put('#labPitchCents',info.cents);
  put('#labPitchStatus',info.status);
  const needle=root.querySelector('#labPitchNeedle');if(needle)needle.style.left=info.position+'%';
}

function stopLiveTuneMic(){
  if(state.liveRecording){toast('Detén primero la grabación de Voice Lab');return;}
  state.liveMicToken++;
  state.liveMicActive=false;
  cancelAnimationFrame(state.liveMeterFrame);
  state.liveMeterFrame=0;
  engine.watchMicPitch(null);
  if(!state.recording)engine.stopMic();
  const meter=$('#labLiveMeter');if(meter)meter.style.width='0%';
  const status=$('#labLiveStatus');
  if(status)status.textContent='MICRÓFONO DETENIDO · NO SE ESTÁ GRABANDO';
}
function runLiveTuneMeter(){
  cancelAnimationFrame(state.liveMeterFrame);
  const samples=new Float32Array(4096);
  const tick=()=>{
    if(!state.liveMicActive||state.tuneMode!=='live'||!$('#labLiveMeter'))return;
    if(engine.getMicMeterData(samples)){
      if(performance.now()-state.liveNoteLast>140){
        state.liveNoteLast=performance.now();
        const note=estimateNote(samples,engine.ctx?.sampleRate||48000);
        onTunePitch(note?{voiced:true,midi:note.midi,target:note.nearest,cents:note.cents,frequency:note.frequency,confidence:note.confidence}:{voiced:false});
      }
      const {rms,peak}=meterLevel(samples);
      const bar=$('#labLiveMeter');
      bar.style.width=Math.min(100,Math.round(Math.sqrt(rms)*165))+'%';
      bar.style.background=peak>.9?'var(--pink)':'var(--green)';
      if(peak>.9){const label=$('#labLiveStatus');if(label)label.textContent='ENTRADA ALTA · BAJA LA GANANCIA PARA EVITAR SATURACIÓN';}
    }
    state.liveMeterFrame=requestAnimationFrame(tick);
  };
  state.liveMeterFrame=requestAnimationFrame(tick);
}
async function populateLiveInputs(){
  const select=$('#labMicSelect');if(!select)return;
  try{
    const devices=await listMicrophones();
    if(!$('#labMicSelect'))return;
    select.innerHTML='<option value="">Micrófono predeterminado</option>'+
      devices.filter(d=>d.deviceId&&d.deviceId!=='default')
      .map((d,i)=>'<option value="'+html(d.deviceId)+'">'+html(d.label||'Entrada '+(i+1))+'</option>').join('');
    if([...select.options].some(o=>o.value===state.preferredInput))select.value=state.preferredInput;
  }catch{}
}
async function startLiveTuneMic(){
  if(state.liveMicBusy||state.liveMicActive||state.tuneMode!=='live'||!$('#tuneLab'))return;
  if(state.recording||state.preview)return toast('Termina y cierra la grabación para usar Voice Playground');
  if(!navigator.mediaDevices?.getUserMedia)return toast('Se necesita localhost o HTTPS y permiso de micrófono');
  const request=++state.liveMicToken;
  state.liveMicBusy=true;
  const status=$('#labLiveStatus');if(status)status.textContent='SOLICITANDO ACCESO AL MICRÓFONO...';
  const chosen=$('#labMicSelect')?.value||'';
  let stream;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:{
      ...(chosen?{deviceId:{exact:chosen}}:{}),
      echoCancellation:false,noiseSuppression:false,autoGainControl:false
    },video:false});
    await engine.ready();
    if(request!==state.liveMicToken||state.tuneMode!=='live'||!$('#tuneLab')){
      stream.getTracks().forEach(t=>t.stop());return;
    }
    state.preferredInput=chosen;
    const track=state.liveTuneTrack;
    track.volume=clamp($('#labLiveMonitor')?.value??60,0,80);
    await engine.prepareMic(stream,track,true);
    if(request!==state.liveMicToken||state.tuneMode!=='live'||!$('#tuneLab')){
      engine.stopMic();return;
    }
    engine.setMicGain(clamp($('#labLiveInputGain')?.value??state.inputGain,0,150));
    state.liveMicActive=true;
    stream.getAudioTracks()[0]?.addEventListener('mute',()=>{
      if($('#micStatus'))$('#micStatus').textContent='⚠ Micrófono silenciado por el sistema o navegador';
    });
    stream.getAudioTracks()[0]?.addEventListener('unmute',()=>{
      if($('#micStatus'))$('#micStatus').textContent='● Micrófono activo · comprueba la onda';
    });
    stream.getAudioTracks()[0]?.addEventListener('ended',()=>{
      if(state.liveMicActive){stopLiveTuneMic();toast('El micrófono fue desconectado');}
    },{once:true});
    engine.watchMicPitch(null);
    runLiveTuneMeter();
    const label=$('#labLiveStatus');
    if(label)label.textContent='◉ VOZ EN VIVO · AURICULARES RECOMENDADOS · SIN GRABACIÓN';
    await populateLiveInputs();
  }catch(error){
    stream?.getTracks().forEach(t=>t.stop());state.preview=null;state.micSignal=false;
    engine.stopMic();
    const msg=error.name==='NotAllowedError'?'Permiso de micrófono denegado':error.name==='NotFoundError'?'No hay micrófono disponible':error.message;
    if($('#labLiveStatus'))$('#labLiveStatus').textContent=msg;
    toast(msg);
  }finally{state.liveMicBusy=false;}
}

async function startLiveRecording(){
  if(state.liveRecording||!state.liveMicActive||!engine.mic)return toast('Primero activa y autoriza el micrófono');
  if(engine.capture||state.recording)return toast('Ya hay una grabación en curso');
  try{
    const settings={...state.liveTuneTrack,fxBypass:{...state.liveTuneTrack.fxBypass}};
    const offset=engine.playing?engine.position():state.position;
    const capture=await engine.startCapture(seconds=>{
      if(state.liveRecording)state.liveRecording.seconds=seconds;
      if(seconds>=MAX_RECORDING_SECONDS&&state.liveRecording&&!state.liveRecording.stopping)stopLiveRecording();
    });
    state.liveRecording={settings,offset,seconds:0,capture,stopping:false};
    const status=$('#labLiveStatus');
    if(status)status.textContent='● GRABANDO · conserva el original y aplica efectos al reproducir';
    const start=$('[data-action="tune-live-record"]'),stop=$('[data-action="tune-live-save"]');
    if(start)start.disabled=true;if(stop)stop.disabled=false;
  }catch(error){toast('No se pudo comenzar: '+error.message);}
}
async function stopLiveRecording(){
  const rec=state.liveRecording;if(!rec||rec.stopping)return;
  rec.stopping=true;
  try{
    const buffer=await engine.stopCapture();
    if(!signalQuality(buffer).valid)throw Error('El micrófono no entregó voz; no se creó una pista vacía');
    state.liveRecording=null;
    const t=addTrack(buffer,'Voz Lab '+(state.tracks.filter(x=>x.type==='voice').length+1),'voice',rec.offset);
    const keep={id:t.id,buffer:t.buffer,name:t.name,type:t.type,color:t.color,offset:t.offset,bus:t.bus};
    Object.assign(t,rec.settings,keep);
    engine.updateTrack(t);queueAutosave();render();
    toast('Toma guardada: voz original y efectos editables');
  }catch(error){toast('No se guardó: '+error.message);}
  finally{
    state.liveRecording=null;
    const start=$('[data-action="tune-live-record"]'),stop=$('[data-action="tune-live-save"]');
    if(start)start.disabled=false;if(stop)stop.disabled=true;
    const status=$('#labLiveStatus');
    if(status)status.textContent='◉ MICRÓFONO ACTIVO · PUEDES GRABAR OTRA TOMA';
  }
}

function switchTuneSource(mode){
  if(state.liveRecording)return toast('Detén la grabación antes de cambiar de modo');
  if(!['live','track'].includes(mode))return;
  if(mode==='track'&&!current())return toast('Primero selecciona o graba una pista');
  if(mode!==state.tuneMode)stopLiveTuneMic();
  state.tuneMode=mode;
  if(mode==='live'&&!state.liveTuneTrack){
    state.liveTuneTrack={...defaults(),volume:60,space:0,echo:0,bypassEffects:false};
    const from=current();
    if(from)Object.assign(state.liveTuneTrack,{
      tuneX:from.tuneX,tuneY:from.tuneY,autotune:from.autotune,retune:from.retune,
      key:from.key,scale:from.scale,brightness:from.brightness,warmth:from.warmth,drive:from.drive
    });
  }
  engine.watchPitch(mode==='track'?(current()?.id??null):null,mode==='track'?onTunePitch:null);
  const currentSource=getTuneTrack();if(!currentSource)return;
  const lab=$('#tuneLab');
  if(lab)lab.outerHTML=tuneLabMarkup(currentSource,loadUserTunes(),mode,!!current());
  sessionButton();
  $('.focus-panel')?.classList.add('tune-focus');
  updateTuneLabView($('#tuneLab'),currentSource);
  if(mode==='live')populateLiveInputs();
}

function openTuneLab(mode='track'){
  if(state.recording)return toast('Detén la grabación antes de abrir Voice Playground');
  state.tuneMode=mode==='live'?'live':'track';
  if(state.tuneMode==='live'&&!state.liveTuneTrack)state.liveTuneTrack={...defaults(),volume:60,space:0,echo:0,bypassEffects:false};
  const track=getTuneTrack();if(!track)return toast('Selecciona un sonido o utiliza MI VOZ EN VIVO');
  if(!Number.isFinite(track.tuneX)||!Number.isFinite(track.tuneY)){
    const point=tunePointFromManual(track.autotune,track.retune);
    track.tuneX=point.x;track.tuneY=point.y;
    track.tunePreset='custom';
  }
  modal('Voice Playground · Tune Lab',tuneLabMarkup(track,loadUserTunes(),state.tuneMode,!!current()),
    [{label:'LISTO / VOLVER A MI MEZCLA',type:'tune-done',primary:true}]);
  $('.focus-panel')?.classList.add('tune-focus');
  updateTuneLabView($('#tuneLab'),track);
  sessionButton();
  if(state.tuneMode==='track')engine.watchPitch(track.id,onTunePitch);
  else{engine.watchPitch(null,null);populateLiveInputs();}
}
function finishTuneGesture(){
  if(!tuneGesture)return;
  const track=getTuneTrack();
  tuneGesture=null;
  if(track){tuneRefresh(track);if(state.tuneMode==='track'){renderInspector();queueAutosave();}}
}

function refreshCharacterPad(track){
  const node=$('#characterNode'),readout=$('#characterReadout');
  if(node){node.style.left=((Math.max(-12,Math.min(12,track.pitchShift||0))+12)/24*100)+'%';
    node.style.top=(100-Math.max(0,Math.min(100,track.drive||0)))+'%';}
  if(readout)readout.textContent='Altura '+Number(track.pitchShift||0).toFixed(1)+' semitonos · distorsión '+Math.round(track.drive||0)+'%';
}
function characterPoint(event){
  const pad=$('#characterPad');if(!pad)return null;
  const r=pad.getBoundingClientRect();if(!r.width||!r.height)return null;
  return {x:clamp((event.clientX-r.left)/r.width*2-1,-1,1),
          y:clamp((1-(event.clientY-r.top)/r.height)*2-1,-1,1)};
}
function changeCharacter(x,y,save=false){
  const track=getTuneTrack();if(!track)return;
  characterCoordinates(track,x,y);refreshCharacterPad(track);
  if(state.tuneMode==='live')engine.updateMic(track);
  else{engine.updateTrack(track);if(save){renderInspector();queueAutosave();}}
}
function setupCharacterGestures(){
  let active=null;
  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('#characterPad')||event.button!==0)return;
    const pad=$('#characterPad'),point=characterPoint(event);if(!point)return;
    event.preventDefault();active=event.pointerId;
    if(state.tuneMode==='track')checkpoint();
    pad.setPointerCapture(event.pointerId);changeCharacter(point.x,point.y);
  });
  document.addEventListener('pointermove',event=>{
    if(event.pointerId!==active)return;
    const point=characterPoint(event);if(point)changeCharacter(point.x,point.y);
  });
  document.addEventListener('pointerup',event=>{
    if(event.pointerId!==active)return;
    active=null;if(state.tuneMode==='track'){renderInspector();queueAutosave();}
  });
  document.addEventListener('pointercancel',event=>{if(event.pointerId===active)active=null;});
  document.addEventListener('keydown',event=>{
    if(event.target.id!=='characterPad'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();if(state.tuneMode==='track')checkpoint();
    const track=getTuneTrack();if(!track)return;
    const speed=(track.pitchShift||0)/12,drive=(track.drive||0)/50-1,step=event.shiftKey?.2:.05;
    changeCharacter(speed+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),
      drive+(event.key==='ArrowDown'?-step:event.key==='ArrowUp'?step:0),true);
  });
}

function installTuneGestures(){
  document.addEventListener('pointerdown',event=>{
    const pad=event.target.closest('#tunePad');
    if(!pad||event.target.closest('[data-tune-preset]')||event.button!==0)return;
    const track=getTuneTrack();if(!track)return;
    event.preventDefault();
    if(state.tuneMode==='track')checkpoint();
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
    const track=getTuneTrack();if(!track)return;
    event.preventDefault();if(state.tuneMode==='track')checkpoint();
    const p=normalizeTune(track.tuneX,track.tuneY),step=event.shiftKey?.15:.04;
    const x=event.key==='Home'?0:p.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0);
    const y=event.key==='Home'?0:p.y+(event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0);
    tuneChange(x,y,'custom',true);
  });
  document.addEventListener('pointerdown',event=>{
    if(event.target.matches('[data-tune-axis]')&&state.tuneMode==='track')checkpoint();
  });
  document.addEventListener('keydown',event=>{
    if(event.target.matches('[data-tune-axis]') &&
      ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key) &&
      !event.repeat&&state.tuneMode==='track')checkpoint();
  });
  document.addEventListener('change',event=>{
    if(event.target.matches('[data-tune-axis]')){if(state.tuneMode==='track'){renderInspector();queueAutosave();}}
  });
}
function tuneAction(action){
  const track=getTuneTrack();if(!track)return;
  if(action==='tune-source-live'){switchTuneSource('live');return;}
  if(action==='tune-source-track'){switchTuneSource('track');return;}
  if(action==='tune-live-start'){startLiveTuneMic();return;}
  if(action==='tune-live-record'){startLiveRecording();return;}
  if(action==='tune-live-save'){stopLiveRecording();return;}
  if(action==='tune-live-stop'){stopLiveTuneMic();return;}
  if(action==='tune-apply'){
    if(state.tuneMode!=='live'||!current())return toast('Selecciona una pista antes de aplicar');
    checkpoint();
    const target=current(),source=state.liveTuneTrack;
    Object.assign(target,{tuneX:source.tuneX,tuneY:source.tuneY,autotune:source.autotune,retune:source.retune,
      brightness:source.brightness,warmth:source.warmth,drive:source.drive,pitchShift:source.pitchShift,voiceCharacter:source.voiceCharacter,tunePreset:source.tunePreset,preset:'custom'});
    engine.updateTrack(target);renderInspector();queueAutosave();
    toast('Configuración de Voice Playground aplicada a '+target.name);
    return;
  }
  if(action==='tune-done'){finishTuneGesture();closeModal();renderInspector();return;}
  if(action==='tune-preview'){
    if(state.tuneMode==='live')return toast('Pulsa ACTIVAR MI VOZ para escuchar el micrófono');
    if(!state.tracks.length)return toast('Agrega audio para escuchar');
    if(engine.playing){toast('La mezcla ya está sonando. Mueve el nodo.');return;}
    if(state.position>=projectDuration(state.tracks)-.02)state.position=0;
    playPause();return;
  }
  if(action==='tune-ab'){
    if(state.tuneMode==='track')checkpoint();track.bypassEffects=!track.bypassEffects;
    tuneRefresh(track);if(state.tuneMode==='track'){renderInspector();queueAutosave();}return;
  }
  if(action==='tune-surprise'){
    if(state.tuneMode==='track')checkpoint();
    tuneChange(Math.random()*2-1,Math.random()*2-1,'custom',true);return;
  }
  if(action==='tune-reset'){
    if(state.tuneMode==='track')checkpoint();tuneChange(-.75,-1,'natural',true);return;
  }
  if(action==='tune-save'){
    try{
      const name=$('#labPresetName')?.value||'';
      const saved=saveUserTune(name,track.tuneX,track.tuneY);
      const list=$('#labUserPresets');
      if(list)list.innerHTML=customTuneMarkup(loadUserTunes());
      track.tunePreset='user:'+saved.name;
      if(state.tuneMode==='track'){queueAutosave();renderInspector();}
      const input=$('#labPresetName');if(input)input.value='';
      toast('Estilo '+saved.name+' guardado solo en este navegador.');
    }catch(error){toast(error.message);}
  }
}


function openPitchReview(){
  const track=current();if(!track)return toast('Selecciona una pista vocal primero');
  const clip=getEditableClip(track,state.selectedClip);
  if(!clip)return toast('No hay audio para revisar');
  state.pitchReview={trackId:track.id,clipId:clip.id};
  const seconds=clip.buffer.duration,to=seconds.toFixed(2),regions=clip.pitchRegions||[];
  modal('♩ Afinación por fragmentos · '+track.name,
    '<p>Escucha y corrige partes pequeñas de la voz sin alterar el archivo original. El detector es monofónico y aproximado.</p>'+
    pitchReviewMarkup(clip)+
    '<div class="pitch-review-controls"><label>DESDE · SEGUNDOS<input id="pitchFrom" type="number" min="0" max="'+to+'" step=".05" value="0"></label>'+
    '<label>HASTA · SEGUNDOS<input id="pitchTo" type="number" min="0" max="'+to+'" step=".05" value="'+Math.min(2,seconds).toFixed(2)+'"></label>'+
    '<label>CAMBIAR ALTURA<input id="pitchSemitones" type="range" min="-12" max="12" step=".5" value="0"><output id="pitchShiftValue">0 semitonos</output></label></div>'+
    '<div class="pitch-note-grid"><strong>DO · RE · MI · FA · SOL · LA · SI</strong><p>Los cambios usan desplazamiento granular de tono. El resultado puede ser robótico o artificial.</p></div>'+
    '<div class="pitch-review-summary" id="pitchReviewSummary">'+regions.length+' regiones editadas · original intacto</div>'+
    '<div class="pitch-auto-buttons"><button class="lab-action" data-action="pitch-scan">♬ DETECTAR NOTAS</button>'+
      AUTO_TUNE_MODES.map(m=>'<button class="lab-action" data-action="pitch-auto-'+m.id+'">✧ AUTO AFINADO · '+m.label+'</button>').join('')+'</div>',
    [{label:'QUITAR CORRECCIONES',type:'pitch-clear'},{label:'APLICAR CAMBIO AL SEGMENTO',type:'pitch-mask',primary:true}]);
  requestAnimationFrame(drawActivePitchReview);
}
function drawActivePitchReview(){
  const t=state.tracks.find(t=>t.id===state.pitchReview?.trackId),clip=t&&getEditableClip(t,state.pitchReview.clipId);
  if(!clip||!$('#pitchWave'))return;
  const from=Number($('#pitchFrom')?.value||0),to=Number($('#pitchTo')?.value||0),duration=clip.buffer.duration;
  drawPitchWave($('#pitchWave'),clip.buffer,clip.pitchRegions);
  const selected=selectionPercent(from,to,duration),selection=$('#pitchWaveSelection');
  if(selection){selection.style.left=selected.left+'%';selection.style.width=selected.width+'%';}
  const masks=$('#pitchWaveMasks');if(masks){
    masks.innerHTML=(clip.pitchRegions||[]).map(r=>{
      const p=selectionPercent(r.from,r.to,duration);
      return '<div class="pitch-mask" style="left:'+p.left+'%;width:'+p.width+'%" title="Corrección '+Number(r.semitones||0).toFixed(1)+' semitonos"></div>';
    }).join('');
  }
}
function pitchReviewAction(action){
  const track=state.tracks.find(t=>t.id===state.pitchReview?.trackId);
  const clip=track&&getEditableClip(track,state.pitchReview.clipId);
  if(!clip)return toast('Selecciona un fragmento vocal');
  if(state.sessionRecording||state.recording)return toast('Finaliza la grabación antes de editar la voz');
  try{
    if(action==='pitch-scan'||action.startsWith('pitch-auto-')){
      const regions=noteRegions(clip.buffer);
      if(!regions.length)throw Error('No pude reconocer una nota clara. Prueba una voz aislada sin acompañamiento');
      if(action==='pitch-scan'){
        const found=regions.slice(0,10).map(r=>r.from.toFixed(1)+'s '+solfege(r.detected)).join(' · ');
        $('#pitchReviewSummary').textContent=regions.length+' lecturas aproximadas: '+found;
        toast('Notas detectadas, todavía sin aplicar cambios');
        return;
      }
      const mode=action.slice('pitch-auto-'.length),preset=AUTO_TUNE_MODES.find(m=>m.id===mode);
      if(!preset)return;
      checkpoint();
      autoTuneSegments(clip,regions,mode,track.key,track.scale);
      track.autotune=preset.strength;track.retune=preset.retune;
      track.bypassEffects=false;track.fxBypass={...track.fxBypass,tune:false};
      state.selected=track.id;state.selectedClip=clip.id;engine.updateTrack(track);
      $('#pitchReviewSummary').textContent=clip.pitchRegions.length+' regiones con corrección automática '+preset.label;
      queueAutosave();restartPlayback();drawActivePitchReview();
      toast('Auto afinado '+preset.label+' listo, editable por fragmentos');
      return;
    }
    if(action==='pitch-clear'){
      checkpoint();clip.pitchRegions=[];clip.autoTuneMode=null;
      $('#pitchReviewSummary').textContent='0 regiones · audio original intacto';
      queueAutosave();restartPlayback();drawActivePitchReview();toast('Correcciones del clip retiradas');return;
    }
    if(action==='pitch-mask'){
      const from=Number($('#pitchFrom').value),to=Number($('#pitchTo').value),semitones=Number($('#pitchSemitones').value);
      const draft={...clip,pitchRegions:clip.pitchRegions?.map(r=>({...r}))};
      setNoteMask(draft,from,to,semitones);
      checkpoint();setNoteMask(clip,from,to,semitones);
      $('#pitchReviewSummary').textContent=clip.pitchRegions.length+' fragmentos con notas ajustadas';
      queueAutosave();restartPlayback();drawActivePitchReview();toast('Fragmento corregido; el audio fuente sigue intacto');
    }
  }catch(error){toast(error.message);}
}

function openEffects(){
  const t=current();if(!t)return;
  modal('Efectos de '+t.name,
    '<p>Experimenta sin perder el sonido original. Cada efecto se aplica solo a esta capa.</p>'+
    '<div class="control-grid">'+dial('Velocidad','retune',t.retune,'var(--purple)')+dial('Brillo','brightness',t.brightness,'var(--blue)')+dial('Calidez','warmth',t.warmth,'var(--orange)')+'</div>'+
    '<div class="inspector-divider"></div><div class="control-grid">'+dial('Eco','echo',t.echo,'var(--pink)')+dial('Espacio','space',t.space,'var(--purple)')+dial('Distorsión','drive',t.drive,'var(--orange)')+'</div>'+
    '<div class="inspector-divider"></div><div class="control-heading"><strong>PROCESADORES ACTIVOS</strong></div>'+
    '<div class="fx-rack-switches">'+FX_CHAIN.map(effect=>'<button type="button" class="fx-toggle '+(isFxBypassed(t,effect.id)?'fx-disabled':'')+'" data-fx-toggle="'+effect.id+'" aria-pressed="'+String(!isFxBypassed(t,effect.id))+'" title="'+html(effect.hint)+'"><span>'+html(effect.label)+'</span><strong>'+(isFxBypassed(t,effect.id)?'OFF':'ON')+'</strong></button>').join('')+'</div>'+
    '<div class="inspector-divider"></div><div class="control-grid">'+dial('Dirección','pan',t.pan,'var(--blue)',-100,100)+'</div>',
    [{label:'LISTO',type:'close',primary:true}]);
}
function openTiming(){
  const track=current();if(!track)return;
  const t=Array.isArray(track.clips)?getEditableClip(track,state.selectedClip):track;
  if(!t)return;
  checkpoint();
  const avail=t.buffer.duration,controls=[
    ['offset','Mover clip (segundos)','position',Math.max(180,Math.ceil(projectDuration(state.tracks))),.05],
    ['speed','Velocidad de reproducción (×)','speed',2,.05],
    ['trimStart','Recortar inicio (segundos)','trims',Math.max(0,avail-(t.trimEnd||0)-.01),.05],
    ['trimEnd','Recortar final (segundos)','trims',Math.max(0,avail-(t.trimStart||0)-.01),.05],
    ['fadeIn','Entrada suave (segundos)','fades',Math.min(30,avail),.1],
    ['fadeOut','Salida suave (segundos)','fades',Math.min(30,avail),.1]
  ];
  modal('Ajustar '+(t.name||track.name),
    '<p>Mueve tu clip y crea transiciones. Puedes cambiar estos valores cuantas veces quieras.</p>'+
    '<div class="focus-stack">'+controls.map(([id,label,info,max,step])=>'<div class="compact-field"><label for="timing-'+id+'">'+label+'</label><input id="timing-'+id+'" data-timing="'+id+'" type="number" min="'+(id==='speed'?.5:0)+'" max="'+max+'" step="'+step+'" value="'+(id==='speed'?clipSpeed(t):t[id]||0)+'" style="width:75px;padding:7px"></div>').join('')+'</div>'+
    '<p class="hint" style="margin-top:15px">Duración audible: '+clock(effectiveDuration(t))+' · Original: '+clock(t.buffer.duration)+'</p>',
    [{label:'LISTO',type:'close',primary:true}]);
}
/* Independent per-clip segment repeats and zero-copy pattern duplication. */
function openClipLoop(trackId=state.selected){
  const track=state.tracks.find(t=>t.id===trackId);
  if(!track)return toast('Selecciona primero una pista');
  const clip=getEditableClip(track,state.selectedClip);
  if(!clip)return toast('No hay un clip para repetir');
  state.selected=track.id;state.selectedClip=clip.id;
  state.loopEdit={trackId:track.id,clipId:clip.id};
  const bounds=clipSourceBounds(clip),loop=validLoop(clip);
  const duration=(loop?loop.to-loop.from:bounds.end-bounds.start).toFixed(2);
  modal('⟳ Loop · '+(clip.name||track.name),
    '<p>Repite solo un fragmento de esta pista. Las otras pistas seguirán su propio tiempo.</p>'+
    '<div class="loop-editor-preview"><span>FUENTE ORIGINAL · '+(clip.buffer.duration).toFixed(2)+'s</span>'+
    '<strong>'+html(clip.name||track.name)+'</strong><small>Fragmento actual: '+duration+'s</small></div>'+
    '<div class="loop-visual-range" aria-label="Selecciona el segmento de audio">'+
      '<span>COMIENZO DEL SEGMENTO</span><input type="range" id="loopFromSlider" min="'+bounds.start+'" max="'+bounds.end+'" step="0.01" value="'+(loop?.from??bounds.start)+'" aria-label="Deslizar inicio del loop">'+
      '<span>FIN DEL SEGMENTO</span><input type="range" id="loopToSlider" min="'+bounds.start+'" max="'+bounds.end+'" step="0.01" value="'+(loop?.to??bounds.end)+'" aria-label="Deslizar final del loop">'+
      '<div class="loop-visual-track"><div class="loop-visual-selected" id="loopRangeVisual" style="left:'+(((loop?.from??bounds.start)-bounds.start)/Math.max(.01,bounds.end-bounds.start)*100)+'%;width:'+(((loop?.to??bounds.end)-(loop?.from??bounds.start))/Math.max(.01,bounds.end-bounds.start)*100)+'%"></div></div></div>'+
    '<div class="loop-editor-grid">'+
      '<label for="clipLoopFrom">DESDE (segundos)<input id="clipLoopFrom" type="number" min="'+bounds.start+'" max="'+bounds.end+'" step="0.01" value="'+(loop?.from??bounds.start).toFixed(2)+'"></label>'+
      '<label for="clipLoopTo">HASTA (segundos)<input id="clipLoopTo" type="number" min="'+bounds.start+'" max="'+bounds.end+'" step="0.01" value="'+(loop?.to??bounds.end).toFixed(2)+'"></label>'+
      '<label for="clipLoopRepeats">REPETICIONES<input id="clipLoopRepeats" type="number" min="1" max="64" step="1" value="'+(loop?.repeats||4)+'"></label>'+
      '<label for="clipLoopCopies">DUPLICAR PATRÓN<input id="clipLoopCopies" type="number" min="1" max="16" step="1" value="1"></label>'+
    '</div>'+
    '<p class="hint">Ejemplo: un fragmento de 2 segundos × 8 = 16 segundos de loop. Elige cortes cercanos a cruces por cero para evitar clics.</p>',
    [{label:'QUITAR LOOP',type:'loop-remove'},{label:'DUPLICAR →',type:'loop-duplicate'},{label:'APLICAR LOOP',type:'loop-apply',primary:true}]);
}
function editLoop(action){
  if(state.sessionRecording)return toast('Finaliza la grabación de sesión antes de modificar loops');
  const track=state.tracks.find(t=>t.id===state.loopEdit?.trackId);
  if(!track)return toast('No se encontró la pista');
  const clip=getEditableClip(track,state.loopEdit.clipId);
  if(!clip)return toast('No se encontró el clip');
  try{
    const removing=action==='loop-remove',duplicating=action==='loop-duplicate';
    if(duplicating&&!validLoop(clip))return toast('Primero pulsa APLICAR LOOP');
    const from=Number($('#clipLoopFrom')?.value),to=Number($('#clipLoopTo')?.value),
      repeats=Number($('#clipLoopRepeats')?.value),copies=Number($('#clipLoopCopies')?.value);
    if(!removing&&!duplicating){
      const probe={...clip};setClipLoop(probe,from,to,repeats);
    }
    if(duplicating&&(copies<1||copies>16||!Number.isInteger(copies)||clipsOf(track).length+copies>128))
      throw Error('Elige 1–16 copias, máximo 128 clips por pista');
    checkpoint();
    ensureClips(track);
    const source=getEditableClip(track,state.loopEdit.clipId);
    if(removing)removeClipLoop(source);
    else if(duplicating){
      const added=duplicateLoop(track,source.id,copies,i=>
        globalThis.crypto?.randomUUID?.()||'loop-copy-'+Date.now()+'-'+i);
      state.selectedClip=added.at(-1).id;
    }else setClipLoop(source,from,to,repeats);
    modalStack.length=0;$('#modalRoot').innerHTML='';
    render();restartPlayback();
    toast(removing?'Loop desactivado':duplicating?'Loops duplicados a la derecha':'Loop aplicado; las demás pistas conservan su ritmo');
  }catch(error){toast(error.message);}
}


function openTrackMove(id){
  const track=state.tracks.find(t=>t.id===id);if(!track)return;
  state.moveTrackId=id;
  const earliest=Math.min(...clipsOf(track).map(c=>c.offset||0));
  modal('↠ Mover toda la pista · '+track.name,
    '<p>Mueve todos los segmentos de esta pista juntos. Las demás pistas mantienen su posición.</p>'+
    '<label class="field">Comenzar en el segundo<input id="trackMoveOffset" type="number" min="0" max="3600" step=".05" value="'+earliest.toFixed(2)+'"></label>'+
    '<p class="hint">Cada clip conserva su corte, velocidad y distancia respecto a los demás.</p>',
    [{label:'MOVER PISTA',type:'apply-track-move',primary:true}]);
}
function applyTrackMove(){
  if(state.recording||state.sessionRecording)return toast('Detén la grabación antes de mover pistas');
  const track=state.tracks.find(t=>t.id===state.moveTrackId);
  if(!track)return;
  const target=Number($('#trackMoveOffset')?.value);
  const clips=clipsOf(track),earliest=Math.min(...clips.map(c=>c.offset||0)),delta=target-earliest;
  if(!Number.isFinite(target)||target<0||target>3600||clips.some(c=>c.offset+delta<0||c.offset+delta>3600))
    return toast('Elige un inicio entre 0 y 3600 segundos');
  checkpoint();
  if(Array.isArray(track.clips))for(const clip of track.clips)clip.offset+=delta;
  else track.offset=(track.offset||0)+delta;
  closeModal();render();restartPlayback();
  toast('Pista desplazada a '+target.toFixed(2)+' s');
}

function openTrackActions(id){
  state.selected=id;render();
  const t=current();
  modal('Opciones de la capa',
    '<div class="field"><label>Nombre de la capa</label><input type="text" id="renameInput" maxlength="80" value="'+html(t.name)+'" style="background:#1b222b;border:1px solid #495362;border-radius:7px;padding:11px;color:white"></div>'+
    '<p style="margin-top:14px">Un canal puede contener varias tomas. DIVIDIR corta el clip seleccionado, sin crear otro canal.</p>',
    [{label:'ELIMINAR',type:'delete-track'},{label:'⟳ LOOP DEL CLIP',type:'loop-editor'},{label:'✂ DIVIDIR CLIP',type:'split-track'},{label:'＋ AÑADIR CLIP',type:'add-clip'},{label:'DUPLICAR CANAL',type:'duplicate-track'},{label:'GUARDAR NOMBRE',type:'rename-track',primary:true}]);
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
  const samples=new Float32Array(4096);
  if(engine.getMicMeterData(samples)){
    if(performance.now()-state.recordNoteLast>115){
      state.recordNoteLast=performance.now();
      const detected=estimateNote(samples,engine.ctx?.sampleRate||48000),label=$('#singingNote'),fine=$('#singingCents');
      // Discard isolated octave jumps and release the display in silence.
      state.noteHistory=detected?[...state.noteHistory.slice(-3),detected.nearest]:[];
      const same=detected&&state.noteHistory.filter(n=>Math.abs(n-detected.nearest)<=1).length>=2;
      const note=same?detected:null;
      if(label)label.textContent=note?note.name+note.octave:'—';
      if(fine)fine.textContent=note?(Math.abs(note.cents)<=15?'✓ Dentro de ±15 cents':(note.cents<0?'↑ Sube un poco':'↓ Baja un poco')+' · '+Math.abs(note.cents)+' cents'):'Escuchando · canta una nota sostenida';
      for(const step of $$('#noteSteps [data-note]'))step.classList.toggle('is-active',!!note&&step.dataset.note===note.name);
    }
    const {rms,peak}=meterLevel(samples);
    if(rms>.008)state.micSignal=true;
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
  state.inputGain=clamp($('#recordGain')?.value??state.inputGain,0,200);
  state.monitorGain=clamp($('#monitorGain')?.value??state.monitorGain,0,100);
  state.preferredInput=selected;
  const status=$('#micStatus');if(status)status.textContent='Solicitando permiso al micrófono...';
  let stream;
  try{
    // Release the previous device before opening a different one.
    cancelAnimationFrame(state.meterFrame);engine.stopMic();state.preview=null;state.micSignal=false;state.noteHistory=[];
    stream=await navigator.mediaDevices.getUserMedia({audio:{
      ...(selected?{deviceId:{exact:selected}}:{}),
      echoCancellation:!monitor,noiseSuppression:!monitor,autoGainControl:false
    },video:false});
    await engine.ready();
    if(!$('#micSelect')){stream.getTracks().forEach(t=>t.stop());return;}
    const monitorTrack={...defaults(),autotune:tune,clean,space:8,volume:state.monitorGain};
    await engine.prepareMic(stream,monitorTrack,monitor);
    engine.setMicGain(state.inputGain);
    state.preview={stream,monitorTrack,monitor};
    stream.getAudioTracks()[0]?.addEventListener('ended',()=>{
      if(state.recording)stopRecording();
      else {state.preview=null;$('#micStatus').textContent='Micrófono desconectado: vuelve a probar la entrada.';}
    },{once:true});
    const actualId=stream.getAudioTracks()[0]?.getSettings?.().deviceId || selected;
    await updateMicrophoneChoices(actualId);
    if($('#micStatus'))$('#micStatus').textContent='● PERMISO CONCEDIDO · HABLA Y COMPRUEBA LA ONDA';
    const start=$('[data-action="start-record"]');if(start)start.disabled=false;
    const test=$('[data-action="test-mic"]');if(test)test.textContent='↻ CAMBIAR / PROBAR';
    state.recordMeterHistory=[];drawMicPreview();
  }catch(error){
    stream?.getTracks().forEach(t=>t.stop());
    const msg=error.name==='NotAllowedError'?'Permiso denegado. Activa el micrófono en el navegador y en tu sistema.':
      error.name==='OverconstrainedError'?'El dispositivo elegido ya no está disponible. Selecciona el predeterminado.':
      error.name==='NotFoundError'?'No se encontró ningún micrófono conectado.':error.message;
    if($('#micStatus'))$('#micStatus').textContent=msg;
    const start=$('[data-action="start-record"]');if(start)start.disabled=true;
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
    '<div class="mic-permission-explainer"><strong>① Autorizar micrófono</strong><span>Presiona PERMITIR MICRÓFONO y acepta el permiso del navegador. Habla para comprobar la onda antes de grabar. No se enviará audio a internet.</span></div>'+ 
    '<div id="micStatus" class="mic-status" role="status">Esperando permiso · micrófono apagado</div>'+
    '<div class="record-visual record-visual-v2"><div class="rec-title"><span id="recordTimer">LISTO PARA GRABAR</span><span id="recordPeak">SIN SEÑAL</span></div><canvas id="recordWave" class="record-wave" aria-label="Onda de entrada del micrófono"></canvas><div class="record-meter-shell"><span id="recordMeter"></span></div></div>'+    '<section class="singing-coach" aria-label="Entrenador de notas en vivo"><div><strong>CALENTAMIENTO VOCAL · NOTA ACTUAL</strong><span id="singingNote" aria-live="off">—</span><small id="singingCents">Canta una nota para comenzar · aproximado</small></div><div class="note-steps" id="noteSteps">'+['DO','RE','MI','FA','SOL','LA','SI','DO'].map(n=>'<span data-note="'+n+'">'+n+'</span>').join('')+'</div></section>'+
    '<details class="record-advanced"><summary>⚙ Opciones avanzadas · efectos, sincronía y monitor</summary>'+ 
    '<div class="control-row"><label for="recordGain">GANANCIA DE ENTRADA</label><input id="recordGain" type="range" min="0" max="200" step="5" value="'+state.inputGain+'"><output id="recordGainValue">'+state.inputGain+'%</output></div>'+
    '<div class="control-row"><label for="monitorGain">VOLUMEN DE MONITOREO</label><input id="monitorGain" type="range" min="0" max="100" step="5" value="'+state.monitorGain+'"><output id="monitorGainValue">'+state.monitorGain+'%</output></div>'+
    '<div class="control-row"><label for="monitorToggle">Escucharme con efectos (auriculares)</label><input type="checkbox" class="toggle-switch" id="monitorToggle">'+buttonInfo('monitor')+'</div>'+
    '<div class="control-row"><label for="recordTune">Afinación al escucharme</label><input type="range" min="0" max="100" value="80" id="recordTune">'+buttonInfo('autotune')+'</div>'+
    '<div class="control-row"><label for="recordClean">Limpieza al escucharme</label><input type="range" min="0" max="100" value="35" id="recordClean">'+buttonInfo('clean')+'</div>'+
    '<div class="control-row"><label for="recordBacking">Reproducir base al grabar</label><input type="checkbox" class="toggle-switch" id="recordBacking" '+(state.tracks.length?'checked':'')+'></div>'+
    '<div class="control-row"><label for="recordCountIn">Cuenta de 4 pulsos antes de grabar</label><input type="checkbox" id="recordCountIn" class="toggle-switch" checked>'+buttonInfo('countIn')+'</div>'+
    '<div class="control-row"><label for="recordShift">Ajuste de sincronía de tu voz</label><input id="recordShift" type="range" min="-300" max="300" step="25" value="'+state.recordShiftMs+'"><output id="recordShiftValue">'+(state.recordShiftMs===0?'Sin ajuste':state.recordShiftMs+' ms')+'</output>'+buttonInfo('alignment')+'</div>'+
    '</details>'+ 
    '<div class="note">Grabación PCM sin compresión intermedia. Si tu voz queda desfasada al escucharla, puedes adelantarla o retrasarla con el ajuste de sincronía. Duración máxima: 5 minutos.</div>',
    [{label:'🎙 PERMITIR MICRÓFONO',type:'test-mic'},{label:'● GRABAR',type:'start-record',primary:true}]);
  const start=$('[data-action="start-record"]');if(start)start.disabled=true;
  await updateMicrophoneChoices();
}
async function startRecording(){
  if(state.recording||state.countingIn||!state.preview)return toast('Primero presiona PERMITIR MICRÓFONO');
  if(state.preview.stream?.getAudioTracks?.()[0]?.readyState!=='live')return toast('Micrófono desconectado. Vuelve a activarlo.');
  const tune=Number($('#recordTune')?.value??80),clean=Number($('#recordClean')?.value??35);
  state.recordShiftMs=Math.round(Number($('#recordShift')?.value||0));
  state.preview.monitorTrack.autotune=tune;state.preview.monitorTrack.clean=clean;
  engine.updateMic(state.preview.monitorTrack);
  const backing=!!$('#recordBacking')?.checked && state.tracks.length>0;
  if($('#recordCountIn')?.checked && !engine.playing){
    const count={cancelled:false};state.countingIn=count;
    const actions=$('.focus-footer');
    if(actions)actions.innerHTML='<button class="button button-muted" data-action="cancel-countin">× CANCELAR CUENTA</button>';
    try{
      const completed=await engine.countIn(state.bpm,4,beat=>{
        const label=$('#recordTimer');if(label)label.textContent='♩ ENTRAS EN '+beat;
        const status=$('#micStatus');if(status)status.textContent='ESCUCHA LOS PULSOS Y PREPÁRATE';
      },()=>count.cancelled || !state.preview || !$('#recordTimer'));
      if(!completed||count.cancelled||state.countingIn!==count)return;
    }catch(error){count.cancelled=true;toast('No se pudo preparar la entrada: '+error.message);return;}
    finally{
      if(state.countingIn===count)state.countingIn=null;
      if(count.cancelled && $('#recordTimer')){
        $('#recordTimer').textContent='LISTO PARA GRABAR';
        const footer=$('.focus-footer');
        if(footer)footer.innerHTML='<button class="button button-muted" data-action="test-mic">↻ PROBAR ENTRADA</button><button class="button button-primary" data-action="start-record">● GRABAR</button>';
      }else if($('#recordTimer')){
        $('#recordTimer').textContent='COMENZANDO TOMA...';
      }
    }
  }
  if(!state.preview||!$('#recordTimer'))return;
  if(backing && !engine.playing){
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
    if(!buffer||buffer.duration<.08)throw Error('La toma es demasiado corta o quedó vacía');
    const quality=signalQuality(buffer);
    if(!quality.valid)throw Error('La grabación está en silencio. No se agregó una pista vacía. Revisa la entrada seleccionada, el permiso del navegador y el medidor; luego graba otra vez.');
    state.recording=null; // capture is finished; allow undo of the newly created take
    const adjustedStart=recording.offset+(recording.recordShiftMs||0)/1000;
    const track=addTrack(buffer,'Mi voz '+(state.tracks.filter(t=>t.type==='voice').length+1),'voice',Math.max(0,adjustedStart));
    if(adjustedStart<0)track.trimStart=Math.min(buffer.duration-.02,-adjustedStart);
    Object.assign(track,{autotune:recording.tune,clean:recording.clean,retune:70,space:12,preset:'custom'});
    toast('¡Toma grabada! La capa de voz ya aparece en tu mezcla.');
  }catch(error){
    toast('Grabación no guardada: '+error.message);
    if($('#micStatus'))$('#micStatus').textContent='⚠ '+error.message;
    const footer=$('.focus-footer');
    if(footer)footer.innerHTML='<button class="button button-muted" data-action="test-mic">↻ CAMBIAR MICRÓFONO</button>'+
      '<button class="button button-primary" data-action="start-record">● REINTENTAR GRABACIÓN</button>';
    if($('#recordTimer'))$('#recordTimer').textContent='TOMA NO GUARDADA';
  }
  finally{
    state.recording=null;
    if(!$('#recordTimer')||$('#recordTimer').textContent!=='TOMA NO GUARDADA'){
      cancelAnimationFrame(state.meterFrame);
      engine.stopMic();state.preview=null;
      modalStack.length=0;$('#modalRoot').innerHTML='';
      const ghost=$('#recordingGhost');if(ghost)ghost.innerHTML='';
      render();
    }else{
      const ghost=$('#recordingGhost');if(ghost)ghost.innerHTML='';
    }
  }
}

/** Per-channel bounce: editable project remains untouched; rendered takes form of a separate new track. */
function openTrackExport(id){
  const track=state.tracks.find(t=>t.id===id);if(!track)return;
  state.exportTrackId=id;
  modal('Exportar o guardar · '+track.name,
    '<p>Conservamos todos tus clips originales. Puedes descargar esta capa con efectos o sin ellos, o crear una nueva pista renderizada dentro del proyecto.</p>'+
    '<div class="field"><label for="trackExportMode">Sonido</label><select class="modal-select" id="trackExportMode"><option value="wet">Con los efectos actuales</option><option value="dry">Sin efectos (mantiene cortes, tiempo, volumen y panorama)</option></select></div>'+
    '<div class="field"><label for="trackExportDepth">Formato WAV</label><select class="modal-select" id="trackExportDepth"><option value="24">24-bit · producción</option><option value="16">16-bit · compatible</option><option value="32">32-bit float</option></select></div>'+
    '<p class="hint">Se incluye el espacio previo a la pista para conservar la sincronía con la canción. Crear una nueva pista no borra ni silencia la original.</p>',
    [{label:'↓ DESCARGAR WAV',type:'do-track-export',primary:true},{label:'▣ GUARDAR COMO PISTA',type:'do-track-bounce'}]);
}
async function performTrackExport(asTrack=false){
  if(state.busy||state.recording||state.sessionRecording)return toast('Finaliza la grabación o exportación en curso.');
  const track=state.tracks.find(t=>t.id===state.exportTrackId);
  if(!track)return toast('La pista ya no está disponible.');
  const dry=$('#trackExportMode')?.value==='dry';
  const depth=Number($('#trackExportDepth')?.value||24);
  state.busy=true;
  try{
    const source={...track,muted:false,solo:false};
    const blob=await engine.exportMix([source],{depth,rate:48000,dry});
    if(asTrack){
      const buffer=await engine.decode(new File([blob],safeFilename(track.name)+'.wav',{type:'audio/wav'}));
      const added=addTrack(buffer,track.name+(dry?' · original':' · con FX'),track.type,0);
      added.bypassEffects=true;added.bus=track.bus;added.volume=100;
      engine.updateTrack(added);if(engine.playing)restartPlayback();
      modalStack.length=0;$('#modalRoot').innerHTML='';
      render();toast('Nueva pista renderizada sin modificar la fuente.');
    }else{
      downloadBlob(blob,safeFilename(track.name)+(dry?'-original':'-con-fx')+'-'+depth+'bit.wav');
      modalStack.length=0;$('#modalRoot').innerHTML='';
      toast('WAV individual descargado.');
    }
  }catch(error){toast('Pista: '+error.message);}
  finally{state.busy=false;}
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
  const track=current();if(!track)return;
  const t=Array.isArray(track.clips)?getEditableClip(track,state.selectedClip):track;
  if(!t)return;
  const n=key==='speed'?clamp(value,.5,2):clamp(value,0,key==='offset'?3600:t.buffer.duration);
  if(key==='speed')setClipSpeed(t,n);
  else if(key==='offset')moveClip(t,n);
  else if(key==='trimStart')trimClip(t,'start',n);
  else if(key==='trimEnd')trimClip(t,'end',n);
  else t[key]=n;
  const maxTrim=t.buffer.duration-.02;
  if(t.trimStart+t.trimEnd>maxTrim){if(key==='trimStart')t.trimEnd=Math.max(0,maxTrim-t.trimStart);else t.trimStart=Math.max(0,maxTrim-t.trimEnd);}
  t.fadeIn=clamp(t.fadeIn,0,effectiveDuration(t));t.fadeOut=clamp(t.fadeOut,0,effectiveDuration(t));
  queueAutosave();
  const note=$('.focus-content .hint');
  if(note)note.textContent='Duración audible: '+clock(effectiveDuration(t))+' · Original: '+clock(t.buffer.duration);
}
function handleTrackAction(action,id){
  const t=state.tracks.find(x=>x.id===id);if(!t)return;
  if(action==='delete'){deleteTrack(id);return;}
  if(action==='export-track'){openTrackExport(id);return;}
  if(action==='restore-flow'){checkpoint();t.flowHidden=false;render();return;}
  if(action==='move-track'){openTrackMove(id);return;}
  if(action==='edit'){openTrackActions(id);return;}
  if(action==='clip-loop'){openClipLoop(id);return;}
  if(action==='add-clip'){state.clipImportTrack=id;$('#clipFileInput').click();return;}
  if(action==='mute'||action==='solo'){
    checkpoint();t[action==='mute'?'muted':'solo']=!t[action==='mute'?'muted':'solo'];
    render();restartPlayback();
  }
}
function handleModalAction(action){
  if(action==='save-sample-original'||action==='save-sample-processed'){
    const id=state.pendingSampleTrackId,name=$('#sampleExportName')?.value||'';
    if(!id)return toast('Selecciona primero una pista');
    saveTrackAsSample(id,action==='save-sample-processed',name);return;
  }
  if(action==='close-modal'||action==='close'){closeModal();return;}
  if(action==='session-record'){toggleSessionRecording();return;}
  if(action==='tune-open'){openTuneLab('track');return;}
  if(action.startsWith('tune-')){tuneAction(action);return;}
  if(action==='apply-track-move'){applyTrackMove();return;}
  if(action==='effects'){openEffects();return;}
  if(action==='pitch-review'){openPitchReview();return;}
  if(action==='pitch-mask'||action==='pitch-clear'||action==='pitch-scan'||action.startsWith('pitch-auto-')){pitchReviewAction(action);return;}
  if(action==='toggle-bypass'){
    const t=current();if(!t)return;
    checkpoint();t.bypassEffects=!t.bypassEffects;
    engine.updateTrack(t);renderInspector();queueAutosave();
    toast(t.bypassEffects?'Escuchando audio original':'Escuchando efectos de esta capa');return;
  }
  if(action==='timing'){openTiming();return;}
  if(['loop-apply','loop-remove','loop-duplicate'].includes(action)){editLoop(action);return;}
  if(action==='loop-editor'){openClipLoop();return;}
  if(action==='add-clip'){const t=current();if(t){state.clipImportTrack=t.id;closeModal();$('#clipFileInput').click();}return;}
  if(action==='save-named'){saveNewNamed();return;}
  if(action==='confirm-save-named'){confirmSaveNamed();return;}
  if(action==='load-local'){modalStack.length=0;$('#modalRoot').innerHTML='';load();return;}
  if(action==='browse-project'){$('#projectInput').click();return;}
  if(action==='cancel-countin'){
    if(state.countingIn)state.countingIn.cancelled=true;
    state.countingIn=null;
    const actions=$('.focus-footer');
    if(actions)actions.innerHTML='<button class="button button-muted" data-action="test-mic">↻ PROBAR ENTRADA</button><button class="button button-primary" data-action="start-record">● GRABAR</button>';
    if($('#recordTimer'))$('#recordTimer').textContent='LISTO PARA GRABAR';
    if($('#micStatus'))$('#micStatus').textContent='CUENTA CANCELADA · PUEDES VOLVER A GRABAR';
    return;
  }
  if(action==='test-mic'){prepareSelectedMic();return;}
  if(action==='start-record'){startRecording();return;}
  if(action==='stop-record'){stopRecording();return;}
  if(action==='do-export'){performExport();return;}
  if(action==='do-track-export'){performTrackExport(false);return;}
  if(action==='do-track-bounce'){performTrackExport(true);return;}
  const t=current();if(!t)return;
  if(action==='rename-track'){const name=$('#renameInput')?.value.trim();if(!name)return toast('Escribe un nombre');checkpoint();t.name=name.slice(0,80);modalStack.length=0;$('#modalRoot').innerHTML='';render();}
  if(action==='split-track'){
    try{
      const id=globalThis.crypto?.randomUUID?.()||'split-'+Date.now();
      checkpoint();
      const clipId=getEditableClip(t,state.selectedClip)?.id;
      const [left,right]=splitTrackClip(t,clipId,state.position,id);
      state.selected=t.id;state.selectedClip=right.id;
      modalStack.length=0;$('#modalRoot').innerHTML='';
      render();restartPlayback();
      toast('Clip dividido dentro del mismo canal, sin alterar el original.');
    }catch(error){toast(error.message);}
    return;
  }
  if(action==='duplicate-track'){
    const clone={...cloneTrackMetadata(t),id:globalThis.crypto?.randomUUID?.()||'copy-'+Date.now(),name:t.name+' · copia',color:COLORS[state.tracks.length%COLORS.length]};
    checkpoint();state.tracks.push(clone);state.selected=clone.id;modalStack.length=0;$('#modalRoot').innerHTML='';render();restartPlayback();toast('Capa duplicada. Puedes darle otros efectos.');
  }
  if(action==='delete-track'){
    deleteTrack(t.id);
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
    const button=event.target.closest('[data-clip-control]');
    if(!button||event.button!==0||state.recording||state.sessionRecording)return;
    const track=state.tracks.find(t=>t.id===button.dataset.clipTrack);
    if(!track)return;
    const clip=Array.isArray(track.clips)?getEditableClip(track,button.dataset.clipId):track;
    if(!clip)return;
    if(clip.loop&&button.dataset.clipControl!=='move')return toast('Desactiva el loop antes de recortar su origen');
    event.preventDefault();event.stopPropagation();
    checkpoint();state.selected=track.id;state.selectedClip=clip.id;
    state.dragClip={trackId:track.id,clipId:clip.id,mode:button.dataset.clipControl,
      startX:event.clientX,origin:{offset:clip.offset||0,trimStart:clip.trimStart||0,trimEnd:clip.trimEnd||0},
      span:timelineSpan(state.tracks),width:button.closest('.track-wave').getBoundingClientRect().width,
      button,region:button.closest('.clip-region')};
    button.setPointerCapture(event.pointerId);
    button.closest('.clip-region').classList.add('is-grabbing');
  });
  tracks.addEventListener('pointermove',event=>{
    const drag=state.dragClip;if(!drag||!drag.button.hasPointerCapture(event.pointerId))return;
    const track=state.tracks.find(t=>t.id===drag.trackId);
    if(!track)return;
    const clip=Array.isArray(track.clips)?getEditableClip(track,drag.clipId):track;
    if(!clip)return;
    let delta=(event.clientX-drag.startX)/Math.max(1,drag.width)*drag.span;
    if(state.snap)delta=Math.round(delta/(60/state.bpm))*(60/state.bpm);
    const speed=clipSpeed(clip),base=drag.origin,max=clip.buffer.duration;
    if(drag.mode==='move')moveClip(clip,clamp(base.offset+delta,0,3600));
    else if(drag.mode==='start'){
      const trim=clamp(base.trimStart+delta*speed,0,max-base.trimEnd-.02);
      clip.trimStart=trim;clip.offset=Math.max(0,base.offset+(trim-base.trimStart)/speed);
    }else if(drag.mode==='end'){
      clip.trimEnd=clamp(base.trimEnd-delta*speed,0,max-base.trimStart-.02);
    }
    drag.region.style.left=(Math.max(0,(clip.offset||0)/drag.span)*100)+'%';
    drag.region.style.width=(Math.max(.4,clipDuration(clip)/drag.span*100))+'%';
    drawWaves();updateTransport();
  });
  const finish=event=>{
    const drag=state.dragClip;if(!drag)return;
    const track=state.tracks.find(t=>t.id===drag.trackId);
    const clip=track&&(Array.isArray(track.clips)?getEditableClip(track,drag.clipId):track);
    if(event.type==='pointercancel'&&clip)Object.assign(clip,drag.origin);
    state.dragClip=null;
    render();restartPlayback();
  };
  tracks.addEventListener('pointerup',finish);
  tracks.addEventListener('pointercancel',finish);
}


function setupSamples(){
 const root=$('#sampleDeckBody');
 if(!root)return;
 const deck=new SampleDeck({
  root,engine,onMessage:toast,onLibraryChanged:refreshFlowAssets,onClose:closeSampleDesk,
  onSource:()=>{
   const track=current();
   if(!track)return null;
   const clip=getEditableClip(track,state.selectedClip);
   if(!clip?.buffer)return null;
   const bounds=clipSourceBounds(clip);
   const loop=validLoop(clip);
   return {name:clip.name||track.name,buffer:clip.buffer,
    from:loop?.from??bounds.start,to:loop?.to??bounds.end};
  },
  onAdd:(buffer,name,settings,options={})=>{
    const selected=state.tracks.find(t=>t.id===state.selected);
    const destination=options.route||'samples';
    const bus=destination==='selected'&&selected?busForTrack(selected):'samples';
    const track=addTrack(buffer,name,'audio',state.position,bus,false,true);
    track.bus=bus;track.sourceKind='sample';
    track.flowTo=destination==='master'?'master':destination==='selected'&&selected?'track:'+selected.id:'bus:'+bus;
    if(settings)Object.assign(track,settings);
    engine.updateTrack(track);render();restartPlayback();queueAutosave();
    return track;
  }
 });
 state.sampleDeck=deck;
  deck.load().catch(error=>toast(error.message));
  refreshFlowAssets();
 const area=$('#sampleDeck'),toggle=$('#sampleToggle');
 const open=async()=>{
  if(area.classList.contains('is-fullscreen')){closeSampleDesk();return;}
  await openSampleDesk();
 };
 toggle.addEventListener('click',open);
 root.addEventListener('click',event=>{
  if(event.target.closest('[data-pad-close-deck]'))closeSampleDesk();
 });
 document.addEventListener('keydown',event=>{
  if(area.hidden||event.repeat||event.ctrlKey||event.metaKey||event.altKey||
   event.target.closest('input,textarea,select,[contenteditable],button')||$('#modalBackdrop'))return;
  const index=['1','2','3','4','5','6','7','8','9','0','-','='].indexOf(event.key);
  if(index!==-1&&deck.pads[index]){event.preventDefault();deck.play(index);}
 });
}

function wire(){
  setupMixer();setupFlow();setupSamples();
  installTuneGestures();setupCharacterGestures();
  setupScrubber();
  setupClipDragging();
  const bpm=$('#bpmInput'),metro=$('#metronomeBtn'),snapBtn=$('#snapBtn');
  $('#timelineZoom').value=state.zoom;
  $('#timelineZoom').addEventListener('input',event=>{
    state.zoom=clamp(Number(event.target.value),1,8);
    $('#zoomValue').textContent=state.zoom.toFixed(1)+'×';
    render();
  });
  $('#tracks').addEventListener('scroll',event=>{
    const view=event.target.closest('[data-wave-viewport]');if(!view)return;
    state.scrollX=view.scrollLeft;
    for(const el of $$('.wave-viewport'))if(el!==view)el.scrollLeft=state.scrollX;
    const rulerView=$('#rulerViewport');if(rulerView)rulerView.scrollLeft=state.scrollX;
  },true);
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
  $('#clipFileInput').onchange=async e=>{
    const target=state.clipImportTrack;state.clipImportTrack=null;
    await importClipIntoTrack(e.target.files?.[0],target);e.target.value='';
  };
  $('#demoBtn').onclick=()=>{state.libraryTab='rhythms';renderLibrary();$('#soundLibrary').scrollIntoView({behavior:'smooth',block:'start'});};$('#recordBtn').onclick=openRecording;
  $('#sessionRecordBtn').onclick=toggleSessionRecording;
  $('#voiceLabBtn').onclick=()=>openTuneLab('live');
  $('#loopBtn').onclick=()=>{checkpoint();state.loop=!state.loop;$('#loopBtn').setAttribute('aria-pressed',String(state.loop));toast(state.loop?'Repetición activada':'Repetición desactivada');};
  $('#playBtn').onclick=playPause;$('#stopBtn').onclick=stop;$('#backBtn').onclick=()=>{if(engine.playing){engine.pause();state.position=0;restartPlaybackAtZero();}else{state.position=0;updateTransport();}};
  $('#exportBtn').onclick=openExport;$('#projectBtn').onclick=openProjectMenu;
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
      const track=state.tracks.find(t=>t.id===wave.dataset.wave);
      if(track){
        state.selected=track.id;
        const hit=clipsOf(track).find(clip=>state.position>=clip.offset&&state.position<=clip.offset+clipDuration(clip));
        state.selectedClip=hit?.id||null;
        renderInspector();renderMixer();
      }
      if(engine.playing)engine.play(state.tracks,state.position).then(()=>{render();runTicker();}).catch(err=>toast(err.message));
      updateTransport();return;
    }
    const card=e.target.closest('[data-track]');if(card){state.selected=card.dataset.track;state.selectedClip=null;render();}
  });
  $('#tracks').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.track-card')){e.preventDefault();state.selected=e.target.dataset.track;state.selectedClip=null;render();}});
  document.addEventListener('change',event=>{
    if(event.target.id==='labMicSelect'&&state.liveMicActive){
      stopLiveTuneMic();startLiveTuneMic();
    }
  });
  document.addEventListener('click',e=>{
    const opening=e.target.closest('[data-project-open]');if(opening){openNamed(opening.dataset.projectOpen);return;}
    const deletion=e.target.closest('[data-project-delete]');if(deletion){removeNamed(deletion.dataset.projectDelete);return;}
    const info=e.target.closest('[data-info]');if(info){help(info.dataset.info);return;}
    const action=e.target.closest('[data-action]');if(action){handleModalAction(action.dataset.action);return;}
    const effectButton=e.target.closest('[data-fx-toggle]');
    if(effectButton){
      const track=current();if(!track)return;
      if(!FX_IDS.includes(effectButton.dataset.fxToggle))return;
      checkpoint();toggleTrackFx(track,effectButton.dataset.fxToggle);engine.updateTrack(track);
      queueAutosave();
      const button=effectButton;
      const off=isFxBypassed(track,effectButton.dataset.fxToggle);
      button.classList.toggle('fx-disabled',off);
      button.setAttribute('aria-pressed',String(!off));
      const strong=button.querySelector('strong');if(strong)strong.textContent=off?'OFF':'ON';
      return;
    }
    const character=e.target.closest('[data-voice-character]');
    if(character){
      const track=getTuneTrack();if(!track)return;
      if(state.tuneMode==='track')checkpoint();
      const preset=applyVoiceCharacter(track,character.dataset.voiceCharacter);
      refreshCharacterPad(track);
      if(state.tuneMode==='live')engine.updateMic(track);
      else{engine.updateTrack(track);renderInspector();queueAutosave();}
      toast('Personaje '+preset.name+' aplicado a la voz');return;
    }
    const tunePreset=e.target.closest('[data-tune-preset]');
    if(tunePreset){
      const point=findTunePreset(tunePreset.dataset.tunePreset);
      if(point){if(state.tuneMode==='track')checkpoint();tuneChange(point.x,point.y,point.id,true);}return;
    }
    const userPoint=e.target.closest('[data-user-tune]');
    if(userPoint){
      const point=loadUserTunes()[Number(userPoint.dataset.userTune)];
      if(point){if(state.tuneMode==='track')checkpoint();tuneChange(point.x,point.y,'user:'+point.name,true);}return;
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
    if(['clipLoopFrom','clipLoopTo','loopFromSlider','loopToSlider'].includes(e.target.id)){
      const from=$('#clipLoopFrom'),to=$('#clipLoopTo'),slideFrom=$('#loopFromSlider'),slideTo=$('#loopToSlider');
      if(from&&to&&slideFrom&&slideTo){
        if(e.target===slideFrom)from.value=slideFrom.value;
        if(e.target===slideTo)to.value=slideTo.value;
        if(e.target===from)slideFrom.value=from.value;
        if(e.target===to)slideTo.value=to.value;
        const a=Number(from.value),b=Number(to.value),min=Number(slideFrom.min),max=Number(slideFrom.max);
        const fill=$('#loopRangeVisual');
        if(fill&&Number.isFinite(a)&&Number.isFinite(b)&&max>min){
          const left=Math.max(0,Math.min(100,(a-min)/(max-min)*100));
          const right=Math.max(left,Math.min(100,(b-min)/(max-min)*100));
          fill.style.left=left+'%';fill.style.width=(right-left)+'%';
        }
      }
    }
    if(e.target.id==='labLiveInputGain'){
      engine.setMicGain(clamp(e.target.value,0,150));
      const out=$('#labLiveInputValue');if(out)out.textContent=e.target.value+'%';
    }
    if(e.target.id==='labLiveMonitor'){
      if(state.liveTuneTrack){state.liveTuneTrack.volume=clamp(e.target.value,0,80);engine.updateMic(state.liveTuneTrack);}
      const out=$('#labLiveMonitorValue');if(out)out.textContent=e.target.value+'%';
    }
    if(e.target.matches('[data-tune-axis]')){
      const t=current();if(t){
        const x=e.target.dataset.tuneAxis==='x'?Number(e.target.value)/100:t.tuneX;
        const y=e.target.dataset.tuneAxis==='y'?Number(e.target.value)/100:t.tuneY;
        tuneChange(x,y);
      }
    }
    if(e.target.matches('[data-setting]'))setSetting(e.target.dataset.setting,Number(e.target.value),e.target);
    if(e.target.matches('[data-timing]'))setTiming(e.target.dataset.timing,Number(e.target.value));
    if(e.target.id==='pitchZoom'){
      const zoom=clamp(Number(e.target.value),1,8);
      $('#pitchWaveInner').style.width=(zoom*100)+'%';
      $('#pitchZoomLabel').textContent=zoom.toFixed(1)+'×';
      requestAnimationFrame(drawActivePitchReview);
    }
    if(e.target.id==='pitchFrom'||e.target.id==='pitchTo')drawActivePitchReview();
    if(e.target.id==='pitchSemitones'){
      const out=$('#pitchShiftValue');if(out)out.textContent=Number(e.target.value).toFixed(1)+' semitonos';
    }
    if(e.target.id==='recordGain'){
      state.inputGain=clamp(e.target.value,0,200);
      engine.setMicGain(state.inputGain);
      const output=$('#recordGainValue');if(output)output.textContent=state.inputGain+'%';
      queueAutosave();
    }
    if(e.target.id==='monitorGain'){
      state.monitorGain=clamp(e.target.value,0,100);
      if(state.preview){state.preview.monitorTrack.volume=state.monitorGain;engine.updateMic(state.preview.monitorTrack);}
      const output=$('#monitorGainValue');if(output)output.textContent=state.monitorGain+'%';
      queueAutosave();
    }
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
  let pitchPointer=null;
  document.addEventListener('pointerdown',event=>{
    if(event.target.id!=='pitchWave'||event.button!==0)return;
    const t=state.tracks.find(t=>t.id===state.pitchReview?.trackId),clip=t&&getEditableClip(t,state.pitchReview.clipId);
    if(!clip)return;
    event.preventDefault();event.target.setPointerCapture(event.pointerId);
    const from=sourceTimeFromPointer(event.clientX,event.target.getBoundingClientRect(),clip.buffer.duration);
    pitchPointer={id:event.pointerId,start:from};
    $('#pitchFrom').value=from.toFixed(2);$('#pitchTo').value=Math.min(clip.buffer.duration,from+.1).toFixed(2);
    drawActivePitchReview();
  });
  document.addEventListener('pointermove',event=>{
    if(!pitchPointer||pitchPointer.id!==event.pointerId)return;
    const canvas=$('#pitchWave');if(!canvas)return;
    const t=state.tracks.find(t=>t.id===state.pitchReview?.trackId),clip=t&&getEditableClip(t,state.pitchReview.clipId);if(!clip)return;
    const to=sourceTimeFromPointer(event.clientX,canvas.getBoundingClientRect(),clip.buffer.duration);
    $('#pitchFrom').value=Math.min(pitchPointer.start,to).toFixed(2);
    $('#pitchTo').value=Math.max(pitchPointer.start,to).toFixed(2);
    drawActivePitchReview();
  });
  document.addEventListener('pointerup',event=>{if(pitchPointer?.id===event.pointerId)pitchPointer=null;});
  document.addEventListener('pointercancel',event=>{if(pitchPointer?.id===event.pointerId)pitchPointer=null;});
  document.addEventListener('keydown',e=>{
    if(((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='x')&&e.target.closest('[data-flow-track]')&&!$('#modalBackdrop')){
      e.preventDefault();deleteFlowNode(e.target.closest('[data-flow-track]').dataset.flowTrack);return;
    }
    if(['Delete','Backspace'].includes(e.key)&&!e.repeat&&!$('#modalBackdrop')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable=true]')){
      const node=e.target.closest('[data-flow-track]');if(node){e.preventDefault();deleteFlowNode(node.dataset.flowTrack);return;}
      const card=e.target.closest('[data-track]');if(card){e.preventDefault();deleteTrack(card.dataset.track);return;}
    }
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!document.activeElement?.matches('input[type="text"],textarea')){
      e.preventDefault();if(e.shiftKey)redo();else undo();return;
    }
    if(e.key==='Tab'&&$('#modalBackdrop')){
      const targets=$$('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',$('.focus-panel'));
      if(targets.length){const first=targets[0],last=targets[targets.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    }
    if(e.key==='Escape'&&$('#modalBackdrop')){closeModal();return;}
    if(e.key===' '&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName||'')&&!$('#modalBackdrop')){e.preventDefault();playPause();}
  });
  navigator.mediaDevices?.addEventListener?.('devicechange',()=>{if($('#micSelect')&&!state.recording)updateMicrophoneChoices();});
  window.addEventListener('resize',()=>requestAnimationFrame(()=>{drawWaves();alignWaveRuler();invalidateFlowWireGeometry($('#flowArea'));paintFlow();}));
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
