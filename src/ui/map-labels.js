// Names live in screen pixels, independently of the world's camera scale. This
// module reads the rendered scene only; it never reads or changes a game save.
const GAP=3, MARGIN=5;
export const nameRectsOverlap=(a,b,gap=0)=>a.x<b.x+b.w+gap&&b.x<a.x+a.w+gap&&a.y<b.y+b.h+gap&&b.y<a.y+a.h+gap;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function rectangleIndex(rectangles){
  const cells=new Map(),size=48;
  const keys=rect=>{const result=[];for(let x=Math.floor((rect.x-GAP)/size);x<=Math.floor((rect.x+rect.w+GAP)/size);x++)for(let y=Math.floor((rect.y-GAP)/size);y<=Math.floor((rect.y+rect.h+GAP)/size);y++)result.push(`${x}:${y}`);return result;};
  const add=rect=>{for(const key of keys(rect)){if(!cells.has(key))cells.set(key,[]);cells.get(key).push(rect);}};
  const collides=rect=>keys(rect).some(key=>(cells.get(key)??[]).some(other=>nameRectsOverlap(rect,other,GAP)));
  rectangles.forEach(add);return{add,collides};
}

// A bounded search finds nearby free space first. A growing bottom margin is a
// deterministic fallback for genuinely crowded maps: names remain readable and
// reachable with the existing map scrollbar, rather than being cut or shrunk.
export function placeMapNames(items,obstacles,{width,height}){
  const index=rectangleIndex(obstacles),placed=[];
  let bottom=height;
  const ordered=[...items].sort((a,b)=>a.anchor.y-b.anchor.y||a.anchor.x-b.anchor.x||a.id.localeCompare(b.id));
  for(const item of ordered){
    let best=null;
    for(const [variantIndex,variant] of item.variants.entries()){
      const {w,h}=variant;
      if(w>width-MARGIN*2)continue;

      const candidate=(x,y)=>{
        const rect={x:clamp(x,MARGIN,width-w-MARGIN),y,w,h};
        if(y<MARGIN||y+h>height-MARGIN)return;
        const dx=Math.max(rect.x-item.anchor.x,0,item.anchor.x-rect.x-w),dy=Math.max(rect.y-item.anchor.y,0,item.anchor.y-rect.y-h);
        const cost=Math.hypot(dx,dy)+variantIndex*12+Math.abs(rect.y+h/2-item.anchor.y)*.08;
        if((!best||cost<best.cost)&&!index.collides(rect))best={...rect,cost,variant};
      };
      const figure=item.figure;
      candidate(figure.x-w-GAP,figure.y+(figure.h-h)/2);
      candidate(figure.x+figure.w+GAP,figure.y+(figure.h-h)/2);
      candidate(item.anchor.x-w/2,figure.y-h-GAP);
      candidate(item.anchor.x-w/2,figure.y+figure.h+GAP);
      // Scan in screen pixels, so 8% and 180% zoom have the same legibility and
      // collision tolerance. Include the last row/column at narrow widths.
      const radius=best?.cost??Math.max(width,height),left=Math.max(MARGIN,item.anchor.x-radius-w),right=Math.min(width-w-MARGIN,item.anchor.x+radius),top=Math.max(MARGIN,item.anchor.y-radius-h),bottom=Math.min(height-h-MARGIN,item.anchor.y+radius);
      for(let y=top;y<=bottom;y+=8)for(let x=left;x<=right;x+=8)candidate(x,y);
      candidate(width-w-MARGIN,height-h-MARGIN);

    }
    if(!best){
      const variant=item.variants.at(-1),w=Math.min(variant.w,width-MARGIN*2),h=variant.h;
      let y=MARGIN,found=false;
      // Existing free space below the map can be reused by several names.
      const limit=Math.max(bottom,...obstacles.map(r=>r.y+r.h),0)+h+GAP+MARGIN;
      for(;y<=limit&&!found;y+=8)for(let x=MARGIN;x<=width-w-MARGIN;x+=8){
        const rect={x,y,w,h};if(index.collides(rect))continue;
        best={...rect,variant};found=true;break;
      }
      if(!best)best={x:MARGIN,y:limit+GAP,w,h,variant};
    }
    const result={...best,id:item.id,anchor:item.anchor,figure:item.figure};
    placed.push(result);index.add(result);bottom=Math.max(bottom,result.y+result.h+MARGIN);
  }
  return{labels:placed,height:bottom};
}

