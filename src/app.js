import {AudioEngine} from './engine.js';
import {KEYS,SCALES,COLORS,PRESETS,defaults,clock,clamp,projectDuration,effectiveDuration,peaks,synthBeat,downloadBlob,safeFilename} from './dsp.js';
import {saveSession,loadSession} from './project-store.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const engine=new AudioEngine();
const state={tracks:[],selected:null,position:0,recording:null,master:85,busy:false};
const HELP={
  studio:['Bienvenido a tu estudio','1. Importa una base o prueba un ritmo. 2. Pulsa Grabar mi voz y canta. 3. Selecciona una capa para modificarla. 4. Dale Play y exporta tu mezcla. Todo el audio se procesa en tu equipo.'],
  tracks:['Capas de sonido','Cada capa es independiente. Puedes combinar voz, batería, música y efectos. Toca una para modificarla. M silencia, S deja escuchar solo esa capa. La flecha abre las acciones de la capa.'],
  timeline:['Línea de tiempo','Cada forma de onda representa un sonido. Toca cualquier punto de una onda para ir a ese momento de la mezcla. En AJUSTAR TIEMPOS puedes desplazar, recortar y suavizar entradas y salidas.'],
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
  recording:['Grabar con el micrófono','Permite grabar tu voz como una capa independiente. Usa auriculares para cantar sobre una base. Puedes activar escucharte con efectos, pero eso puede producir acoples si usas altavoces. La toma se guarda localmente al detener.'],
  monitor:['Escucharme con efectos','Si activas esta opción oirás tu micrófono procesado mientras cantas. Requiere auriculares para evitar acoples y puede haber latencia según el dispositivo.'],
  offline:['Tus sonidos son privados','Nada se envía a servidores. Guarda la sesión en este navegador con GUARDAR. El almacenamiento local puede borrarse al limpiar los datos del navegador; exporta tus mezclas importantes.']
};
let toastTimer,raf=0;
const modalStack=[];
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
  if(modalStack.length){$('#modalRoot').innerHTML=modalStack.pop();$('.focus-panel')?.focus();return;}
  if(state.recording){toast('Detén la grabación antes de cerrar');return;}
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
  state.tracks.push(t);state.selected=id;render();if(engine.playing)restartPlayback();
  return t;
}
function render(){
  $('#trackCount').textContent=String(state.tracks.length).padStart(2,'0');
  const duration=projectDuration(state.tracks);
  $('#endTimeLabel').textContent=clock(duration);
  $('#emptyState').classList.toggle('hidden',state.tracks.length>0);
  $('#tracks').innerHTML=state.tracks.map((t,i)=>{
    const active=t.id===state.selected;
    return '<article class="track-card'+(active?' selected':'')+'" style="--track-color:'+trackColor(t)+'" data-track="'+html(t.id)+'" tabindex="0" aria-label="Seleccionar capa '+html(t.name)+'">'+
      '<div class="vinyl'+(engine.playing&&!t.muted?' spinning':'')+'" aria-hidden="true"><div class="vinyl-center"></div></div>'+
      '<div class="track-info"><strong class="track-name" title="'+html(t.name)+'">'+html(t.name)+'</strong><div class="track-sub">'+(t.type==='voice'?'◉ VOZ':t.type==='demo'?'♫ BEAT':'≋ AUDIO')+' · '+clock(effectiveDuration(t))+'</div><div class="track-buttons"><button class="small-toggle'+(t.muted?' active':'')+'" data-track-action="mute" data-id="'+html(t.id)+'" title="Silenciar" aria-label="Silenciar '+html(t.name)+'">M</button><button class="small-toggle solo'+(t.solo?' active':'')+'" data-track-action="solo" data-id="'+html(t.id)+'" title="Escuchar solo" aria-label="Escuchar solo '+html(t.name)+'">S</button></div></div>'+
      '<div class="track-wave" data-wave="'+html(t.id)+'" title="Toca para moverte en la mezcla"><canvas data-canvas="'+html(t.id)+'" aria-label="Forma de onda"></canvas><div class="wave-label">'+(t.offset>0?'+'+t.offset.toFixed(1)+'s':'WAV')+'</div></div>'+
      '<div class="track-tail"><button type="button" class="mini-action" data-track-action="edit" data-id="'+html(t.id)+'" aria-label="Opciones de la capa">⋯</button><span class="track-number">'+String(i+1).padStart(2,'0')+'</span></div></article>';
  }).join('');
  renderInspector();requestAnimationFrame(drawWaves);updateTransport();
}
function drawWaves(){
  const full=Math.max(.01,projectDuration(state.tracks));
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
    '<div class="inspector-divider"></div><div class="control-heading"><strong>TUS 3 CONTROLES</strong>'+buttonInfo('inspector')+'</div>'+
    '<div class="control-grid">'+dial('Volumen','volume',t.volume)+dial('Afinación','autotune',t.autotune,'var(--purple)')+dial('Limpieza','clean',t.clean,'var(--blue)')+'</div>'+
    '<div class="control-row"><label for="tuneKey">Tono</label><select data-setting="key" id="tuneKey">'+KEYS.map((x,i)=>'<option value="'+i+'"'+(i===t.key?' selected':'')+'>'+x+'</option>').join('')+'</select>'+buttonInfo('key')+'</div>'+
    '<div class="control-row"><label for="tuneScale">Escala</label><select data-setting="scale" id="tuneScale">'+SCALES.map((x,i)=>'<option value="'+i+'"'+(i===t.scale?' selected':'')+'>'+x+'</option>').join('')+'</select>'+buttonInfo('scale')+'</div>'+
    '<button class="wide-button" data-action="effects">✦ MÁS EFECTOS →</button><button class="wide-button" data-action="timing">◷ AJUSTAR TIEMPOS →</button>';
}
function updateTransport(){
  const duration=projectDuration(state.tracks),pos=engine.playing?engine.position():state.position;
  $('#timeDisplay').innerHTML=clock(pos)+' <span>/ '+clock(duration)+'</span>';
  $('#playBtn').textContent=engine.playing?'Ⅱ':'▶';
  $('#playBtn').setAttribute('aria-label',engine.playing?'Pausar':'Reproducir');
  const percent=duration>0?clamp(pos/duration*100,0,100):0;
  $('#playhead').style.left=percent+'%';$('#playhead').style.opacity=state.tracks.length?1:0;
}
function runTicker(){
  cancelAnimationFrame(raf);
  const tick=()=>{
    if(engine.playing){
      const p=engine.position();state.position=p;updateTransport();
      if(p>=projectDuration(state.tracks)-.015){engine.stop();state.position=0;render();return;}
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
function stop(){engine.stop();state.position=0;cancelAnimationFrame(raf);render();}
async function importFiles(files){
  if(!files?.length)return;
  toast('Preparando sonidos...');
  for(const file of Array.from(files)){
    try{const b=await engine.decode(file);addTrack(b,file.name.replace(/\.[^.]+$/,''));}
    catch(e){toast(file.name+': '+e.message);}
  }
  toast('Sonido listo. Selecciona una capa para personalizarlo.');
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
    [{label:'ELIMINAR',type:'delete-track'},{label:'DUPLICAR',type:'duplicate-track'},{label:'GUARDAR NOMBRE',type:'rename-track',primary:true}]);
}
async function openRecording(){
  if(state.recording)return;
  if(!navigator.mediaDevices?.getUserMedia)return help('recording');
  modal('Grabar tu voz',
    '<p>Tu voz se agregará como una capa. Puedes reproducir la base al mismo tiempo y grabar encima.</p>'+
    '<div class="record-visual"><span class="record-glyph"></span><span id="recordTimer">LISTO PARA GRABAR</span></div>'+
    '<div class="control-row"><label for="monitorToggle">Escucharme con efectos (auriculares)</label><input type="checkbox" class="toggle-switch" id="monitorToggle">'+buttonInfo('monitor')+'</div>'+
    '<div class="control-row"><label for="recordTune">Afinación al escucharme</label><input type="range" min="0" max="100" value="80" id="recordTune">'+buttonInfo('autotune')+'</div>'+
    '<div class="control-row"><label for="recordClean">Limpieza al escucharme</label><input type="range" min="0" max="100" value="35" id="recordClean">'+buttonInfo('clean')+'</div>'+
    '<div class="note">Usa auriculares si reproduces una pista de fondo. La grabación se conserva sin efectos destructivos; podrás aplicar efectos a su capa después.</div>',
    [{label:'COMENZAR A GRABAR',type:'start-record',primary:true}]);
}
async function startRecording(){
  if(state.recording)return;
  const monitor=$('#monitorToggle')?.checked||false,tune=Number($('#recordTune')?.value||80),clean=Number($('#recordClean')?.value||35);
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Este navegador no permite grabar audio');return;}
  let stream;
  try{
    await engine.ready();
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!monitor,noiseSuppression:!monitor,autoGainControl:!monitor},video:false});
    const recorder=new MediaRecorder(stream),chunks=[],offset=engine.playing?engine.position():state.position;
    const monitorTrack={...defaults(),autotune:tune,clean,space:8,volume:80};
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>toast('Error de grabación: revisa el micrófono');
    recorder.onstop=async()=>{
      try{
        engine.stopMonitor();
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
        if(blob.size<100)return toast('La grabación quedó vacía');
        const buffer=await engine.decode(blob);
        const t=addTrack(buffer,'Mi voz '+(state.tracks.filter(x=>x.type==='voice').length+1),'voice',offset);
        Object.assign(t,{autotune:tune,clean,retune:70,space:12,preset:'star'});
        render();toast('¡Voz agregada! Puedes afinarla y escucharla con la base.');
      }catch(err){toast('No se pudo preparar la toma: '+err.message);}
      finally{state.recording=null;modalStack.length=0;$('#modalRoot').innerHTML='';}
    };
    if(monitor)await engine.monitor(stream,monitorTrack);
    state.recording={recorder,stream,started:Date.now(),monitorTrack};
    recorder.start(250);
    const actions=$('.focus-footer');actions.innerHTML='<button class="button button-primary" data-action="stop-record">■ DETENER Y AGREGAR</button>';
    $('#recordTimer').textContent='● GRABANDO...';
    const timer=setInterval(()=>{
      if(!state.recording){clearInterval(timer);return;}
      const display=$('#recordTimer');if(display)display.textContent='● '+clock((Date.now()-state.recording.started)/1000)+' · GRABANDO';
    },250);
  }catch(error){
    stream?.getTracks().forEach(t=>t.stop());
    engine.stopMonitor();
    toast('No se pudo iniciar el micrófono: '+error.message);
  }
}
function stopRecording(){if(!state.recording)return;const rec=state.recording.recorder;if(rec.state!=='inactive')rec.stop();$('#recordTimer').textContent='PREPARANDO TU VOZ...';}
function openExport(){
  if(!state.tracks.length)return toast('Agrega un sonido antes de exportar');
  modal('Exportar mi canción',
    '<p>Elige cómo quieres recibir tu sonido. Se crea un archivo WAV local con tus efectos.</p>'+
    '<div class="field"><label>Qué quieres exportar</label><select id="exportScope" class="modal-select"><option value="mix">Toda la mezcla</option>'+(current()?'<option value="selected">Solo capa: '+html(current().name)+'</option>':'')+'</select></div>'+
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
    const blob=await engine.exportMix(state.tracks,{depth,rate,onlyId});
    downloadBlob(blob,safeFilename(onlyId?current().name:'veryAtractiveSynth-mi-mezcla')+'-'+rate/1000+'k-'+depth+'bit.wav');
    modalStack.length=0;$('#modalRoot').innerHTML='';toast('Tu archivo WAV está listo.');
  }catch(e){toast('Exportación: '+e.message);}
  finally{state.busy=false;if(btn)btn.textContent='CREAR MI WAV';}
}
async function save(){
  if(state.busy)return;
  if(!state.tracks.length)return toast('No hay pistas para guardar');
  try{state.busy=true;await saveSession(state.tracks,state.master);toast('Sesión guardada en este navegador');}
  catch(e){toast('No se pudo guardar: '+e.message);}
  finally{state.busy=false;}
}
async function load(){
  if(state.tracks.length&&!confirm('¿Reemplazar las capas actuales por la última sesión guardada?'))return;
  try{
    engine.stop();const ctx=await engine.ready(),data=await loadSession(ctx);
    if(!data)return toast('Todavía no tienes una sesión guardada');
    state.tracks=data.tracks;state.selected=state.tracks[0]?.id||null;state.master=data.master||85;
    engine.setMaster(state.master);$('#masterVolume').value=state.master;$('#volumeValue').textContent=state.master+'%';
    state.position=0;render();toast('Sesión recuperada. Todo está en este dispositivo.');
  }catch(e){toast('No se pudo recuperar: '+e.message);}
}
async function setSetting(key,value,element){
  const t=current();if(!t||!(key in defaults()))return;
  t[key]=clamp(value,key==='pan'?-100:0,key==='pan'?100:key==='key'?11:key==='scale'?2:100);
  t.preset='custom';engine.updateTrack(t);
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
  const note=$('.focus-content .hint');
  if(note)note.textContent='Duración audible: '+clock(effectiveDuration(t))+' · Original: '+clock(t.buffer.duration);
}
function handleTrackAction(action,id){
  const t=state.tracks.find(x=>x.id===id);if(!t)return;
  if(action==='edit'){openTrackActions(id);return;}
  if(action==='mute'||action==='solo'){
    t[action==='mute'?'muted':'solo']=!t[action==='mute'?'muted':'solo'];
    render();restartPlayback();
  }
}
function handleModalAction(action){
  if(action==='close-modal'||action==='close'){closeModal();return;}
  if(action==='effects'){openEffects();return;}
  if(action==='timing'){openTiming();return;}
  if(action==='start-record'){startRecording();return;}
  if(action==='stop-record'){stopRecording();return;}
  if(action==='do-export'){performExport();return;}
  const t=current();if(!t)return;
  if(action==='rename-track'){const name=$('#renameInput')?.value.trim();if(!name)return toast('Escribe un nombre');t.name=name.slice(0,80);modalStack.length=0;$('#modalRoot').innerHTML='';render();}
  if(action==='duplicate-track'){
    const clone={...t,id:globalThis.crypto?.randomUUID?.()||'copy-'+Date.now(),name:t.name+' · copia',color:COLORS[state.tracks.length%COLORS.length]};
    state.tracks.push(clone);state.selected=clone.id;modalStack.length=0;$('#modalRoot').innerHTML='';render();restartPlayback();toast('Capa duplicada. Puedes darle otros efectos.');
  }
  if(action==='delete-track'){
    if(!confirm('¿Eliminar la capa "'+t.name+'"?'))return;
    state.tracks=state.tracks.filter(x=>x.id!==t.id);state.selected=state.tracks[0]?.id||null;
    modalStack.length=0;$('#modalRoot').innerHTML='';render();restartPlayback();toast('Capa eliminada');
  }
}
function wire(){
  $('#importBtn').onclick=$('#addTrackBtn').onclick=$('#emptyImportBtn').onclick=()=>$('#fileInput').click();
  $('#fileInput').onchange=async e=>{await importFiles(e.target.files);e.target.value='';};
  $('#demoBtn').onclick=demo;$('#recordBtn').onclick=openRecording;
  $('#playBtn').onclick=playPause;$('#stopBtn').onclick=stop;$('#backBtn').onclick=()=>{if(engine.playing){engine.pause();state.position=0;restartPlaybackAtZero();}else{state.position=0;updateTransport();}};
  $('#exportBtn').onclick=openExport;$('#saveBtn').onclick=save;$('#loadBtn').onclick=load;
  $('#helpBtn').onclick=()=>help('studio');$('#tracksInfo').onclick=()=>help('tracks');
  $('#timelineInfo').onclick=()=>help('timeline');$('#inspectorInfo').onclick=()=>help('inspector');$('#masterInfo').onclick=()=>help('master');
  $('#masterVolume').oninput=e=>{state.master=Number(e.target.value);engine.setMaster(state.master);$('#volumeValue').textContent=state.master+'%';};
  $('#tracks').addEventListener('click',e=>{
    const toggle=e.target.closest('[data-track-action]');if(toggle){handleTrackAction(toggle.dataset.trackAction,toggle.dataset.id);return;}
    const wave=e.target.closest('[data-wave]');
    if(wave){
      const rect=wave.getBoundingClientRect(),full=projectDuration(state.tracks);
      state.position=clamp((e.clientX-rect.left)/rect.width,0,1)*full;
      if(engine.playing)engine.play(state.tracks,state.position).then(()=>{render();runTicker();}).catch(err=>toast(err.message));
      updateTransport();return;
    }
    const card=e.target.closest('[data-track]');if(card){state.selected=card.dataset.track;render();}
  });
  $('#tracks').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.track-card')){e.preventDefault();state.selected=e.target.dataset.track;render();}});
  document.addEventListener('click',e=>{
    const info=e.target.closest('[data-info]');if(info){help(info.dataset.info);return;}
    const action=e.target.closest('[data-action]');if(action){handleModalAction(action.dataset.action);return;}
    const preset=e.target.closest('[data-preset]');if(preset){
      const t=current(),p=PRESETS[preset.dataset.preset];if(!t||!p)return;
      Object.assign(t,p,{preset:preset.dataset.preset});engine.updateTrack(t);renderInspector();toast('Estilo aplicado: '+p.label);return;
    }
    if(e.target.id==='modalBackdrop')closeModal();
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-setting]'))setSetting(e.target.dataset.setting,Number(e.target.value),e.target);
    if(e.target.matches('[data-timing]'))setTiming(e.target.dataset.timing,Number(e.target.value));
    if(e.target.id==='recordTune'||e.target.id==='recordClean'){
      if(!state.recording)return;state.recording.monitorTrack[e.target.id==='recordTune'?'autotune':'clean']=Number(e.target.value);engine.updateMonitor(state.recording.monitorTrack);
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('select[data-setting]'))renderInspector();
    if(e.target.matches('[data-timing]')){render();restartPlayback();}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Tab'&&$('#modalBackdrop')){
      const targets=$('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',$('.focus-panel'));
      if(targets.length){const first=targets[0],last=targets[targets.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    }
    if(e.key==='Escape'&&$('#modalBackdrop')){closeModal();return;}
    if(e.key===' '&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName||'')&&!$('#modalBackdrop')){e.preventDefault();playPause();}
  });
  window.addEventListener('resize',()=>requestAnimationFrame(drawWaves));
  document.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault();});
  document.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length){e.preventDefault();importFiles(e.dataTransfer.files);}});
  window.addEventListener('beforeunload',e=>{if(state.recording){e.preventDefault();e.returnValue='';}});
}
async function restartPlaybackAtZero(){
  try{await engine.play(state.tracks,0);render();runTicker();}catch(err){toast(err.message);}
}
wire();render();
if('serviceWorker' in navigator&&window.isSecureContext){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
