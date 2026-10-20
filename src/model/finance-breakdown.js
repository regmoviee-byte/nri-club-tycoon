import {hourlyCosts,reserveEstimate} from './finances.js';

// A cash statement, not a forecast or an accrual-profit calculation. Inventory
// use is shown separately because its purchase has already been paid in cash.
const round=value=>Math.round(value*100)/100;
const categories={
 receipts:['session','tips','cafe'],
 running:['wage','operations','cleaning','cleaning-refund','repair','kit-maintenance','fine'],
 stock:['stock','stock-refund'],
 development:['opening','construction','game','adventure','hire','hire-service','training','sale','restoration'],
};
export function financeBreakdown(club){
 const sums={receipts:0,running:0,stock:0,development:0,other:0};
 for(const entry of club.finance.ledger){
  const category=Object.keys(categories).find(key=>categories[key].includes(entry.kind))??'other';
  sums[category]+=entry.amount;
 }
 for(const key of Object.keys(sums))sums[key]=round(sums[key]);
 const change=round(Object.values(sums).reduce((sum,value)=>sum+value,0));
 const movements=club.inventory?.movements??[],cost=type=>round(movements.filter(m=>m.type===type).reduce((sum,m)=>sum+m.quantity*m.unitCost,0));
 return {...sums,change,initial:round(club.finance.cash-change),cash:club.finance.cash,issuedCost:cost('serve'),writtenOffCost:cost('write-off'),estimatedInventory:Boolean(club.inventory?.batches?.some(b=>b.costEstimated))};
}

// Read-only investment arithmetic. afterClub may already contain the proposed
// transaction: its cash is deliberately ignored, so a quote never charges twice.
// The reserve covers known deadlines, not an unstarted game or future revenue.
export function investmentQuote(club,{cost=0,refund=0,afterClub=null}={}){
 if(!Number.isFinite(cost)||cost<0||!Number.isFinite(refund)||refund<0)throw new Error('Некорректная сумма сметы.');
 const after=afterClub??club,beforeReserve=reserveEstimate(club),afterReserve=reserveEstimate(after);
 const hourly=value=>round(Object.values(hourlyCosts(value)).reduce((sum,amount)=>sum+amount,0));
 const balanceAfter=round(club.finance.cash-cost+refund),freeAfter=round(balanceAfter-afterReserve.total);
 return {cost:round(cost),refund:round(refund),balanceBefore:club.finance.cash,balanceAfter,
  hourlyBefore:hourly(club),hourlyAfter:hourly(after),reserveBefore:beforeReserve.total,reserveAfter:afterReserve.total,
  freeAfter,shortfall:Math.max(0,-freeAfter),projected:Boolean(afterClub),reserveThrough:afterReserve.through,reserveHours:afterReserve.hours};
}

// Only offer empty, idle rooms. Closing an occupied room needs the separate
// assignment flow; this read model must never unseat guests or change a save.
export function emptyRoomSavings(club){
 return club.rooms.filter(room=>room.enabled&&room.status!=='running'&&!club.guests.some(guest=>guest.roomId===room.id)).map(room=>{
  const afterClub={...club,rooms:club.rooms.map(value=>value.id===room.id?{...value,enabled:false,operational:false}:value)};
  const quote=investmentQuote(club,{afterClub});
  return {roomId:room.id,hourlySaving:round(quote.hourlyBefore-quote.hourlyAfter),...quote};
 });
}
