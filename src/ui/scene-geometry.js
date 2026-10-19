export function sceneGeometry(w,h){
  const shelfY=h*.6,upperShelfY=h*.23,board=Math.max(4,Math.min(8,h*.014));
  return{counterTop:h-12,shelfY,upperShelfY,board,books:Array.from({length:7},(_,i)=>({x:w*(.81+i*.022),y:shelfY-h*(.20+(i%3)*.03),width:w*.015,height:h*(.20+(i%3)*.03)}))};
}
