// Development marks the player's history. It never ends a solvent club or
// grants money, hires staff, seats guests or starts another session.
const tracks=[
 {id:'rooms',title:'Рабочие комнаты',steps:[1,2,5,10,20,50]},
 {id:'participations',title:'Отзывы гостей',steps:[4,25,100,250,500,1000]},
 {id:'reserve',title:'Свободные деньги',steps:[1000,8000,25000,50000,100000]},
];
const ids=new Set(tracks.map(t=>t.id));
const stepsThrough=(track,value)=>{
 const steps=[...track.steps];
 while(steps.at(-1)<=value&&steps.at(-1)<=Number.MAX_SAFE_INTEGER/2)steps.push(steps.at(-1)*2);
 return steps;
};
export function ensureDevelopment(club){
 const campaign=club.campaign;
 // Preserve old completion as history; remove its control over continued play.
 if(campaign.won&&!campaign.previousVictory)campaign.previousVictory={clock:campaign.wonAt??club.clock,goal:structuredClone(campaign.goal??{})};
 delete campaign.won;delete campaign.wonAt;delete campaign.goal;delete campaign.continued;
 campaign.mode='endless';
 campaign.development??={version:1,records:{rooms:0,participations:0,reserve:0},earned:[]};
 const d=campaign.development;
 if(d.version!==1||!d.records||!Array.isArray(d.earned)||tracks.some(t=>!Number.isFinite(d.records[t.id])||d.records[t.id]<0)||new Set(d.earned.map(a=>a.id)).size!==d.earned.length||d.earned.some(a=>!ids.has(a.metric)||!Number.isSafeInteger(a.value)||a.value<1||a.id!==a.metric+':'+a.value||!Number.isFinite(a.clock)||a.clock>club.clock||!stepsThrough(tracks.find(t=>t.id===a.metric),a.value).includes(a.value)))throw Error('Повреждена история развития клуба.');
 return d;
}
export function updateDevelopment(club,progress){
 const d=ensureDevelopment(club),seen=new Set(d.earned.map(a=>a.id));
 for(const track of tracks){
  const value=Math.max(0,progress[track.id]);
  d.records[track.id]=Math.max(d.records[track.id],value);
  for(const threshold of stepsThrough(track,d.records[track.id])){
   const id=track.id+':'+threshold;
   if(threshold<=d.records[track.id]&&!seen.has(id)){d.earned.push({id,metric:track.id,value:threshold,clock:club.clock});seen.add(id);}
  }
 }
 return d;
}
export function developmentStatus(club,progress){
 const d=club.campaign.development??{records:{},earned:[]};
 return{mode:'endless',current:{...progress},tracks:tracks.map(track=>{
  const record=Math.max(d.records[track.id]??0,progress[track.id],0),next=stepsThrough(track,record).find(n=>n>record)??null;
  return{id:track.id,title:track.title,current:progress[track.id],record,next};
 }),earned:d.earned.map(a=>({...a,title:tracks.find(t=>t.id===a.metric).title}))};
}
