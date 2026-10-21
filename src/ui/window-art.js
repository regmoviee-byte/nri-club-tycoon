import {project} from './seat-frame.js';

// The opening is inset into a normal wall; the sill projects toward the room.
export function windowArt(wall,height){
 if(height<22)return '';
 const end={x:wall.x+(wall.axis==='h'?1:0),y:wall.y+(wall.axis==='v'?1:0)};
 const point=(t,z,offset=0)=>{const p=project(wall.x+(end.x-wall.x)*t+(wall.axis==='v'?offset:0),wall.y+(end.y-wall.y)*t+(wall.axis==='h'?offset:0));return p.x+','+(p.y-z);};
 const quad=(l,r,b,t,fill,attrs='')=>'<polygon points="'+[point(l,b),point(l,t),point(r,t),point(r,b)].join(' ')+'" fill="'+fill+'" '+attrs+'/>';
 const line=(a,b,stroke,width)=>'<path d="M'+a+'L'+b+'" fill="none" stroke="'+stroke+'" stroke-width="'+width+'"/>';
 const top=Math.min(45,height-5),bottom=16;
 return '<g class="window-detail" data-window-frame="true" pointer-events="none">'+
 quad(.12,.9,bottom-2,top+1,'#9d896a')+quad(.12,.87,bottom,top,'#e9dfbe')+
 quad(.19,.81,bottom+5,top-5,'#739b99','data-window-glazing="true"')+
 quad(.22,.78,bottom+7,top-7,'#aecfca')+
 '<path d="M'+point(.24,top-9)+'L'+point(.46,top-9)+'L'+point(.24,bottom+9)+'Z" fill="#d9eee5" opacity=".46"/>'+
 line(point(.5,bottom+4),point(.5,top-4),'#eee5c9',1.8)+line(point(.18,(bottom+top)/2),point(.82,(bottom+top)/2),'#eee5c9',1.8)+
 '<polygon data-window-sill="true" points="'+[point(.09,bottom),point(.91,bottom),point(.91,bottom,.09),point(.09,bottom,.09)].join(' ')+'" fill="#f4e9c9" stroke="#b5a383" stroke-width=".5"/>'+
 '<polygon points="'+[point(.09,bottom,.09),point(.91,bottom,.09),point(.91,bottom-2,.09),point(.09,bottom-2,.09)].join(' ')+'" fill="#baaa8b"/>'+ '</g>';
}
