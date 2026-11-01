/** Friendly drag/tap library; all entries route to actual locally generated DSP. */
import {GROOVES,VOICE_STYLES,AUTO_TRANSITIONS} from './studio-library.js';
export const LIBRARY_TABS=Object.freeze([
  {id:'rhythms',label:'Ritmos'},
  {id:'voices',label:'Estilos de voz'},
  {id:'transitions',label:'Transiciones'}
]);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function libraryMarkup(tab='rhythms'){
  const selected=LIBRARY_TABS.some(t=>t.id===tab)?tab:'rhythms';
  const list=selected==='rhythms'?GROOVES:selected==='voices'?VOICE_STYLES:AUTO_TRANSITIONS;
  return '<div class="library-tabs" role="tablist" aria-label="Categorías de sonidos">'+
    LIBRARY_TABS.map(t=>'<button type="button" role="tab" aria-selected="'+(t.id===selected)+'" data-library-tab="'+t.id+'">'+t.label+'</button>').join('')+'</div>'+
    '<div class="library-cards" role="tabpanel">'+list.map(item=>
      '<button type="button" draggable="true" class="library-card" data-library-item="'+item.id+'" data-library-kind="'+selected+'" title="Arrastra a un nodo, o pulsa para aplicar">'+
        '<span class="library-icon">'+escape(item.icon||item.emoji)+'</span>'+
        '<span class="library-copy"><strong>'+escape(item.name)+'</strong><small>'+escape(item.description||item.hint||item.category+' · '+item.bpm+' BPM')+'</small></span>'+
        '<span class="library-add" aria-hidden="true">＋</span>'+
      '</button>').join('')+'</div>'+
    '<p class="library-help">'+(selected==='rhythms'?'Ritmos originales generados aquí mismo, sin descargas. Pulsa uno para añadirlo.':
      selected==='voices'?'Prueba un estilo en tu pista seleccionada. Para otra pista, arrástralo hasta su planeta.':
      'Fundidos y cruces no destructivos. Selecciona un clip y luego pulsa o arrastra una transición.')+'</p>';
}
