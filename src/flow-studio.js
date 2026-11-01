/* Voice Flow: lightweight, accessible map of REAL mixer tracks and effect bypass.
 * Nodes/edges are a presentation of existing audio routing, not a separate
 * pretend sound engine. Dragging FX tiles onto a track enables WebAudio DSP.
 */
import {FX_CHAIN,isFxBypassed} from './fx-rack.js';
import {formatDb} from './studio-mixer.js';
export const FLOW_MIN_WIDTH=830;
export const FLOW_NODE_WIDTH=220;
export function flowPosition(track,index,positions={}){
  const stored=positions?.[track.id];
  return stored&&Number.isFinite(stored.x)&&Number.isFinite(stored.y)?
    {x:Math.max(12,Math.min(540,stored.x)),y:Math.max(12,Math.min(3000,stored.y))}:
    {x:45+(index%2)*104,y:32+index*160};
}
export function flowHeight(trackCount){return Math.max(355,trackCount*160+70);}
export function flowMarkup(tracks,positions={},selectedId=null){
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={tune:'Afinación',clean:'Limpieza',eq:'Tono',drive:'Calor',compressor:'Compresión',delay:'Eco',reverb:'Espacio'};
  const palette='<div class="flow-palette"><div class="flow-palette-copy"><strong>01 · Arrastra un efecto</strong><small>O tócalo y luego elige una pista. Si lo retiras, conservarás su configuración.</small></div>'+
    '<div class="flow-palette-items">'+FX_CHAIN.map(f=>
      '<button type="button" draggable="true" data-flow-palette="'+f.id+'" title="'+escape(f.hint)+'" aria-label="Elegir efecto '+escape(f.label)+'" class="flow-effect-tile"><span class="flow-effect-symbol">'+({tune:'✧',clean:'◌',eq:'≋',drive:'♨',compressor:'◈',delay:'↺',reverb:'✦'}[f.id])+'</span><strong>'+names[f.id]+'</strong><small>Arrastrar ＋</small></button>'
    ).join('')+'</div><div class="flow-remove-zone" id="flowRemoveZone" aria-label="Soltar efecto aquí para desactivarlo">↩ Soltar aquí para quitar un efecto de una pista</div></div>';
  const visible=tracks.filter(t=>!t.flowHidden);
  const nodes=visible.map((track,index)=>{
    const p=flowPosition(track,index,positions),off=track.muted;
    const effects=FX_CHAIN.filter(f=>!isFxBypassed(track,f.id)&&(
      f.id==='tune'?track.autotune>1:f.id==='clean'?track.clean>1:
      f.id==='eq'?Math.abs(track.brightness-50)>7||Math.abs(track.warmth-20)>7:
      f.id==='drive'?track.drive>1:f.id==='delay'?track.echo>1:
      f.id==='reverb'?track.space>1:true));
    return '<article class="flow-node '+(track.id===selectedId?'flow-node-selected ':'')+(off?'flow-node-off':'')+
      '" data-flow-track="'+escape(track.id)+'" style="left:'+p.x+'px;top:'+p.y+'px;--flow-accent:'+(/^#[0-9a-fA-F]{6}$/.test(track.color)?track.color:'#81a0d3')+'">'+
      '<div class="flow-node-top" data-flow-drag="'+escape(track.id)+'" tabindex="0" title="Arrastra para mover este nodo" aria-label="Mover nodo '+escape(track.name)+'"><span class="flow-source-icon">'+(track.type==='voice'?'◉':track.type==='demo'?'♫':'≋')+'</span>'+
      '<div><strong>'+escape(track.name)+'</strong><small>'+(track.type==='voice'?'Tu voz':'Tu sonido')+' · '+formatDb(track.volume)+'</small></div><span class="flow-move-icon">⠿</span></div>'+
      '<div class="flow-fx-drop" data-flow-drop="'+escape(track.id)+'" tabindex="0" aria-label="Soltar un efecto para '+escape(track.name)+'">'+
      (effects.length?effects.map(f=>'<button class="flow-fx-pill" draggable="true" data-flow-effect="'+f.id+'" data-flow-owner="'+escape(track.id)+'" title="Retirar '+names[f.id]+' (sin borrar ajustes)">'+names[f.id]+' <span>×</span></button>').join(''):'<span class="flow-fx-placeholder">＋ Suelta aquí un efecto</span>')+
      '</div>'+
      '<div class="flow-node-bottom"><button type="button" data-flow-focus="'+escape(track.id)+'" aria-label="Editar '+escape(track.name)+'">Ajustar</button>'+
      '<button type="button" data-flow-link="'+escape(track.id)+'" aria-pressed="'+(!off)+'">'+(off?'◎ Reconectar':'● Conectada')+'</button><button type="button" data-flow-delete="'+escape(track.id)+'" title="Desconectar y luego retirar" aria-label="Desconectar o retirar nodo">×</button></div>'+
      '<span class="flow-port" aria-hidden="true"></span></article>';
  }).join('');
  const master='<aside class="flow-master" id="flowMaster"><div class="flow-master-orb">◉</div><strong>Tu canción</strong><small>MEZCLA FINAL</small><span>Todas las pistas conectadas llegan aquí</span></aside>';
  return palette+'<div class="flow-board-scroller"><div class="flow-board" id="flowBoard" style="height:'+flowHeight(visible.length)+'px">'+
    '<svg id="flowWires" class="flow-wires" aria-hidden="true"></svg>'+nodes+master+
    (visible.length?'':'<div class="flow-welcome">Tus pistas aparecerán como planetas de sonido. Agrega una voz o un ritmo para empezar.</div>')+
    '</div></div><p class="flow-footnote">Supr sobre el nodo: primera vez desconecta, segunda lo retira del mapa. La pista queda guardada en Tu mezcla.</p>';
}
export function wireCurve(ax,ay,bx,by,energy=0,time=0){
  const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy)||1,amplitude=Math.min(55,Math.max(0,energy)*55);
  const normalX=-dy/length,normalY=dx/length,segments=9;
  let d='M '+ax.toFixed(1)+' '+ay.toFixed(1);
  for(let i=0;i<segments;i++){
    const u=(i+.5)/segments,v=(i+1)/segments;
    const envelope=Math.sin(Math.PI*u);
    const vibration=Math.sin(time*.032+i*1.9+ax*.012)*amplitude*envelope;
    const cx=ax+dx*u+normalX*vibration,cy=ay+dy*u+normalY*vibration;
    const ex=ax+dx*v,ey=ay+dy*v;
    d+=' Q '+cx.toFixed(1)+' '+cy.toFixed(1)+' '+ex.toFixed(1)+' '+ey.toFixed(1);
  }
  return d;
}
export function updateFlowWires(root,tracks,engine,animate=true){
  const board=root?.querySelector('#flowBoard'),svg=root?.querySelector('#flowWires'),master=root?.querySelector('#flowMaster');
  if(!board||!svg||!master)return;
  const b=board.getBoundingClientRect(),m=master.getBoundingClientRect();
  const mx=m.left-b.left+4,my=m.top-b.top+m.height/2;
  svg.setAttribute('viewBox','0 0 '+Math.round(b.width)+' '+Math.round(b.height));
  const existing=new Map(Array.from(svg.querySelectorAll('[data-flow-wire]')).map(n=>[n.dataset.flowWire,n]));
  for(const track of tracks){
    const node=Array.from(board.querySelectorAll('[data-flow-track]')).find(n=>n.dataset.flowTrack===track.id);
    if(!node)continue;
    const r=node.getBoundingClientRect(),aX=r.right-b.left,aY=r.top-b.top+r.height/2;
    let path=existing.get(track.id);
    if(!path){path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('data-flow-wire',track.id);path.classList.add('flow-wire');svg.appendChild(path);}
    const meter=!track.muted&&animate?engine.getTrackMeter(track.id):{rms:0};
    path.setAttribute('d',wireCurve(aX,aY,mx,my,Math.min(1,Math.sqrt(meter.rms)*2.5),animate?performance.now():0));
    path.classList.toggle('flow-wire-off',!!track.muted);
    path.style.setProperty('--flow-wire-color',!track.muted&&animate?'#159dfb':(track.color||'#9da9ca'));
    path.style.strokeWidth=!track.muted&&animate?(3+Math.min(5,Math.sqrt(meter.rms)*12))+'px':'3px';
    existing.delete(track.id);
    const glow=node.querySelector('.flow-source-icon');
    if(glow)glow.style.transform=animate&&meter.rms>0.001?'scale('+(1+Math.min(.19,meter.rms*.45)).toFixed(3)+')':'scale(1)';
  }
  for(const old of existing.values())old.remove();
}
