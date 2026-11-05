/** Friendly drag/tap library; all entries route to actual locally generated DSP. */
import {GROOVES,VOICE_STYLES,AUTO_TRANSITIONS} from './studio-library.js';
export const LIBRARY_TABS=Object.freeze([
  {id:'rhythms',label:'Ritmos'},
  {id:'voices',label:'Estilos de voz'},
  {id:'transitions',label:'Transiciones'}
]);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function libraryMarkup(tab='rhythms',{category='all',tempo='all',favoritesOnly=false,favorites=[],previewId=null}={}){
  const selected=LIBRARY_TABS.some(t=>t.id===tab)?tab:'rhythms';
  const categories=[...new Set(GROOVES.map(g=>g.category))];
  const list=selected==='rhythms'?GROOVES.filter(g=>
    (category==='all'||g.category===category)&&
    (tempo==='all'||tempo==='slow'&&g.bpm<100||tempo==='medium'&&g.bpm>=100&&g.bpm<125||tempo==='fast'&&g.bpm>=125)&&
    (!favoritesOnly||favorites.includes(g.id))):selected==='voices'?VOICE_STYLES:AUTO_TRANSITIONS;
  const filters=selected==='rhythms'?'<div class="library-filters">'+
    '<label>Estilo <select data-library-filter="category"><option value="all">Todos</option>'+categories.map(c=>'<option value="'+escape(c)+'"'+(category===c?' selected':'')+'>'+escape(c)+'</option>').join('')+'</select></label>'+
    '<label>Tempo <select data-library-filter="tempo">'+[['all','Todos'],['slow','Hasta 99 BPM'],['medium','100–124 BPM'],['fast','125 BPM o más']].map(([id,label])=>'<option value="'+id+'"'+(tempo===id?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
    '<button type="button" data-library-favorites aria-pressed="'+favoritesOnly+'">★ Solo favoritos</button></div>':'';
  return '<div class="library-tabs" role="tablist" aria-label="Categorías de sonidos">'+
    LIBRARY_TABS.map(t=>'<button type="button" role="tab" aria-selected="'+(t.id===selected)+'" data-library-tab="'+t.id+'">'+t.label+'</button>').join('')+'</div>'+
    filters+'<div class="library-cards" role="tabpanel">'+(list.length?list.map(item=>
      '<div class="library-tile">'+
      '<button type="button" draggable="true" class="library-card" data-library-item="'+item.id+'" data-library-kind="'+selected+'" title="Arrastra a un nodo, o pulsa para aplicar">'+
        '<span class="library-icon">'+escape(item.icon||item.emoji)+'</span>'+
        '<span class="library-copy"><strong>'+escape(item.name)+'</strong><small>'+escape(item.description||item.hint||item.category+' · '+item.bpm+' BPM')+'</small></span>'+
        '<span class="library-add" aria-hidden="true">＋</span>'+
      '</button>'+(selected==='rhythms'?'<div class="library-tile-actions"><button type="button" data-library-preview="'+escape(item.id)+'" aria-label="'+(previewId===item.id?'Detener':'Escuchar')+' '+escape(item.name)+'">'+(previewId===item.id?'■ Detener':'▶ Escuchar')+'</button><button type="button" data-library-favorite="'+escape(item.id)+'" aria-label="Favorito: '+escape(item.name)+'" aria-pressed="'+favorites.includes(item.id)+'">'+(favorites.includes(item.id)?'★':'☆')+'</button></div>':'')+'</div>').join(''):'<p class="library-empty">No hay ritmos con estos filtros.</p>')+'</div>'+
    '<p class="library-help">'+(selected==='rhythms'?'Escucha un ritmo antes de añadirlo. Tus favoritos se guardan en este navegador.':
      selected==='voices'?'Prueba un estilo en tu pista seleccionada. Para otra pista, arrástralo hasta su planeta.':
      'Fundidos y cruces no destructivos. Selecciona un clip y luego pulsa o arrastra una transición.')+'</p>';
}
