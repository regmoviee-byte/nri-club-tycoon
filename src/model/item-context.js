import {sessionProgram} from './preferences.js';
import {QUALITY_BALANCE as Q} from '../data/balance.js';

const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
// The announced story, not a private wish, determines whether a prop can be
// used. Planning, review and the inspector share this public context.
export function itemContext(session,program=sessionProgram(session??{})){
 return {combat:clamp(program?.scenes?.combat),exploration:clamp(program?.scenes?.exploration),tone:program?.tone??'mixed'};
}
export function contextualLearningAllowance(items,{learning,context}={}){
 const enabled=(items??[]).filter(i=>i.enabled!==false),has=kind=>enabled.some(i=>(i.kind??i.type)===kind||i.type===kind);
 const written=has('tablet')?Q.tabletMaterials:(has('whiteboard')||has('board'))&&['ahead','table'].includes(learning)?Q.boardMaterials:0;
 const visual=has('miniatures')&&learning==='describe'?Q.miniatureMaterials*(context?.combat??0):0;
 return Math.max(written,visual);
}
