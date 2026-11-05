export function normaliseAutomation(points,min=0,max=1){
  if(!Array.isArray(points))return [];
  return points.map(p=>({time:Math.max(0,Number(p.time)||0),value:Math.max(min,Math.min(max,Number(p.value)||0))}))
    .filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.value)).sort((a,b)=>a.time-b.time);
}
export function sampleAutomation(points,time,min=0,max=1){
  const curve=normaliseAutomation(points,min,max),t=Math.max(0,Number(time)||0);
  if(!curve.length)return min;
  if(t<=curve[0].time)return curve[0].value;
  const last=curve.at(-1);if(t>=last.time)return last.value;
  const i=curve.findIndex(p=>p.time>=t),b=curve[i],a=curve[i-1],ratio=(t-a.time)/Math.max(.000001,b.time-a.time);
  return a.value+(b.value-a.value)*ratio;
}
export function addAutomationPoint(points,time,value,min=0,max=1){
  return normaliseAutomation([...(points||[]),{time,value}],min,max);
}
