import { hash } from './generator.js';
import { better,buildCostModel } from './assessment.js';
export function shuffled(items,seed){const copy=[...items];let n=hash(seed);for(let i=copy.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
export function validateGroups(rooms,guests,groups){return Array.isArray(groups)&&groups.length===rooms.length&&groups.every((g,r)=>Array.isArray(g)&&g.length===rooms[r].capacity)&&groups.flat().length===guests.length&&new Set(groups.flat()).size===guests.length&&groups.flat().every(i=>Number.isInteger(i)&&i>=0&&i<guests.length);}
// Exact bipartite matching for mandatory unary conditions only. This does not
// claim to optimize comfort or group relationships.
export function feasibleGrouping(rooms,guests,seed='feasible',model=buildCostModel(rooms,guests)){
  const slots=rooms.flatMap((r,ri)=>Array.from({length:r.capacity},()=>ri));if(slots.length!==guests.length)return null;
  const owners=slots.map(()=>-1),order=shuffled(guests.map((_,i)=>i),seed);
  const slotOrder=shuffled(slots.map((_,i)=>i),seed+'|slots');
  function augment(guest,seen){for(const slot of slotOrder){if(seen.has(slot)||model.base[slots[slot]][guest].hard)continue;seen.add(slot);if(owners[slot]===-1||augment(owners[slot],seen)){owners[slot]=guest;return true;}}return false;}
  for(const guest of order)if(!augment(guest,new Set()))return null;
  return rooms.map((_,r)=>owners.filter((_,slot)=>slots[slot]===r));
}
export function searchArrangement(rooms,guests,{seed='comfort',restarts=10,maxPasses=18,initialGroups=null}={}){
  if(rooms.reduce((sum,r)=>sum+r.capacity,0)!==guests.length)throw new RangeError('Число мест должно совпадать с числом гостей.');
  const model=buildCostModel(rooms,guests),starts=[];let checkedSwaps=0;
  if(validateGroups(rooms,guests,initialGroups))starts.push(initialGroups.map(g=>[...g]));
  for(let i=0;i<restarts;i++){
    const feasible=feasibleGrouping(rooms,guests,seed+'|'+i,model);
    if(feasible)starts.push(feasible);
  }
  if(!starts.length){const ids=shuffled(guests.map((_,i)=>i),seed);let offset=0;starts.push(rooms.map(r=>{const group=ids.slice(offset,offset+r.capacity);offset+=r.capacity;return group;}));}
  let best=null;
  for(const start of starts){
    const groups=start.map(g=>[...g]),scores=groups.map((g,r)=>model.score(r,g));
    for(let pass=0;pass<maxPasses;pass++){
      let bestMove=null;
      for(let r=0;r<rooms.length;r++)for(let s=r+1;s<rooms.length;s++)for(let a=0;a<groups[r].length;a++)for(let b=0;b<groups[s].length;b++){
        checkedSwaps++;const one=[...groups[r]],two=[...groups[s]];[one[a],two[b]]=[two[b],one[a]];
        const first=model.score(r,one),second=model.score(s,two);
        const delta={hard:first.hard+second.hard-scores[r].hard-scores[s].hard,soft:first.soft+second.soft-scores[r].soft-scores[s].soft};
        if(better(delta,{hard:0,soft:0})&&(!bestMove||better(delta,bestMove.delta)))bestMove={r,s,one,two,first,second,delta};
      }
      if(!bestMove)break;
      const m=bestMove;groups[m.r]=m.one;groups[m.s]=m.two;scores[m.r]=m.first;scores[m.s]=m.second;
    }
    const cost=scores.reduce((sum,s)=>({hard:sum.hard+s.hard,soft:sum.soft+s.soft}),{hard:0,soft:0});
    if(better(cost,best))best={...cost,groups:groups.map(g=>[...g])};
  }
  return{...best,method:'bounded-multistart-swap-search',provenOptimal:false,checkedSwaps,starts:starts.length,maxPasses};
}
