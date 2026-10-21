// Actions use the same command handlers and validation as the main interface.
export function createContextMenu(root){
 const menu=document.createElement('section');menu.id='context-menu';menu.className='context-menu';menu.setAttribute('role','menu');menu.hidden=true;root.append(menu);
 let previous=null;
 const close=()=>{menu.hidden=true;menu.replaceChildren();};
 function open(title,actions,point){
  close();previous=document.activeElement;const heading=document.createElement('b');heading.textContent=title;menu.append(heading);
  for(const action of actions){const b=document.createElement('button');b.type='button';b.textContent=action.label;b.dataset.action=action.action;Object.assign(b.dataset,action.data??{});b.setAttribute('role','menuitem');b.disabled=Boolean(action.disabled);menu.append(b);if(action.reason){const reason=document.createElement('small');reason.textContent=action.reason;menu.append(reason);}}
  menu.hidden=false;menu.style.left='0px';menu.style.top='0px';const rect=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(point?.x??innerWidth/2,innerWidth-rect.width-8))+'px';menu.style.top=Math.max(8,Math.min(point?.y??innerHeight/2,innerHeight-rect.height-8))+'px';menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 }
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close();},true);
 menu.addEventListener('click',()=>queueMicrotask(close));
 menu.addEventListener('keydown',e=>{const buttons=[...menu.querySelectorAll('button:not(:disabled)')];if(e.key==='Escape'){e.stopPropagation();close();previous?.focus({preventScroll:true});}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.stopPropagation();e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
 return {open,close};
}
