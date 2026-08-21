(()=>{
  if(window.__rdoMoonshineBuyersLoaded)return;window.__rdoMoonshineBuyersLoaded=true;
  const KEY='rdo_moonshine_buyers_v3';
  const HOLD_BREAK_EVEN_MIN=18;
  let state={eddie:false,hal:false,hank:false,lewis:false,mo:false,other:false,otherName:'',lastTimer:''};
  try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const style=document.createElement('style');
  style.textContent=`
    .mbBox{margin-top:12px;border-top:1px solid #49382a;padding-top:12px}.mbHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.mbHead b{font-size:14px}.mbStatus{font-size:10px;border:1px solid #49382a;border-radius:999px;padding:5px 8px;color:#b7a998}.mbStatus.good{color:#74cb96;background:#14251b}.mbStatus.warn{color:#f0c764;background:#28200e}.mbStatus.hot{color:#fff;background:#762d24}.mbNote{font-size:11px;color:#b7a998;line-height:1.45;margin-top:5px}.mbList{display:grid;gap:7px;margin-top:9px}.mbBuyer{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #49382a;background:#18130f;border-radius:11px;padding:9px}.mbBuyer label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800}.mbBuyer input[type=checkbox]{width:auto;margin:0;transform:scale(1.15)}.mbBuyer small{font-size:10px;color:#b7a998}.mbOther{margin-top:7px}.mbOther input{width:100%;border:1px solid #49382a;border-radius:10px;background:#16120f;color:#f6eee4;padding:9px}.mbAdvice{margin-top:9px;border:1px solid #49382a;background:#18130f;border-radius:11px;padding:10px;font-size:12px;line-height:1.45}.mbAdvice.good{border-color:#2c6a45;background:#14251b}.mbAdvice.warn{border-color:#6f5423;background:#28200e}.mbAdvice.hot{border-color:#8f463b;background:#4a211c}.mbDecision{margin-top:10px;border:2px solid #49382a;border-radius:14px;padding:12px;background:#18130f}.mbDecision.good{border-color:#2c6a45;background:#14251b}.mbDecision.warn{border-color:#7d602b;background:#28200e}.mbDecision.hot{border-color:#9a4d40;background:#4a211c}.mbDecision .mbBig{font-size:20px;font-weight:900}.mbDecision .mbWhy{font-size:11px;color:#b7a998;line-height:1.45;margin-top:4px}.mbMath{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.mbMath div{border:1px solid #49382a;border-radius:10px;padding:8px;background:#15110e}.mbMath b{display:block;font-size:15px}.mbMath span{font-size:9px;color:#b7a998}
    @media(max-width:430px){.mbMath{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
  const cards=[...document.querySelectorAll('.card')];
  const moon=cards.find(c=>c.textContent.includes('Moonshine'));
  if(!moon)return;
  const box=document.createElement('div');box.className='mbBox';
  box.innerHTML=`
    <div class="mbHead"><b>💰 Moonshine Sell / Hold Advisor</b><span class="mbStatus" id="mbStatus">CHECK MENU</span></div>
    <div class="mbNote">Optimizes for long-run cash per hour. For strong 2-star Berry Cobbler, a preferred buyer pays about $226.87 versus about $144.37 from Bert before damage/bonuses. With a 48-minute batch, the practical wait-vs-restart break-even is about ${HOLD_BREAK_EVEN_MIN} minutes.</div>
    <div class="mbDecision" id="mbDecision"><div class="mbBig">Enter buyer reset time</div><div class="mbWhy">Start the buyer timer above and mark any preferred buyer Marcel currently shows.</div></div>
    <div class="mbList">
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="eddie"> Eddie Bray</label><small>Berry Cobbler compatible</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="hal"> Hal Baker</label><small>Berry Cobbler compatible</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="hank"> Hank Andrews</label><small>Berry Cobbler compatible</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="lewis"> Lewis Wells</label><small>Berry Cobbler compatible</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="mo"> Mo Carlyle</label><small>Berry Cobbler compatible</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="other"> Other preferred buyer</label><small>Use if Marcel shows another name</small></div>
      <div class="mbBuyer"><div><b>Bert Higgins</b><br><small>Always available • lower payout</small></div><small>FALLBACK</small></div>
    </div>
    <div class="mbOther"><input id="mbOtherName" placeholder="Other buyer name (optional)"></div>
    <div class="mbAdvice" id="mbAdvice">Mark who is available in your current buyer cycle.</div>
  `;
  moon.appendChild(box);

  const buyers=['eddie','hal','hank','lewis','mo','other'];
  const labels={eddie:'Eddie Bray',hal:'Hal Baker',hank:'Hank Andrews',lewis:'Lewis Wells',mo:'Mo Carlyle'};
  buyers.forEach(k=>{const el=box.querySelector(`[data-buyer="${k}"]`);el.checked=!!state[k];el.addEventListener('change',()=>{state[k]=el.checked;save();render()})});
  const otherName=box.querySelector('#mbOtherName');otherName.value=state.otherName||'';otherName.addEventListener('input',()=>{state.otherName=otherName.value.trim();save();render()});
  const preferred=()=>buyers.filter(k=>state[k]);
  function clearPreferred(){buyers.forEach(k=>state[k]=false);box.querySelectorAll('[data-buyer]').forEach(i=>i.checked=false);save()}
  function parseClock(s){
    if(!s||s==='--:--')return null;
    const p=s.split(':').map(Number);if(p.some(Number.isNaN))return null;
    if(p.length===2)return (p[0]*60+p[1])*1000;
    if(p.length===3)return (p[0]*3600+p[1]*60+p[2])*1000;
    return null;
  }
  const mins=ms=>Math.max(0,Math.ceil(ms/60000));
  function setDecision(kind,title,why,extra=''){
    const d=box.querySelector('#mbDecision');d.className='mbDecision '+kind;
    d.innerHTML=`<div class="mbBig">${title}</div><div class="mbWhy">${why}</div>${extra}`;
  }
  function render(){
    const status=box.querySelector('#mbStatus'),advice=box.querySelector('#mbAdvice');
    const recipe=document.getElementById('recipe')?.value||'Berry Cobbler';
    const batchBadge=document.getElementById('moonBadge')?.textContent||'';
    const moonClock=document.getElementById('moonTimer')?.textContent||'--:--';
    const resetClock=document.getElementById('buyerTimer')?.textContent||'--:--';
    const resetMs=parseClock(resetClock),batchMs=parseClock(moonClock);
    const active=preferred();
    const ready=batchBadge.includes('READY'),cooking=batchBadge.includes('COOKING'),idle=batchBadge.includes('IDLE');
    const names=active.map(k=>k==='other'?(state.otherName||'Other preferred buyer'):labels[k]);

    if(active.length){
      status.textContent='PREFERRED AVAILABLE';status.className='mbStatus good';
      advice.className='mbAdvice good';advice.innerHTML=`Available now: <b>${names.join(', ')}</b>${resetMs!==null?` • reset in <b>${resetClock}</b>`:''}`;
      if(ready){
        setDecision('good','✅ SELL NOW',`You have a preferred buyer for ${recipe}. Selling now gives the better payout and lets the next batch start immediately.`);
      }else if(cooking){
        if(resetMs!==null&&batchMs!==null&&resetMs>batchMs){
          setDecision('good','✅ KEEP COOKING → SELL',`The batch should finish about ${mins(batchMs)} min from now, before buyers reset in about ${mins(resetMs)} min. Sell promptly when ready.`,`<div class="mbMath"><div><b>${mins(batchMs)} min</b><span>BATCH LEFT</span></div><div><b>${mins(resetMs)} min</b><span>BUYER RESET</span></div></div>`);
        }else if(resetMs!==null&&batchMs!==null&&resetMs<=batchMs){
          setDecision('warn','⚠️ BUYERS RESET BEFORE BATCH',`Your current preferred buyer may disappear before the batch is finished. When the reset happens, re-check Marcel and mark the new buyer list. Berry Cobbler usually finds another preferred buyer.`);
        }else{
          setDecision('warn','⏱️ START BUYER TIMER',`A preferred buyer is available now, but I need the reset countdown to know whether that buyer should survive until the batch finishes.`);
        }
      }else if(idle){
        if(resetMs!==null&&resetMs>=48*60000){
          setDecision('good','✅ START BERRY COBBLER',`The current preferred buyer should still be around through a 48-minute strong batch if you start now.`);
        }else if(resetMs!==null){
          setDecision('warn','🕒 START MASH, RECHECK AFTER RESET',`Buyers reset in about ${mins(resetMs)} min, which is before a full 48-minute batch finishes. In-game, avoid relying on today's buyer; re-check the new list after reset before committing your flavor when possible.`);
        }else setDecision('warn','⏱️ START BUYER TIMER',`Enter the buyer reset countdown before starting if you want the tracker to optimize the next batch.`);
      }
    }else{
      status.textContent='NO PREFERRED';status.className='mbStatus warn';
      advice.className='mbAdvice warn';advice.innerHTML=`No preferred Berry Cobbler buyer is marked.${resetMs!==null?` Buyer reset: <b>${resetClock}</b>`:' Enter the buyer reset time above.'}`;
      if(ready){
        if(resetMs===null){
          setDecision('warn','⏱️ ENTER RESET TIMER',`I need the current buyer reset countdown to decide whether waiting beats selling to Bert.`);
        }else if(resetMs===0){
          setDecision('warn','🔄 RECHECK BUYERS NOW',`The buyer cycle just reset. Open Marcel's list and mark any new preferred Berry Cobbler buyer before selling.`);
        }else if(resetMs<=HOLD_BREAK_EVEN_MIN*60000){
          setDecision('good','🟢 HOLD FOR RESET',`Only about ${mins(resetMs)} min remain. Waiting is inside the ~${HOLD_BREAK_EVEN_MIN}-minute money-per-hour break-even, so a preferred buyer after reset is usually worth more than dumping this batch to Bert and restarting.`,`<div class="mbMath"><div><b>${mins(resetMs)} min</b><span>WAIT TO RESET</span></div><div><b>~${HOLD_BREAK_EVEN_MIN} min</b><span>HOLD BREAK-EVEN</span></div></div>`);
        }else{
          setDecision('hot','🔴 SELL TO BERT → RESTART',`The next reset is about ${mins(resetMs)} min away, beyond the ~${HOLD_BREAK_EVEN_MIN}-minute break-even. For nonstop cash per hour, take Bert's lower payout now and immediately start another 48-minute batch.`,`<div class="mbMath"><div><b>${mins(resetMs)} min</b><span>WAIT TO RESET</span></div><div><b>48 min</b><span>NEW STRONG BATCH</span></div></div>`);
        }
      }else if(cooking&&batchMs!==null){
        if(resetMs===null){
          setDecision('warn','⏱️ ENTER RESET TIMER',`The batch is still cooking. Add the buyer reset countdown so I can compare the reset against the batch finish time.`);
        }else if(resetMs<=batchMs){
          setDecision('good','✅ KEEP COOKING — RESET FIRST',`Buyers should reset about ${mins(resetMs)} min from now, before your batch finishes in about ${mins(batchMs)} min. Re-check the buyer list after reset; you may have a preferred buyer waiting by delivery time.`);
        }else{
          const waitAfterReady=resetMs-batchMs;
          if(waitAfterReady<=HOLD_BREAK_EVEN_MIN*60000){
            setDecision('good','🟢 FINISH BATCH → HOLD',`Your batch finishes in about ${mins(batchMs)} min, then the reset is only about ${mins(waitAfterReady)} min later. That post-finish wait is inside the ~${HOLD_BREAK_EVEN_MIN}-minute hold range.`);
          }else{
            setDecision('hot','🔴 PLAN TO SELL BERT AT READY',`The batch finishes in about ${mins(batchMs)} min, but buyers would not reset for roughly ${mins(waitAfterReady)} more min after that. If no preferred buyer appears, selling to Bert and restarting is the better nonstop $/hour play.`);
          }
        }
      }else if(idle){
        if(resetMs!==null&&resetMs<48*60000){
          setDecision('good','🟢 START MASH — WAIT TO FLAVOR',`The buyer list resets in about ${mins(resetMs)} min, before a 48-minute strong batch would finish. Start production, then re-check buyers after reset and flavor for the new list when possible.`);
        }else if(resetMs!==null){
          setDecision('warn','⚠️ PICK A CURRENT REQUEST',`No Berry Cobbler preferred buyer is marked and the reset is still ${mins(resetMs)} min away. For maximum efficiency, choose a flavor that currently has a preferred buyer rather than locking into an unsupported flavor.`);
        }else setDecision('warn','⏱️ ENTER RESET TIMER',`Start the buyer timer and mark Marcel's current buyers before choosing the next batch.`);
      }
    }
  }
  setInterval(()=>{
    const t=document.getElementById('buyerTimer')?.textContent||'--:--';
    if(state.lastTimer && state.lastTimer!=='00:00' && t==='00:00'){clearPreferred()}
    state.lastTimer=t;save();render();
  },1000);
  document.getElementById('recipe')?.addEventListener('change',render);
  render();
})();