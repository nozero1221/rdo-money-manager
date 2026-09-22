/* RDO Companion: deterministic calculations. No DOM, storage, requests or game connection. */
export const VERSION = '20260922a';
export const MIN = 60000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
export const mod = (x, n) => ((x % n) + n) % n;
export const clone = x => JSON.parse(JSON.stringify(x));
export const idOf = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
// Preferred windows and weather: Jean Ropke RDOMap/data/animal_legendary.json.
// These are community planning data, NOT detections from a player's lobby.
const rows = [
 ['Teca Gator','alligator',1,[[21,6]],'storm'],['Sun Gator','alligator',2,[[6,9]],'foggy'],
 ['Owiza Bear','bear',1,[[21,6]],'rain'],['Ridgeback Bear','bear',2,[[9,18]],'clear'],
 ['Zizi Beaver','beaver',1,[[6,9],[18,21]],'any'],['Moon Beaver','beaver',2,[[6,9],[18,21]],'rain'],
 ['Tatanka Bison','bison',1,[[9,18]],'rain'],['Winyan Bison','bison',2,[[21,6]],'clear'],
 ['Cogi Boar','boar',1,[[6,9]],'clear'],['Wakpa Boar','boar',2,[[9,18]],'rain'],
 ['Mud Runner Buck','buck',1,[[9,18]],'clear'],['Snow Buck','buck',2,[[6,9]],'clear'],
 ['Iguga Cougar','cougar',1,[[18,21]],'storm'],['Maza Cougar','cougar',2,[[6,9]],'clear'],
 ['Red Streak Coyote','coyote',1,[[9,21]],'any'],['Midnight Paw Coyote','coyote',2,[[6,21]],'clear'],
 ['Katata Elk','elk',1,[[6,18]],'foggy'],['Ozula Elk','elk',2,[[18,4]],'foggy'],
 ['Ota Fox','fox',1,[[6,9],[18,21]],'clear'],['Marble Fox','fox',2,[[6,9],[18,21]],'clear'],
 ['Snowflake Moose','moose',1,[[21,6]],'rain'],['Knight Moose','moose',2,[[9,18]],'any'],
 ['Nightwalker Panther','panther',1,[[18,21]],'foggy'],['Ghost Panther','panther',2,[[21,6]],'rain'],
 ['Gabbro Horn Ram','ram',1,[[6,18]],'clear'],['Chalk Horn Ram','ram',2,[[9,18]],'clear'],
 ['Emerald Wolf','wolf',1,[[18,6]],'any'],['Onyx Wolf','wolf',2,[[21,6]],'clear']
];
export const ANIMALS = rows.map(([name,species,variant,times,weather]) => ({name,species,times,weather,id:idOf(name),mapId:`mp_animal_${species}_legendary_0${variant}`}));
export const SPECIES = [...new Set(ANIMALS.map(a => a.species))];
export const HABITAT = [
 ['bull_elk','Rocky Mountain Bull Elk','Little Creek River / Cumberland Forest','No strict time restriction recorded'],
 ['cow_elk','Rocky Mountain Cow Elk','Little Creek River / Cumberland Forest','No strict time restriction recorded'],
 ['badger','American Badger','Riggs Station / Tall Trees','Try evening or night'],
 ['gray_wolf','Gray Wolf','Tall Trees / Cumberland Forest','Try night; daytime encounters can happen'],
 ['timber_wolf','Timber Wolf','Cumberland Forest / Grizzlies','Prioritize nighttime'],
 ['ram','Rocky Mountain Bighorn Ram','Grizzlies / Cumberland Forest','No strict time restriction recorded'],
 ['sheep','Rocky Mountain Bighorn Sheep','Grizzlies / Cumberland Forest','No strict time restriction recorded'],
 ['coyote','California Valley Coyote','Heartlands / Cumberland Forest','No strict time restriction recorded'],
 ['buck','Whitetail Buck','Heartlands / Cumberland Forest','No strict time restriction recorded'],
 ['deer','Whitetail Deer','Heartlands / Cumberland Forest','No strict time restriction recorded'],
 ['boar','Wild Boar','Strawberry area / Thieves Landing','No strict time restriction recorded'],
 ['bison','American Bison','Great Plains / Heartlands','No strict time restriction recorded'],
 ['prong_buck','American Pronghorn Buck','Great Plains / Heartlands','Check the American subspecies'],
 ['prong_doe','American Pronghorn Doe','Great Plains / Heartlands','Check the American subspecies']
].map(([id,name,area,time])=>({id,name,area,time}));
export function defaults() {
 return {
  settings:{moonMinutes:48,bountyMinutes:48,telegramMinutes:24,buyerCycleMinutes:96,harrietMinutes:48,ettaTarget:12,goal:'cash',bonusUntil:''},
  clock:{offset:0,calibrated:false,calibratedAt:0,weather:'unknown',weatherAt:0},
  timers:{bounty:0,telegram:0,harriet:0,test:0},
  etta:{active:false,start:0,captured:false},
  moon:{status:'idle',end:0,remaining:0,duration:48*MIN,recipe:'Berry Cobbler'},
  buyers:{next:0,status:'unknown',name:'',checkedAt:0,recipe:'',offerNow:null,offerBetter:null,nextCost:null,deliveryMinutes:10},
  trader:{goods:0,materials:'unknown',supplies:'unknown',reminder:0},
  collection:{got:{},sampled:{},skinned:{},cooldowns:{}},
  habitat:{sampled:{},stamped:{}},
  ui:{missingOnly:false,hideCooldowns:true},
  ledger:{start:0,entries:[]},
  history:[]
 };
}
const numeric = (v,d=0,lo=0,hi=Number.MAX_SAFE_INTEGER) => typeof v==='number' && Number.isFinite(v) ? Math.min(hi,Math.max(lo,v)) : d;
const choice = (v,values,d) => values.includes(v) ? v : d;
const text = (v,max=100) => typeof v==='string' ? v.slice(0,max) : '';
export function sanitize(input) {
 if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Invalid tracker data.');
 const d=defaults(), s=input;
 for(const k of ['moonMinutes','bountyMinutes','telegramMinutes','buyerCycleMinutes','harrietMinutes']) d.settings[k]=numeric(s.settings?.[k],d.settings[k],1,360);
 d.settings.ettaTarget=choice(s.settings?.ettaTarget,[12,30],12);
 d.settings.goal=choice(s.settings?.goal,['cash','collection'],'cash');
 const bonus=text(s.settings?.bonusUntil,10); d.settings.bonusUntil=/^\d{4}-\d{2}-\d{2}$/.test(bonus)?bonus:'';
 d.clock.offset=numeric(s.clock?.offset,0,-1440,1440);d.clock.calibrated=s.clock?.calibrated===true;
 d.clock.calibratedAt=numeric(s.clock?.calibratedAt); d.clock.weatherAt=numeric(s.clock?.weatherAt);
 d.clock.weather=choice(s.clock?.weather,['unknown','clear','rain','foggy','storm'],'unknown');
 for(const k of Object.keys(d.timers))d.timers[k]=numeric(s.timers?.[k]);
 d.etta.active=s.etta?.active===true;d.etta.start=numeric(s.etta?.start);d.etta.captured=s.etta?.captured===true;
 if(!d.etta.start)d.etta.active=false;
 d.moon.status=choice(s.moon?.status,['idle','cooking','paused','ready'],'idle');
 for(const k of ['end','remaining','duration'])d.moon[k]=numeric(s.moon?.[k],d.moon[k]);
 d.moon.recipe=text(s.moon?.recipe,60)||'Berry Cobbler';
 if(d.moon.status==='cooking'&&!d.moon.end)d.moon.status='idle';
 d.buyers.next=numeric(s.buyers?.next);d.buyers.status=choice(s.buyers?.status,['unknown','preferred','bert'],'unknown');
 d.buyers.name=text(s.buyers?.name,60);d.buyers.checkedAt=numeric(s.buyers?.checkedAt);d.buyers.recipe=text(s.buyers?.recipe,60);
 for(const k of ['offerNow','offerBetter','nextCost'])d.buyers[k]=typeof s.buyers?.[k]==='number'?numeric(s.buyers[k],null,0,100000):null;
 d.buyers.deliveryMinutes=numeric(s.buyers?.deliveryMinutes,10,1,120);
 d.trader.goods=numeric(s.trader?.goods,0,0,100);
 d.trader.materials=choice(s.trader?.materials,['unknown','good','low'],'unknown');
 d.trader.supplies=choice(s.trader?.supplies,['unknown','good','need'],'unknown');d.trader.reminder=numeric(s.trader?.reminder);
 for(const a of ANIMALS)for(const k of ['got','sampled','skinned'])if(s.collection?.[k]?.[a.id]===true)d.collection[k][a.id]=true;
 for(const sp of SPECIES)if(typeof s.collection?.cooldowns?.[sp]==='number')d.collection.cooldowns[sp]=numeric(s.collection.cooldowns[sp]);
 for(const a of HABITAT)for(const k of ['sampled','stamped'])if(s.habitat?.[k]?.[a.id]===true)d.habitat[k][a.id]=true;
 d.ui.missingOnly=s.ui?.missingOnly===true;d.ui.hideCooldowns=s.ui?.hideCooldowns!==false;
 d.ledger.start=numeric(s.ledger?.start);
 d.ledger.entries=(Array.isArray(s.ledger?.entries)?s.ledger.entries:[]).slice(-300).filter(x=>x&&typeof x==='object').map(x=>({at:numeric(x.at),mine:numeric(x.mine,0,-100000,100000),friend:numeric(x.friend,0,-100000,100000),note:text(x.note,80)}));
 d.history=(Array.isArray(s.history)?s.history:[]).slice(-30).filter(x=>x&&typeof x==='object').map(x=>({at:numeric(x.at),note:text(x.note,120)}));
 return d;
}
export function reconcile(s, now) {
 let changed=false;
 if(s.moon.status==='cooking' && s.moon.end>0 && now>=s.moon.end){s.moon.status='ready';changed=true;}
 if(s.buyers.next>0 && now>=s.buyers.next){
  const cycle=s.settings.buyerCycleMinutes*MIN;
  s.buyers.next += (Math.floor((now-s.buyers.next)/cycle)+1)*cycle;
  s.buyers.status='unknown';s.buyers.checkedAt=0;s.buyers.offerNow=null;changed=true;
 }
 if(s.buyers.status!=='unknown' && s.buyers.recipe!==s.moon.recipe){s.buyers.status='unknown';s.buyers.checkedAt=0;changed=true;}
 return changed;
}
export const remaining = (end,now=Date.now()) => Math.max(0,end-now);
export const gameMinutes = (s,now=Date.now()) => mod(now/2000+s.clock.offset,1440);
export function clockText(minute) {let m=Math.floor(mod(minute,1440));return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function duration(ms) {let s=Math.ceil(Math.max(0,ms)/1000);const h=Math.floor(s/3600);s%=3600;return `${h?h+':':''}${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
export function parseDuration(raw,maxMinutes=360) {
 const parts=String(raw).trim().split(':');
 if(!parts.length||parts.length>3||parts.some(p=>!/^\d+(\.\d+)?$/.test(p)))return null;
 const nums=parts.map(Number);let sec;
 if(parts.length===1)sec=nums[0]*60;
 else {if(nums.slice(1).some(n=>n>=60)||nums.some(n=>!Number.isInteger(n)))return null;sec=parts.length===2?nums[0]*60+nums[1]:nums[0]*3600+nums[1]*60+nums[2];}
 return sec>0 && sec<=maxMinutes*60 ? Math.round(sec*1000):null;
}
export function rankAnimals(s,now=Date.now()) {
 const m=gameMinutes(s,now),weather=now-s.clock.weatherAt<=15*MIN?s.clock.weather:'unknown';
 return ANIMALS.map(a=>{
  const inWindow=a.times.some(([st,en])=>st<en?m>=st*60&&m<en*60:m>=st*60||m<en*60);
  const wait=inWindow?0:Math.min(...a.times.map(([st])=>mod(st*60-m,1440)))*2000;
  const cooldown=remaining(s.collection.cooldowns[a.species]||0,now);
  const weatherScore=a.weather==='any'||a.weather===weather?0:weather==='unknown'?1:2;
  return {...a,inWindow,wait,cooldown,weatherScore,observedWeather:weather,got:!!s.collection.got[a.id]};
 }).filter(a=>(!s.ui.hideCooldowns||!a.cooldown)&&(!s.ui.missingOnly||!a.got))
 .sort((a,b)=>Number(!!a.cooldown)-Number(!!b.cooldown)||Number(!a.inWindow)-Number(!b.inWindow)||a.wait-b.wait||a.weatherScore-b.weatherScore||Number(a.got)-Number(b.got)||a.name.localeCompare(b.name));
}
export function buyerAdvice(s,now=Date.now()) {
 const m=s.moon,b=s.buyers,reset=remaining(b.next,now);
 const valid=b.status!=='unknown' && b.recipe===m.recipe && b.next>now && b.checkedAt>0;
 const prefix=m.status==='ready'?'Batch ready. ':'';
 if(m.status==='paused')return {title:'Production paused in your tracker',why:'Resume only when production resumes in-game. Buyer cycles keep moving.',tone:'muted'};
 if(!b.next)return {title:'Sync the buyer countdown once',why:'Enter the countdown from Marcel. Later cycles will roll forward automatically.',tone:'warn'};
 if(!valid)return {title:'Check the new buyer list',why:prefix+'Buyer names are unconfirmed for this cycle. A blank list is not proof that only Bert is available.',tone:'warn'};
 if(m.status==='cooking') {
  const left=remaining(m.end,now);
  return reset<=left?{title:'Keep cooking; recheck after reset',why:'The list changes before this batch finishes. Current buyers are not guaranteed to remain.',tone:'warn'}:{title:'Keep cooking',why:`Batch ready in ${duration(left)}. The saved buyer list lasts ${duration(reset)} more, assuming the timer matches your game.`,tone:'good'};
 }
 if(m.status==='idle')return {title:'Start a batch',why:reset<s.settings.moonMinutes*MIN?'The buyer list changes during production; check it again before relying on a buyer.':'Keep production running before starting a longer job.',tone:'good'};
 if(b.status==='preferred')return {title:'Sell to your confirmed buyer',why:`${b.name||'Your marked preferred buyer'} is confirmed for this flavor. Sell before the list changes; then restart production.`,tone:'good'};
 const {offerNow,offerBetter,nextCost,deliveryMinutes}=b;
 if([offerNow,offerBetter,nextCost].some(x=>x===null))return {title:'Compare the offers before selling',why:'Only Bert is marked. Enter his actual offer, your expected preferred offer, and next-batch costs below to estimate whether waiting is worth it.',tone:'warn'};
 const net=offerBetter-nextCost,gain=offerBetter-offerNow;
 if(net<=0)return {title:'Check the entered prices and costs',why:'The expected next batch has no positive net return in this model.',tone:'warn'};
 const rate=net/(s.settings.moonMinutes+deliveryMinutes);
 const ceiling=Math.max(0,gain/rate),wait=reset/MIN;
 return {title:wait<=ceiling?'A short hold may be worth it':'Selling now is favored by this estimate',why:`Wait: ${wait.toFixed(1)} min. Best-case wait limit: ${ceiling.toFixed(1)} min. This assumes a preferred buyer appears at the NEXT reset; it is not guaranteed. Other activities, travel and your session length can change the choice.`,tone:wait<=ceiling?'good':'warn',ceiling};
}
export function recommendations(s,now=Date.now()) {
 const make=(title,why,target)=>({title,why,target});
 if(s.etta.active){
  const elapsed=now-s.etta.start;
  return [make(!s.etta.captured?(elapsed<4*MIN?'Stay hidden during Etta':'Listen for Etta’s leaving dialogue'):(elapsed<s.settings.ettaTarget*MIN?'Keep Etta secured until your checkpoint':'Your Etta turn-in checkpoint is reached'),!s.etta.captured?'The four-minute cue is approximate. Confirm the dialogue before moving.':'The mission timer keeps running from the end of the cutscene.','etta'),make('Finish this mission before role deliveries','Your businesses can wait; this plan will not send you on another job mid-mission.','etta')];
 }
 const a=[];
 if(s.moon.status==='ready'){const advice=buyerAdvice(s,now);a.push(make(advice.title,advice.why,'moon'));}
 if(s.trader.goods>=100)a.push(make('Deliver your full Trader wagon','Your manually recorded goods are full. Confirm the current count in Cripps’ menu before departing.','trader'));
 if(s.trader.supplies==='need')a.push(make('Resupply Cripps','Your recorded supplies need attention before production can continue.','trader'));
 if(s.moon.status==='idle')a.push(make('Start production before your next job','Get the next batch underway so your time on another activity is useful.','moon'));
 if(s.trader.materials==='low')a.push(make('Refill Trader materials','Check your Hunting tab for an eligible target, or collect ordinary animals.','trader'));
 if(s.settings.goal==='collection'){const pick=rankAnimals(s,now).find(x=>!x.got&&!x.cooldown);if(pick)a.push(make(`Check ${pick.name}`,pick.inWindow?'Its preferred time is active. This is a spawn-area suggestion, not a confirmed sighting.':`Preferred window starts in ${duration(pick.wait)} real time. Check its map before travelling.`,'hunt'));}
 if(s.settings.bonusUntil && Date.parse(s.settings.bonusUntil+'T23:59:59Z')>now && remaining(s.timers.telegram,now)===0)a.push(make('Run your marked bonus activity','This priority uses your manually confirmed bonus expiry, not a live event feed.','telegram'));
 if(!remaining(s.timers.bounty,now))a.push(make('A Legendary Bounty is off your timer','Choose Etta or Yukon after your production tasks are handled.','etta'));
 a.push(make('Collect nearby items while waiting','Use the Collector map; avoid a long trip when a delivery is about to become ready.','maps'));
 return a.slice(0,3);
}
// Migrate only explicit tracker fields; preserve old keys outside this function.
export function migrateLegacy(get,now=Date.now()) {
 const d=defaults();const o=get('rdo_manager_v3')||get('rdo_manager_v2')||get('rdo_manager_v1')||{};
 d.settings.moonMinutes=o.moonMins||48;d.moon={...d.moon,status:o.moonActive?(o.moonEnd>now?'cooking':'ready'):'idle',end:o.moonEnd||0,duration:o.moonDuration||48*MIN,recipe:o.recipe||'Berry Cobbler'};
 d.timers.bounty=o.bountyEnd||0;d.timers.telegram=o.telegramEnd||0;d.timers.harriet=o.harrietEnd||0;
 d.etta={active:!!o.ettaActive,start:o.ettaStart||0,captured:!!o.ettaCaptured};
 d.trader={...d.trader,goods:o.goods||0,materials:o.materials==='good'?'good':o.materials==='low'?'low':'unknown',supplies:o.supplies==='good'?'good':o.supplies==='need'?'need':'unknown'};
 d.buyers.next=o.buyerEnd||0; // Old checkmarks are not a verified current buyer list.
 const l=get('rdo_legendary_collection_v1')||{};d.collection.got=l.got||{};d.collection.cooldowns=l.cooldowns||{};
 const n=get('rdo_nat_mountain_grassland_v1')||{};for(const a of HABITAT){d.habitat.sampled[a.id]=!!n[a.id]?.sampled;d.habitat.stamped[a.id]=!!n[a.id]?.stamped;}
 const c=get('rdo_legendary_advisor_v2'),oldc=get('rdo_legendary_advisor_v1');
 if(c){d.clock.offset=c.syncOffsetMin||0;d.clock.calibrated=!!c.calibrated;d.clock.calibratedAt=c.lastCalibratedAt||0;}
 else if(oldc?.syncGameMin!=null&&oldc.syncRealMs!=null){d.clock.offset=mod(oldc.syncGameMin-oldc.syncRealMs/2000+720,1440)-720;d.clock.calibrated=true;}
 // Expired event bonuses and unobserved weather deliberately return to unknown.
 return sanitize(d);
}
