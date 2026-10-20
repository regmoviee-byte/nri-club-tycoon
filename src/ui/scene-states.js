import {project} from './seat-frame.js';
import {BUILD_CATALOG} from '../data/build-catalog.js';
import {visualObjectState,visualRoomState} from '../model/operations.js';
import {groupLimits} from '../model/group-size.js';
import {escapeHTML as esc} from './people.js';
const path=(ps,fill,extra='')=>'<path d="M'+ps.map(p=>p.x+','+p.y).join('L')+'Z" fill="'+fill+'" '+extra+'/>';
export function floorTileArt(x,y,finish,owned,zoneState={}){
 const tiled=finish==='tile',color=!owned?'#9baaa2':finish?(tiled?'#c8cfc1':(x+y)%2?'#c9ac7e':'#c2a072'):'#b2bab2',corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([u,v])=>project(u,v));
 let art=path(corners,color,'stroke="'+(owned?'#9d9e8c':'#a0afa7')+'" stroke-width=".65" data-cell="'+x+','+y+'" data-floor-finish="'+(finish??'concrete')+'" class="'+(owned?'owned-cell':'outside-cell')+'"');
 const line=(a,b,opacity=.28)=>{a=project(...a);b=project(...b);return '<path d="M'+a.x+' '+a.y+'L'+b.x+' '+b.y+'" fill="none" stroke="'+(tiled?'#a0b1a4':'#8b6f4e')+'" stroke-width=".6" opacity="'+opacity+'" pointer-events="none"/>';};
 if(finish){if(tiled)art+=line([x+.5,y],[x+.5,y+1])+line([x,y+.5],[x+1,y+.5]);else{for(const d of [.33,.66])art+=line([x,y+d],[x+1,y+d]);art+=line([x+.3,y],[x+.3,y+.33],.16)+line([x+.7,y+.33],[x+.7,y+.66],.16);}}
 if(owned&&zoneState.dirty&&Math.abs(x*7+y*11)%3===0){const p=project(x+.48,y+.53);art+='<g class="floor-dirt" pointer-events="none" data-zone-dirt="true"><ellipse cx="'+p.x+'" cy="'+p.y+'" rx="8" ry="3" fill="#796b4e" opacity=".25"/><path d="M'+(p.x-3)+' '+(p.y-2)+'l4-1 2 2-3 2Z" fill="#d9ceb0" stroke="#887e65" stroke-width=".4"/></g>';}
 return art;
}
export function objectContactArt(object){
 const spec=BUILD_CATALOG[object.kind];if(!spec||spec.layer!=='floor')return '';
 const w=object.rotation%2?spec.height:spec.width,h=object.rotation%2?spec.width:spec.height;
 const dot=(x,y,rx,ry)=>{const p=project(x,y,.05);return '<ellipse cx="'+p.x+'" cy="'+p.y+'" rx="'+rx+'" ry="'+ry+'" fill="#35473b" opacity=".19"/>';};
 if(spec.family==='table')return '<g class="contact-shadow" pointer-events="none">'+[-.79,.79].flatMap(x=>[-.79,.79].map(y=>dot(object.x+1+x,object.y+1+y,3.8,1.9))).join('')+'</g>';
 const p=project(object.x+w/2,object.y+h/2);return '<g class="contact-shadow" pointer-events="none"><ellipse cx="'+p.x+'" cy="'+(p.y+1)+'" rx="'+((w+h)*11)+'" ry="'+((w+h)*4)+'" fill="#35473b" opacity=".12"/></g>';
}
export function objectVisualStatus(club,object){
 const state=visualObjectState(club,object.id);if(!state)return null;
 const services=['water','kettle','coffee','coffeeAuto','cookies','fridge'],flag=state.flags.find(f=>['broken','repair','off','closed','unsafe','isolated','empty'].includes(f.kind))??state.flags[0];
 if(!flag&&!services.includes(object.kind))return null;
 const stock=services.includes(object.kind)?state.availableStock:null;
 return {...state,name:BUILD_CATALOG[object.kind]?.name,displayName:({coffeeAuto:'Кофемашина',coffee:'Кофеварка',water:'Кулер',kettle:'Чайная зона',cookies:'Печенье',fridge:'Холодильник',conditioner:'Кондиционер',lightAdjustable:'Светильник',deskLamp:'Лампа'})[object.kind],flag,stock,label:flag?.label??stock+' порц.',symbol:({broken:'!',repair:'↻',off:'○',closed:'×',unsafe:'!',isolated:'!',empty:'0',soon:'◷'})[flag?.kind]??'•',problem:!!flag&&flag.kind!=='off'&&flag.kind!=='closed',objectId:object.id};
}
export function equipmentOverlayArt(object,status){
 if(!status?.flag)return '';
 const s=BUILD_CATALOG[object.kind],w=object.rotation%2?s.height:s.width,h=object.rotation%2?s.width:s.height,p=project(object.x+w/2,object.y+h/2,35),off=['off','closed','broken','repair'].includes(status.flag.kind);
 return '<g class="equipment-state-overlay" data-equipment-state="'+status.flag.kind+'" pointer-events="none">'+(off?'<ellipse cx="'+p.x+'" cy="'+(p.y-7)+'" rx="5" ry="3" fill="#354b49" opacity=".75"/>':'')+'</g>';
}
export function roomVisualStatus(club,zone){
 const room=club.rooms.find(r=>r.id===zone.id),state=visualRoomState(club,zone.id),count=club.guests.filter(g=>g.roomId===zone.id).length;
 const {minimum,maximum}=room?groupLimits(room):{minimum:3,maximum:4},ready=count>=minimum&&count<=maximum,problem=state.serviceBlocked?'Нужна уборка':state.dirty?'Грязно':null,cleaning=state.cleaning?'Уборка':state.queued?'Уборка в очереди':null;
 const running=room?.status==='running',status=cleaning??problem??(zone.purpose==='staff'?'Отдых':running?'Идёт игра':room?.enabled===false?'Отключена':!room?.operational?'Не готова':ready?'Готова · '+count+'/'+maximum:count+'/'+maximum+' мест');
 return {roomId:zone.id,name:zone.name??(zone.purpose==='staff'?'Отдых мастеров':'Комната '+zone.number),marker:zone.purpose==='staff'?'☕':String(zone.number??club.layout.rooms.indexOf(zone)+1),status,short:cleaning?'↻':problem?'!':zone.purpose==='staff'?'':running?'▶':room?.enabled===false?'○':!room?.operational?'!':count+'/'+maximum,kind:cleaning?'cleaning':problem?'problem':running?'running':zone.purpose==='staff'?'rest':room?.enabled===false?'off':!room?.operational?'problem':ready?'ready':'idle',state,count,minimum,maximum};
}
export function statusBadgeArt(status,x,y,{compact=false,object=false}={}){
 const w=object?(compact?25:108):(compact?30:142),h=compact?27:39,color=status.kind==='running'?'#42675b':status.kind==='problem'||status.problem?'#875446':status.kind==='ready'?'#5e7553':'#eee3c5',light=['running','problem','ready'].includes(status.kind)||status.problem,ink=light?'#fff3dc':'#344e46',data=object?'data-object="'+esc(status.objectId)+'"':'data-room="'+esc(status.roomId)+'"',name=status.name??status.label,symbol=({running:'▶',ready:'✓',problem:'!',cleaning:'↻',off:'○'})[status.kind]??'';
 const shorten=(value,limit)=>{const text=String(value??'');return text.length>limit?text.slice(0,limit-1)+'…':text;},detail=status.status??(status.flag?.kind==='empty'?'Нет запаса':status.flag?status.flag.label:status.stock+' порций');
 return '<g '+data+' class="screen-state-marker '+(object?'object-state-marker':'room-state-marker')+' '+esc(status.kind??'')+'" data-marker-compact="'+compact+'" transform="translate('+x+' '+y+')" role="button" tabindex="0" aria-label="'+esc(name+' · '+(status.status??status.label))+'"><title>'+esc(name+' · '+(status.status??status.label))+'</title><rect x="'+(-w/2)+'" y="'+(-h/2)+'" width="'+w+'" height="'+h+'" rx="5" fill="'+color+'" stroke="#8e927d"/>'+(compact?'<text text-anchor="middle" y="5" fill="'+ink+'">'+esc(object?status.symbol:status.marker??'•')+'</text>'+(!object&&symbol?'<text class="marker-corner-state" x="9" y="-5" text-anchor="middle" fill="'+ink+'">'+symbol+'</text>':''):'<text text-anchor="middle" y="-3" fill="'+ink+'">'+esc(shorten(status.displayName??name,object?14:21))+'</text><text text-anchor="middle" y="12" class="marker-detail" fill="'+ink+'">'+esc(shorten(detail,object?19:27))+'</text>')+'</g>';
}
