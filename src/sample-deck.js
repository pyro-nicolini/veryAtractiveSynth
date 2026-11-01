import {PAD_KEYS,padBounds,copySample,waveformPoints,safePadName} from './sample-bank.js';
import {savePad,loadPads} from './sample-pad-store.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function padWaveSVG(buffer,from=0,to=buffer.duration){
 if(!buffer)return '';
 const points=waveformPoints(buffer,{from,to,count:30});
 const lines=points.map((v,i)=>'M'+(i*4+2)+' '+(20-Math.max(1,v*16)).toFixed(1)+' V'+(20+Math.max(1,v*16)).toFixed(1)).join(' ');
 return '<svg viewBox="0 0 120 40" preserveAspectRatio="none" class="sample-wave" role="img" aria-label="Onda del sample"><path d="'+lines+'"/></svg>';
}
export class SampleDeck{
 constructor({root,engine,onAdd,onSource,onMessage}){
  this.root=root;this.engine=engine;this.onAdd=onAdd;this.onSource=onSource;
  this.say=onMessage||(()=>{});this.pads=Array(12).fill(null);
  this.selected=null;this.draft=null;this.loaded=false;
  root.addEventListener('click',event=>this.click(event));
  root.addEventListener('input',event=>this.input(event));
  root.addEventListener('change',event=>this.change(event));
  this.render();
 }
 async load(){
  if(this.loaded)return;
  try{this.pads=await loadPads();}catch(error){this.say('Sin acceso a biblioteca local: '+error.message);}
  this.loaded=true;this.render();
 }
 render(){
  const count=this.pads.filter(Boolean).length;
  this.root.innerHTML='<div class="sample-head"><div><div class="section-overline">INSTRUMENTO · LOCAL / PRIVADO</div><h2>Sample Deck <span class="sample-counter">'+count+' / 12</span></h2><p>Doce botones. Tus sonidos, tus recortes, tu ritmo.</p></div><span class="sample-keys-hint">1—9 · 0 · − · =</span></div>'+
   '<div class="sample-grid" role="group" aria-label="12 pads de sonido">'+
   this.pads.map((pad,i)=>'<div class="sample-pad '+(this.selected===i?'selected':'')+(pad?' filled':'')+'">'+
     '<button type="button" class="sample-trigger" data-pad-play="'+i+'" aria-label="'+(pad?'Reproducir '+esc(pad.name):'Preparar pad vacío '+(i+1))+'">'+
     '<span class="sample-key">'+PAD_KEYS[i]+'</span><span class="sample-pad-name">'+esc(pad?.name||'Crear sonido')+'</span>'+
     (pad?padWaveSVG(pad.buffer,pad.from,pad.to):'<span class="sample-empty-wave">⌁</span>')+
     '<span class="sample-duration">'+(pad?(pad.to-pad.from).toFixed(2)+' s':'＋ Añadir')+'</span></button>'+
     '<button type="button" class="sample-pad-edit" data-pad-edit="'+i+'" aria-label="Editar pad '+(i+1)+'">✎</button></div>').join('')+'</div>'+
   '<div class="sample-editor" id="sampleEditor">'+(this.selected===null?'Toca ✎ para cargar, recortar o cambiar el nombre de un sample.':this.editorMarkup())+'</div>'+
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
    '<div class="sample-editor-actions"><button type="button" data-pad-import>↑ Cargar audio</button>'+
    '<button type="button" data-pad-from-track>✂ Desde la pista</button>'+
    '<button type="button" data-pad-save '+(!pad?'disabled':'')+'>✓ Guardar pad</button>'+
    (pad?'<button type="button" data-pad-insert>＋ Enviar a pistas</button><button type="button" data-pad-remove>Eliminar</button>':'')+'</div>';
 }
 select(i){this.selected=i;this.draft=this.pads[i]?{...this.pads[i]}:null;this.render();}
 async click(event){
  const target=event.target.closest('button');if(!target)return;
  if(target.hasAttribute('data-pad-edit')){this.select(Number(target.dataset.padEdit));return;}
  if(target.hasAttribute('data-pad-play')){
    const i=Number(target.dataset.padPlay);
    if(this.pads[i])await this.play(i);else this.select(i);
    return;
  }
  if(target.hasAttribute('data-pad-close')){this.selected=null;this.draft=null;this.render();return;}
  if(this.selected===null)return;
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
      this.render();this.say('Pad guardado en este dispositivo');
    }catch(error){this.say('No se guardó: '+error.message);}return;
  }
  if(target.hasAttribute('data-pad-insert')){
    const pad=this.draft||this.pads[this.selected];if(!pad)return;
    try{const ctx=await this.engine.ready(),buffer=copySample(ctx,pad.buffer,pad.from,pad.to);
      this.onAdd(buffer,pad.name);this.say('Sample agregado como pista');}
    catch(error){this.say(error.message);}return;
  }
  if(target.hasAttribute('data-pad-remove')){
    if(!confirm('¿Vaciar este pad? Los demás seguirán guardados.'))return;
    try{await savePad(this.selected,null);this.pads[this.selected]=null;this.draft=null;this.render();this.say('Pad vaciado');}
    catch(error){this.say(error.message);}
  }
 }
 async change(event){
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
   const ctx=await this.engine.ready(),source=ctx.createBufferSource();
   source.buffer=pad.buffer;source.connect(this.engine.output.gain);
   source.start(ctx.currentTime,pad.from,pad.to-pad.from);
   const tile=this.root.querySelector('[data-pad-play="'+index+'"]');tile?.classList.add('is-playing');
   source.onended=()=>{source.disconnect();tile?.classList.remove('is-playing');};
  }catch(error){this.say('No se pudo reproducir: '+error.message);}
 }
}
