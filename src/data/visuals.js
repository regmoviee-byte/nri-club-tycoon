// Authored fictional art direction. Never read by compatibility or ratings.
export const SPARSE_PORTRAIT_IDS=['alexandra','denis','sofia','semyon'];
const palettes=[['#edc4b0','#c38d7b'],['#e3b79f','#bb8772'],['#f0d1bd','#cca18d'],['#d6b39a','#ad826e'],['#e5c7b5','#bc9685'],['#d9bd9e','#b09578']];
const dark={alexandra:['#a77559','#794b3e'],denis:['#805947','#5a3a33'],sofia:['#b18265','#875944']};
const longHair=new Set(['alyona','marina','kseniya','evgeniya','lidiya']);
const bobHair=new Set(['alina','irina','nina','yulia']);
const pixie=new Set(['anna','polina','tamara']);
const curls=new Set(['alexandra','nadezhda','sofia','kirill','roman','mark']);
const glasses=new Set(['darya','nadezhda','igor','lidiya','pavel']);
const beards=new Set(['andrey','viktor','denis','lev','roman','sergey']);
const hairs=['#48332f','#2f2930','#915c3d','#665046','#ad9271','#61433a'];
const clothes=['#586a83','#756078','#79554d','#566675','#665d74','#8a7665','#465663','#786b78'];
const hairOverride={alina:'#a26645',darya:'#29262d',kseniya:'#a66a43',anna:'#42352f',svetlana:'#ac9575',evgeniya:'#77513e',vera:'#4c3c35',marina:'#322b2e',elena:'#a56a43',lidiya:'#423331',semyon:'#29272d'};
// Personal combinations stay legible above the counter, where trousers and
// most body-shape differences are hidden. Short hair is shared, not one face.
const authoredPortraits={
  anna:{hairDetail:0},
  tamara:{hair:'pixie',hairDetail:1,hairColor:'#6a4337',face:4,expression:'happy',outfit:'cardigan',coat:'#5b726a',accent:'#d4c4aa'},
};
export function visualFor(id,age,grammar,index){
  const skin=dark[id]??palettes[(index*5+Math.floor(index/5))%palettes.length];
  let hair=longHair.has(id)?'long':bobHair.has(id)?'bob':pixie.has(id)?'pixie':curls.has(id)?'curly':grammar==='feminine'?'tied':'short';
  if(/^(guest|visitor|arrival|generated)-/.test(id)||index>=40)hair=['short','bob','curly','pixie','long','tied','braid','ponytail','shaved'][(index*5+Math.floor(index/9))%9];
  if(id==='darya')hair='braid';if(id==='denis')hair='shaved';if(id==='elena')hair='ponytail';
  return{style:'anime-v2',artRevision:4,bodyShape:['lean','regular','soft','broad','compact'][(index*3+Math.floor(index/6))%5],hairDetail:(index*7+Math.floor(index/3))%3,trousers:['#465366','#4b414b','#59606a','#384753','#615653'][Math.floor(index/2)%5],shoes:['#39333c','#4e3c38','#41444c'][index%3],accent:['#d0baa0','#aab4ab','#c1b1ba','#c4c3b6'][Math.floor(index/3)%4],expression:['calm','happy','bored','surprised','delighted','focused'][(index*5+Math.floor(index/7))%6],iris:['#867044','#536b8c','#677965','#8a6250'][index%4],skin:skin[0],shade:skin[1],hair,hairColor:age>=60?'#a9a7a3':age>=50?'#68605b':hairOverride[id]??hairs[index%hairs.length],shortCurls:grammar==='masculine',coat:clothes[index%clothes.length],outfit:['crew','hoodie','shirt','cardigan','sweater','vest'][(index+Math.floor(index/6)*3)%6],face:index%6,eyes:(index*3+1)%7,nose:(index*5+2)%7,mouth:index%4,build:[.86,1.12,.97,1.23,1.06,.92][index%6],pose:[0,-1.2,.8,0,1.1,-.7,0,.6][index%8],glasses:glasses.has(id),beard:beards.has(id),moustache:id==='vasiliy',freckles:['alina','kseniya','polina','boris'].includes(id),eastAsian:id==='semyon',...authoredPortraits[id]};
}
