import {visualFor} from './visuals.js';

// Fictional applicants. Offer and appearance use separate deterministic streams;
// hiring, dismissal and reloading retain the same person and skills.
const hash=text=>{let n=2166136261;for(const c of text){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
const first={masculine:['Алексей','Дмитрий','Михаил','Антон','Пётр','Максим','Руслан','Вадим','Сергей','Егор','Николай','Тимур'],feminine:['Наталья','Екатерина','Ольга','Елена','Виктория','Татьяна','Людмила','Светлана','Кира','Анастасия','Юлия','Полина']};
const last=['Белов','Орлов','Миронов','Волков','Соколов','Фомин','Лебедев','Кузнецов','Романов','Титов','Зайцев','Крылов'];
const clamp=n=>Math.max(.25,Math.min(1,Math.round(n*100)/100));
export function nextMasterApplicant(index,templates){
 const roll=key=>hash('club-applicant:'+index+':'+key),base=structuredClone(templates[roll('offer')%templates.length]);
 const id='hire-'+index,identityId='master-applicant-'+index,grammar=roll('grammar')%2?'feminine':'masculine',age=23+roll('age')%35;
 const name=first[grammar][roll('name')%first[grammar].length]+' '+last[roll('surname')%last.length]+(grammar==='feminine'?'а':'');
 const teachingSkill=clamp((base.teachingSkill??(base.coaching?.75:.5))+(roll('teaching')%9-4)/100),facilitation=clamp((base.facilitation??(base.invites?.85:.45))+(roll('facilitation')%11-5)/100);
 const wantsTeaching=base.wantsTeaching??base.coaching,teachingCapacity=base.teachingCapacity??(wantsTeaching?2:0),rulesPolicy=base.rulesPolicy??'announced',disputePolicy=base.disputePolicy??'after';
 const detail=[wantsTeaching?'Берётся объяснять правила; одновременно помогает '+(teachingCapacity===1?'одному новичку':teachingCapacity+' новичкам')+'.':'Ведёт игры для подготовленной компании.',base.invites?'Самостоятельно приглашает тихих игроков к действию.':'Ожидает инициативы от игроков.',rulesPolicy==='raw'?'Придерживается правил книги.':'Обсуждает изменения правил до начала.',facilitation>=.8?'Уверенно возвращает слово участникам.':'При одновременных спорах может не успеть помочь каждому.'].join(' ');
 return{...base,id,baseId:identityId,name,age,grammar,identity:{id:identityId,name,age,grammar,portrait:visualFor(identityId,age,grammar,roll('portrait')%100000)},
  fee:Math.max(400,base.fee+(roll('fee')%5-2)*25),hourlyWage:Math.max(160,base.hourlyWage+(roll('wage')%5-2)*5),
  systemSkills:Object.fromEntries(base.known.map(system=>[system,Math.max(60,Math.min(99,(base.systemSkills[system]??80)+(roll('system:'+system)%9-4)))])),
  teachingSkill,facilitation,wantsTeaching,coaching:wantsTeaching,teachingCapacity,rulesPolicy,disputePolicy,announcesChanges:true,protectsChoices:base.protectsChoices??base.adviceBoundary??true,
  detail,limitations:wantsTeaching?'Качество зависит от числа новичков и состава группы.':'Для новичков понадобится другой мастер или подготовка.',fatigue:0,hoursWorked:0,training:null};
}
