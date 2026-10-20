// These facts are captured only when that particular answer is really heard.
// Deadlines, boundaries, refusals and system knowledge need today's answer.
import {answerText} from './club.js';
const fresh=new Set(['time','boundaries','avoidGenres','knowledge']);
const fields={rules:['profile.traits.rules'],pace:['profile.traits.pace'],learning:['preferences.learning'],participation:['preferences.spotlight','preferences.interrupts'],houseRules:['preferences.rulesPolicy'],disputes:['preferences.disputes'],tone:['preferences.tone'],stakes:['preferences.stakes'],commitment:['preferences.format','preferences.regularity','preferences.breaks'],habits:['preferences.receiveHelp'],helpOthers:['preferences.giveHelp','preferences.asksBeforeHelping','preferences.respectsNo','preferences.teachingSkill'],stories:['profile.genres']};
const get=(source,path)=>path.split('.').reduce((value,key)=>value?.[key],source);
function set(target,path,value){const keys=path.split('.');let row=target;for(const key of keys.slice(0,-1))row=row[key]??={};row[keys.at(-1)]=structuredClone(value);}
export function conversationFacts(guest,questionId){
 if(fresh.has(questionId)||!fields[questionId])return null;
 const facts={};for(const path of fields[questionId]){const value=get(guest,path);if(value!==undefined)facts[path]=structuredClone(path==='profile.genres'?value.slice(0,1):value);}return facts;
}
export function planningGuest(club,guest,{memory=true}={}){
 const result=structuredClone(guest);result.planningMemory=[];
 if(!memory)return result;
 const known=club.guestRegistry?.persons?.[guest.personId]?.knownAnswers??{};
 const person=club.guestRegistry?.persons?.[guest.personId];
 for(const answer of Object.values(known)){
  if(fresh.has(answer.questionId)||guest.asked.includes(answer.questionId)||answer.visitId===guest.visitId||!fields[answer.questionId])continue;
  // Old saves have literal replies but no typed facts. Reuse only a reply
  // which can be reproduced exactly from the saved person, never today's
  // unseen guest. Unrecognised historical wording stays an explicit memory.
  let facts=answer.facts;
  if(!facts&&person){const source={...person,dialogueVersion:person.dialogueVersion??1,avoidGenres:person.avoidGenres??[]};try{if(answerText(source,answer.questionId,answer.variant)===answer.reply)facts=conversationFacts(source,answer.questionId);}catch{}}
  if(!facts)continue;
  const allowed=fields[answer.questionId];
  for(const [path,value]of Object.entries(facts))if(allowed.includes(path))set(result,path,value);
  if(!result.asked.includes(answer.questionId))result.asked.push(answer.questionId);
  result.planningMemory.push({questionId:answer.questionId,at:answer.at??null,visitId:answer.visitId,reply:answer.reply});
 }
 return result;
}
