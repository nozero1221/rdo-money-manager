import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,clone,sanitize,parseDuration,reconcile,MIN,HOUR,ANIMALS,HABITAT,rankAnimals,recommendations,buyerAdvice,gameMinutes,mod,migrateLegacy} from '../companion-core.mjs';
const now=1790000000000;
test('durations accept minute/second/hour input and reject invalid text',()=>{
 assert.equal(parseDuration('12:30'),750000);assert.equal(parseDuration('1:36:00'),96*MIN);assert.equal(parseDuration('0.5'),30000);
 for(const s of ['','NaN','-3','0','1:60','1:2:3:4','361','<script>'])assert.equal(parseDuration(s),null,s);
});
test('buyer cycles catch up over several missed resets without restarting from now',()=>{
 const s=defaults();s.buyers.next=now-200*MIN;s.buyers.status='preferred';s.buyers.recipe=s.moon.recipe;s.buyers.checkedAt=now-MIN;
 assert.equal(reconcile(s,now),true);assert.equal(s.buyers.next,now+88*MIN);assert.equal(s.buyers.status,'unknown');assert.equal(reconcile(s,now),false);
});
test('exact reset moves one whole cycle forward',()=>{const s=defaults();s.buyers.next=now;reconcile(s,now);assert.equal(s.buyers.next,now+96*MIN)});
test('return from background finishes production but preserves paused production',()=>{
 const s=defaults();s.moon.status='cooking';s.moon.end=now-MIN;reconcile(s,now);assert.equal(s.moon.status,'ready');
 s.moon.status='paused';s.moon.remaining=10*MIN;reconcile(s,now+12*HOUR);assert.equal(s.moon.remaining,10*MIN);assert.equal(s.moon.status,'paused');
});
test('cooldown species excluded and collected-only filter is independent',()=>{
 const s=defaults();s.collection.cooldowns.wolf=now+HOUR;
 assert.ok(!rankAnimals(s,now).some(a=>a.species==='wolf'));
 s.ui.hideCooldowns=false;assert.equal(rankAnimals(s,now).filter(a=>a.species==='wolf').length,2);
 s.ui.missingOnly=true;s.collection.got.teca_gator=true;assert.ok(!rankAnimals(s,now).some(a=>a.id==='teca_gator'));
});
test('unknown weather is not reported as a weather match',()=>{
 const s=defaults();s.clock.weather='unknown';const a=rankAnimals(s,now).find(a=>a.weather!=='any');assert.equal(a.weatherScore,1);
});
test('midnight-spanning preferred window handles both sides correctly',()=>{
 for(const hour of [0,5,18,23]){const s=defaults();s.clock.offset=mod(hour*60-now/2000+720,1440)-720;assert.equal(rankAnimals(s,now).find(a=>a.name==='Emerald Wolf').inWindow,true);}
});
test('an active Etta run suppresses impossible concurrent role recommendations',()=>{
 const s=defaults();s.etta={active:true,start:now-MIN,captured:false};s.trader.goods=100;s.moon.status='ready';
 assert.ok(recommendations(s,now).every(a=>a.target==='etta'));
});
test('an unconfirmed list never means sell to Bert',()=>{
 const s=defaults();s.moon.status='ready';s.buyers.next=now+95*MIN;
 assert.match(buyerAdvice(s,now).title,/Check/);assert.ok(!buyerAdvice(s,now).title.includes('Selling now'));
});
test('economic comparison uses entered values rather than an 18-minute rule',()=>{
 const s=defaults();s.moon.status='ready';Object.assign(s.buyers,{next:now+20*MIN,status:'bert',checkedAt:now,recipe:s.moon.recipe,offerNow:140,offerBetter:220,nextCost:40,deliveryMinutes:12});
 assert.ok(Math.abs(buyerAdvice(s,now).ceiling-80/(180/60))<1e-8);
 assert.match(buyerAdvice(s,now).title,/hold/);s.buyers.next=now+50*MIN;assert.match(buyerAdvice(s,now).title,/Selling now/);
});
test('clock advances by wall time across page absence',()=>{const s=defaults();s.clock.offset=10;assert.ok(Math.abs(mod(gameMinutes(s,now+10*MIN)-gameMinutes(s,now),1440)-300)<0.0001)});
test('legacy migration keeps existing timers, collections and calibration',()=>{
 const legacy={rdo_manager_v3:{bountyEnd:now+MIN,goods:73,moonEnd:now+5*MIN,moonActive:true,ettaActive:true,ettaStart:now-MIN},rdo_legendary_collection_v1:{got:{emerald_wolf:true},cooldowns:{wolf:now+HOUR}},rdo_nat_mountain_grassland_v1:{badger:{sampled:true,stamped:true}},rdo_legendary_advisor_v2:{syncOffsetMin:23,calibrated:true}};
 const s=migrateLegacy(k=>legacy[k],now);assert.equal(s.trader.goods,73);assert.equal(s.timers.bounty,now+MIN);assert.equal(s.moon.status,'cooking');assert.equal(s.collection.got.emerald_wolf,true);assert.equal(s.clock.offset,23);assert.equal(s.habitat.stamped.badger,true);assert.equal(s.buyers.status,'unknown');
});
test('import validation rejects bad shapes and ignores prototype pollution',()=>{
 assert.throws(()=>sanitize(null));const s=sanitize(JSON.parse('{"__proto__":{"polluted":true},"settings":{"moonMinutes":-999},"collection":{"cooldowns":{"__proto__":1000}}}'));
 assert.equal({}.polluted,undefined);assert.equal(s.settings.moonMinutes,1);assert.equal(Object.keys(s.collection.cooldowns).length,0);
});
test('complete reference lists and unique IDs',()=>{assert.equal(ANIMALS.length,28);assert.equal(HABITAT.length,14);assert.equal(new Set(ANIMALS.map(a=>a.id)).size,28)});
