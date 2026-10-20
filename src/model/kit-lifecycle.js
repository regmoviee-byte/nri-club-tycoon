import {recordMoney} from './finances.js';

// Working game balance, not measured maintenance prices of real clubs.
export const KIT_BALANCE=Object.freeze({preparationHours:.25,wearPerHour:1,warningCondition:30,repairHours:.5,repairRate:.15,minimumRepair:60});
const busy=(club,id)=>club.rooms.some(r=>r.status==='running'&&(r.run?.room?.kitId??r.kitId)===id);
const byId=(club,id)=>club.library.copies.find(k=>k.id===id);
export function ensureKits(club){
 for(const kit of club.library.copies){kit.condition??=100;kit.useCount??=0;kit.usedRunIds??=[];kit.preparingUntil??=null;kit.repair??=null;}
 return club;
}
export const kitSalvage=kit=>Math.floor(kit.price*.6*Math.max(0,Math.min(100,kit.condition??100))/100);
export function kitStatus(club,id){
 const kit=byId(club,id);if(!kit)return{ok:false,reason:'Игровой комплект не найден.'};
 const running=busy(club,id),preparing=(kit.preparingUntil??0)>club.clock,repairing=Boolean(kit.repair),condition=kit.condition??100;
 const task=club.rooms.find(r=>r.tablePreparation?.kitId===id)?.tablePreparation,queued=preparing&&(task?.startedAt??club.clock)>club.clock;
 const reason=running?'Этот комплект используется в идущей игре.':preparing?(queued?'Материалы ждут управляющего в очереди на проверку.':'Управляющий собирает и проверяет материалы после игры.'):repairing?'Комплект на обслуживании.':condition<=0?'Комплект изношен. Отремонтируйте его или назначьте другой экземпляр.':'';
 return{ok:!running&&!preparing&&!repairing&&condition>0,id,condition,useCount:kit.useCount??0,running,preparing,queued,repairing,warning:condition<=KIT_BALANCE.warningCondition,readyAt:kit.repair?.endsAt??(preparing?kit.preparingUntil:null),reason,repairQuote:{cost:Math.max(KIT_BALANCE.minimumRepair,Math.round(kit.price*KIT_BALANCE.repairRate)),hours:KIT_BALANCE.repairHours,available:!running&&!preparing&&!repairing&&condition<100},saleValue:kitSalvage(kit)};
}
export function roomPreparation(club,roomId){
 const room=club.rooms.find(r=>r.id===roomId),task=room?.tablePreparation;
 if(!task||task.endsAt<=club.clock)return{ready:true,endsAt:null,reason:''};
 const queued=task.startedAt>club.clock,remainingMinutes=Math.ceil((task.endsAt-club.clock)*60-1e-8);
 return{ready:false,queued,startsAt:task.startedAt,endsAt:task.endsAt,remainingMinutes,reason:(queued?'Стол ждёт управляющего в очереди. ':'Управляющий собирает и проверяет материалы. ')+`До готовности ${remainingMinutes} минут; проверка каждого стола занимает 15 минут. Это базовая работа без доплаты.`};
}
export function prepareAfterRun(club,run,room){
 ensureKits(club);const kit=byId(club,run.room.kitId??room.kitId);if(!kit||kit.usedRunIds.includes(run.id))return false;
 kit.usedRunIds.push(run.id);kit.useCount++;kit.condition=Math.max(0,Math.round((kit.condition-(run.endsAt-run.startedAt)*KIT_BALANCE.wearPerHour)*100)/100);
 const startedAt=Math.max(run.endsAt,...club.rooms.map(r=>r.tablePreparation?.endsAt??run.endsAt));
 kit.preparingUntil=startedAt+KIT_BALANCE.preparationHours;
 room.tablePreparation={runId:run.id,kitId:kit.id,queuedAt:run.endsAt,startedAt,endsAt:kit.preparingUntil};return true;
}
export function kitDeadlines(club){return [...club.library.copies.flatMap(k=>[k.preparingUntil,k.repair?.endsAt]),...club.rooms.map(r=>r.tablePreparation?.endsAt)].filter(t=>Number.isFinite(t)&&t>club.clock);}
export function finishKitTasks(club){
 ensureKits(club);
 for(const kit of club.library.copies){if(kit.preparingUntil!==null&&kit.preparingUntil<=club.clock)kit.preparingUntil=null;if(kit.repair&&kit.repair.endsAt<=club.clock){kit.condition=100;kit.repair=null;}}
 for(const room of club.rooms)if(room.tablePreparation?.endsAt<=club.clock)room.tablePreparation=null;
}
export function repairKit(club,id){
 ensureKits(club);const kit=byId(club,id),state=kitStatus(club,id);
 if(!kit)return{ok:false,reason:state.reason};
 if(!state.repairQuote.available)return{ok:false,reason:state.reason||'Этот комплект уже в полном порядке.'};
 const {cost,hours}=state.repairQuote;if(club.finance.cash<cost)return{ok:false,reason:club.finance.cash<0?'Сначала погасите долг.':'Не хватает денег на обслуживание комплекта.'};
 const taskId=`kit-repair-${id}-${club.clock}`;
 if(!recordMoney(club,-cost,'kit-maintenance','Обслуживание игрового комплекта',{id:taskId,details:{kitId:id}}))return{ok:false,reason:'Оплата этого обслуживания уже есть в кассе. Проверьте сохранённое состояние комплекта.'};
 kit.repair={id:taskId,startedAt:club.clock,endsAt:club.clock+hours,cost};return{ok:true,cost,endsAt:kit.repair.endsAt};
}
export function validateKits(club){
 for(const kit of club.library.copies){
  if(!Number.isFinite(kit.condition)||kit.condition<0||kit.condition>100||!Number.isInteger(kit.useCount)||kit.useCount<0||!Array.isArray(kit.usedRunIds)||new Set(kit.usedRunIds).size!==kit.usedRunIds.length||kit.usedRunIds.some(id=>typeof id!=='string'||!id)||kit.usedRunIds.length>kit.useCount||kit.preparingUntil!==null&&(!Number.isFinite(kit.preparingUntil)||kit.preparingUntil<0)||kit.repair!==null&&(!kit.repair||typeof kit.repair.id!=='string'||!kit.repair.id||!Number.isFinite(kit.repair.startedAt)||!Number.isFinite(kit.repair.endsAt)||kit.repair.endsAt<=kit.repair.startedAt||kit.repair.startedAt>club.clock||!Number.isSafeInteger(kit.repair.cost)||kit.repair.cost<0))throw new Error('Повреждено состояние игрового комплекта.');
 }
 for(const room of club.rooms)if(room.tablePreparation&&(!Number.isFinite(room.tablePreparation.endsAt)||!Number.isFinite(room.tablePreparation.startedAt)||room.tablePreparation.endsAt<=room.tablePreparation.startedAt||room.tablePreparation.queuedAt!==undefined&&(!Number.isFinite(room.tablePreparation.queuedAt)||room.tablePreparation.queuedAt>club.clock)||!byId(club,room.tablePreparation.kitId)||typeof room.tablePreparation.runId!=='string'))throw new Error('Повреждена подготовка стола.');
 return club;
}
