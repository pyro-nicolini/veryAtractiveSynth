/** Real, acyclic serial routing for the studio graph.
 * Legacy sessions without flowTo still travel directly to their original bus.
 * A track:<id> edge feeds the next track's processor INPUT, intentionally
 * applying downstream effects to the sum of the upstream and local sources.
 */
import {BUS_IDS,busForTrack} from './studio-mixer.js';
export const MASTER_TARGET='master';
export function routeFor(track,tracks){
  const raw=typeof track?.flowTo==='string'?track.flowTo:'';
  if(raw==='master')return 'master';
  if(raw.startsWith('bus:')&&BUS_IDS.includes(raw.slice(4)))return raw;
  if(raw.startsWith('track:')){
    const id=raw.slice(6);
    const target=tracks.find(t=>t.id===id);
    if(target&&target.id!==track.id&&busForTrack(target)===busForTrack(track))return raw;
  }
  return 'bus:'+busForTrack(track);
}
export function routeMap(tracks){
  return new Map(tracks.map(t=>[t.id,routeFor(t,tracks)]));
}
export function wouldCycle(tracks,from,to){
  if(!tracks.some(t=>t.id===from))return true;
  const updated=tracks.map(t=>t.id===from?{...t,flowTo:to}:t);
  const routes=routeMap(updated);
  const state=new Map();
  const visit=id=>{
    if(state.get(id)===1)return true;
    if(state.get(id)===2)return false;
    state.set(id,1);
    const dest=routes.get(id);
    if(dest?.startsWith('track:')&&visit(dest.slice(6)))return true;
    state.set(id,2);return false;
  };
  return updated.some(t=>visit(t.id));
}
export function canConnect(tracks,from,to){
  const source=tracks.find(t=>t.id===from);if(!source)return false;
  if(to==='master')return !wouldCycle(tracks,from,to);
  if(to.startsWith('bus:'))return BUS_IDS.includes(to.slice(4))&&!wouldCycle(tracks,from,to);
  if(!to.startsWith('track:'))return false;
  const target=tracks.find(t=>t.id===to.slice(6));
  return !!target&&target.id!==from&&busForTrack(source)===busForTrack(target)&&!wouldCycle(tracks,from,to);
}
export function chainLane(tracks,bus){
  const lane=tracks.filter(t=>!t.flowHidden&&busForTrack(t)===bus);
  const next=new Map();
  lane.forEach((track,i)=>next.set(track.id,i+1<lane.length?'track:'+lane[i+1].id:'bus:'+bus));
  return next;
}
export function wireAudioGraphs(tracks,graphs,buses,masterInput){
  const routes=routeMap(tracks);
  // Never allow an invalid persisted graph to create a feedback loop.
  const cycle=tracks.some(t=>wouldCycle(tracks,t.id,routes.get(t.id)));
  if(cycle)throw Error('Se detectó un ciclo entre pistas. Corrige las conexiones.');
  for(const track of tracks){
    const graph=graphs.get(track.id);if(!graph)continue;
    const route=routes.get(track.id);
    let target=route==='master'?masterInput:
      route.startsWith('track:')?graphs.get(route.slice(6))?.input:
      buses.get(route.slice(4))?.gain;
    if(!target)target=buses.get(busForTrack(track))?.gain||masterInput;
    graph.meter.disconnect();
    graph.meter.connect(target);
  }
}
