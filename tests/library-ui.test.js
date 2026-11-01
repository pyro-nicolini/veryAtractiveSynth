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
