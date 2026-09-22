import {VERSION,MIN,HOUR,ANIMALS,SPECIES,HABITAT,remaining,gameMinutes,clockText,duration,parseDuration,rankAnimals,buyerAdvice,recommendations,clone} from './companion-core.mjs?v=20260922a';
import {TrackerStore} from './companion-store.mjs?v=20260922a';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const localTime=ms=>new Date(ms).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const clockWindow=a=>a.times.map(([s,e])=>`${clockText(s*60)}–${clockText(e*60)}`).join(' / ');
const store=new TrackerStore();let mounted=false;let view='plan',renderedRevision=-1,timerEditing=null,toastId=null,lastHuntMinute=-1;
function notify(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastId);toastId=setTimeout(()=>$('toast').classList.remove('show'),3200)}
function change(note,mutate){store.commit(note,mutate);notify(note)}
function inputSync(id,value){const node=$(id);if(node&&document.activeElement!==node)node.value=value??'';}
function showView(name){if(!['plan','timers','hunt','sets','tools'].includes(name))return;view=name;document.querySelectorAll('[data-panel]').forEach(n=>n.hidden=n.dataset.panel!==name);document.querySelectorAll('nav [data-view]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.view===name)));tick();}
const destinations={etta:'timers',bounty:'timers',telegram:'timers',harriet:'timers',moon:'timers',trader:'timers',hunt:'hunt',maps:'hunt'};
function jump(target){showView(destinations[target]||'plan');$(target)?.scrollIntoView({block:'start',behavior:'smooth'});}
function saveDisplay(){
 $('saveStatus').textContent=store.status;$('saveStatus').classList.toggle('error',store.memoryOnly);
 $('saveDetail').textContent=`${store.loadedFrom}. ${store.status}. ${store.state.modifiedAt?'Last change: '+new Date(store.state.modifiedAt).toLocaleString()+'.':''} Saves are local to this browser, not uploaded to GitHub.`;
 $('undo').disabled=!store.undoStack.length;
}
function buildLists(){
 $('huntList').innerHTML=ANIMALS.map(a=>`<article class="card animal" data-animal="${a.id}"><h3>${esc(a.name)}</h3><p>Preferred: ${clockWindow(a)} · ${a.weather==='any'?'any weather':esc(a.weather)}</p><div class="twopills"><span class="pill" data-hunt-status></span><span class="pill" data-hunt-weather></span></div><small data-cooldown></small><label class="check"><input type="checkbox" data-col="got" data-id="${a.id}"> Already have this animal</label><div class="two"><label class="check"><input type="checkbox" data-col="sampled" data-id="${a.id}"> Sample logged</label><label class="check"><input type="checkbox" data-col="skinned" data-id="${a.id}"> Skin logged</label></div><div class="actions"><button class="primary" data-action="animalFound" data-id="${a.id}">Got it now · log 72h</button><button data-action="animalMap" data-id="${a.id}">Map pins</button></div></article>`).join('');
 $('setList').innerHTML=HABITAT.map(a=>`<article class="card setrow" data-habitat="${a.id}"><h3>${esc(a.name)}</h3><p>${esc(a.area)}<br>${esc(a.time)}</p><div class="two"><label class="check"><input type="checkbox" data-set="sampled" data-id="${a.id}"> Sample collected</label><label class="check"><input type="checkbox" data-set="stamped" data-id="${a.id}"> Sold / stamped</label></div></article>`).join('');
 $('cooldownControls').innerHTML=SPECIES.map(sp=>`<div class="eventrow"><div><b>${esc(sp[0].toUpperCase()+sp.slice(1))}</b><small data-species="${sp}"></small></div><button data-action="cooldownClear" data-species="${sp}">Clear logged timer</button></div>`).join('');
}
function syncState(){
 const s=store.data;
 for(const key of Object.keys(s.settings))inputSync(key,s.settings[key]);
 inputSync('recipe',s.moon.recipe);inputSync('buyerStatus',s.buyers.status);inputSync('buyerName',s.buyers.name);
 for(const key of ['offerNow','offerBetter','nextCost','deliveryMinutes'])inputSync(key,s.buyers[key]);
 inputSync('goods',s.trader.goods);inputSync('materials',s.trader.materials);inputSync('supplies',s.trader.supplies);inputSync('weather',s.clock.weather);
 $('missingOnly').checked=s.ui.missingOnly;$('hideCooldowns').checked=s.ui.hideCooldowns;
 document.querySelectorAll('[data-col]').forEach(n=>n.checked=!!s.collection[n.dataset.col][n.dataset.id]);
 document.querySelectorAll('[data-set]').forEach(n=>n.checked=!!s.habitat[n.dataset.set][n.dataset.id]);
 $('moonPause').textContent=s.moon.status==='paused'?'Resume production':'Pause production';
 $('moonPause').disabled=!['cooking','paused'].includes(s.moon.status);
 $('buyerCycleNote').textContent=`Repeats every ${s.settings.buyerCycleMinutes} real minutes after your synchronization. Buyer names still need checking each cycle.`;
 $('clockState').textContent=s.clock.calibrated?'Your correction is saved':'Map-clock estimate';
 $('history').innerHTML=s.history.slice().reverse().map(x=>`<div class="eventrow"><span>${esc(x.note)}</span><time>${localTime(x.at)}</time></div>`).join('')||'<p>No changes logged yet.</p>';
 tick(true);
}
function paintSets(){const s=store.data;const stamps=HABITAT.filter(a=>s.habitat.stamped[a.id]).length,samples=HABITAT.filter(a=>s.habitat.sampled[a.id]).length;
 $('setProgress').textContent=`${stamps} / 14 stamped`;$('sampleProgress').textContent=`${samples} sampled`;$('setBar').value=stamps;
 $('planSet').textContent=`${stamps} / 14`;$('planLegends').textContent=`${ANIMALS.filter(a=>s.collection.got[a.id]).length} / 28`;
 $('setAdvice').textContent=stamps===14?'All stamps logged. Trade in the habitat in-game, then start a new checklist.':`${14-stamps} stamp${14-stamps===1?'':'s'} still needed. Selling a sample to Harriet is the step that earns a stamp.`;
 document.querySelectorAll('[data-habitat]').forEach(n=>{const done=!!s.habitat.stamped[n.dataset.habitat];n.hidden=$('setMissing').checked&&done;n.classList.toggle('done',done)});
}
let lastHuntOrder='';
function paintHunts(now,force=false){
 const ranked=rankAnimals(store.data,now),query=$('animalSearch').value.trim().toLowerCase();
 const shown=ranked.filter(a=>!query||a.name.toLowerCase().includes(query)),allowed=new Set(shown.map(a=>a.id));
 const order=shown.map(a=>a.id).join(',');
 const rows=new Map([...document.querySelectorAll('[data-animal]')].map(n=>[n.dataset.animal,n]));
 // Move existing nodes only when the order changes. Never recreate focused inputs on a timer tick.
 if(order!==lastHuntOrder){for(const a of shown)$('huntList').appendChild(rows.get(a.id));lastHuntOrder=order;}
 for(const [id,n] of rows)n.hidden=!allowed.has(id);
 for(const a of shown){const n=rows.get(a.id);n.classList.toggle('got',a.got);
  n.querySelector('[data-hunt-status]').textContent=a.cooldown?'Logged cooldown':a.inWindow?'Preferred time now':`Window in ${duration(a.wait)}`;
  n.querySelector('[data-hunt-status]').classList.toggle('goodtext',!a.cooldown&&a.inWindow);
  n.querySelector('[data-hunt-weather]').textContent=a.weather==='any'?'Any weather':a.observedWeather==='unknown'?'Weather unconfirmed':a.weatherScore===0?'Weather matches':'Weather differs';
  n.querySelector('[data-cooldown]').textContent=a.cooldown?`Species timer: ${duration(a.cooldown)} remaining. Do not prioritize this from your own logged timer.`:'No active species cooldown is logged. That is not proof a spawn is available.';
 }
 $('huntCount').textContent=shown.length?`${shown.length} shown. Ordered by logged cooldown, preferred time, weather, then missing animals. Map distance is not measured.`:'No matches with these filters. Turn off “only animals I still need,” unhide cooldowns, or clear the search.';
 for(const n of document.querySelectorAll('[data-species]')){if(n.tagName==='SMALL'){const left=remaining(store.data.collection.cooldowns[n.dataset.species]||0,now);n.textContent=left?duration(left)+' remaining':'No active timer logged';}}
}
let lastRecommendations='';
function paintPlan(now){
 const items=recommendations(store.data,now),sig=JSON.stringify(items);
 if(sig!==lastRecommendations){$('recommendations').innerHTML=items.map((x,i)=>`<article class="card ${i===0?'featured':''}"><span class="eyebrow">${i===0?'NEXT BEST STEP':`THEN CONSIDER ${i+1}`}</span><h2>${esc(x.title)}</h2><p>${esc(x.why)}</p><button ${i===0?'class="primary"':''} data-action="jump" data-target="${x.target}">Open ${x.target==='etta'?'mission':x.target==='moon'?'Moonshine':x.target==='hunt'?'Hunting':x.target==='maps'?'maps':'task'}</button></article>`).join('');lastRecommendations=sig;}
 const s=store.data,events=[['Legendary Bounty',s.timers.bounty,'bounty'],['Telegram',s.timers.telegram,'telegram'],['Buyer list resets',s.buyers.next,'moon'],['Harriet list reminder',s.timers.harriet,'harriet'],['Check Cripps',s.trader.reminder,'trader']];
 if(['cooking','ready'].includes(s.moon.status))events.push(['Moonshine estimate',s.moon.end,'moon']);
 const all=events.filter(x=>x[1]>0).sort((a,b)=>a[1]-b[1]).slice(0,5);
 $('upcoming').innerHTML=all.map(([name,end,target])=>`<div class="eventrow"><div><b>${name}</b><small>${end>now?'At '+localTime(end):'Ready to check in-game'}</small></div><strong>${end>now?duration(end-now):'Due'}</strong></div>`).join('')||'<p>Start a timer in the Timers tab to build your schedule.</p>';
}
let lastAdvice='';
function tick(force=false){if(!store.ready)return;store.refreshDerived();const s=store.data,now=Date.now();
 $('gameClock').textContent='RDO '+clockText(gameMinutes(s,now));
 if(view==='plan'||force)paintPlan(now);
 if(view==='timers'||force){
  $('ettaElapsed').textContent=s.etta.active?duration(Math.floor(Math.max(0,now-s.etta.start)/1000)*1000):'00:00';
  const e=now-s.etta.start;$('ettaBadge').textContent=s.etta.active?(s.etta.captured?'Captured':'Run active'):'Not running';
  $('ettaCue').textContent=!s.etta.active?'Ready for a new run.':!s.etta.captured?(e<4*MIN?`Approximate capture cue in ${duration(4*MIN-e)}. Stay hidden.`:'Listen for her leaving dialogue. The timer cannot hear the game.'):(e<s.settings.ettaTarget*MIN?`Your ${s.settings.ettaTarget}-minute checkpoint is in ${duration(s.settings.ettaTarget*MIN-e)}.`:'Your chosen checkpoint is reached; turn in when you are ready.');
  for(const key of ['bounty','telegram','harriet'])$(key+'Timer').textContent=s.timers[key]?(remaining(s.timers[key],now)?duration(remaining(s.timers[key],now)):'Ready to check'):(key==='harriet'?'Not set':'No cooldown logged');
  $('moonBadge').textContent=s.moon.status;$('moonTimer').textContent=s.moon.status==='cooking'?duration(remaining(s.moon.end,now)):s.moon.status==='paused'?duration(s.moon.remaining)+' · paused':s.moon.status==='ready'?'Ready to check':'Not started';
  $('buyerTimer').textContent=s.buyers.next?duration(remaining(s.buyers.next,now)):'Not synced';
  const a=buyerAdvice(s,now),signature=JSON.stringify(a);if(signature!==lastAdvice){$('buyerDecision').className='notice '+a.tone;$('buyerDecision').innerHTML=`<strong>${esc(a.title)}</strong><p>${esc(a.why)}</p>`;lastAdvice=signature;}
  $('traderReminder').textContent=s.trader.reminder?(remaining(s.trader.reminder,now)?`Check supplies in ${duration(remaining(s.trader.reminder,now))}. Goods stay at your last entered count.`:'Reminder due: check supplies and your actual goods count.'):'Goods stay at your last entered count; the tracker cannot observe Cripps.';
 }
 if(view==='hunt'||force){const minute=Math.floor(gameMinutes(s,now));paintHunts(now,force||minute!==lastHuntMinute);lastHuntMinute=minute;}
 if(view==='sets'||view==='plan'||force)paintSets();
 if(view==='tools'||force){
  $('testStatus').textContent=s.timers.test?(s.timers.test>Date.now()?`Save test running: ${duration(s.timers.test-now)} left. Switch apps or lock your phone now.`:`Save test finished. Its original deadline was ${localTime(s.timers.test)}; it did not restart on return.`):'Run the one-minute test to check this browser’s saving and resume behavior.';
  const totals=s.ledger.entries.reduce((r,x)=>({mine:r.mine+x.mine,friend:r.friend+x.friend}),{mine:0,friend:0}),elapsed=now-s.ledger.start;
  $('ledgerSummary').textContent=s.ledger.start?`You: ${money(totals.mine)} · Friend: ${money(totals.friend)}. ${elapsed>=5*MIN?`Your logged net rate: ${money(totals.mine/(elapsed/HOUR))}/hour since ${localTime(s.ledger.start)}.`:'The rate appears after five minutes to avoid a misleading early spike.'}`:'Log actual net money received. Your first entry starts the session clock.';
 }
}
function openTimer(which){
 const s=store.data;timerEditing=which;$('timerTitle').textContent=which==='buyer'?'Sync buyer reset countdown':`Correct ${which} time left`;
 const end=which==='moon'?s.moon.end:which==='buyer'?s.buyers.next:s.timers[which];
 $('timerInput').value=end>Date.now()?duration(end-Date.now()):'';$('timerError').textContent='';$('timerDialog').showModal();$('timerInput').focus();
}
function downloadBackup(){const blob=new Blob([store.exportText()],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`RDO-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);notify('Backup file prepared. Keep it in Files.');}
function showMap(id){const a=ANIMALS.find(x=>x.id===id);if(!a)return;const url='https://jeanropke.github.io/RDOMap/?q='+encodeURIComponent(a.mapId);$('mapTitle').textContent=a.name+' · spawn areas';$('mapExternal').href=url;$('mapFrame').replaceChildren();const f=document.createElement('iframe');f.src=url;f.title=a.name+' community map';f.referrerPolicy='no-referrer';f.loading='lazy';$('mapFrame').appendChild(f);$('mapDialog').showModal();}
async function action(button){
 const what=button.dataset.action,id=button.dataset.id,s=store.data,n=Date.now();
 const a=ANIMALS.find(x=>x.id===id);
 switch(what){
 case 'undo':store.undo();notify('Last change undone');break;
 case 'jump':jump(button.dataset.target);break;
 case 'ettaStart':if(s.etta.active&&!confirm('Restart the current Etta timer?'))return;change('Started Etta',d=>d.etta={active:true,start:n,captured:false});break;
 case 'ettaCaptured':if(!s.etta.active)return notify('Start the mission timer first.');change('Etta marked captured',d=>d.etta.captured=true);break;
 case 'ettaFinish':if(!s.etta.active&&!confirm('Log an Etta turn-in now and start the cooldown?'))return;change('Logged Etta turn-in',d=>{d.etta.active=false;d.timers.bounty=n+d.settings.bountyMinutes*MIN});break;
 case 'ettaCancel':change('Cancelled Etta timer; no new cooldown',d=>d.etta={active:false,start:0,captured:false});break;
 case 'yukonFinish':if(s.etta.active)return notify('Finish or cancel the active Etta run first.');change('Logged Yukon completion',d=>d.timers.bounty=n+d.settings.bountyMinutes*MIN);break;
 case 'telegramFinish':change('Logged Telegram completion',d=>d.timers.telegram=n+d.settings.telegramMinutes*MIN);break;
 case 'harrietStart':change('Started Harriet list reminder',d=>d.timers.harriet=n+d.settings.harrietMinutes*MIN);break;
 case 'moonStart':if(s.moon.status!=='idle'&&!confirm('Replace this batch’s timer with a new one?'))return;change('Started batch estimate',d=>{d.moon.status='cooking';d.moon.duration=d.settings.moonMinutes*MIN;d.moon.end=n+d.moon.duration;d.moon.remaining=0});break;
 case 'moonPause':change(s.moon.status==='paused'?'Resumed production estimate':'Paused production estimate',d=>{if(d.moon.status==='paused'){d.moon.end=n+d.moon.remaining;d.moon.status=d.moon.remaining?'cooking':'ready';}else if(d.moon.status==='cooking'){d.moon.remaining=remaining(d.moon.end,n);d.moon.status='paused';}});break;
 case 'moonReady':change('Marked batch ready in-game',d=>{d.moon.status='ready';d.moon.end=n;d.moon.remaining=0});break;
 case 'moonSold':if(s.moon.status!=='ready'&&!confirm('Confirm that you delivered this batch in-game?'))return;change('Marked batch delivered',d=>{d.moon.status='idle';d.moon.end=0;d.moon.remaining=0});break;
 case 'editTimer':openTimer(button.dataset.timer);break;
 case 'closeDialog':$('timerDialog').close();break;
 case 'goodsMinus':change('Updated Trader goods',d=>d.trader.goods=Math.max(0,d.trader.goods-5));break;
 case 'goodsPlus':change('Updated Trader goods',d=>d.trader.goods=Math.min(100,d.trader.goods+5));break;
 case 'traderResupply':change('Logged resupply; check again in 50 minutes',d=>{d.trader.supplies='good';d.trader.reminder=n+50*MIN});break;
 case 'traderSold':if(!confirm('Reset goods to zero after your in-game delivery?'))return;change('Marked Trader delivery',d=>d.trader.goods=0);break;
 case 'calibrate':{const v=$('calibration').value;if(!/^\d{2}:\d{2}$/.test(v))return notify('Enter the time you currently see in-game.');const [h,m]=v.split(':').map(Number);change('Saved game-clock correction',d=>{d.clock.offset=((h*60+m-n/2000+720)%1440+1440)%1440-720;d.clock.calibrated=true;d.clock.calibratedAt=n});break;}
 case 'clockReset':change('Using uncorrected map clock',d=>{d.clock.offset=0;d.clock.calibrated=false;});break;
 case 'animalFound':if(!a)return;if(remaining(s.collection.cooldowns[a.species]||0,n)&&!confirm('This species already has a logged cooldown. Replace it with a new 72-hour estimate?'))return;change(`Logged ${a.name} now`,d=>{d.collection.got[a.id]=true;d.collection.cooldowns[a.species]=n+72*HOUR});break;
 case 'animalMap':showMap(id);break;
 case 'closeMap':$('mapDialog').close();$('mapFrame').replaceChildren();break;
 case 'cooldownClear':{const sp=button.dataset.species;if(!SPECIES.includes(sp))return;if(!confirm('Clear this manually logged species timer? This cannot change the game’s cooldown.'))return;change(`Cleared ${sp} planning timer`,d=>delete d.collection.cooldowns[sp]);break;}
 case 'setReset':if(!confirm('Have you traded in the set? Reset this set’s sample/stamp checklist?'))return;change('Started a fresh habitat checklist',d=>d.habitat={sampled:{},stamped:{}});break;
 case 'backupExport':downloadBackup();break;
 case 'backupImport':$('importFile').click();break;
 case 'testStart':change('Started one-minute save test',d=>d.timers.test=n+MIN);break;
 case 'ledgerNew':if(!confirm('Start a new earnings session? The previous totals will be cleared from this session view.'))return;change('Started new earnings session',d=>d.ledger={start:n,entries:[]});break;
 case 'ledgerAdd':{const mine=$('moneyMine').value,friend=$('moneyFriend').value;if(mine===''&&friend==='')return notify('Enter an actual payout or cost first.');const values=[Number(mine||0),Number(friend||0)];if(values.some(v=>!Number.isFinite(v)||Math.abs(v)>100000))return notify('Enter a number between −100000 and 100000.');change('Logged session earnings',d=>{if(!d.ledger.start)d.ledger.start=n;d.ledger.entries.push({at:n,mine:values[0],friend:values[1],note:$('moneyNote').value})});$('moneyMine').value='';$('moneyFriend').value='';$('moneyNote').value='';break;}
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.view){showView(b.dataset.view);return;}if(!store.ready)return;if(b.dataset.action)action(b).catch(err=>notify(err.message||'That change could not be applied.'));});
document.addEventListener('change',e=>{
 if(!store.ready)return;const el=e.target,n=Date.now();
 if(el.dataset.setting){const key=el.dataset.setting;let v=el.value;if(!['goal','bonusUntil'].includes(key)){v=Number(v);if(!Number.isFinite(v)||v<1||v>360){notify('Enter 1 to 360 minutes.');syncState();return}}
 change('Updated '+key,d=>{d.settings[key]=v;if(key==='buyerCycleMinutes'){d.buyers.next=0;d.buyers.status='unknown';}});
 }else if(el.dataset.field){const k=el.dataset.field,v=el.value;
 if(k==='buyerStatus'&&v!=='unknown'&&!store.data.buyers.next){notify('Sync the buyer timer first so this observation expires correctly.');el.value='unknown';return;}
 if(k==='goods'&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100)){notify('Goods must be 0 to 100.');syncState();return;}
 change('Updated '+k,d=>{
 if(k==='recipe'){d.moon.recipe=v.trim()||'Berry Cobbler';d.buyers.status='unknown';d.buyers.offerNow=null;d.buyers.offerBetter=null;}
 else if(k==='buyerName')d.buyers.name=v;
 else if(k==='buyerStatus'){d.buyers.status=v;d.buyers.checkedAt=n;d.buyers.recipe=d.moon.recipe;}
 else if(k==='weather'){d.clock.weather=v;d.clock.weatherAt=n;}
 else d.trader[k]=k==='goods'?Number(v):v;
 });
 }else if(el.dataset.quote){const k=el.dataset.quote,v=el.value===''?null:Number(el.value);if(v!==null&&(!Number.isFinite(v)||v<0||v>100000))return notify('Enter a valid nonnegative amount.');change('Updated comparison assumptions',d=>d.buyers[k]=v);
 }else if(el.dataset.filter){change('Updated hunting filter',d=>d.ui[el.dataset.filter]=el.checked);
 }else if(el.dataset.col){if(!ANIMALS.some(a=>a.id===el.dataset.id))return;change('Updated Legendary checklist',d=>d.collection[el.dataset.col][el.dataset.id]=el.checked);
 }else if(el.dataset.set){if(!HABITAT.some(a=>a.id===el.dataset.id))return;change('Updated habitat checklist',d=>d.habitat[el.dataset.set][el.dataset.id]=el.checked);
 }else if(el.id==='setMissing')paintSets();
});
$('animalSearch').addEventListener('input',()=>paintHunts(Date.now(),true));
$('timerForm').addEventListener('submit',e=>{e.preventDefault();const ms=parseDuration($('timerInput').value);if(ms===null){$('timerError').textContent='Enter a positive duration up to six hours, such as 12:30 or 1:36:00.';return;}const now=Date.now();change('Corrected '+timerEditing+' countdown',d=>{if(timerEditing==='moon'){d.moon.status='cooking';d.moon.end=now+ms;d.moon.remaining=0;}else if(timerEditing==='buyer'){d.buyers.next=now+ms;d.buyers.status='unknown';d.buyers.checkedAt=0;d.buyers.offerNow=null;}else d.timers[timerEditing]=now+ms;});$('timerDialog').close();});
$('importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>500000)throw new Error('That backup is too large.');const raw=await f.text();if(!confirm('Replace the current tracker with this backup? Your current session can be recovered with Undo.'))return;store.importText(raw);notify('Backup restored. Timers recalculated from their timestamps.');}catch(err){notify(err.message||'Unable to read this backup.')}finally{e.target.value='';}});
store.addEventListener('change',()=>{saveDisplay();if(!store.ready||!mounted)return;if(renderedRevision!==store.state.revision){renderedRevision=store.state.revision;syncState();}});
try {await store.init();buildLists();mounted=true;$('app').hidden=false;$('loading').hidden=true;$('buildVersion').textContent=VERSION;saveDisplay();syncState();
 // Single foreground repaint loop. Returning from another app derives time from timestamps.
 setInterval(()=>{if(!document.hidden)tick()},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick(true)});
 window.addEventListener('pageshow',()=>tick(true));
}catch(err){$('loading').innerHTML='<h2>The tracker could not initialize</h2><p>Your older saved data was not deleted. Refresh or return to the older tracker.</p><a href="./classic.html">Older tracker</a>';console.error(err);}

$('mapDialog').addEventListener('close',()=> $('mapFrame').replaceChildren());
