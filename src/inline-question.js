/** Non-modal confirmation or short text input; only one question may be pending. */
export function inlineQuestion(host,{message,initialValue,acceptLabel='Confirmar'}){
  if(host.firstElementChild)return Promise.resolve(null);
  const doc=host.ownerDocument,panel=doc.createElement('section');
  panel.className='inline-question';panel.setAttribute('role','region');panel.setAttribute('aria-label','Confirmación');
  const text=doc.createElement('p');text.textContent=message;panel.append(text);
  let input=null;
  if(initialValue!==undefined){
    input=doc.createElement('input');input.type='text';input.maxLength=42;input.value=initialValue;input.setAttribute('aria-label','Nombre');panel.append(input);
  }
  const actions=doc.createElement('div'),accept=doc.createElement('button'),cancel=doc.createElement('button');
  accept.type=cancel.type='button';accept.textContent=acceptLabel;cancel.textContent='Cancelar';
  actions.append(accept,cancel);panel.append(actions);host.replaceChildren(panel);
  return new Promise(resolve=>{
    let done=false;
    const finish=value=>{if(done)return;done=true;host.replaceChildren();resolve(value);};
    accept.addEventListener('click',()=>finish(input?input.value:true));
    cancel.addEventListener('click',()=>finish(null));
    panel.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(null);}
      else if(event.key==='Enter'&&input&&event.target===input){event.preventDefault();event.stopPropagation();finish(input.value);}
    });
    (input||cancel).focus();
  });
}
