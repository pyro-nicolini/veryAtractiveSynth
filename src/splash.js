/* Small, escapable intro. Never touches sound, project data or browser storage. */
const overlay=document.querySelector('#introSplash');
if(overlay){
  let removed=false;
  const finish=()=>{
    if(removed)return;
    removed=true;overlay.classList.add('is-leaving');
    window.setTimeout(()=>overlay.remove(),420);
  };
  overlay.querySelector('#splashSkip')?.addEventListener('click',finish);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(finish,reduced?350:2650);
}
