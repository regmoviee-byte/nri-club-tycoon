import {recordMoney} from './finances.js';
export const SERVICE_STAFF={fee:600,hourlyWage:25,capacityMultiplier:1.5};
export const serviceStaffOnShift=club=>(club.serviceStaff??[]).filter(person=>person.onShift);
export const serviceHourlyCost=club=>serviceStaffOnShift(club).reduce((sum,person)=>sum+person.hourlyWage,0);
export const serviceCapacity=(club,base,itemId)=>Math.floor(base*(serviceStaffOnShift(club).some(person=>person.assignment?.type==='service'&&person.assignment.itemId===itemId&&!club.operations?.tasks.some(t=>t.helperId===person.id&&t.state==='active'))?SERVICE_STAFF.capacityMultiplier:1));
export function assignServiceStaff(club,itemId){
 const person=club.serviceStaff?.[0];if(!person)return {ok:false,reason:'Сначала пригласите помощника сервиса.'};
 if(club.operations?.tasks.some(t=>t.helperId===person.id&&t.state==='active'))return {ok:false,reason:'Помощник занят уборкой до её окончания.'};
 if(itemId!==null&&!club.layout.objects.some(item=>item.id===itemId&&['water','kettle','coffee','coffeeAuto','cookies','fridge'].includes(item.kind)))return {ok:false,reason:'Выберите конкретную раздачу для помощника.'};
 person.assignment=itemId?{type:'service',itemId}:null;return {ok:true,person};
}
export function hireServiceStaff(club){
 if(club.campaign.status==='bankrupt')return {ok:false,reason:'Это прохождение завершено.'};
 if(club.serviceStaff?.length)return {ok:false,reason:'Помощник сервиса уже нанят.'};
 if(club.finance.cash<SERVICE_STAFF.fee)return {ok:false,reason:club.finance.cash<0?'Сначала погасите долг.':'На приглашение помощника нужно 600 ₽.'};
 const person={id:'service-1',name:'Помощник сервиса',fee:SERVICE_STAFF.fee,hourlyWage:SERVICE_STAFF.hourlyWage,balanceVersion:8,onShift:false};
 club.serviceStaff=[person];recordMoney(club,-person.fee,'hire-service','Приглашён помощник сервиса');return {ok:true,cost:person.fee,person};
}
export function setServiceShift(club,idOrEnabled,enabled){
 const id=typeof idOrEnabled==='string'?idOrEnabled:'service-1',active=typeof idOrEnabled==='boolean'?idOrEnabled:enabled;
 const person=club.serviceStaff?.find(p=>p.id===id);if(!person)return {ok:false,reason:'Сначала пригласите помощника сервиса.'};
 if(typeof active!=='boolean')return {ok:false,reason:'Укажите, работает ли помощник сейчас.'};
 if(active&&(club.finance.cash<0||club.campaign.status==='bankrupt'))return {ok:false,reason:'Нельзя начинать смену при долге или после закрытия клуба.'};
 if(!active&&club.operations?.tasks.some(t=>t.helperId===person.id&&['active','queued'].includes(t.state)))return {ok:false,reason:'Сначала дождитесь окончания назначенной помощнику уборки.'};
 person.onShift=active;return {ok:true,person};
}
export function validateServiceStaff(club){
 if(club.serviceStaff===undefined)club.serviceStaff=[];
 if(!Array.isArray(club.serviceStaff)||club.serviceStaff.length>1||club.serviceStaff.some(p=>p.id!=='service-1'||p.fee!==600||![60,SERVICE_STAFF.hourlyWage].includes(p.hourlyWage)||typeof p.onShift!=='boolean'||p.assignment&&(p.assignment.type!=='service'||!club.layout.objects.some(i=>i.id===p.assignment.itemId))))throw new Error('Повреждено сохранение помощника сервиса.');
 // Only future shift costs change. Past ledger entries and signed contracts stay intact.
 for(const person of club.serviceStaff){person.hourlyWage=SERVICE_STAFF.hourlyWage;person.balanceVersion=8;}
 return club;
}