function segmentHits(a,b,r){
  // Liang–Barsky clipping, with a tiny inset so a line may touch a box edge.
  let low=0,high=1;const dx=b.x-a.x,dy=b.y-a.y;
  for(const[p,q]of[[-dx,a.x-r.x-.4],[dx,r.x+r.w-a.x-.4],[-dy,a.y-r.y-.4],[dy,r.y+r.h-a.y-.4]]){
    if(Math.abs(p)<.00001){if(q<0)return false;continue;}
    const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return false;
  }
  return high>=0&&low<=1;
}
const edgePoint=(rect,towards)=>{
  const center={x:rect.x+rect.w/2,y:rect.y+rect.h/2},dx=towards.x-center.x,dy=towards.y-center.y;
  const scale=1/Math.max(Math.abs(dx)/(rect.w/2||1),Math.abs(dy)/(rect.h/2||1),1);
  return{x:center.x+dx*scale,y:center.y+dy*scale};
};
export function mapNameLeader(label,obstacles){
  const start=edgePoint(label.figure,{x:label.x+label.w/2,y:label.y+label.h/2}),end=edgePoint(label,start);
  const blockers=obstacles.filter(r=>r!==label&&r!==label.figure&&!nameRectsOverlap(r,label.figure,-Math.min(r.w,r.h)/3));
  const clear=points=>points.slice(1).every((p,i)=>blockers.every(r=>!segmentHits(points[i],p,r)));
  const direct=[start,end];if(clear(direct))return direct;
  const routes=[[start,{x:start.x,y:end.y},end],[start,{x:end.x,y:start.y},end]];
  for(const r of blockers){
    for(const x of[r.x-2,r.x+r.w+2])routes.push([start,{x,y:start.y},{x,y:end.y},end]);
    for(const y of[r.y-2,r.y+r.h+2])routes.push([start,{x:start.x,y},{x:end.x,y},end]);
  }
  const route=routes.filter(clear).sort((a,b)=>a.slice(1).reduce((sum,p,i)=>sum+distance(a[i],p),0)-b.slice(1).reduce((sum,p,i)=>sum+distance(b[i],p),0))[0];
  // If tightly touching sprites leave no exit corridor, keep a direct tether;
  // the name box itself still never overlaps any figure or important control.
  return route??direct;
}

