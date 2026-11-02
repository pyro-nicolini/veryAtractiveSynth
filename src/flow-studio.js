/* Signal Flow V2: only sources, buses and master live on the main graph.
 * Track FX are expandable child controls; master FX belong to the master node.
 * Cable geometry follows actual WebAudio destinations, never decorative inserts.
 */
import {FX_CHAIN,isFxBypassed} from './fx-rack.js';
import {MASTER_FX_CHAIN} from './master-fx.js';
import {formatDb,BUS_IDS,BUS_LABELS,busForTrack} from './studio-mixer.js';
import {routeFor,canConnect} from './flow-routing.js';

export const FLOW_MIN_WIDTH=1200;
export const FLOW_NODE_WIDTH=232;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FX_ICON={tune:'✦',clean:'◌',eq:'≋',drive:'◈',compressor:'◉',delay:'↺',reverb:'✧'};
function effectIsActive(track,id){
 if(track.bypassEffects||isFxBypassed(track,id))return false;
 return id==='tune'?track.autotune>1:id==='clean'?track.clean>1:
  id==='eq'?Math.abs(track.brightness-50)>7||Math.abs(track.warmth-20)>7:
  id==='drive'?track.drive>1:id==='delay'?track.echo>1:
  id==='reverb'?track.space>1:true;
}
export function flowPosition(track,index,positions={}){
 const p=positions?.[track.id];
 return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?
  {x:Math.max(12,Math.min(7000,p.x)),y:Math.max(12,Math.min(3000,p.y))}:
  {x:70+index*285,y:busForTrack(track)==='vocals'?125:520};
}
export function flowHeight(){return 920;}
function trackFxDrawer(track,presets=[]){
 const fx=FX_CHAIN.map(item=>{
  const active=effectIsActive(track,item.id);
  return '<button type="button" class="flow-fx-subnode '+(active?'is-active':'')+'" data-flow-effect-toggle="'+item.id+'" data-flow-owner="'+esc(track.id)+'" aria-pressed="'+active+'" title="'+esc(item.hint)+'">'+
   '<span class="flow-fx-icon">'+FX_ICON[item.id]+'</span><span class="flow-fx-copy"><strong>'+esc(item.label)+'</strong><small>'+(active?'ACTIVO':'DESACTIVADO')+'</small></span><span class="flow-fx-state">'+(active?'ON':'OFF')+'</span></button>';
 }).join('');
 const saved=(presets||[]).map(p=>'<button type="button" class="flow-fx-preset" data-flow-preset="'+esc(p.id)+'" data-flow-owner="'+esc(track.id)+'" title="Aplicar este preset a '+esc(track.name)+'">◈ '+esc(p.name)+'</button>').join('');
 return '<section class="flow-fx-drawer" data-flow-fx-drawer="'+esc(track.id)+'" aria-label="Efectos de '+esc(track.name)+'">'+
  '<header><div><strong>FX DE ESTA PISTA</strong><small>Solo modifica este sonido · el original se conserva</small></div>'+
  '<button type="button" data-flow-save-fx="'+esc(track.id)+'">▣ Guardar preset</button></header>'+
  '<div class="flow-fx-grid">'+fx+'</div>'+(saved?'<div class="flow-fx-presets"><small>MIS PRESETS</small>'+saved+'</div>':'')+'</section>';
}
function masterFxDrawer(settings={}){
 const controls=MASTER_FX_CHAIN.map(item=>{
  const value=Number(settings[item.id])||0;
  const suffix=item.id==='low'||item.id==='high'?' dB':'%';
  return '<label class="master-fx-control"><span><strong>'+item.label+'</strong><small>'+esc(item.hint)+'</small></span>'+
   '<output data-master-fx-value="'+item.id+'">'+value+suffix+'</output>'+
   '<input type="range" data-master-fx="'+item.id+'" min="'+item.min+'" max="'+item.max+'" step="'+item.step+'" value="'+value+'" aria-label="'+esc(item.hint)+'"></label>';
 }).join('');
 return '<section class="master-fx-drawer" data-master-fx-panel>'+
  '<header><div><strong>MASTER FX</strong><small>Procesa la mezcla completa: voces + música + samples</small></div>'+
  '<div class="master-fx-head-actions"><button type="button" data-flow-master-help title="Qué hace el procesamiento global">?</button><label class="master-fx-bypass"><input type="checkbox" data-master-fx-bypass '+(settings.bypass?'checked':'')+'> BYPASS</label></div></header>'+
  '<div class="master-fx-grid">'+controls+'</div></section>';
}
function nodeMarkup(track,position,destOptions,selectedId,expanded,presets){
 const dest=routeFor(track,[track,...destOptions.tracks]);
 const options=['master',...BUS_IDS.map(id=>'bus:'+id),
  ...destOptions.tracks.filter(other=>other.id!==track.id&&busForTrack(other)===busForTrack(track)&&canConnect(destOptions.tracks,track.id,'track:'+other.id)).map(other=>'track:'+other.id)];
 const label=to=>to==='master'?'MASTER OUT':to.startsWith('bus:')?'BUS · '+(BUS_LABELS[to.slice(4)]||to.slice(4).toUpperCase()):'PISTA · '+(destOptions.tracks.find(t=>t.id===to.slice(6))?.name||'');
 const opts=options.map(to=>'<option value="'+esc(to)+'" '+(dest===to?'selected':'')+'>'+esc(label(to))+'</option>').join('');
 const activeFx=FX_CHAIN.filter(f=>effectIsActive(track,f.id)).length;
 const isVoice=busForTrack(track)==='vocals',isSample=busForTrack(track)==='samples';
 const kind=isVoice?'VOICE':isSample?'SAMPLE':track.type==='demo'?'BEAT':'TRACK';
 const wave=Array.from({length:18},(_,i)=>'<i style="--bar:'+((i*17+7)%11+3)+'"></i>').join('');
 return '<article class="flow-node '+(track.id===selectedId?'flow-node-selected ':'')+(track.muted?'flow-node-off ':'')+
  (isVoice?'flow-node-voice ':isSample?'flow-node-sample ':'flow-node-track ')+(expanded?'fx-expanded':'')+
  '" data-flow-track="'+esc(track.id)+'" data-flow-route="'+esc(dest)+'" style="left:'+position.x+'px;top:'+position.y+'px;--flow-accent:'+(isVoice?'#f36aa9':isSample?'#a9d88d':'#55c5e5')+'">'+
  '<button class="patch-port patch-port-in" data-flow-in="'+esc(track.id)+'" type="button" title="Entrada de '+esc(track.name)+'" aria-label="Entrada de '+esc(track.name)+'"></button>'+
  '<header class="flow-node-top" data-flow-drag="'+esc(track.id)+'" tabindex="0" aria-label="Arrastrar para mover '+esc(track.name)+'">'+
   '<span class="flow-source-icon">'+(isVoice?'◉':isSample?'▦':'♫')+'</span><span class="flow-node-name"><strong>'+esc(track.name)+'</strong><small>'+kind+' · '+formatDb(track.volume)+'</small></span>'+
   '<button type="button" class="flow-sample-grip" draggable="true" data-flow-export-sample="'+esc(track.id)+'" title="Arrastra a SAMPLE DESK para guardar este sonido">♫</button>'+
   '<span class="flow-move-icon" aria-hidden="true">⠿</span></header>'+
  '<div class="flow-node-wave" aria-label="Medidor de audio">'+wave+'</div>'+
  '<div class="flow-node-actions"><button type="button" data-flow-focus="'+esc(track.id)+'">Editar</button>'+
   '<button type="button" class="flow-fx-trigger" data-flow-expand-fx="'+esc(track.id)+'" aria-expanded="'+expanded+'" aria-controls="fx-'+esc(track.id)+'">FX <span>'+activeFx+'</span></button>'+
   '<button type="button" data-flow-link="'+esc(track.id)+'" aria-pressed="'+(!track.muted)+'">'+(track.muted?'OFF':'ON')+'</button>'+
   '<button type="button" class="flow-node-more" data-flow-delete="'+esc(track.id)+'" title="Ocultar nodo">⋯</button></div>'+
  '<label class="flow-node-route"><span>ENVIAR A</span><select data-flow-destination="'+esc(track.id)+'" aria-label="Destino de '+esc(track.name)+'">'+opts+'</select></label>'+
  '<button class="patch-port patch-port-out" data-flow-out="'+esc(track.id)+'" type="button" title="Arrastra desde aquí para conectar" aria-label="Salida de '+esc(track.name)+'"></button>'+
  (expanded?'<div id="fx-'+esc(track.id)+'">'+trackFxDrawer(track,presets)+'</div>':'')+'</article>';
}
export function flowMarkup(tracks,positions={},selectedId=null,pads=[],assets=[],presets=[],expandedFx=[],masterFx={}){
 const visible=tracks.filter(t=>!t.flowHidden),expanded=new Set(expandedFx||[]);
 const voice=visible.filter(t=>busForTrack(t)==='vocals');
 const music=visible.filter(t=>['music','samples','fx'].includes(busForTrack(t)));
 const geom=new Map();let maxRight=FLOW_MIN_WIDTH-470;
 for(const [lane,items] of [['vocals',voice],['music',music]]){
  items.forEach((track,index)=>{
   const stored=positions?.[track.id],pos=stored&&Number.isFinite(stored.x)&&Number.isFinite(stored.y)?
    flowPosition(track,index,positions):{x:70+index*285,y:lane==='vocals'?125:520};
   geom.set(track.id,pos);maxRight=Math.max(maxRight,pos.x+FLOW_NODE_WIDTH+70);
  });
 }
 const boardWidth=Math.min(12000,Math.max(FLOW_MIN_WIDTH,maxRight+520));
 const busX=boardWidth-500,masterX=boardWidth-260;
 const nodes=visible.map(track=>nodeMarkup(track,geom.get(track.id),{tracks:visible},selectedId,expanded.has(track.id),presets)).join('');
 const busY={vocals:165,music:535,samples:655,fx:760};
 const buses=BUS_IDS.map(id=>{
  const title=id==='fx'?'FX RETURN':id==='samples'?'SAMPLE BUS':BUS_LABELS[id];
  const sub=id==='samples'?'Samples reutilizables':id==='fx'?'Efectos auxiliares':'Salida del grupo';
  return '<button type="button" class="flow-bus-node flow-bus-'+id+'" data-flow-bus="'+id+'" data-flow-in="bus:'+id+'" style="left:'+busX+'px;top:'+busY[id]+'px" title="'+title+' recibe las pistas conectadas">'+
   '<span class="flow-bus-orb">'+(id==='vocals'?'◉':id==='music'?'≋':id==='samples'?'▦':'✧')+'</span><span><small>SUMADOR</small><strong>'+title+'</strong><small>'+sub+'</small></span></button>';
 }).join('');
 const master='<article class="flow-master '+(expanded.has('master')?'fx-expanded':'')+'" id="flowMaster" style="left:'+masterX+'px;top:300px">'+
  '<button type="button" class="patch-port patch-port-in flow-master-in" data-flow-in="master" title="Entrada de la mezcla" aria-label="Entrada de MASTER"></button>'+
  '<button type="button" class="flow-master-orb" data-flow-expand-fx="master" aria-expanded="'+expanded.has('master')+'" title="Abrir efectos globales">◉</button>'+
  '<strong>MASTER OUT</strong><small>Salida final · estéreo</small>'+
  '<button type="button" class="flow-master-fx" data-flow-expand-fx="master" aria-expanded="'+expanded.has('master')+'">MASTER FX</button>'+
  (expanded.has('master')?masterFxDrawer(masterFx):'')+'</article>';
 const laneTags='<div class="patch-lane-title" style="top:28px"><span class="patch-lane-dot voices"></span>01 · VOICE SIGNAL <small>Voces · cada pista tiene sus propios FX</small><button type="button" data-flow-add-voice>＋ Añadir voz</button></div>'+
  '<div class="patch-lane-title" style="top:430px"><span class="patch-lane-dot music"></span>02 · TRACK SIGNAL <small>Instrumentos, loops y samples</small><button type="button" data-flow-add-track>＋ Añadir pista</button></div>';
 const emptyVoice=!voice.length?'<div class="flow-lane-empty" style="left:70px;top:115px">Importa una grabación vocal o pulsa «Añadir voz».</div>':'';
 const emptyMusic=!music.length?'<div class="flow-lane-empty" style="left:70px;top:410px">Añade una base, un loop o un sample.</div>':'';
 const dock='<button type="button" class="patch-sample-dock" data-flow-sample-dock title="Arrastra aquí cualquier nodo para guardar su audio en la biblioteca"><span>▦</span><span><strong>SAMPLE DESK</strong><small>Arrastra un nodo aquí para guardarlo como sample</small></span><b>↗</b></button>';
 const guide=!visible.length?'<div class="flow-onboarding"><span><b>1</b> Añade una voz o una pista</span><span><b>2</b> Abre FX dentro del nodo</span><span><b>3</b> Conecta OUT → IN o guarda en Sample Desk</span></div>':'';
 const transport='<div class="flow-mini-transport"><button type="button" data-flow-play aria-label="Reproducir o pausar">▶</button><button type="button" data-flow-stop aria-label="Detener">■</button><label><span>MASTER</span><input type="range" min="0" max="100" data-flow-master-volume value="'+(Number(masterFx.masterVolume)||85)+'" aria-label="Volumen Master"></label></div>';
 return '<div class="patch-main"><div class="patch-toolbar"><span class="patch-live-dot"></span><strong>SIGNAL FLOW</strong><span>Conecta salida → entrada · los FX viven dentro de cada pista</span>'+transport+dock+'</div>'+guide+
  '<div class="flow-board-scroller"><div class="flow-board" id="flowBoard" style="width:'+boardWidth+'px;height:'+flowHeight()+'px">'+
  '<svg class="flow-wires" id="flowWires" aria-hidden="true"></svg>'+laneTags+emptyVoice+emptyMusic+nodes+buses+master+'</div></div>'+
  '<p class="flow-footnote"><strong>Empieza:</strong> añade una voz o pista, abre FX para modificar solo ese sonido y conecta su salida con otra entrada. MASTER FX modifica toda la mezcla. Arrastra el icono ♫ de cualquier nodo a SAMPLE DESK para guardar una copia original o procesada.</p></div>';
}
export function wireCurve(ax,ay,bx,by,energy=0,time=0){
 const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy)||1,amp=Math.min(21,Math.max(0,energy)*24);
 const nx=-dy/length,ny=dx/length;
 let d='M '+ax.toFixed(1)+' '+ay.toFixed(1);
 for(let i=0;i<6;i++){const u=(i+.5)/6,v=(i+1)/6,ripple=Math.sin(time*.026+i*1.8+ax*.012)*amp*Math.sin(Math.PI*u);
  d+=' Q '+(ax+dx*u+nx*ripple).toFixed(1)+' '+(ay+dy*u+ny*ripple).toFixed(1)+' '+(ax+dx*v).toFixed(1)+' '+(ay+dy*v).toFixed(1);}
 return d;
}
const flowGeometryCache=new WeakMap();
export function invalidateFlowWireGeometry(root){const board=root?.querySelector('#flowBoard');if(board)flowGeometryCache.delete(board);}
function getFlowGeometry(board,svg){
 const cached=flowGeometryCache.get(board);if(cached)return cached;
 const rect=board.getBoundingClientRect(),entries=[];
 svg.setAttribute('viewBox','0 0 '+Math.round(rect.width)+' '+Math.round(rect.height));
 const point=(el,side)=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:(side==='right'?r.right:r.left)-rect.left,y:r.top-rect.top+r.height/2};};
 const add=(id,from,to,owner,busId)=>{if(from&&to)entries.push({id,from,to,owner,busId,level:0,path:null});};
 const findInput=el=>el?.querySelector?.('[data-flow-in]')||el;
 const master=board.querySelector('#flowMaster');
 for(const card of board.querySelectorAll('[data-flow-track]')){
  const id=card.dataset.flowTrack,dest=card.dataset.flowRoute;
  const target=dest==='master'?master:dest.startsWith('track:')?
   Array.from(board.querySelectorAll('[data-flow-track]')).find(el=>el.dataset.flowTrack===dest.slice(6)):
   Array.from(board.querySelectorAll('[data-flow-bus]')).find(el=>el.dataset.flowBus===dest.slice(4));
  add(id+':out',point(card.querySelector('[data-flow-out]'),'right'),point(findInput(target),'left'),id,null);
 }
 for(const bus of board.querySelectorAll('[data-flow-bus]'))add('bus:'+bus.dataset.flowBus,point(bus,'right'),point(master,'left'),null,bus.dataset.flowBus);
 const old=new Map(Array.from(svg.querySelectorAll('[data-flow-wire]')).map(el=>[el.dataset.flowWire,el]));
 for(const entry of entries){let path=old.get(entry.id);if(!path){path=document.createElementNS('http://www.w3.org/2000/svg','path');path.dataset.flowWire=entry.id;path.classList.add('flow-wire');svg.appendChild(path);}entry.path=path;old.delete(entry.id);}
 for(const path of old.values())path.remove();
 const result={entries};flowGeometryCache.set(board,result);return result;
}
export function updateFlowWires(root,tracks,engine,animate=true,time=0){
 const board=root?.querySelector('#flowBoard'),svg=root?.querySelector('#flowWires');if(!board||!svg)return;
 const layout=getFlowGeometry(board,svg),byId=new Map(tracks.map(t=>[t.id,t])),trackMeters=new Map(),busMeters=new Map();
 const trackMeter=id=>{
  if(trackMeters.has(id))return trackMeters.get(id);
  const track=byId.get(id),value=animate&&track&&!track.muted?engine.getTrackMeter?.(id):null;
  trackMeters.set(id,value);return value;
 };
 const busMeter=id=>{
  if(busMeters.has(id))return busMeters.get(id);
  const value=animate?engine.getBusMeter?.(id):null;busMeters.set(id,value);return value;
 };
 for(const entry of layout.entries){
  const track=byId.get(entry.owner),busId=entry.busId;
  const meter=busId?busMeter(busId):track?trackMeter(track.id):null;
  const rms=Number(meter?.rms)||0,target=animate?Math.min(1,Math.sqrt(Math.max(0,rms))*3):0;
  entry.level+=(target-entry.level)*(target>entry.level?.35:.16);
  entry.path.setAttribute('d',wireCurve(entry.from.x,entry.from.y,entry.to.x,entry.to.y,entry.level,animate?time:0));
  entry.path.classList.toggle('flow-wire-off',!!track?.muted);
  entry.path.style.setProperty('--flow-wire-color',busId?'#ff9b52':track?.type==='voice'?'#f36aa9':'#55c5e5');
  entry.path.style.strokeWidth=(2.4+entry.level*3.5).toFixed(2)+'px';
 }
 for(const card of board.querySelectorAll('[data-flow-track]')){
  const track=byId.get(card.dataset.flowTrack),meter=track?trackMeter(track.id):null,rms=Number(meter?.rms)||0;
  const active=!!animate&&!track?.muted&&rms>.002;
  card.classList.toggle('is-playing',active);
  card.style.setProperty('--flow-energy',String(Math.min(1,Math.sqrt(Math.max(0,rms))*3)));
 }
 for(const bus of board.querySelectorAll('[data-flow-bus]')){
  const meter=busMeter(bus.dataset.flowBus),rms=Number(meter?.rms)||0;
  bus.classList.toggle('is-playing',!!animate&&rms>.002);
  bus.style.setProperty('--flow-energy',String(Math.min(1,Math.sqrt(Math.max(0,rms))*3)));
 }
 const master=board.querySelector('#flowMaster'),meter=animate?engine.getMasterMeter?.():null,rms=Number(meter?.rms)||0;
 if(master){master.classList.toggle('is-playing',!!animate&&rms>.002);master.style.setProperty('--flow-energy',String(Math.min(1,Math.sqrt(Math.max(0,rms))*3)));}
}
