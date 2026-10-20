import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,encodeClub,decodeClub,campaignMarket} from '../src/model/campaign.js';
import {hireServiceStaff,setServiceShift,serviceHourlyCost,SERVICE_STAFF} from '../src/model/service-staff.js';
import {recordMoney} from '../src/model/finances.js';

test('Service helper charges the quoted wage only while on shift',()=>{
 const c=createCampaign('service-balance'),before=c.finance.cash;
 assert.equal(hireServiceStaff(c).ok,true);assert.equal(c.finance.cash,before-600);
 assert.equal(serviceHourlyCost(c),0);assert.equal(setServiceShift(c,true).ok,true);
 assert.equal(serviceHourlyCost(c),25);assert.equal(campaignMarket(c).serviceStaff.hourlyWage,25);
 assert.equal(setServiceShift(c,false).ok,true);assert.equal(serviceHourlyCost(c),0);
});
test('Legacy helper adopts future wage without rewriting past financial history',()=>{
 const c=createCampaign('legacy-service');assert.equal(hireServiceStaff(c).ok,true);
 c.serviceStaff[0].hourlyWage=60;delete c.serviceStaff[0].balanceVersion;
 recordMoney(c,-60,'operations','Ранее оплаченная смена');
 const history=structuredClone(c.finance.ledger),loaded=decodeClub(encodeClub(c));
 assert.equal(loaded.serviceStaff[0].hourlyWage,SERVICE_STAFF.hourlyWage);
 assert.deepEqual(loaded.finance.ledger,history);assert.deepEqual(decodeClub(encodeClub(loaded)),loaded);
});
