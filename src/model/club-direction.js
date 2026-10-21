export const BEGINNER_DIRECTION=Object.freeze({activationCost:300,hourlyCost:15,demandBonus:1.5,newcomerShare:.65,returningLearnerChance:.65});
export function ensureClubDirection(club){
 club.clubDirection??={version:1,id:'general',chosenAt:club.clock};return club.clubDirection;
}
export function directionHourlyCost(club){return club.clubDirection?.id==='beginners'?BEGINNER_DIRECTION.hourlyCost:0;}
export function clubDirectionStatus(club){
 const direction=club.clubDirection??{id:'general'},persons=Object.values(club.guestRegistry?.persons??{}),introduced=persons.filter(p=>Object.keys(p.introductions??{}).length>0),learners=new Map(introduced.map(p=>[p.id,Object.values(p.introductions).filter(i=>Number.isFinite(i.at))])),returned=new Set();
 for(const visit of Object.values(club.guestRegistry?.visits??{}))if(learners.get(visit.personId)?.some(lesson=>visit.arrivedAt>lesson.at||visit.arrivedAt===lesson.at&&lesson.visitId&&visit.id!==lesson.visitId))returned.add(visit.personId);
 const returningLearners=introduced.filter(p=>returned.has(p.id));
 return {id:direction.id,name:direction.id==='beginners'?'Школа новичков':'Открытый клуб',activationCost:BEGINNER_DIRECTION.activationCost,hourlyCost:direction.id==='beginners'?BEGINNER_DIRECTION.hourlyCost:0,beginnersHourlyCost:BEGINNER_DIRECTION.hourlyCost,demandBonus:direction.id==='beginners'?BEGINNER_DIRECTION.demandBonus:0,returningLearnerChance:BEGINNER_DIRECTION.returningLearnerChance,description:direction.id==='beginners'?'Объявление школы привлекает больше людей, которым нужна помощь с правилами. Если успешно обученный постоянный гость уже может вернуться, 65% попыток прихода сначала обращаются к таким людям вместо обычных 45% для постоянников. При отсутствии подходящего человека придёт новый гость. Мастера, материалы и состав выбираете вы; бонуса к оценке нет.':'Общий поток без платы за направление. Можно проводить любые купленные истории и обучать гостей.',progress:{introduced:introduced.length,returningLearners:returningLearners.length},progressLabels:{introduced:'Гости, освоившие первый ход новой системы',returningLearners:'Из них вернулись в клуб'}};
}
export function validateClubDirection(club){
 const direction=ensureClubDirection(club);
 if(direction.version!==1||!['general','beginners'].includes(direction.id)||!Number.isFinite(direction.chosenAt)||direction.chosenAt>club.clock)throw Error('Повреждено направление клуба.');return true;
}
