import {PAD_KEYS,padBounds,copySample,waveformPoints,safePadName,SAMPLE_FX,sampleEffect} from './sample-bank.js';
import {defaults,encodeWav,downloadBlob,safeFilename} from './dsp.js';
import {savePad,loadPads} from './sample-pad-store.js';
import {saveLibrarySample,listLibrarySamples,loadLibrarySample,deleteLibrarySample} from './sample-library.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function padWaveSVG(buffer,from=0,to=buffer.duration){
 if(!buffer)return '';
 const points=waveformPoints(buffer,{from,to,count:30});
 const lines=points.map((v,i)=>'M'+(i*4+2)+' '+(20-Math.max(1,v*16)).toFixed(1)+' V'+(20+Math.max(1,v*16)).toFixed(1)).join(' ');
 return '<svg viewBox="0 0 120 40" preserveAspectRatio="none" class="sample-wave" role="img" aria-label="Onda del sample"><path d="'+lines+'"/></svg>';
}
export class SampleDeck{
 constructor({root,engine,onAdd,onSource,onMessage,onLibraryChanged,onClose}){
  this.root=root;this.engine=engine;this.onAdd=onAdd;this.onSource=onSource;
  this.say=onMessage||(()=>{});this.onLibraryChanged=onLibraryChanged||(()=>{});this.onClose=onClose||(()=>{});this.pads=Array(12).fill(null);
  this.selected=null;this.draft=null;this.loaded=false;this.assets=[];this.pendingDelete=null;this.pendingPadRemoval=false;
  root.addEventListener('click',event=>this.click(event));
  root.addEventListener('input',event=>this.input(event));
  root.addEventListener('change',event=>this.change(event));
  this.render();
 }
 async load(){
  if(this.loaded)return;
  try{this.pads=await loadPads();}catch(error){this.say('Sin acceso a biblioteca local: '+error.message);}
  try{this.assets=await listLibrarySamples();}catch{}
  this.loaded=true;this.render();this.onLibraryChanged();
 }
 render(){
  const count=this.pads.filter(Boolean).length;
  const library=this.assets.length?this.assets.map(item=>'<article class="sample-library-item"><span class="sample-library-icon">♫</span><span class="sample-library-name"><strong>'+esc(item.name)+'</strong><small>'+Number(item.duration||0).toFixed(2)+' s · '+esc(item.fx||'original')+'</small></span><button type="button" data-library-play="'+esc(item.id)+'" title="Escuchar" aria-label="Escuchar '+esc(item.name)+'">▶</button><button type="button" data-library-add="'+esc(item.id)+'" data-library-route="samples" title="Añadir al Sample Bus" aria-label="Añadir '+esc(item.name)+' al Sample Bus">＋</button><button type="button" data-library-add="'+esc(item.id)+'" data-library-route="selected" title="Insertar en la pista seleccionada" aria-label="Insertar '+esc(item.name)+' en la pista seleccionada">↳</button><button type="button" data-library-add="'+esc(item.id)+'" data-library-route="master" title="Enviar directamente a Master" aria-label="Enviar '+esc(item.name)+' directamente a Master">M</button><button type="button" data-library-to-pad="'+esc(item.id)+'" title="Copiar a un pad libre" aria-label="Copiar '+esc(item.name)+' a un pad libre">▦</button><button type="button" data-library-export="'+esc(item.id)+'" title="Exportar el audio guardado como WAV" aria-label="Exportar '+esc(item.name)+' como WAV">↓</button>'+
    (this.pendingDelete===item.id?'<span class="sample-confirm">¿Eliminar? <button type="button" data-library-confirm-delete="'+esc(item.id)+'">Sí, eliminar</button><button type="button" data-library-cancel-delete>Cancelar</button></span>':'<button type="button" data-library-delete="'+esc(item.id)+'" title="Eliminar" aria-label="Eliminar '+esc(item.name)+' de la biblioteca">×</button>')+'</article>').join(''):'<p class="sample-library-empty">Guarda un pad o arrastra el asa ♫ de una pista al dock SAMPLE DESK dentro de Signal Flow.</p>';
  this.root.innerHTML='<div class="sample-head"><div><div class="section-overline">INSTRUMENTO · LOCAL / PRIVADO</div><h2>Sample Desk <span class="sample-counter">'+count+' / 12</span></h2><p>Prueba, corta, guarda y reutiliza tus sonidos. Tus archivos permanecen en este equipo.</p></div><div class="sample-head-actions"><span class="sample-keys-hint">1—9 · 0 · − · =</span><button type="button" class="sample-close" data-pad-close-deck>← Volver al estudio</button></div></div>'+
   '<div class="sample-grid" role="group" aria-label="12 pads de sonido">'+
   this.pads.map((pad,i)=>'<div class="sample-pad '+(this.selected===i?'selected':'')+(pad?' filled':'')+'">'+
     '<button type="button" class="sample-trigger" data-pad-play="'+i+'" aria-label="'+(pad?'Reproducir '+esc(pad.name):'Preparar pad vacío '+(i+1))+'">'+
     '<span class="sample-key">'+PAD_KEYS[i]+'</span><span class="sample-pad-name">'+esc(pad?.name||'Crear sonido')+'</span>'+
     (pad?padWaveSVG(pad.buffer,pad.from,pad.to):'<span class="sample-empty-wave">⌁</span>')+
     '<span class="sample-duration">'+(pad?(pad.to-pad.from).toFixed(2)+' s':'＋ Añadir')+'</span></button>'+
     '<button type="button" class="sample-pad-edit" data-pad-edit="'+i+'" aria-label="Editar pad '+(i+1)+'">✎</button></div>').join('')+'</div>'+
   '<section class="sample-library"><header><div><strong>PORTAPAPELES DE SAMPLES</strong><small>Sonidos guardados · escucha o envía a SAMPLE BUS, pista o MASTER</small></div><span>'+this.assets.length+' sonidos</span></header><div class="sample-library-list">'+library+'</div></section>'+
   '<div class="sample-editor" id="sampleEditor">'+(this.selected===null?'Elige un pad para cargar audio, recortar o guardar un sonido.':this.editorMarkup())+'</div>'+
   '<input type="file" id="sampleFile" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" hidden>';
 }
 editorMarkup(){
  const i=this.selected,pad=this.draft||this.pads[i],duration=pad?.buffer.duration||0;
  const from=pad?.from||0,to=pad?.to||duration;
  return '<div class="sample-editor-heading"><strong>PAD '+String(i+1).padStart(2,'0')+' · AJUSTAR SONIDO</strong>'+
    '<button data-pad-close type="button" aria-label="Cerrar editor">×</button></div>'+
    '<label class="sample-label">Nombre<input type="text" id="sampleName" maxlength="36" value="'+esc(pad?.name||'Sample '+(i+1))+'"></label>'+
    (pad?'<div class="sample-editor-wave">'+padWaveSVG(pad.buffer,from,to)+'</div>'+
      '<div class="sample-trim"><label>INICIO <output id="sampleStartLabel">'+from.toFixed(2)+' s</output><input id="sampleStart" type="range" min="0" max="'+duration+'" step=".01" value="'+from+'"></label>'+
      '<label>FINAL <output id="sampleEndLabel">'+to.toFixed(2)+' s</output><input id="sampleEnd" type="range" min="0" max="'+duration+'" step=".01" value="'+to+'"></label></div>':
      '<p class="sample-edit-empty">Carga un sonido de hasta 30 segundos o corta uno desde tu pista seleccionada.</p>')+
    (pad?'<label class="sample-fx-label" for="sampleFx">COLOR DEL SAMPLE <select id="sampleFx" aria-label="Efecto del pad">'+
      Object.entries(SAMPLE_FX).map(([id,fx])=>'<option value="'+id+'" '+((pad.fx||'original')===id?'selected':'')+'>'+esc(fx.name)+'</option>').join('')+
      '</select></label><p class="sample-fx-hint">El original se conserva · escucha el pad con el color elegido, o exporta cualquiera de las dos versiones.</p>'+
      '<label class="sample-insert-target">ENVIAR A <select id="sampleInsertRoute" aria-label="Destino del sample"><option value="samples">SAMPLE BUS</option><option value="selected">PISTA SELECCIONADA</option><option value="master">MASTER</option></select></label>':'')+
    '<div class="sample-editor-actions"><button type="button" data-pad-import>↑ Cargar audio</button>'+
    '<button type="button" data-pad-from-track>✂ Desde la pista</button>'+
    '<button type="button" data-pad-save '+(!pad?'disabled':'')+'>✓ Guardar pad</button>'+
    (pad?'<button type="button" data-pad-insert>＋ Enviar a pistas</button>'+
     '<button type="button" data-pad-to-library>▣ Guardar en biblioteca</button>'+ 
     '<button type="button" data-pad-export="dry">↓ WAV original</button>'+
     '<button type="button" data-pad-export="wet">↓ WAV con FX</button>'+
     (this.pendingPadRemoval?'<span class="sample-confirm">¿Vaciar este pad? <button type="button" data-pad-remove-confirm>Sí, vaciar</button><button type="button" data-pad-remove-cancel>Cancelar</button></span>':'<button type="button" data-pad-remove>Vaciar pad</button>'):'')+'</div>';
 }
 select(i){this.selected=i;this.pendingPadRemoval=false;this.draft=this.pads[i]?{...this.pads[i]}:null;this.render();}
 async click(event){
  const target=event.target.closest('button');if(!target)return;
  if(target.hasAttribute('data-pad-close-deck')){this.onClose?.();return;}
  if(target.hasAttribute('data-library-play')){await this.playLibrary(target.dataset.libraryPlay);return;}
  if(target.hasAttribute('data-library-add')){await this.addLibrary(target.dataset.libraryAdd,target.dataset.libraryRoute||'samples');return;}
  if(target.hasAttribute('data-library-delete')){this.pendingDelete=target.dataset.libraryDelete;this.render();return;}
  if(target.hasAttribute('data-library-cancel-delete')){this.pendingDelete=null;this.render();return;}
  if(target.hasAttribute('data-library-confirm-delete')){await this.removeLibrary(target.dataset.libraryConfirmDelete);return;}
  if(target.hasAttribute('data-library-to-pad')){await this.copyLibraryToPad(target.dataset.libraryToPad);return;}
  if(target.hasAttribute('data-library-export')){await this.exportLibrary(target.dataset.libraryExport);return;}
  if(target.hasAttribute('data-pad-edit')){this.select(Number(target.dataset.padEdit));return;}
  if(target.hasAttribute('data-pad-play')){
    const i=Number(target.dataset.padPlay);
    if(this.pads[i])await this.play(i);else this.select(i);
    return;
  }
  if(target.hasAttribute('data-pad-close')){this.selected=null;this.draft=null;this.render();return;}
  if(this.selected===null)return;
  if(target.hasAttribute('data-pad-to-library')){
    const pad=this.draft||this.pads[this.selected];if(!pad)return;
    try{const saved=await saveLibrarySample({...pad,name:this.root.querySelector('#sampleName')?.value||pad.name});
      await this.refreshAssets();this.say('Guardado en Mis Samples: '+saved.name);this.onLibraryChanged();}
    catch(error){this.say('No se pudo guardar en la biblioteca: '+error.message);}return;
  }
  if(target.hasAttribute('data-pad-export')){
    const pad=this.draft||this.pads[this.selected];if(!pad)return;
    try{
      const ctx=await this.engine.ready(),buffer=copySample(ctx,pad.buffer,pad.from,pad.to);
      const processed=target.dataset.padExport==='wet';
      const fx=sampleEffect(pad.fx);
      const wav=processed
        ?await this.engine.exportMix([{...defaults(),...fx.settings,id:'pad-export',name:pad.name,
          type:'audio',buffer,volume:85,bus:'music',muted:false,solo:false}],{depth:24,rate:48000})
        :encodeWav(buffer,24);
      downloadBlob(wav,safeFilename(pad.name)+(processed?'-con-fx':'-original')+'.wav');
      this.say('Sample exportado como WAV '+(processed?'procesado':'original'));
    }catch(error){this.say('No se pudo exportar el pad: '+error.message);}
    return;
  }
  if(target.hasAttribute('data-pad-import')){this.root.querySelector('#sampleFile')?.click();return;}
  if(target.hasAttribute('data-pad-from-track')){
    const item=this.onSource();if(!item?.buffer){this.say('Selecciona una pista con sonido primero');return;}
    try{
      const from=Math.max(0,item.from||0),to=Math.min(item.buffer.duration,from+30,item.to??item.buffer.duration);
      if(to-from<.02)throw Error('La selección es demasiado corta');
      const ctx=await this.engine.ready(),buffer=copySample(ctx,item.buffer,from,to);
      this.draft={buffer,from:0,to:buffer.duration,name:safePadName(item.name,this.selected)};
      this.render();this.say('Recorte listo para guardar');
    }catch(error){this.say(error.message);}return;
  }
  if(target.hasAttribute('data-pad-save')){
    if(!this.draft)return;
    try{
      const name=safePadName(this.root.querySelector('#sampleName')?.value,this.selected);
      const next={...this.draft,name};padBounds(next.buffer,next.from,next.to);
      await savePad(this.selected,next);this.pads[this.selected]=next;this.draft={...next};
      this.render();this.onLibraryChanged();this.say('Pad guardado en este dispositivo');
    }catch(error){this.say('No se guardó: '+error.message);}return;
  }
  if(target.hasAttribute('data-pad-insert')){
    const pad=this.draft||this.pads[this.selected];if(!pad)return;
    try{const ctx=await this.engine.ready(),buffer=copySample(ctx,pad.buffer,pad.from,pad.to);
      const route=this.root.querySelector('#sampleInsertRoute')?.value||'samples',track=this.onAdd(buffer,pad.name,sampleEffect(pad.fx).settings,{route});const actual=route==='selected'&&!track?.flowTo?.startsWith('track:')?'SAMPLE BUS':route==='master'?'MASTER':route==='selected'?'la pista seleccionada':'SAMPLE BUS';this.say('Sample insertado en '+actual+'.');}
    catch(error){this.say(error.message);}return;
  }
  if(target.hasAttribute('data-pad-remove')){this.pendingPadRemoval=true;this.render();return;}
  if(target.hasAttribute('data-pad-remove-cancel')){this.pendingPadRemoval=false;this.render();return;}
  if(target.hasAttribute('data-pad-remove-confirm')){
    try{await savePad(this.selected,null);this.pads[this.selected]=null;this.draft=null;this.render();this.onLibraryChanged();this.say('Pad vaciado');}
    catch(error){this.say(error.message);}
  }
 }
 async refreshAssets(){
  this.assets=await listLibrarySamples();this.render();
  return this.assets;
 }
 async playLibrary(id){
  try{
   const pad=await loadLibrarySample(id);
   if(SAMPLE_FX[pad.fx]&&pad.fx!=='original')return await this.engine.previewSample(pad.buffer,pad.from,pad.to,sampleEffect(pad.fx).settings);
   const ctx=await this.engine.ready(),source=ctx.createBufferSource();
   source.buffer=pad.buffer;source.connect(this.engine.output.gain);source.start(ctx.currentTime,pad.from,pad.to-pad.from);
   source.onended=()=>{try{source.disconnect();}catch{}};return source;
  }catch(error){this.say('No se pudo reproducir el sample: '+error.message);}
 }
 async addLibrary(id,route='samples'){
  try{
   const pad=await loadLibrarySample(id),ctx=await this.engine.ready(),buffer=copySample(ctx,pad.buffer,pad.from,pad.to);
   const track=this.onAdd(buffer,pad.name,sampleEffect(pad.fx).settings,{route});
   const actual=route==='selected'&&!track?.flowTo?.startsWith('track:')?'SAMPLE BUS':route==='master'?'MASTER':route==='selected'?'la pista seleccionada':'SAMPLE BUS';
   this.say('Sample añadido a '+actual+'.');
  }catch(error){this.say('No se pudo añadir: '+error.message);}
 }
 async copyLibraryToPad(id){
  try{
   const index=this.pads.findIndex(pad=>!pad);
   if(index<0)throw Error('No hay pads libres. Vacía uno para copiar el sample.');
   const sample=await loadLibrarySample(id);
   await savePad(index,sample);this.pads[index]=sample;this.selected=index;this.draft={...sample};this.pendingPadRemoval=false;
   this.render();this.onLibraryChanged();this.say('Sample copiado al pad '+String(index+1).padStart(2,'0')+'.');
  }catch(error){this.say('No se pudo copiar al pad: '+error.message);}
 }
 async exportLibrary(id){
  try{
   const sample=await loadLibrarySample(id),ctx=await this.engine.ready(),buffer=copySample(ctx,sample.buffer,sample.from,sample.to);
   downloadBlob(encodeWav(buffer,24),safeFilename(sample.name)+'-guardado.wav');
   this.say('WAV del sample guardado exportado.');
  }catch(error){this.say('No se pudo exportar el sample: '+error.message);}
 }
 async removeLibrary(id){
  if(this.pendingDelete!==id)return;
  try{await deleteLibrarySample(id);this.pendingDelete=null;await this.refreshAssets();this.onLibraryChanged();this.say('Sample eliminado de la biblioteca.');}
  catch(error){this.say(error.message);}
 }
 async change(event){
  if(event.target.id==='sampleFx'){
    if(this.selected!==null){this.draft={...(this.draft||this.pads[this.selected]),fx:sampleEffect(event.target.value)===SAMPLE_FX.original?'original':event.target.value};this.say('Efecto elegido. Pulsa Guardar pad para conservarlo.');}
    return;
  }
  if(event.target.id!=='sampleFile')return;
  const file=event.target.files?.[0];if(!file)return;
  try{
   const buffer=await this.engine.decode(file);
   if(buffer.duration>30)throw Error('Este audio supera 30 segundos: impórtalo como pista y usa ✂ Desde la pista.');
   this.draft={buffer,from:0,to:buffer.duration,name:safePadName(file.name.replace(/\.[^.]+$/,''),this.selected)};
   this.render();this.say('Recorta y guarda tu sample');
  }catch(error){this.say('No se pudo importar: '+error.message);}
 }
 input(event){
  if(!this.draft||!['sampleStart','sampleEnd'].includes(event.target.id))return;
  const start=Number(this.root.querySelector('#sampleStart')?.value),end=Number(this.root.querySelector('#sampleEnd')?.value);
  if(end-start<.02)return;
  this.draft.from=start;this.draft.to=end;
  const wave=this.root.querySelector('.sample-editor-wave');if(wave)wave.innerHTML=padWaveSVG(this.draft.buffer,start,end);
  this.root.querySelector('#sampleStartLabel').textContent=start.toFixed(2)+' s';
  this.root.querySelector('#sampleEndLabel').textContent=end.toFixed(2)+' s';
 }
 async play(index){
  const pad=this.pads[index];if(!pad)return;
  try{
   if(pad.fx&&pad.fx!=='original'){
     const source=await this.engine.previewSample(pad.buffer,pad.from,pad.to,sampleEffect(pad.fx).settings);
     const tile=this.root.querySelector('[data-pad-play="'+index+'"]');tile?.classList.add('is-playing');
     source.addEventListener('ended',()=>tile?.classList.remove('is-playing'),{once:true});
     return;
   }
   const ctx=await this.engine.ready(),source=ctx.createBufferSource();
   source.buffer=pad.buffer;source.connect(this.engine.output.gain);
   source.start(ctx.currentTime,pad.from,pad.to-pad.from);
   const tile=this.root.querySelector('[data-pad-play="'+index+'"]');tile?.classList.add('is-playing');
   source.onended=()=>{source.disconnect();tile?.classList.remove('is-playing');};
  }catch(error){this.say('No se pudo reproducir: '+error.message);}
 }
}
