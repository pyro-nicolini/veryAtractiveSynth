/** Keep a real, non-modal tool history without duplicating a tool on repeated clicks. */
export function openWorkspace(root,history,title,markup){
  const existing=root.firstElementChild;
  if(existing?.querySelector('#modalTitle')?.textContent===title){
    existing.querySelector('.focus-panel')?.focus();
    return false;
  }
  if(existing){history.push(existing);existing.remove();}
  root.innerHTML=markup;
  root.querySelector('.focus-panel')?.focus();
  return true;
}
export function restoreWorkspace(root,history){
  if(!history.length)return false;
  root.replaceChildren(history.pop());
  root.querySelector('.focus-panel')?.focus();
  return true;
}
