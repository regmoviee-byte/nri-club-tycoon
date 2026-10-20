import {PointerGesture} from '../model/camera.js';
import {actorById,roomById,beginDrag,cancelDrag,endDrag} from '../model/club.js';
import {lockedGuest} from '../model/lifecycle.js';
import {createPuppet,resizePuppet,stepPuppet,puppetPose,pinPuppet,standingPose,seatedPose,interpolatePose} from '../model/puppet.js';
import {puppetSVG,FIGURE_FRAMES} from './graphic-portrait.js';
import {chairScale,figureAnchor,grabOffset,bindGrip,gripPoint,dragAnchor,DEFAULT_CHAIR_SCALE} from '../model/drag-geometry.js';

export function installAvatarDrag({getClub,select,changed,placement,error,reveal,enabled=()=>true}) {
  const game=document.querySelector('#game'),ghost=document.querySelector('#ticket-ghost');
  let session=null,rag=null,animation=null,raf=0,last=0,point={x:0,y:0},note='',ignoreClick=false,destroyed=false;
  const listeners=[];
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const listen=(node,type,callback,options)=>{
    node.addEventListener(type,callback,options);
    listeners.push(()=>node.removeEventListener(type,callback,options));
  };
  const source=()=>session?actorById(getClub(),session.guestId):null;
  const schedule=()=>{if(!raf&&!destroyed)raf=requestAnimationFrame(frame);};

  function removeMarks() {
    game.querySelectorAll('.drag-source,.drop-target,.drop-blocked,.landing-target').forEach(node=>node.classList.remove('drag-source','drop-target','drop-blocked','landing-target'));
  }
  function finishVisual() {
    if(raf)cancelAnimationFrame(raf);
    if(animation?.fadeSource) {
      animation.fadeSource.style.opacity=animation.sourceOpacity;
      animation.fadeSource.style.transition=animation.sourceTransition;
    }
    raf=0;last=0;rag=null;animation=null;ghost.hidden=true;ghost.innerHTML='';ghost.style.opacity='';removeMarks();
  }
  function release(held) {
    try{game.releasePointerCapture(held.pointerId);}catch{/* A cancelled pointer can already have lost capture. */}
  }
  function targetAt(p) {
    const element=document.elementFromPoint(p.x,p.y)?.closest('.map-chair[data-seat]');
    if(!element||!game.contains(element))return null;
    const roomId=element.closest('[data-room]')?.dataset.room,seat=Number(element.dataset.seat),room=roomById(getClub(),roomId);
    return room&&Number.isInteger(seat)&&seat>=0&&seat<room.capacity?{element,roomId,seat}:null;
  }
  function chairAnchor(chair) {
    // The first SVG of an occupied chair is its wooden back, not the visitor.
    const portrait=chair.querySelector('.map-person .graphic-portrait');
    if(portrait)return figureAnchor(portrait.getBoundingClientRect(),FIGURE_FRAMES.seated);
    const slot=chair.querySelector('.empty-seat');
    if(slot)return figureAnchor(slot.getBoundingClientRect(),FIGURE_FRAMES.seated);
    const rect=chair.getBoundingClientRect(),label=chair.querySelector('.chair-label')?.getBoundingClientRect();
    return figureAnchor({...rect,left:rect.left,top:rect.top,width:rect.width,height:Math.max(0,rect.height-(label?.height??12))},FIGURE_FRAMES.seated);
  }
  function measuredScale() {
    const target=targetAt(point),preferred=target&&chairAnchor(target.element);
    if(preferred)return preferred.scale;
    for(const chair of game.querySelectorAll('.map-chair')) {
      const anchor=chairAnchor(chair);
      if(anchor)return anchor.scale;
    }
    return chairScale(null,session?.scale??DEFAULT_CHAIR_SCALE);
  }
  function hover() {
    game.querySelectorAll('.drop-target,.drop-blocked').forEach(node=>node.classList.remove('drop-target','drop-blocked'));
    const target=targetAt(point);
    if(!target){note='Вернуть на место';return;}
    const room=roomById(getClub(),target.roomId),occupied=target.element.dataset.guest;
    if(room.status==='running') {
      note='Здесь уже играют';target.element.classList.add('drop-blocked');
    }else {
      note=occupied&&occupied!==session?.guestId?'Обмен местами':'На этот стул';target.element.classList.add('drop-target');
    }
  }
  function destination(held,target) {
    const seat=target??(held.kind==='seat'?held.origin:null);
    if(seat) {
      const chair=game.querySelector(`[data-room="${seat.roomId}"] [data-seat="${seat.seat}"]`);
      const portrait=chair?.querySelector('.map-person .graphic-portrait');
      const anchor=portrait&&figureAnchor(portrait.getBoundingClientRect(),FIGURE_FRAMES.seated);
      return anchor?{anchor,pose:seatedPose(held.build),node:chair,className:'landing-target'}:null;
    }
    const node=game.querySelector('#visitor-art'),portrait=node?.querySelector('.graphic-portrait');
    const anchor=portrait&&figureAnchor(portrait.getBoundingClientRect(),FIGURE_FRAMES.portrait);
    return anchor?{anchor,pose:standingPose(held.build),node,className:'drag-source'}:null;
  }
  function settle(held,g,target) {
    const goal=destination(held,target);
    if(!rag||!g||!goal||reduced()||document.hidden){finishVisual();return;}
    const returningToDesk=!target&&held.kind==='desk';
    let to=goal.anchor;
    if(returningToDesk) {
      // Fly the small figure back to the grabbed point, then dissolve into the
      // counter portrait. Never grow full-size legs over the rest of the UI.
      const local=gripPoint(goal.pose,held.grip),pin={x:to.x+local.x*to.scale,y:to.y+local.y*to.scale};
      to={...dragAnchor(pin,local,rag.scale),scale:rag.scale};
    }
    animation={g,pose:puppetPose(rag),goal:goal.pose,x:rag.x,y:rag.y,scale:rag.scale,to,time:performance.now(),
      fadeSource:returningToDesk?goal.node:null,sourceOpacity:goal.node.style.opacity??'',sourceTransition:goal.node.style.transition??''};
    rag=null;removeMarks();goal.node.classList.add(goal.className);last=0;schedule();
    if(returningToDesk){goal.node.style.transition='none';goal.node.style.opacity='.15';}
  }
  async function cancelInteraction({animate=false}={}) {
    const held=session,g=source(),wasDragging=held?.dragging;
    // Detach before releasePointerCapture, whose lost event may be synchronous.
    session=null;gesture.cancel();cancelDrag(getClub());
    if(raf)cancelAnimationFrame(raf);raf=0;
    if(held) {
      game.classList.toggle('show-rooms',held.roomsShown);
      release(held);
      if(wasDragging){ignoreClick=true;await changed();}
    }
    if(animate&&wasDragging)settle(held,g,null);else finishVisual();
  }
  function frame(now) {
    raf=0;
    if(destroyed||(!rag&&!animation))return;
    const dt=last?clamp((now-last)/1000,.001,.1):1/60;last=now;
    let pose,x,y,scale,g,emotion;
    if(animation) {
      const t=clamp((now-animation.time)/220,0,1),ease=1-(1-t)**3;
      if(t===1){finishVisual();return;}
      pose=interpolatePose(animation.pose,animation.goal,ease);
      x=animation.x+(animation.to.x-animation.x)*ease;
      y=animation.y+(animation.to.y-animation.y)*ease;
      scale=animation.scale+(animation.to.scale-animation.scale)*ease;
      g=animation.g;emotion=g.identity.portrait.expression;
      if(animation.fadeSource) {
        const fade=clamp((t-.2)/.8,0,1),smooth=fade*fade*(3-2*fade);
        ghost.style.opacity=String(1-smooth);animation.fadeSource.style.opacity=String(.15+.85*smooth);
      }
    }else {
      g=source();
      if(!g){cancelInteraction();return;}
      session.scale=measuredScale();resizePuppet(rag,session.scale);
      stepPuppet(rag,{...point,grip:session.grip},dt);
      pose=puppetPose(rag);x=rag.x;y=rag.y;scale=rag.scale;
      // A reaction to a quick movement contains no compatibility information.
      emotion=rag.energy>1350?'surprised':g.identity.portrait.expression;
    }
    ghost.innerHTML=puppetSVG(g.identity,pose,{x,y,scale,width:innerWidth,height:innerHeight,emotion})+
      (!animation?`<span class="drag-note" style="left:${clamp(point.x+15,8,Math.max(8,innerWidth-220))}px;top:${clamp(point.y+16,8,Math.max(8,innerHeight-38))}px">${note}</span>`:'');
    ghost.hidden=false;schedule();
  }

  const gesture=new PointerGesture({
    begin:id=>{
      if(!session||!beginDrag(getClub(),id)){cancelInteraction();return;}
      session.dragging=true;select(id);
      if(innerWidth<=850) {
        if(reveal)reveal();else game.classList.add('show-rooms');
      }
      const g=source();session.scale=measuredScale();
      const local=gripPoint(standingPose(session.build),session.grip),anchor=dragAnchor(point,local,session.scale);
      rag=createPuppet(anchor.x,anchor.y,{scale:session.scale,build:session.build});pinPuppet(rag,point,session.grip);
      game.querySelectorAll(`[data-drag-guest="${id}"]`).forEach(node=>node.classList.add('drag-source'));
      hover();last=0;schedule();
    },
    drag:p=>{point=p;hover();},
    drop:async p=>{
      point=p;const held=session,g=source(),target=targetAt(p);
      const result=endDrag(getClub(),target?.roomId??null,target?.seat??null);
      session=null;
      if(!result.ok)game.classList.toggle('show-rooms',held.roomsShown);
      removeMarks();if(raf)cancelAnimationFrame(raf);raf=0;const saved=await changed();
      settle(held,g,result.ok&&saved!==false?target:null);
      if(!result.ok&&!result.cancelled)error(result.reason);
    },
    select:async id=>{
      const shouldPlace=session?.kind==='desk'&&(innerWidth<=850||session.pointerType!=='mouse');
      if(id){await select(id);if(shouldPlace)placement();}
    },
  });

  listen(window,'pointerdown',e=>{
    if(!enabled())return;
    if(e.button!==0)return;
    // A second finger anywhere cancels; it need not land on another avatar.
    if(session){if(session.pointerId!==e.pointerId)cancelInteraction({animate:true});return;}
    ignoreClick=false;
    const avatar=e.target.closest?.('[data-drag-guest]');
    if(!avatar||!game.contains(avatar))return;
    const id=avatar.dataset.dragGuest,g=actorById(getClub(),id);
    if(!g||lockedGuest(getClub(),g))return;
    const kind=avatar.id==='visitor-art'?'desk':'seat',art=avatar.querySelector('.graphic-portrait');
    const anchor=art&&figureAnchor(art.getBoundingClientRect(),FIGURE_FRAMES[kind==='desk'?'portrait':'seated']);
    if(!anchor)return;
    finishVisual();point={x:e.clientX,y:e.clientY};
    const build=g.identity.portrait.build,pose=kind==='desk'?standingPose(build):seatedPose(build);
    session={pointerId:e.pointerId,guestId:id,pointerType:e.pointerType,kind,build,grip:bindGrip(pose,grabOffset(point,anchor)),
      origin:{roomId:g.roomId,seat:g.seat},roomsShown:game.classList.contains('show-rooms'),dragging:false,scale:DEFAULT_CHAIR_SCALE};
    e.preventDefault();
    try{game.setPointerCapture(e.pointerId);}catch{/* Window listeners still track this pointer. */}
    gesture.down({id:e.pointerId,...point,button:e.button},id);
  },true);
  listen(window,'pointermove',e=>{
    if(session?.pointerId===e.pointerId){point={x:e.clientX,y:e.clientY};gesture.move({id:e.pointerId,...point});}
  });
  listen(window,'pointerup',e=>{
    if(session?.pointerId!==e.pointerId)return;
    const held=session;
    gesture.up({id:e.pointerId,x:e.clientX,y:e.clientY});
    ignoreClick=true;session=null;release(held);
  });
  listen(window,'click',e=>{
    if(game.contains(e.target)&&ignoreClick&&e.detail>0){ignoreClick=false;e.preventDefault();e.stopImmediatePropagation();}
  },true);
  listen(game,'lostpointercapture',e=>{if(session?.pointerId===e.pointerId)cancelInteraction({animate:true});});
  listen(window,'pointercancel',e=>{if(session?.pointerId===e.pointerId)cancelInteraction({animate:true});});
  listen(window,'blur',()=>cancelInteraction());
  listen(window,'keydown',e=>{if(e.key==='Escape'&&session){e.preventDefault();cancelInteraction({animate:true});}});
  listen(document,'visibilitychange',()=>{if(document.hidden)cancelInteraction();});
  return {
    cancel:()=>cancelInteraction(),
    isDragging:()=>!!session?.dragging,
    destroy:()=>{if(destroyed)return;cancelInteraction();destroyed=true;listeners.splice(0).forEach(remove=>remove());},
  };
}
