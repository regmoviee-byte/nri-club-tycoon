import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign} from '../src/model/campaign.js';
import {SESSIONS} from '../src/data/club.js';
import {BUILD_CATALOG} from '../src/data/build-catalog.js';
import {PRODUCTS} from '../src/data/commerce.js';
import {roomUpgradeBenefit,roomUpgradeBenefitV8,serviceUpgradeBenefitV8,clubPrestige} from '../src/model/upgrades.js';
import {rateCampaignGuest,tableWorkloadV8,learningMaterialAllowance} from '../src/model/campaign-rating.js';
import {sessionProgram} from '../src/model/preferences.js';

function fixture(){
 const c=createCampaign('purchases-quality-fixture'),session=structuredClone(SESSIONS.find(s=>s.id==='club-last-orbit'));
 const guests=c.guests.slice(0,4).map((g,seat)=>{const copy=structuredClone(g);copy.seat=seat;copy.profile.genres=[{id:session.genres[0]}];copy.profile.boundaries=[];copy.schedule={arrivalAt:12,leaveAt:24,preferred:[4,4]};copy.waiting={totalHours:0,seatedHours:0,standingHours:0,legacyHours:0};copy.preferences.tone='serious';copy.preferences.knowledge.fate=0;copy.preferences.learning='table';copy.preferences.scenes.combat=1;copy.preferences.comfort={longSeat:true,quiet:true,heat:true,drink:'coffee',snack:true,cold:true};return copy;});
 return{id:'quality-fixture',ratingVersion:8,startedAt:12,endsAt:16,guests,room:{session,program:sessionProgram(session),master:structuredClone(c.staff[0]),equipment:[],chairIds:['c0','c1','c2','c3'],environment:{hot:false,noisyAppliances:false}},observed:{services:[],noiseHours:0}};
}
const put=(run,kind,id=kind)=>run.room.equipment.push({id,kind,type:({tableComfort:'wideTable',whiteboard:'board'}[kind]??kind),enabled:true});

