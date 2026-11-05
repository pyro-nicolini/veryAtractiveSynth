import test from 'node:test';
import assert from 'node:assert/strict';
import {openWorkspace,restoreWorkspace} from '../src/workspace.js';

function host(){
  return {
    firstElementChild:null,
    set innerHTML(title){
      if(!title){this.firstElementChild=null;return;}
      const panel={title,focusCount:0,querySelector(selector){
        return selector==='#modalTitle'?{textContent:this.title}:
          selector==='.focus-panel'?{focus:()=>this.focusCount++}:null;
      },remove:()=>{this.firstElementChild=null;}};
      this.firstElementChild=panel;
    },
    querySelector(selector){return this.firstElementChild?.querySelector(selector)||null;},
    replaceChildren(child){this.firstElementChild=child;}
  };
}
test('reopening the same tool does not stack copies and closing restores the previous live surface',()=>{
  const root=host(),history=[];
  assert.equal(openWorkspace(root,history,'Afinar voz','Afinar voz'),true);
  const voice=root.firstElementChild;voice.unsavedValue='preserved';
  assert.equal(openWorkspace(root,history,'Afinar voz','Afinar voz'),false);
  assert.equal(history.length,0);
  assert.equal(openWorkspace(root,history,'Ayuda','Ayuda'),true);
  assert.equal(history.length,1);
  assert.equal(restoreWorkspace(root,history),true);
  assert.equal(root.firstElementChild,voice);
  assert.equal(root.firstElementChild.unsavedValue,'preserved');
  assert.equal(restoreWorkspace(root,history),false);
});
