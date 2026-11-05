import test from 'node:test';import assert from 'node:assert/strict';
import {libraryMarkup} from '../src/library-ui.js';
test('library exposes categories and actionable drag tiles for all selections',()=>{
 for(const tab of ['rhythms','voices','transitions']){
  const ui=libraryMarkup(tab);
  assert.match(ui,/role="tablist"/);
  assert.match(ui,/draggable="true"/);
  assert.match(ui,new RegExp('data-library-kind="'+tab+'"'));
 }
 assert.match(libraryMarkup('rhythms'),/Pop luminoso/);
 assert.match(libraryMarkup('voices'),/Terciopelo/);
 assert.match(libraryMarkup('transitions'),/Cruce con siguiente/);
});
test('rhythm filters combine category, tempo and favorites without adding tracks',()=>{
 const filtered=libraryMarkup('rhythms',{category:'Urbano',tempo:'fast',favoritesOnly:true,favorites:['trap']});
 assert.match(filtered,/Trap pausado/);assert.doesNotMatch(filtered,/Dembow cálido|Pop luminoso/);
 assert.match(filtered,/data-library-preview="trap"/);assert.match(filtered,/data-library-favorite="trap" aria-label="Favorito: Trap pausado" aria-pressed="true"/);
 assert.match(libraryMarkup('rhythms',{category:'Pop',tempo:'slow'}),/No hay ritmos con estos filtros/);
 assert.match(libraryMarkup('rhythms',{previewId:'pop'}),/aria-label="Detener Pop luminoso"/);
});
