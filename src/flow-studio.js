/* Signal Flow / modular patchbay. Every link is backed by WebAudio routing.
 * Processor chips reflect the actual FIXED rack order. The patchbay changes
 * TRACK destination, not processor order, and rejects feedback cycles.
 */
import {FX_CHAIN,isFxBypassed} from './fx-rack.js';
import {formatDb,BUS_IDS,BUS_LABELS,busForTrack} from './studio-mixer.js';
import {routeFor,canConnect} from './flow-routing.js';
export const FLOW_MIN_WIDTH=940;
export const FLOW_NODE_WIDTH=205;
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FX_LABEL={tune:'TUNE',clean:'CLEAN',eq:'EQ',drive:'DRIVE',compressor:'COMP',delay:'DELAY',reverb:'REVERB'};
const FX_ICON={tune:'✦',clean:'◌',eq:'≋',drive:'◈',compressor:'◉',delay:'↺',reverb:'✧'};
function enabledEffects(track){
 if(track.bypassEffects)return [];
 return FX_CHAIN.filter(f=>!isFxBypassed(track,f.id)&&(
  f.id==='tune'?track.autotune>1:f.id==='clean'?track.clean>1:
  f.id==='eq'?Math.abs(track.brightness-50)>7||Math.abs(track.warmth-20)>7:
  f.id==='drive'?track.drive>1:f.id==='delay'?track.echo>1:
  f.id==='reverb'?track.space>1:true));
}
export function flowPosition(track,index,positions={}){
 const p=positions?.[track.id];
 return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?
  {x:Math.max(12,Math.min(7000,p.x)),y:Math.max(12,Math.min(3000,p.y))}:
  {x:70+index*315,y:busForTrack(track)==='vocals'?128:429};
}
export function flowHeight(){return 710;}
function paletteMarkup(pads,assets){
 const fx='<div class="patch-group"><div class="patch-group-title">PROCESADORES <small>Arrastra sobre una pista</small></div><div class="patch-palette-grid">'+
 FX_CHAIN.map(f=>'<button class="flow-effect-tile" type="button" draggable="true" data-flow-palette="'+f.id+'" title="'+escape(f.hint)+'"><span class="flow-effect-symbol">'+FX_ICON[f.id]+'</span><strong>'+FX_LABEL[f.id]+'</strong><small>+ FX</small></button>').join('')+'</div></div>';
 const padCards=(pads||[]).map((pad,i)=>pad?'<button class="patch-sample" type="button" draggable="true" data-flow-sample="pad:'+i+'" title="Añadir '+escape(pad.name)+' como pista"><span>▦</span><strong>'+escape(pad.name)+'</strong><small>PAD '+(i+1)+'</small></button>':'').join('');
 const saved=(assets||[]).map(item=>'<button class="patch-sample" type="button" draggable="true" data-flow-sample="lib:'+escape(item.id)+'" title="Añadir a la mezcla"><span>♫</span><strong>'+escape(item.name)+'</strong><small>'+Number(item.duration||0).toFixed(1)+' s</small></button>').join('');
 return '<aside class="patch-sidebar" aria-label="Biblioteca de módulos y samples"><div class="patch-sidebar-title">COMPONENTES <small>LOCAL · PRIVADO</small></div>'+fx+
  '<div class="patch-group"><div class="patch-group-title">MIS SAMPLES <small>Persistentes en este equipo</small></div><div class="patch-sample-list">'+
  (padCards||'<p class="patch-empty">Abre SAMPLES para cargar tus pads.</p>')+saved+'</div>'+
  '<button type="button" class="patch-open-deck" data-flow-open-deck>＋ Abrir banco / cortar audio</button></div>'+
  '<div class="flow-remove-zone" id="flowRemoveZone">Arrastra un efecto aquí para quitarlo, sin borrar sus ajustes.</div></aside>';
}
export function flowMarkup(tracks,positions={},selectedId=null,pads=[],assets=[]){
 const visible=tracks.filter(t=>!t.flowHidden);
 const lanes=['vocals','music'];
 const grouped=Object.fromEntries(lanes.map(l=>[l,visible.filter(t=>busForTrack(t)===l)]));
 // Compatibility: aux-FX tracks remain visible in the MUSIC row.
 grouped.music.push(...visible.filter(t=>busForTrack(t)==='fx'));
 const geom=new Map();
 let required=FLOW_MIN_WIDTH;
 lanes.forEach(lane=>{
   let x=75;const y=lane==='vocals'?132:430;
   grouped[lane].forEach((t,i)=>{
     const stored=positions?.[t.id];
     const p=stored&&Number.isFinite(stored.x)&&Number.isFinite(stored.y)?
       flowPosition(t,i,positions):{x,y};
     const effects=enabledEffects(t);
     geom.set(t.id,{...p,effects});
     x=Math.max(x,p.x+FLOW_NODE_WIDTH+55+effects.length*136+38);
   });
   required=Math.max(required,x+450);
 });
 const boardWidth=Math.min(12000,required);
 const busX=boardWidth-405;
 const cards=visible.map(t=>{
  const g=geom.get(t.id);if(!g)return '';
  const dest=routeFor(t,tracks);
  const options=['master',...BUS_IDS.map(id=>'bus:'+id),...visible.filter(other=>other.id!==t.id&&busForTrack(other)===busForTrack(t)&&canConnect(tracks,t.id,'track:'+other.id)).map(other=>'track:'+other.id)];
  const destLabels=x=>x==='master'?'MASTER':x.startsWith('bus:')?'BUS · '+BUS_LABELS[x.slice(4)]:'PISTA · '+(tracks.find(o=>o.id===x.slice(6))?.name||'');
  const optionsHTML=options.map(v=>'<option value="'+escape(v)+'" '+(dest===v?'selected':'')+'>'+escape(destLabels(v))+'</option>').join('');
  return '<article class="flow-node '+(t.id===selectedId?'flow-node-selected ':'')+(t.muted?'flow-node-off ':'')+
  '" data-flow-track="'+escape(t.id)+'" data-flow-route="'+escape(dest)+'" style="left:'+g.x+'px;top:'+g.y+'px;--flow-accent:'+(/^#[0-9a-fA-F]{6}$/.test(t.color)?t.color:'#20c5c2')+'">'+
  '<button class="patch-port patch-port-in" data-flow-in="'+escape(t.id)+'" type="button" title="Conectar cable a '+escape(t.name)+'" aria-label="Entrada de '+escape(t.name)+'"></button>'+
  '<div class="flow-node-top" data-flow-drag="'+escape(t.id)+'" tabindex="0" aria-label="Mover pista '+escape(t.name)+' con flechas o arrastrar"><span class="flow-source-icon">'+(t.type==='voice'?'◉':'♫')+'</span><div><strong>'+escape(t.name)+'</strong><small>'+(t.type==='voice'?'VOICE TRACK':'AUDIO TRACK')+' · '+formatDb(t.volume)+'</small></div><span class="flow-move-icon">⠿</span></div>'+
  '<div class="patch-node-wave">▂▆▅▇▃▆▂▇▅▃▆▂▇▅▂▆▃▇▅</div>'+
  '<label class="flow-route-label">SALIDA <select data-flow-destination="'+escape(t.id)+'" aria-label="Conectar salida de '+escape(t.name)+'">'+optionsHTML+'</select></label>'+
  '<div class="flow-node-bottom"><button type="button" data-flow-focus="'+escape(t.id)+'">◫ Editar</button><button type="button" data-flow-link="'+escape(t.id)+'" aria-pressed="'+(!t.muted)+'">'+(t.muted?'◌ OFF':'● ON')+'</button><button type="button" data-flow-delete="'+escape(t.id)+'" title="Silenciar / ocultar">×</button></div>'+
  '<button class="patch-port patch-port-out" data-flow-out="'+escape(t.id)+'" type="button" title="Iniciar cable desde '+escape(t.name)+'" aria-label="Salida de '+escape(t.name)+'"></button></article>';
 }).join('');
 const effectCards=visible.flatMap(t=>{
  const g=geom.get(t.id);if(!g)return [];
  return g.effects.map((fx,i)=>{
   const left=g.x+FLOW_NODE_WIDTH+48+i*136;
   return '<div class="patch-fx-node" data-flow-fx-node="'+escape(t.id)+':'+fx.id+'" data-flow-owner="'+escape(t.id)+'" style="left:'+left+'px;top:'+(g.y+36)+'px"><span class="patch-fx-port patch-fx-input"></span><div class="patch-fx-symbol">'+FX_ICON[fx.id]+'</div><strong>'+FX_LABEL[fx.id]+'</strong><small>FX INSERT</small><button type="button" data-flow-effect="'+fx.id+'" data-flow-owner="'+escape(t.id)+'" title="Desactivar efecto" aria-label="Quitar '+fx.label+'">×</button><span class="patch-fx-port patch-fx-output"></span></div>';
  });
 }).join('');
 const buses=lanes.map(l=>'<div class="flow-bus-node flow-bus-'+l+'" data-flow-bus="'+l+'" data-flow-in="bus:'+l+'" style="left:'+busX+'px;top:'+(l==='vocals'?158:455)+'px"><span class="flow-bus-orb">'+(l==='vocals'?'◉':'≋')+'</span><div><small>SUMADOR</small><strong>'+BUS_LABELS[l]+'</strong><small>→ MASTER</small></div></div>').join('');
 // Dedicated FX return keeps existing sessions that explicitly used the fx bus.
 const fxBus='<div class="flow-bus-node flow-bus-fx" data-flow-bus="fx" data-flow-in="bus:fx" style="left:'+busX+'px;top:605px"><span class="flow-bus-orb">✧</span><div><small>RETORNO</small><strong>FX</strong></div></div>';
 const master='<div class="flow-master" id="flowMaster" data-flow-in="master" style="left:'+(busX+235)+'px;right:auto;top:320px;transform:none"><div class="flow-master-orb">◉</div><strong>MASTER OUT</strong><small>STEREO / 48 KHZ</small><span>Salida final</span></div>';
 const laneTags='<div class="patch-lane-title" style="top:28px"><span class="patch-lane-dot voices"></span>01 · VOICE SIGNAL <small>Voces y procesadores en serie</small></div>'+
 '<div class="patch-lane-title" style="top:340px"><span class="patch-lane-dot music"></span>02 · TRACK SIGNAL <small>Instrumentos, loops y samples</small></div>';
 const empty=!visible.length?'<div class="flow-welcome">Agrega un sonido, arrastra un efecto o reutiliza un sample desde la biblioteca.</div>':'';
 return '<div class="patch-workspace">'+paletteMarkup(pads,assets)+'<div class="patch-main"><div class="patch-toolbar"><span class="patch-live-dot"></span><strong>PATCHBAY</strong><span>Salida → entrada · misma línea · sin ciclos</span><span class="patch-connection-hint">Clic en puerto derecho, luego puerto izquierdo</span></div>'+
 '<div class="flow-board-scroller"><div class="flow-board" id="flowBoard" style="width:'+boardWidth+'px;height:'+flowHeight()+'px">'+
 '<svg class="flow-wires" id="flowWires" aria-hidden="true"></svg>'+laneTags+cards+effectCards+buses+fxBus+master+empty+'</div></div>'+
 '<p class="flow-footnote">Audio real: cada pista procesa su entrada y envía la señal al siguiente nodo o al bus. Los insertos FX siguen el orden real del motor. Para evitar cambios inesperados, los proyectos anteriores conservan sus destinos originales hasta que los conectes.</p></div></div>';
}
export function wireCurve(ax,ay,bx,by,energy=0,time=0){
 const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy)||1,amp=Math.min(21,Math.max(0,energy)*24);
 const nx=-dy/length,ny=dx/length;
 let d='M '+ax.toFixed(1)+' '+ay.toFixed(1);
 for(let i=0;i<6;i++){const u=(i+.5)/6,v=(i+1)/6;
  const ripple=Math.sin(time*.026+i*1.8+ax*.012)*amp*Math.sin(Math.PI*u);
  d+=' Q '+(ax+dx*u+nx*ripple).toFixed(1)+' '+(ay+dy*u+ny*ripple).toFixed(1)+' '+(ax+dx*v).toFixed(1)+' '+(ay+dy*v).toFixed(1);
 }
 return d;
}
const flowGeometryCache=new WeakMap();
export function invalidateFlowWireGeometry(root){
 const board=root?.querySelector('#flowBoard');if(board)flowGeometryCache.delete(board);
}
function getFlowGeometry(board,svg){
 const cached=flowGeometryCache.get(board);if(cached)return cached;
 const rect=board.getBoundingClientRect();
 svg.setAttribute('viewBox','0 0 '+Math.round(rect.width)+' '+Math.round(rect.height));
 const point=(el,side)=>{
   if(!el)return null;
   const r=el.getBoundingClientRect();
   return {x:(side==='right'?r.right:r.left)-rect.left,y:r.top-rect.top+r.height/2};
 };
 const entries=[],master=board.querySelector('#flowMaster');
 const paths=new Map(Array.from(svg.querySelectorAll('[data-flow-wire]')).map(el=>[el.dataset.flowWire,el]));
 const make=(id,from,to,owner,busId)=>{
  if(!from||!to)return;
  let path=paths.get(id);
  if(!path){path=document.createElementNS('http://www.w3.org/2000/svg','path');path.dataset.flowWire=id;path.classList.add('flow-wire');svg.appendChild(path);}
  entries.push({id,path,from,to,owner,busId,level:0});
  paths.delete(id);
 };
 for(const card of board.querySelectorAll('[data-flow-track]')){
  const id=card.dataset.flowTrack,fx=Array.from(board.querySelectorAll('[data-flow-fx-node]')).filter(el=>el.dataset.flowOwner===id);
  let source=card,step=0;
  for(const processor of fx){make(id+':fx:'+step++,point(source,'right'),point(processor,'left'),id);source=processor;}
  const dest=card.dataset.flowRoute;
  const target=dest==='master'?master:dest.startsWith('track:')?
    Array.from(board.querySelectorAll('[data-flow-track]')).find(el=>el.dataset.flowTrack===dest.slice(6)):
    Array.from(board.querySelectorAll('[data-flow-bus]')).find(el=>el.dataset.flowBus===dest.slice(4));
  make(id+':output',point(source,'right'),point(target,'left'),id);
 }
 for(const bus of board.querySelectorAll('[data-flow-bus]')){
  const id=bus.dataset.flowBus;
  make('bus:'+id,point(bus,'right'),point(master,'left'),null,id);
 }
 for(const path of paths.values())path.remove();
 const layout={entries};flowGeometryCache.set(board,layout);return layout;
}
export function updateFlowWires(root,tracks,engine,animate=true,time=0){
 const board=root?.querySelector('#flowBoard'),svg=root?.querySelector('#flowWires');
 if(!board||!svg)return;
 const layout=getFlowGeometry(board,svg);
 const byId=new Map(tracks.map(t=>[t.id,t]));
 for(const entry of layout.entries){
  const track=byId.get(entry.owner);
  const playing=animate&&(!track||!track.muted);
  const meter=playing?(entry.busId?engine.getBusMeter?.(entry.busId):engine.getTrackMeter?.(track.id)):null;
  const rms=Number(meter?.rms)||0;
  const target=playing?Math.min(1,Math.sqrt(Math.max(0,rms))*3):0;
  entry.level+=((target-entry.level)*(target>entry.level?.35:.16));
  entry.path.setAttribute('d',wireCurve(entry.from.x,entry.from.y,entry.to.x,entry.to.y,entry.level,playing?time:0));
  entry.path.classList.toggle('flow-wire-off',!!track?.muted);
  entry.path.style.setProperty('--flow-wire-color',entry.busId?'#ff9b52':(track?.type==='voice'?'#fa58aa':'#54c4ec'));
  entry.path.style.strokeWidth=(2.6+entry.level*3).toFixed(2)+'px';
 }
}