test('Old V7 accepted upgrade values remain fixed after V8 catalogue changes',()=>{
 const r=fixture();put(r,'tableComfort');put(r,'dice');put(r,'mat');put(r,'miniatures');put(r,'screen');
 assert.equal(roomUpgradeBenefit(r,r.guests[0]).bonus,.6);assert.equal(roomUpgradeBenefit(r,r.guests[0]).effects.find(e=>e.text.includes('просторным')).value,.12);
 const review=rateCampaignGuest({...r,ratingVersion:7},r.guests[0]);assert.equal(review.ratingVersion,7);assert.equal(review.satisfactionValue,undefined);
});
test('Targeted V8 accessories have bounded continuous effects and duplicates cannot stack',()=>{
 const r=fixture();put(r,'mat');const one=roomUpgradeBenefitV8(r,r.guests[0]);assert.equal(one.bonus,.25);
 for(let i=0;i<40;i++)put(r,'mat','duplicate-'+i);assert.equal(roomUpgradeBenefitV8(r,r.guests[0]).bonus,.25);
 put(r,'tableComfort');put(r,'miniatures');put(r,'dice');put(r,'screen');assert.equal(roomUpgradeBenefitV8(r,r.guests[0]).bonus,.8);
 r.guests[0].preferences.scenes.combat=.1;r.guests[0].preferences.scenes.exploration=.1;r.guests[0].preferences.tone='comic';r.guests[0].preferences.knowledge.fate=3;
 assert.equal(roomUpgradeBenefitV8(r,r.guests[0]).bonus,.3);
});
test('Actual service grants one preference-specific bonus, not a bonus for every portion',()=>{
 const r=fixture(),g=r.guests[0];put(r,'coffee');put(r,'cookies');assert.equal(serviceUpgradeBenefitV8(r,g).bonus,0);
 r.observed.services=[{guestId:g.id,service:'coffee',clock:13},{guestId:g.id,service:'cookie',clock:14},{guestId:g.id,service:'cold',clock:14.5},...Array.from({length:20},()=>({guestId:g.id,service:'coffee',clock:15}))];
 assert.equal(serviceUpgradeBenefitV8(r,g).bonus,.35);assert.equal(serviceUpgradeBenefitV8(r,g).effects.length,3);
 r.guests[0].preferences.comfort.snack=false;r.guests[0].preferences.comfort.cold=false;assert.equal(serviceUpgradeBenefitV8(r,g).bonus,.18);
 r.endsAt=14;r.startedAt=12;assert.equal(serviceUpgradeBenefitV8(r,g).bonus,0);
 r.endsAt=16;r.observed.services=[{guestId:g.id,service:'coffee',clock:11.9},{guestId:g.id,service:'coffee',clock:16}];assert.equal(serviceUpgradeBenefitV8(r,g).bonus,0);
});
test('Tablet helps described first turns; board and tablet use the better material, without stacking',()=>{
 const r=fixture();r.room.master={...r.room.master,wantsTeaching:false,coaching:false,teachingCapacity:0};for(const g of r.guests){g.preferences.giveHelp='none';g.preferences.receiveHelp='none';g.preferences.learning='describe';}
 put(r,'whiteboard');const board=tableWorkloadV8(r);assert.equal(board.materialsById[r.guests[0].id],0);
 put(r,'tablet');const tablet=tableWorkloadV8(r);assert.equal(tablet.materialsById[r.guests[0].id],.4);
 put(r,'tablet','second-tablet');assert.equal(tableWorkloadV8(r).materialsById[r.guests[0].id],.4);
 assert.ok(tablet.served<.5,'A tablet cannot replace the teacher for four people learning by description');
});
test('Armrests and sofa have their own contextual role and require their actual occupied place',()=>{
 const r=fixture(),g=r.guests[0];put(r,'chairArms','c0');assert.equal(roomUpgradeBenefitV8(r,g).bonus,.2);assert.equal(roomUpgradeBenefitV8(r,r.guests[1]).bonus,0);
 g.waiting.sofaHours=1;assert.equal(roomUpgradeBenefitV8(r,g).bonus,.4);delete g.waiting.sofaHours;g.waiting.seatedHours=2;assert.equal(roomUpgradeBenefitV8(r,g).bonus,.2);
 r.endsAt=14;assert.equal(roomUpgradeBenefitV8(r,g).bonus,0);
});
test('V8 keeps fractional satisfaction, and hard violations/dirty rooms cannot be cured by purchased bonuses',()=>{
 const r=fixture(),g=r.guests[0],base=rateCampaignGuest(r,g);put(r,'tableComfort');const improved=rateCampaignGuest(r,g);
 assert.equal(improved.ratingVersion,8);assert.equal(improved.satisfactionValue,improved.satisfaction);assert.ok(improved.satisfactionValue>=base.satisfactionValue);assert.ok(improved.upgradeBenefit.bonus>0);
 g.schedule.leaveAt=15;const late=rateCampaignGuest(r,g);assert.ok(late.violations.length);assert.equal(late.upgradeBenefit.bonus,0);assert.ok(late.satisfactionValue<=4);
 g.schedule.leaveAt=24;r.observed.dirtyHours=1;const dirty=rateCampaignGuest(r,g);assert.equal(dirty.upgradeBenefit.bonus,0);assert.equal(dirty.comfort.dirty,true);
});
test('Catalogue cash prices and real service margins agree',()=>{
 assert.equal(BUILD_CATALOG.tableComfort.price,2000);assert.equal(PRODUCTS.tablet.price,1600);assert.equal(PRODUCTS.tablet.hourly,1);
 assert.deepEqual([PRODUCTS.coffee.price,PRODUCTS.coffee.capacity,PRODUCTS.coffee.salePrice,PRODUCTS.coffee.unitCost,PRODUCTS.coffee.hourly],[1200,2,40,12,2]);
 assert.deepEqual([PRODUCTS.coffeeAuto.price,PRODUCTS.coffeeAuto.capacity,PRODUCTS.coffeeAuto.salePrice,PRODUCTS.coffeeAuto.unitCost,PRODUCTS.coffeeAuto.hourly],[2600,6,40,8,6]);
});
test('Unmet teaching has a visible cost only for an actual novice; visual aids cannot replace a teacher',()=>{
 const r=fixture(),g=r.guests[0];r.room.master={...r.room.master,wantsTeaching:false,coaching:false,teachingCapacity:0};for(const guest of r.guests){guest.preferences.giveHelp='none';guest.preferences.receiveHelp='none';guest.preferences.learning='describe';}
 const unsupported=rateCampaignGuest(r,g);assert.equal(unsupported.teachingPenalty,2.5);assert.ok(unsupported.events.some(e=>e.code==='unmet-teaching'));
 put(r,'miniatures');assert.equal(learningMaterialAllowance(r.room.equipment,{learning:'describe',combat:1}),.15);
 const visual=rateCampaignGuest(r,g);assert.ok(visual.workload.servedById[g.id]<.2);assert.equal(visual.teachingPenalty,2.5);
 g.preferences.knowledge.fate=3;assert.equal(rateCampaignGuest(r,g).teachingPenalty,0);
 assert.equal(learningMaterialAllowance([{kind:'whiteboard',enabled:true}],{}),0);
});
test('New feminine reviews do not apply masculine phrase replacement twice',()=>{
 const r=fixture(),g=r.guests[0];g.identity.grammar='feminine';g.preferences.spotlight='invited';g.preferences.knowledge.fate=3;r.room.master.invites=false;
 const review=rateCampaignGuest(r,g),text=JSON.stringify({text:review.text,evidence:review.evidence,comfort:review.comfort});assert.doesNotMatch(text,/(ждала|просила|хотела|устала|играла|рассчитывала)а+/u);
});
test('Prestige needs a sample of reviews; decoration has one shared cap and repeated copies diminish',()=>{
 const c=createCampaign('prestige-concentration'),baseline=clubPrestige(c);c.rating={sum:10,count:1};assert.equal(clubPrestige(c).reputation,0);
 c.rating={sum:80,count:8};assert.equal(clubPrestige(c).reputation,8);
 c.rating={sum:160,count:16};assert.equal(clubPrestige(c).reputation,16);
 const sample=c.layout.objects.find(o=>o.kind==='table');assert.ok(sample);for(let i=0;i<20;i++)c.layout.objects.push({id:'many-poster-'+i,kind:'poster',x:sample.x,y:sample.y,rotation:0,roomId:sample.roomId,enabled:true});
 const prestige=clubPrestige(c);assert.ok(prestige.decorative<=8);assert.ok(prestige.physical<=25);assert.ok(prestige.sources.filter(s=>s.name==='Постер').length<=2);assert.ok(baseline.value<=25);
});
