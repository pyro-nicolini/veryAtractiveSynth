import {BUS_IDS,BUS_LABELS,busForTrack,formatDb} from './studio-mixer.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panText=value=>Number(value)===0?'CENTRO':Number(value)<0?'IZQ '+Math.abs(value):'DER '+value;
export function mixerMarkup(tracks,buses,selected){
  const channels=tracks.map((t,i)=>
    '<article class="mix-channel '+(t.id===selected?'mix-selected':'')+'" data-mixer-channel="'+esc(t.id)+'" style="--accent:'+(/^#[0-9a-fA-F]{6}$/.test(t.color)?t.color:'#a5ff73')+'">'+
      '<div class="mix-channel-head"><button class="mix-name" data-mix-select="'+esc(t.id)+'" title="Seleccionar canal '+esc(t.name)+'">'+esc(t.name)+'</button><span>'+String(i+1).padStart(2,'0')+'</span></div>'+
      '<div class="mix-meter" title="Nivel aproximado después del fader"><div class="mix-meter-fill" data-mix-meter="'+esc(t.id)+'"></div></div>'+
      '<output class="mix-db" data-mix-value="'+esc(t.id)+'">'+formatDb(t.volume)+'</output>'+
      '<input type="range" min="0" max="100" step="1" value="'+Math.max(0,Math.min(100,t.volume??85))+'" data-mix-volume="'+esc(t.id)+'" aria-label="Volumen de '+esc(t.name)+'">'+
      '<label class="mix-label">PAN <input type="range" min="-100" max="100" step="1" value="'+Math.max(-100,Math.min(100,t.pan||0))+'" data-mix-pan="'+esc(t.id)+'" aria-label="Panorámica de '+esc(t.name)+'"></label>'+
      '<small data-mix-pantext="'+esc(t.id)+'">'+panText(t.pan)+'</small>'+
      '<div class="mix-track-toggles"><button type="button" data-mix-mute="'+esc(t.id)+'" aria-pressed="'+!!t.muted+'" class="'+(t.muted?'on':'')+'" aria-label="Silenciar '+esc(t.name)+'">M</button><button type="button" data-mix-solo="'+esc(t.id)+'" aria-pressed="'+!!t.solo+'" class="'+(t.solo?'on':'')+'" aria-label="Solo '+esc(t.name)+'">S</button></div>'+
      '<label class="mix-label">DESTINO <select data-mix-route="'+esc(t.id)+'" aria-label="Bus de salida de '+esc(t.name)+'">'+BUS_IDS.map(id=>
        '<option value="'+id+'" '+(id===busForTrack(t)?'selected':'')+'>'+BUS_LABELS[id]+'</option>').join('')+'</select></label>'+
    '</article>').join('');
  const groups=BUS_IDS.map(id=>'<article class="mix-bus" data-mixer-bus="'+id+'">'+
    '<div class="mix-channel-head"><strong>'+BUS_LABELS[id]+'</strong><span>BUS</span></div>'+
    '<div class="mix-meter"><div class="mix-meter-fill" data-mix-bus-meter="'+id+'"></div></div>'+
    '<output class="mix-db" data-mix-bus-value="'+id+'">'+formatDb(buses[id])+'</output>'+
    '<input type="range" min="0" max="100" step="1" value="'+buses[id]+'" data-mix-bus-volume="'+id+'" aria-label="Volumen bus '+BUS_LABELS[id]+'">'+
    '<small class="mix-description">Grupo de señales</small></article>').join('');
  return '<div class="mix-section"><h3>PISTAS</h3><div class="mix-scroll">'+(channels||'<p class="mix-empty">Agrega una pista para comenzar.</p>')+'</div></div>'+
    '<div class="mix-section"><h3>BUSES DE GRUPO</h3><div class="mix-scroll">'+groups+'</div></div>';
}
export function updateMixerMeters(root,engine,tracks){
  if(!root||root.hidden)return;
  const elements=Array.from(root.querySelectorAll('[data-mix-meter]'));
  for(const track of tracks){
    const meter=elements.find(element=>element.dataset.mixMeter===track.id);
    if(meter)meter.style.height=Math.min(100,Math.sqrt(engine.getTrackMeter(track.id).rms)*145)+'%';
  }
  for(const id of BUS_IDS){
    const meter=root.querySelector('[data-mix-bus-meter="'+id+'"]');
    if(meter)meter.style.height=Math.min(100,Math.sqrt(engine.getBusMeter(id).rms)*145)+'%';
  }
}
