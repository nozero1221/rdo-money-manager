(()=>{
  if(window.__rdoMoonshineBuyersLoaded)return;window.__rdoMoonshineBuyersLoaded=true;
  const KEY='rdo_moonshine_buyers_v1';
  let state={eddie:false,hal:false,hank:false,other:false,otherName:'',lastTimer:''};
  try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const style=document.createElement('style');
  style.textContent=`
    .mbBox{margin-top:12px;border-top:1px solid #49382a;padding-top:12px}.mbHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.mbHead b{font-size:14px}.mbStatus{font-size:10px;border:1px solid #49382a;border-radius:999px;padding:5px 8px;color:#b7a998}.mbStatus.good{color:#74cb96;background:#14251b}.mbStatus.warn{color:#f0c764;background:#28200e}.mbNote{font-size:11px;color:#b7a998;line-height:1.45;margin-top:5px}.mbList{display:grid;gap:7px;margin-top:9px}.mbBuyer{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #49382a;background:#18130f;border-radius:11px;padding:9px}.mbBuyer label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800}.mbBuyer input[type=checkbox]{width:auto;margin:0;transform:scale(1.15)}.mbBuyer small{font-size:10px;color:#b7a998}.mbOther{margin-top:7px}.mbOther input{width:100%;border:1px solid #49382a;border-radius:10px;background:#16120f;color:#f6eee4;padding:9px}.mbAdvice{margin-top:9px;border:1px solid #49382a;background:#18130f;border-radius:11px;padding:10px;font-size:12px;line-height:1.45}.mbAdvice.good{border-color:#2c6a45;background:#14251b}.mbAdvice.warn{border-color:#6f5423;background:#28200e}
  `;
  document.head.appendChild(style);
  const cards=[...document.querySelectorAll('.card')];
  const moon=cards.find(c=>c.textContent.includes('Moonshine'));
  if(!moon)return;
  const box=document.createElement('div');box.className='mbBox';
  box.innerHTML=`
    <div class="mbHead"><b>👥 Moonshine Buyers</b><span class="mbStatus" id="mbStatus">CHECK MENU</span></div>
    <div class="mbNote">Buyer availability is semi-random. Mark the preferred buyers you currently see in Marcel's menu. Bert Higgins is always available but pays less.</div>
    <div class="mbList">
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="eddie"> Eddie Bray</label><small>Berry Cobbler preferred</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="hal"> Hal Baker</label><small>Berry Cobbler preferred</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="hank"> Hank Andrews</label><small>Berry Cobbler preferred</small></div>
      <div class="mbBuyer"><label><input type="checkbox" data-buyer="other"> Other preferred buyer</label><small>Use if your menu shows another name</small></div>
      <div class="mbBuyer"><div><b>Bert Higgins</b><br><small>Always available • lower payout</small></div><small>LAST RESORT</small></div>
    </div>
    <div class="mbOther"><input id="mbOtherName" placeholder="Other buyer name (optional)"></div>
    <div class="mbAdvice" id="mbAdvice">Open Marcel's buyer list and mark who is available now.</div>
  `;
  moon.appendChild(box);
  const buyers=['eddie','hal','hank','other'];
  buyers.forEach(k=>{const el=box.querySelector(`[data-buyer="${k}"]`);el.checked=!!state[k];el.addEventListener('change',()=>{state[k]=el.checked;save();render()})});
  const otherName=box.querySelector('#mbOtherName');otherName.value=state.otherName||'';otherName.addEventListener('input',()=>{state.otherName=otherName.value.trim();save();render()});
  const preferred=()=>buyers.filter(k=>state[k]);
  function clearPreferred(){buyers.forEach(k=>state[k]=false);box.querySelectorAll('[data-buyer]').forEach(i=>i.checked=false);save()}
  function render(){
    const status=box.querySelector('#mbStatus'),advice=box.querySelector('#mbAdvice');
    const recipe=document.getElementById('recipe')?.value||'Berry Cobbler';
    const batch=document.getElementById('moonBadge')?.textContent||'';
    const timer=document.getElementById('buyerTimer')?.textContent||'--:--';
    const active=preferred();
    if(active.length){
      const names=active.map(k=>k==='eddie'?'Eddie Bray':k==='hal'?'Hal Baker':k==='hank'?'Hank Andrews':(state.otherName||'Other preferred buyer'));
      status.textContent='PREFERRED AVAILABLE';status.className='mbStatus good';
      advice.className='mbAdvice good';advice.innerHTML=`<b>${batch.includes('READY')?'SELL NOW':'Buyer available'}:</b> ${names.join(', ')}${timer!=='--:--'?`<br>Buyer reset timer: <b>${timer}</b>`:''}`;
    }else{
      status.textContent='NO PREFERRED MARKED';status.className='mbStatus warn';advice.className='mbAdvice warn';
      advice.innerHTML=recipe==='Berry Cobbler'?`<b>Berry Cobbler:</b> re-check Marcel's buyer list. If only Bert is available, waiting for the next reset usually protects your better payout.${timer!=='--:--'?`<br>Buyer reset timer: <b>${timer}</b>`:''}`:`<b>${recipe}:</b> check the in-game buyer list for a preferred buyer before selling.${timer!=='--:--'?`<br>Buyer reset timer: <b>${timer}</b>`:''}`;
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