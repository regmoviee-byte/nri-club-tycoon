import {bounds} from '../model/layout.js';

export const ISO_TILE_WIDTH = 96;
export const ISO_TILE_HEIGHT = 48;

// Saved coordinates are never projected. Height is a vertical screen distance.
export function project(x, y, z = 0) {
  return {x:(x-y)*ISO_TILE_WIDTH/2, y:(x+y)*ISO_TILE_HEIGHT/2-z};
}
export function unproject(x, y, z = 0) {
  return {x:x/ISO_TILE_WIDTH+(y+z)/ISO_TILE_HEIGHT, y:(y+z)/ISO_TILE_HEIGHT-x/ISO_TILE_WIDTH};
}
export function cellPolygon(x, y) {
  return [project(x,y),project(x+1,y),project(x+1,y+1),project(x,y+1)];
}
export function edgePoints({x,y,axis}) {
  return [project(x,y),project(x+(axis==='h'?1:0),y+(axis==='v'?1:0))];
}
export function projectedBounds(layoutOrBox, {padding=64,headroom=144}={}) {
  const box=layoutOrBox.plots ? bounds(layoutOrBox) : layoutOrBox;
  const points=[project(box.x,box.y),project(box.x+box.w,box.y),project(box.x+box.w,box.y+box.h),project(box.x,box.y+box.h)];
  const minX=Math.min(...points.map(p=>p.x))-padding, minY=Math.min(...points.map(p=>p.y))-headroom;
  const maxX=Math.max(...points.map(p=>p.x))+padding, maxY=Math.max(...points.map(p=>p.y))+padding;
  return {x:minX,y:minY,w:maxX-minX,h:maxY-minY,minX,minY,maxX,maxY};
}
