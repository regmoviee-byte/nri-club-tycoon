// Keep the room being viewed across UI rerenders without writing camera/UI state
// into the campaign. A page always contains whole, equally sized room cards.
export function installRoomPages(map){
  let firstRoom=null,frame=0;
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});};
  function render(direction=0){
    const strip=map.querySelector('.layout-room-strip'),cards=strip?[...strip.querySelectorAll('[data-room-card]')]:[];
    if(!cards.length||!map.clientWidth)return;
    const count=map.clientWidth<520?1:2,index=Math.max(0,cards.findIndex(card=>card.dataset.roomCard===firstRoom));
    const pages=Math.ceil(cards.length/count),page=Math.max(0,Math.min(pages-1,Math.floor(index/count)+direction)),start=page*count;
    firstRoom=cards[start].dataset.roomCard;strip.style.setProperty('--room-columns',count);
    // Measure the tallest complete card at this width, so paging between a
    // running room and a preparation notice cannot move the map or its buttons.
    strip.style.gridAutoRows='';cards.forEach(card=>{card.hidden=false;});
    const cardHeight=Math.ceil(Math.max(...cards.map(card=>card.getBoundingClientRect().height)));
    strip.style.gridAutoRows=`${cardHeight}px`;
    cards.forEach((card,i)=>{card.hidden=i<start||i>=start+count;});
    strip.scrollLeft=0;
    const previous=map.querySelector('[data-room-page="previous"]'),next=map.querySelector('[data-room-page="next"]'),status=map.querySelector('[data-room-page-status]');
    previous.disabled=page===0;next.disabled=page===pages-1;
    const text=`Комнаты ${start+1}${count>1&&start+1<cards.length?'–'+Math.min(start+count,cards.length):''} из ${cards.length}`;
    if(status.textContent!==text)status.textContent=text;
  }
  map.addEventListener('click',event=>{const button=event.target.closest('[data-room-page]');if(button)render(button.dataset.roomPage==='next'?1:-1);});
  map.addEventListener('keydown',event=>{
    if(!event.target.matches('.layout-room-strip')||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();render(event.key==='ArrowRight'?1:-1);
  });
  const mutation=new MutationObserver(records=>{if(records.some(record=>record.target===map))schedule();});
  mutation.observe(map,{childList:true});
  const resize=new ResizeObserver(schedule);resize.observe(map);schedule();
}
