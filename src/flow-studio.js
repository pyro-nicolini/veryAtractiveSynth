/* Voice Flow: lightweight, accessible map of REAL mixer tracks and effect bypass.
 * Nodes/edges are a presentation of existing audio routing, not a separate
 * pretend sound engine. Dragging FX tiles onto a track enables WebAudio DSP.
 */
import {FX_CHAIN,isFxBypassed} from './fx-rack.js';
import {formatDb,BUS_IDS,BUS_LABELS,busForTrack} from './studio-mixer.js';
export const FLOW_MIN_WIDTH=830;
export const FLOW_NODE_WIDTH=220;
export function flowPosition(track,index,positions={}){
  const stored=positions?.[track.id];
  return stored&&Number.isFinite(stored.x)&&Number.isFinite(stored.y)?
    {x:Math.max(12,Math.min(5000,stored.x)),y:Math.max(12,Math.min(3000,stored.y))}:
    {x:50+index*252,y:({vocals:100,music:340,fx:580}[busForTrack(track)]||340)};
}
export function flowHeight(trackCount){return 755+Math.max(0,trackCount)*5;}
export function flowMarkup(tracks,positions={},selectedId=null){
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={tune:'Afinación',clean:'Limpieza',eq:'Tono',drive:'Calor',compressor:'Compresión',delay:'Eco',reverb:'Espacio'};
  const palette='<div class="flow-palette"><div class="flow-palette-copy"><strong>01 · Arrastra un efecto</strong><small>O tócalo y luego elige una pista. Si lo retiras, conservarás su configuración.</small></div>'+
    '<div class="flow-palette-items">'+FX_CHAIN.map(f=>
      '<button type="button" draggable="true" data-flow-palette="'+f.id+'" title="'+escape(f.hint)+'" aria-label="Elegir efecto '+escape(f.label)+'" class="flow-effect-tile"><span class="flow-effect-symbol">'+({tune:'✧',clean:'◌',eq:'≋',drive:'♨',compressor:'◈',delay:'↺',reverb:'✦'}[f.id])+'</span><strong>'+names[f.id]+'</strong><small>Arrastrar ＋</small></button>'
    ).join('')+'</div><div class="flow-remove-zone" id="flowRemoveZone" aria-label="Soltar efecto aquí para desactivarlo">↩ Soltar aquí para quitar un efecto de una pista</div></div>';
  const visible=tracks.filter(t=>!t.flowHidden);
  const groups=Object.fromEntries(BUS_IDS.map(id=>[id,visible.filter(track=>busForTrack(track)===id)]));
  const laneIndex=Object.fromEntries(BUS_IDS.flatMap(id=>groups[id].map((track,index)=>[track.id,index])));
  const longest=Math.max(1,...BUS_IDS.map(id=>groups[id].length));
  const boardWidth=Math.max(FLOW_MIN_WIDTH,530+longest*252);
  const busX=boardWidth-400;
  const nodes=visible.map(track=>{
    const p=flowPosition(track,laneIndex[track.id]||0,positions),off=track.muted;
    const effects=FX_CHAIN.filter(f=>!isFxBypassed(track,f.id)&&(
      f.id==='tune'?track.autotune>1:f.id==='clean'?track.clean>1:
      f.id==='eq'?Math.abs(track.brightness-50)>7||Math.abs(track.warmth-20)>7:
      f.id==='drive'?track.drive>1:f.id==='delay'?track.echo>1:
      f.id==='reverb'?track.space>1:true));
    return '<article class="flow-node '+(track.id===selectedId?'flow-node-selected ':'')+(off?'flow-node-off':'')+
      '" data-flow-track="'+escape(track.id)+'" data-flow-route="'+busForTrack(track)+'" style="left:'+p.x+'px;top:'+p.y+'px;--flow-accent:'+(/^#[0-9a-fA-F]{6}$/.test(track.color)?track.color:'#81a0d3')+'">'+
      '<div class="flow-node-top" data-flow-drag="'+escape(track.id)+'" tabindex="0" title="Arrastra para mover este nodo" aria-label="Mover nodo '+escape(track.name)+'"><span class="flow-source-icon">'+(track.type==='voice'?'◉':track.type==='demo'?'♫':'≋')+'</span>'+
      '<div><strong>'+escape(track.name)+'</strong><small>'+(track.type==='voice'?'Tu voz':'Tu sonido')+' · '+formatDb(track.volume)+'</small></div><span class="flow-move-icon">⠿</span></div>'+
      '<div class="flow-fx-drop" data-flow-drop="'+escape(track.id)+'" tabindex="0" aria-label="Soltar un efecto para '+escape(track.name)+'">'+
      (effects.length?effects.map(f=>'<button class="flow-fx-pill" draggable="true" data-flow-effect="'+f.id+'" data-flow-owner="'+escape(track.id)+'" title="Retirar '+names[f.id]+' (sin borrar ajustes)">'+names[f.id]+' <span>×</span></button>').join(''):'<span class="flow-fx-placeholder">＋ Suelta aquí un efecto</span>')+
      '</div>'+
      '<label class="flow-route-label" title="Elige el grupo al que se conecta este canal">A BUS <select data-flow-route-select="'+escape(track.id)+'" aria-label="Destino de '+escape(track.name)+'">'+BUS_IDS.map(id=>'<option value="'+id+'" '+(busForTrack(track)===id?'selected':'')+'>'+BUS_LABELS[id]+'</option>').join('')+'</select></label>'+
      '<div class="flow-node-bottom"><button type="button" data-flow-focus="'+escape(track.id)+'" aria-label="Editar '+escape(track.name)+'">Ajustar</button>'+
      '<button type="button" data-flow-link="'+escape(track.id)+'" aria-pressed="'+(!off)+'">'+(off?'◎ Reconectar':'● Conectada')+'</button><button type="button" data-flow-delete="'+escape(track.id)+'" title="Desconectar y luego retirar" aria-label="Desconectar o retirar nodo">×</button></div>'+
      '<span class="flow-port" aria-hidden="true"></span></article>';
  }).join('');
  const lanes=BUS_IDS.map(id=>'<div class="flow-lane-tag flow-lane-'+id+'" style="top:'+({vocals:58,music:298,fx:538}[id])+'px"><span>'+({vocals:'01 · VOCES',music:'02 · INSTRUMENTOS',fx:'03 · EFECTOS'}[id])+'</span><small>'+groups[id].length+' canal(es)</small></div>').join('');
  const busNodes=BUS_IDS.map(id=>'<aside class="flow-bus-node flow-bus-'+id+'" data-flow-bus="'+id+'" style="left:'+busX+'px;top:'+({vocals:119,music:359,fx:599}[id])+'px"><span class="flow-bus-orb">◈</span><div><small>BUS / SUMA REAL</small><strong>'+BUS_LABELS[id]+'</strong><small>Enrutar pistas aquí</small></div></aside>').join('');
  const master='<aside class="flow-master" id="flowMaster"><div class="flow-master-orb">◉</div><strong>MASTER</strong><small>MEZCLA FINAL</small><span>Voces, música y FX convergen aquí</span></aside>';
  return palette+'<div class="flow-board-scroller"><div class="flow-board" id="flowBoard" style="width:'+boardWidth+'px;height:'+flowHeight(visible.length)+'px">'+
    '<svg id="flowWires" class="flow-wires" aria-hidden="true"></svg>'+lanes+nodes+busNodes+master+
    (visible.length?'':'<div class="flow-welcome">Tus pistas aparecerán como planetas de sonido. Agrega una voz o un ritmo para empezar.</div>')+
    '</div></div><p class="flow-footnote">Cables reales: pista → bus de voz, música o FX → master. Cambia el destino de cada pista con «A BUS». El mapa es libre de reorganizar; no encadena procesadores entre pistas. Supr desconecta y después oculta sin borrar.</p>';
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
// Layout cache is keyed by the current board DOM node. Normal playback only
// updates existing SVG 'd' attributes and glow transforms, NOT boxes or HTML.
const flowGeometryCache=new WeakMap();
export function invalidateFlowWireGeometry(root){
  const board=root?.querySelector('#flowBoard');
  if(board)flowGeometryCache.delete(board);
}
function getFlowGeometry(board,svg,master){
  const cached=flowGeometryCache.get(board);
  if(cached)return cached;
  const parent=board.getBoundingClientRect(),target=master.getBoundingClientRect();
  const mx=target.left-parent.left+4,my=target.top-parent.top+target.height/2;
  const buses=new Map(Array.from(board.querySelectorAll('[data-flow-bus]')).map(node=>{
    const r=node.getBoundingClientRect();
    return [node.dataset.flowBus,{id:node.dataset.flowBus,node,x:r.left-parent.left+3,y:r.top-parent.top+r.height/2,right:r.right-parent.left}];
  }));
  svg.setAttribute('viewBox','0 0 '+Math.round(parent.width)+' '+Math.round(parent.height));
  const existing=new Map(Array.from(svg.querySelectorAll('[data-flow-wire]')).map(el=>[el.dataset.flowWire,el]));
  const entries=[];
  for(const node of board.querySelectorAll('[data-flow-track]')){
    const id=node.dataset.flowTrack,r=node.getBoundingClientRect();
    let path=existing.get(id);
    if(!path){
      path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('data-flow-wire',id);
      path.classList.add('flow-wire');
      svg.appendChild(path);
    }
    const bus=buses.get(node.dataset.flowRoute);
    entries.push({
      id,path,node,glow:node.querySelector('.flow-source-icon'),
      x:r.right-parent.left,y:r.top-parent.top+r.height/2,
      mx:bus?.x??mx,my:bus?.y??my,level:0
    });
    existing.delete(id);
  }
  for(const bus of buses.values()){
    const id='bus:'+bus.id;
    let path=existing.get(id);
    if(!path){path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('data-flow-wire',id);path.classList.add('flow-wire','flow-bus-wire');svg.appendChild(path);}
    entries.push({id,path,node:bus.node,busId:bus.id,isBus:true,x:bus.right,y:bus.y,mx,my,level:0});
    existing.delete(id);
  }
  for(const stale of existing.values())stale.remove();
  const layout={entries};
  flowGeometryCache.set(board,layout);
  return layout;
}
export function updateFlowWires(root,tracks,engine,animate=true,time=0){
  const board=root?.querySelector('#flowBoard'),svg=root?.querySelector('#flowWires'),master=root?.querySelector('#flowMaster');
  if(!board||!svg||!master)return;
  const layout=getFlowGeometry(board,svg,master);
  const byId=new Map(tracks.map(track=>[track.id,track]));
  for(const entry of layout.entries){
    const track=byId.get(entry.id);
    if(!track&&!entry.isBus)continue;
    const audible=animate&&(entry.isBus||!track.muted);
    // Real channel/bus metres drive the light in each connection, with cached geometry.
    const rms=audible?Math.max(0,Number(entry.isBus?engine.getBusMeter?.(entry.busId)?.rms:engine.getTrackMeter(track.id)?.rms)||0):0;
    const target=audible?Math.min(1,Math.sqrt(rms)*3.2):0;
    entry.level=audible?entry.level+(target-entry.level)*(target>entry.level?.43:.19):0;
    const energy=entry.level;
    const path=entry.path;
    path.setAttribute('d',wireCurve(entry.x,entry.y,entry.mx,entry.my,energy,audible?time:0));
    path.classList.toggle('flow-wire-off',!!track?.muted);
    path.style.setProperty('--flow-wire-color',entry.isBus?'#e6487b':audible?'#ed729d':(track.color||'#9da9ca'));
    path.style.strokeWidth=audible?(3+energy*4.4).toFixed(2)+'px':'3px';
    if(entry.glow)entry.glow.style.transform=audible&&energy>.025?'scale('+(1+energy*.16).toFixed(3)+')':'scale(1)';
  }
}
