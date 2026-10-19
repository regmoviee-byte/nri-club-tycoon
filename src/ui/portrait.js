import {sceneGeometry} from './scene-geometry.js';
export function paintStation(canvas){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,rect.width),h=Math.max(1,rect.height),g=sceneGeometry(w,h);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#3b3a47';ctx.fillRect(0,0,w,h);ctx.fillStyle='#303441';ctx.fillRect(w*.055,h*.34,w*.23,h*.66);ctx.strokeStyle='#79717b';ctx.lineWidth=3;ctx.strokeRect(w*.055,h*.34,w*.23,h*.66);
  ctx.fillStyle='#272b38';ctx.fillRect(w*.81,h*.2,w*.17,h*.61);ctx.fillStyle='#463b43';ctx.fillRect(w*.78,g.upperShelfY+g.board,w*.22,g.board*.7);ctx.fillRect(w*.78,g.shelfY+g.board,w*.22,g.board*.8);
  ctx.fillStyle='#876f65';ctx.fillRect(w*.78,g.upperShelfY,w*.22,g.board);ctx.fillRect(w*.78,g.shelfY,w*.22,g.board);
  const colors=['#827287','#967a67','#61758c','#a4947b','#795e71'];
  for(const [i,b]of g.books.entries()){
    ctx.fillStyle='#171a25';ctx.fillRect(b.x-1,g.shelfY-3,b.width+3,3);
    ctx.fillStyle=colors[i%5];ctx.fillRect(b.x,b.y,b.width,b.height);
    ctx.fillStyle='#ffffff20';ctx.fillRect(b.x+1,b.y+2,Math.max(1,b.width*.15),Math.max(0,b.height-3));
    ctx.fillStyle='#191b2850';ctx.fillRect(b.x,g.shelfY-2,b.width,2);
  }
  ctx.fillStyle='#846457';ctx.fillRect(0,g.counterTop,w,12);ctx.fillStyle='#b08c6d';ctx.fillRect(0,g.counterTop,w,3);
}