export function installMapNames(map){
  let frame=0,disposed=false,observedViewport=null;
  const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(draw);};
  function draw(){
    frame=0;
    const world=map.querySelector('.layout-world[data-projection=isometric]'),stage=world?.parentElement,viewport=stage?.parentElement;
    if(!world||!viewport.clientWidth||!viewport.clientHeight)return;
    if(observedViewport!==viewport){if(observedViewport)resize.unobserve(observedViewport);resize.observe(viewport);observedViewport=viewport;}
    const stageRect=stage.getBoundingClientRect(),worldRect=world.getBoundingClientRect(),width=stage.clientWidth;
    if(width<40)return;
    const local=node=>{const r=node.getBoundingClientRect();return{x:r.left-stageRect.left,y:r.top-stageRect.top,w:r.width,h:r.height};};
    const height=Math.max(viewport.clientHeight,worldRect.bottom-stageRect.top);
    let layer=stage.querySelector('.map-person-label-layer');
    if(!layer){layer=document.createElement('div');layer.className='map-person-label-layer';layer.setAttribute('aria-hidden','true');stage.append(layer);}
    layer.replaceChildren();layer.style.width=`${width}px`;layer.style.height=`${height}px`;
    const sources=[...world.querySelectorAll('.map-chair.occupied,.master-seat,.layout-departing')];
    const items=[],obstacles=[],targets=new Map(),departures=new Map();
    for(const [i,owner]of sources.entries()){
      let departure=null;
      if(owner.classList.contains('layout-departing')){
        const style=getComputedStyle(owner),motion=owner.getAnimations?.().find(animation=>animation.animationName==='leave-room');
        // Reduced motion has no animationend event. Also discard an already
        // finished departure if a resize/rerender arrived between animation end
        // and the next frame, instead of recreating its name at full opacity.
        if(style.animationName==='none'||Number(style.opacity)===0||motion?.playState==='finished'){owner.remove();continue;}
        const timing=motion?.effect?.getTiming();
        departure={duration:Number(timing?.duration)||parseFloat(style.animationDuration)*1000||850,delay:(Number(timing?.delay)||0)-(Number(motion?.currentTime)||0)};
      }
      const source=owner.querySelector('.chair-label,.master-name')??(owner.classList.contains('layout-departing')?owner.lastElementChild:null);
      const figureNode=owner.querySelector('.map-person,.master-figure,.master-mark');
      if(!source||!figureNode||!source.textContent.trim())continue;
      const figure=local(figureNode);if(!figure.w||!figure.h)continue;
      const id=`${owner.dataset.guest??owner.dataset.inspect??'person'}-${i}`,name=source.textContent;
      owner.dataset.nameOwner=id;figureNode.dataset.nameFigure=id;source.dataset.nameSource='';
      const label=document.createElement('span');label.className=`map-person-label${owner.classList.contains('master-seat')?' is-master':''}${owner.classList.contains('chosen')?' is-chosen':''}${owner.classList.contains('waiting-seat')?' is-waiting':''}`;
      label.dataset.labelOwner=id;label.dataset.fullName=name;label.textContent=name;label.style.visibility='hidden';layer.append(label);
      const variants=[];
      const preferred=width<430||sources.length>24?11:12;
      for(const [font,maxWidth]of[[preferred,128],[11,104],[11,76]]){
        label.style.fontSize=`${font}px`;label.style.maxWidth=`${Math.min(maxWidth,width-MARGIN*2)}px`;label.style.width='max-content';
        const rect=label.getBoundingClientRect();variants.push({w:Math.ceil(rect.width)+.25,h:Math.ceil(rect.height)+.25,font});
      }
      const anchor={x:figure.x+figure.w/2,y:figure.y+figure.h/2};
      items.push({id,anchor,figure,variants});obstacles.push(figure);targets.set(id,label);
      if(departure)departures.set(id,departure);
    }
    for(const node of world.querySelectorAll('.map-chair:not(.occupied) .empty-seat,.layout-room-marker,.layout-staff-plaque,.layout-object-state,.layout-zone-state,.layout-iso-blocked,.layout-cleaning-sign,.build-preview-tag,.layout-object--table .layout-object-art,.layout-object--tableComfort .layout-object-art')){
      const rect=local(node);if(rect.w&&rect.h)obstacles.push(rect);
    }
    const result=placeMapNames(items,obstacles,{width,height});
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('map-name-leaders');svg.setAttribute('width',width);svg.setAttribute('height',result.height);
    for(const label of result.labels){
      const node=targets.get(label.id);Object.assign(node.style,{visibility:'',left:`${label.x}px`,top:`${label.y}px`,width:`${label.w}px`,maxWidth:'none',height:`${label.h}px`,fontSize:`${label.variant.font}px`});
      const points=mapNameLeader(label,[...obstacles,...result.labels]),line=document.createElementNS(svg.namespaceURI,'polyline');
      line.classList.add('map-name-leader');line.dataset.labelOwner=label.id;line.setAttribute('points',points.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));
      const dot=document.createElementNS(svg.namespaceURI,'circle');dot.setAttribute('cx',points[0].x);dot.setAttribute('cy',points[0].y);dot.setAttribute('r','1.6');
      const connection=document.createElementNS(svg.namespaceURI,'g');connection.append(line,dot);svg.append(connection);
      const departure=departures.get(label.id);
      if(departure)for(const part of[node,connection])part.style.animation=`map-name-departure ${departure.duration}ms ease-in ${departure.delay}ms both`;
    }
    layer.prepend(svg);layer.style.height=`${result.height}px`;stage.style.minHeight=`${result.height}px`;world.classList.add('has-name-layout');
  }
  const observer=new MutationObserver(records=>{
    if(records.some(r=>!r.target.closest?.('.map-person-label-layer')&&!(r.type==='attributes'&&r.target.classList?.contains('layout-stage'))))schedule();
  });
  // Drag hover changes drop-target/drop-blocked classes on every pointer move.
  // Those classes change paint only. Occupancy/selection replace the DOM, while
  // camera and construction geometry use styles; only those require layout.
  observer.observe(map,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
  const finishDeparture=event=>{if(event.animationName==='leave-room'&&event.target.matches('.layout-departing')){event.target.remove();schedule();}};
  map.addEventListener('animationend',finishDeparture);map.addEventListener('animationcancel',finishDeparture);
  const resize=new ResizeObserver(schedule);resize.observe(map);
  document.fonts?.ready.then(schedule);schedule();
  return()=>{disposed=true;observer.disconnect();resize.disconnect();cancelAnimationFrame(frame);map.removeEventListener('animationend',finishDeparture);map.removeEventListener('animationcancel',finishDeparture);};
}
