/** Viewport math for the dependency-free Signal Flow canvas.
 * All signal nodes and SVG paths remain in unscaled graph coordinates.
 * Only the presentation is zoomed: this never changes audio routing.
 */
export const MIN_FLOW_ZOOM=.45;
export const MAX_FLOW_ZOOM=1.8;
export const clampFlowZoom=value=>Math.max(MIN_FLOW_ZOOM,Math.min(MAX_FLOW_ZOOM,Number.isFinite(Number(value))?Number(value):1));
export function screenToGraph(dx,dy,zoom=1){const z=clampFlowZoom(zoom);return{x:dx/z,y:dy/z};}
export function graphViewportSize(width,height,zoom=1){const z=clampFlowZoom(zoom);return{width:Math.ceil(Math.max(1,width)*z),height:Math.ceil(Math.max(1,height)*z)};}
export function zoomAroundPoint({scrollLeft=0,scrollTop=0,x=0,y=0,oldZoom=1,newZoom=1,oldOriginX=0,oldOriginY=0,newOriginX=0,newOriginY=0}={}){
 const z0=clampFlowZoom(oldZoom),z1=clampFlowZoom(newZoom);
 return {
  left:Math.max(0,Math.round(newOriginX+((scrollLeft-oldOriginX+x)/z0)*z1-x)),
  top:Math.max(0,Math.round(newOriginY+((scrollTop-oldOriginY+y)/z0)*z1-y))
 };
}
export function flowWorkspaceMetrics(contentWidth,contentHeight,viewWidth,viewHeight,zoom=1){
 const z=clampFlowZoom(zoom),w=Math.max(1,Number(viewWidth)||1),h=Math.max(1,Number(viewHeight)||1);
 // Leave at least one whole viewport of navigable space around the graph.
 const paddingX=Math.max(850*z,w),paddingY=Math.max(600*z,h);
 return {
  width:Math.ceil(Math.max(1,contentWidth)*z+paddingX*2),
  height:Math.ceil(Math.max(1,contentHeight)*z+paddingY*2),
  originX:Math.ceil(paddingX),originY:Math.ceil(paddingY)
 };
}
export function fitFlowZoom(contentWidth,contentHeight,viewWidth,viewHeight){
 return clampFlowZoom(Math.min((viewWidth-30)/Math.max(1,contentWidth),(viewHeight-30)/Math.max(1,contentHeight),1));
}
