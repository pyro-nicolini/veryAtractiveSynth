/** Source-time waveform review for non-destructive voice-note masks. */
export function selectionPercent(from,to,duration){
 const d=Number(duration);
 if(!Number.isFinite(d)||d<=0)return {left:0,width:0};
 const a=Math.max(0,Math.min(d,Number(from)||0));
 const b=Math.max(a,Math.min(d,Number(to)||0));
 return {left:a/d*100,width:(b-a)/d*100};
}
export function sourceTimeFromPointer(clientX,rect,duration){
 if(!rect.width)return 0;
 return Math.max(0,Math.min(duration,(clientX-rect.left)/rect.width*duration));
}
export function pitchReviewMarkup(clip){
 const seconds=clip.buffer.duration;
 return '<div class="pitch-wave-head"><strong>ONDA ORIGINAL · '+seconds.toFixed(2)+' s</strong>'+
   '<label>ZOOM <input type="range" min="1" max="8" step=".5" value="1" id="pitchZoom" aria-label="Ampliar visualización de la voz">'+
   '<output id="pitchZoomLabel">1×</output></label></div>'+
   '<div class="pitch-wave-viewport" id="pitchWaveViewport"><div class="pitch-wave-inner" id="pitchWaveInner" style="width:100%">'+
   '<canvas id="pitchWave" class="pitch-wave-canvas" aria-label="Arrastra sobre la onda para seleccionar un tramo de la voz"></canvas>'+
   '<div class="pitch-wave-masks" id="pitchWaveMasks" aria-hidden="true"></div>'+
   '<div class="pitch-wave-selection" id="pitchWaveSelection" aria-hidden="true"></div>'+
   '</div></div>'+
   '<p class="pitch-wave-help">Arrastra sobre la onda para seleccionar un tramo. Amplía hasta 8× y desliza para recorrerlo. Los colores marcan correcciones ya aplicadas.</p>';
}
export function drawPitchWave(canvas,buffer,regions=[]){
 if(!canvas||!buffer)return;
 const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
 const dpr=Math.min(2,typeof devicePixelRatio!=='undefined'?devicePixelRatio:1);
 const w=Math.max(1,Math.round(box.width*dpr)),h=Math.max(1,Math.round(box.height*dpr));
 if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#13272c';ctx.fillRect(0,0,w,h);
 const source=buffer.getChannelData(0),perPixel=source.length/w;
 ctx.strokeStyle='#7bdad4';ctx.lineWidth=Math.max(1,dpr);
 ctx.beginPath();
 for(let x=0;x<w;x+=2){
   const from=Math.floor(x*perPixel),to=Math.min(source.length,Math.max(from+1,Math.floor((x+2)*perPixel)));
   let peak=0;
   for(let i=from;i<to;i+=Math.max(1,Math.floor((to-from)/12)))peak=Math.max(peak,Math.abs(source[i]));
   const range=Math.min(1,peak)*h*.42;
   ctx.moveTo(x,h/2-range);ctx.lineTo(x,h/2+range);
 }
 ctx.stroke();
 ctx.strokeStyle='#49666a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
}
