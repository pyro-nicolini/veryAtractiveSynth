import test from 'node:test';
import assert from 'node:assert/strict';
import {inlineQuestion} from '../src/inline-question.js';

function createHost(){
  const doc={createElement(tag){return {tag,children:[],listeners:{},attributes:{},
    append(...children){this.children.push(...children);},setAttribute(k,v){this.attributes[k]=v;},
    addEventListener(name,fn){this.listeners[name]=fn;},focus(){this.focused=true;},
    click(){this.listeners.click?.({target:this});}};}};
  return {ownerDocument:doc,firstElementChild:null,replaceChildren(...children){this.firstElementChild=children[0]||null;}};
}
test('confirmation is non-modal, cancels safely and rejects overlapping questions',async()=>{
  const host=createHost(),pending=inlineQuestion(host,{message:'¿Eliminar?'});
  const panel=host.firstElementChild,actions=panel.children[1];
  assert.equal(panel.attributes.role,'region');assert.equal(actions.children[1].focused,true);
  assert.equal(await inlineQuestion(host,{message:'Otra acción'}),null);
  actions.children[1].click();assert.equal(await pending,null);assert.equal(host.firstElementChild,null);
  const yes=inlineQuestion(host,{message:'¿Eliminar?'});host.firstElementChild.children[1].children[0].click();
  assert.equal(await yes,true);assert.equal(host.firstElementChild,null);
});
test('a name question returns the edited value',async()=>{
  const host=createHost(),pending=inlineQuestion(host,{message:'Nombre',initialValue:'Voz'});
  const panel=host.firstElementChild,input=panel.children[1];input.value='Mi preset';
  panel.children[2].children[0].click();assert.equal(await pending,'Mi preset');
});
