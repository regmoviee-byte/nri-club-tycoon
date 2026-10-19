import {hash} from '../model/generator.js';
import {standingPose,seatedPose} from '../model/puppet.js';
import {characterHead} from './character-head.js';
import {characterClothes} from './character-clothes.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xy=p=>`${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

export function figureParts(identity,pose,{emotion,idle=false}={}){
 const s=pose,p=identity.portrait,head=characterHead(identity,emotion),body=characterClothes(identity,s);
 const angle=(s.headAngle??s.angle??0)+(p.pose??0)*Math.PI/180,transform=`translate(${xy(s.head)}) rotate(${angle*180/Math.PI})`,motion=idle?'portrait-head':'';
 const rear=`<g data-layer="rear-hair" transform="${transform}"><g class="${motion}" style="transform-origin:0px 0px">${head.back}</g></g>`;
 return `${body.legs}${rear}${body.arms}<g data-layer="torso" class="${idle?'portrait-breathe':''}" style="transform-origin:${body.anchor.x}px ${body.anchor.y}px">${body.torso}</g>${body.armsFront}<g data-layer="front-hair-face" transform="${transform}"><g class="${motion}" style="transform-origin:0px 0px">${head.front}</g></g>`;
}
export const FIGURE_FRAMES={portrait:'0 0 360 365',seated:'30 15 300 500',full:'0 0 360 650'};
export function graphicPortrait(identity,{mini=false,full=false,emotion}={}){
 const pose=mini?seatedPose(identity.portrait.build):standingPose(identity.portrait.build);for(const k of Object.keys(pose))if(typeof pose[k]==='object'){pose[k].x+=180;pose[k].y+=190;}
 const phase=(hash(identity.id)%5000/1000).toFixed(2),breath=(3.8+hash(identity.id+'breath')%25/10).toFixed(1),blink=(3.7+hash(identity.id+'blink')%26/10).toFixed(1);
 return`<svg xmlns="http://www.w3.org/2000/svg" class="graphic-portrait anime-figure ${mini?'mini-portrait':''}" viewBox="${FIGURE_FRAMES[mini?'seated':full?'full':'portrait']}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${esc(identity.name)}, ${identity.age}" style="--breath:${breath}s;--blink:${blink}s;--phase:-${phase}s">${figureParts(identity,pose,{emotion,idle:true})}</svg>`;
}
export function puppetSVG(identity,pose,{x,y,scale,width,height,emotion}={}){return`<svg xmlns="http://www.w3.org/2000/svg" class="drag-puppet" viewBox="0 0 ${width} ${height}" aria-hidden="true"><g transform="translate(${x} ${y}) scale(${scale})">${figureParts(identity,pose,{emotion})}</g></svg>`;}
