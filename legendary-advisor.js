(()=>{
  if(window.__rdoLegendaryAdvisorLoaded)return;window.__rdoLegendaryAdvisorLoaded=true;

  const animals=[
    {name:'Teca Gator',times:[[21,6]],weather:'storm'},
    {name:'Sun Gator',times:[[6,9]],weather:'foggy'},
    {name:'Owiza Bear',times:[[21,6]],weather:'rain'},
    {name:'Ridgeback Bear',times:[[9,18]],weather:'clear'},
    {name:'Zizi Beaver',times:[[6,9],[18,21]],weather:'any'},
    {name:'Moon Beaver',times:[[6,9],[18,21]],weather:'rain'},
    {name:'Tatanka Bison',times:[[9,18]],weather:'rain'},
    {name:'Winyan Bison',times:[[21,6]],weather:'clear'},
    {name:'Cogi Boar',times:[[6,9]],weather:'clear'},
    {name:'Wakpa Boar',times:[[9,18]],weather:'rain'},
    {name:'Mud Runner Buck',times:[[9,18]],weather:'clear'},
    {name:'Snow Buck',times:[[6,9]],weather:'clear'},
    {name:'Iguga Cougar',times:[[18,21]],weather:'storm'},
    {name:'Maza Cougar',times:[[6,9]],weather:'clear'},
    {name:'Red Streak Coyote',times:[[9,21]],weather:'any'},
    {name:'Midnight Paw Coyote',times:[[6,21]],weather:'clear'},
    {name:'Katata Elk',times:[[6,18]],weather:'foggy'},
    {name:'Ozula Elk',times:[[18,4]],weather:'foggy'},
    {name:'Ota Fox',times:[[6,9],[18,21]],weather:'clear'},
    {name:'Marble Fox',times:[[6,9],[18,21]],weather:'clear'},
    {name:'Snowflake Moose',times:[[21,6]],weather:'rain'},
    {name:'Knight Moose',times:[[9,18]],weather:'any'},
    {name:'Nightwalker Panther',times:[[18,21]],weather:'foggy'},
    {name:'Ghost Panther',times:[[21,6]],weather:'rain'},
    {name:'Gabbro Horn Ram',times:[[6,18]],weather:'clear'},
    {name:'Chalk Horn Ram',times:[[9,18]],weather:'clear'},
    {name:'Emerald Wolf',times:[[18,6]],weather:'any'},
    {name:'Onyx Wolf',times:[[21,6]],weather:'clear'}
  ];

  const KEY='rdo_legendary_advisor_v1';
  let S={syncGameMin:null,syncRealMs:null,weather:'unknown'};
  try{S={...S,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
  const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
  const pad=n=>String(n).padStart(2,'0');
  const fmtMin=m=>{m=((Math.round(m)%1440)+1440)%1440;let h=Math.floor(m/60),mm=m%60;return `${pad(h)}:${pad(mm)}`};
  const fmtHour=h=>`${pad(h)}:00`;
  const fmtWindows=a=>a.times.map(([s,e])=>`${fmtHour(s)}–${fmtHour(e)}`).join(' / ');
  const nowGameMin=()=>{
    if(S.syncGameMin==null||S.syncRealMs==null)return null;
    const elapsed=(Date.now()-S.syncRealMs)/1000/60;
    return (S.syncGameMin+elapsed*30)%1440;
  };
  const inRange=(m,s,e)=>{const h=m/60;return s<e ? h>=s&&h<e : h>=s||h<e};
  const untilStart=(m,s)=>{const sm=s*60;return (sm-m+1440)%1440};
  const analyze=a=>{
    const m=nowGameMin();
    if(m==null)return {...a,inWindow:false,delta:99999,weatherMatch:false};
    const inWindow=a.times.some(([s,e])=>inRange(m,s,e));
    const delta=inWindow?0:Math.min(...a.times.map(([s])=>untilStart(m,s)));
    const weatherMatch=S.weather==='unknown'||a.weather==='any'||S.weather===a.weather;
    const tier=inWindow&&weatherMatch?0:inWindow?1:weatherMatch?2:3;
    return {...a,inWindow,delta,weatherMatch,tier};
  };

  const style=document.createElement('style');
  style.textContent=`
    .laCard{background:#211a14;border:1px solid #49382a;border-radius:17px;padding:14px;grid-column:1/-1}
    .laTop{display:flex;justify-content:space-between;align-items:center;gap:8px}.laTop h2{font-size:17px;margin:0}.laClock{font-size:11px;border:1px solid #49382a;border-radius:999px;padding:5px 8px;color:#74cb96;background:#14251b;white-space:nowrap}
    .laSub{font-size:11px;color:#b7a998;line-height:1.45;margin-top:5px}.laControls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.laField label{display:block;font-size:10px;color:#b7a998;font-weight:800;margin-bottom:4px}.laField input,.laField select{width:100%;border:1px solid #49382a;border-radius:11px;background:#16120f;color:#f6eee4;padding:10px;font:inherit}.laButtons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.laButtons button,.laButtons a{min-height:44px;border-radius:12px;padding:10px;text-decoration:none;font-weight:900;text-align:center;display:flex;align-items:center;justify-content:center}.laPrimary{background:#e5a04b;color:#17120e;border:0}.laSecondary{background:#342a21;color:#f6eee4;border:1px solid #49382a}
    .laList{display:grid;gap:8px;margin-top:10px}.laPick{border:1px solid #49382a;background:#18130f;border-radius:13px;padding:10px}.laPick.best{border-color:#2c6a45;background:#14251b}.laPick.warn{border-color:#7d602b;background:#28200e}.laRank{font-size:10px;font-weight:900;color:#e5a04b}.laName{font-size:16px;font-weight:900}.laMeta{font-size:11px;color:#b7a998;line-height:1.45;margin-top:4px}.laStatus{margin-top:6px;font-size:12px;font-weight:900}.laAll{margin-top:10px;border-top:1px solid #49382a;padding-top:10px}.laAll details{border:1px solid #49382a;border-radius:11px;background:#18130f;padding:8px}.laAll summary{font-weight:900;font-size:12px}.laRow{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #34291f;padding:7px 0;font-size:11px}.laRow:first-of-type{margin-top:7px}.laRow span:last-child{color:#b7a998;text-align:right}
    @media(max-width:430px){.laControls,.laButtons{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const card=document.createElement('section');card.className='laCard';
  card.innerHTML=`
    <div class="laTop"><div><h2>🦌 Legendary Animal — Go For This Now</h2><div class="laSub">Ranks all 28 free-roam Legendary Animals by how close your current RDO time is to their preferred window, then uses weather as a tie-breaker. Preferred conditions improve the odds but do not guarantee a spawn.</div></div><div class="laClock" id="laClock">RDO clock not synced</div></div>
    <div class="laControls">
      <div class="laField"><label>Current RDO in-game time</label><input id="laTime" type="time" value="12:00"></div>
      <div class="laField"><label>Current in-game weather</label><select id="laWeather"><option value="unknown">Not sure</option><option value="clear">Clear</option><option value="rain">Rain</option><option value="foggy">Foggy</option><option value="storm">Storm</option></select></div>
    </div>
    <div class="laButtons"><button class="laPrimary" id="laSync" type="button">Sync RDO Clock</button><a class="laSecondary" href="https://jeanropke.github.io/RDOMap/" target="_blank" rel="noopener">Open Jean Ropke Map ↗</a></div>
    <div class="laSub">After syncing once, the tracker advances the RDO clock automatically (about 1 in-game hour every 2 real minutes). Re-sync if your displayed game time drifts.</div>
    <div class="laList" id="laList"></div>
    <div class="laAll"><details><summary>Show all 28 preferred windows</summary><div id="laAll"></div></details></div>
  `;

  const anchor=document.querySelector('.natMG');
  if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('beforebegin',card);
  else (document.querySelector('.grid')||document.querySelector('.wrap')||document.body).appendChild(card);

  const timeInput=card.querySelector('#laTime'),weather=card.querySelector('#laWeather');
  weather.value=S.weather||'unknown';
  weather.addEventListener('change',()=>{S.weather=weather.value;save();render()});
  card.querySelector('#laSync').addEventListener('click',()=>{
    if(!timeInput.value)return;
    const [h,m]=timeInput.value.split(':').map(Number);
    S.syncGameMin=h*60+m;S.syncRealMs=Date.now();S.weather=weather.value;save();render();
  });

  function statusText(x){
    if(x.inWindow&&x.weatherMatch)return '✅ BEST NOW — preferred time is active'+(x.weather==='any'?'':' and weather matches');
    if(x.inWindow&&!x.weatherMatch)return `🟡 TIME IS RIGHT — preferred weather is ${x.weather}`;
    const gameH=x.delta/60,realMin=x.delta/30;
    const near=realMin<=6?'🟢 VERY SOON':realMin<=15?'🟡 COMING UP':'⏳ LATER';
    return `${near} — window starts in ${gameH<1?Math.round(x.delta)+' in-game min':gameH.toFixed(gameH<3?1:0)+' in-game hr'} (~${Math.max(1,Math.round(realMin))} real min)`;
  }

  function render(){
    const gm=nowGameMin();
    const clock=card.querySelector('#laClock'),list=card.querySelector('#laList');
    if(gm==null){clock.textContent='RDO clock not synced';list.innerHTML='<div class="laPick warn"><div class="laName">Sync your in-game clock first</div><div class="laMeta">Look at the RDO time, enter it above, then tap Sync RDO Clock.</div></div>';return;}
    clock.textContent=`RDO ${fmtMin(gm)}`;
    const ranked=animals.map(analyze).sort((a,b)=>a.tier-b.tier||a.delta-b.delta||a.name.localeCompare(b.name));
    list.innerHTML=ranked.slice(0,5).map((x,i)=>`<div class="laPick ${i===0&&x.inWindow&&x.weatherMatch?'best':x.inWindow&&!x.weatherMatch?'warn':''}"><div class="laRank">#${i+1} ${i===0?'GO FOR THIS':''}</div><div class="laName">${x.name}</div><div class="laMeta"><b>Preferred:</b> ${fmtWindows(x)} • ${x.weather==='any'?'Any weather':x.weather}<br><b>Your time:</b> ${fmtMin(gm)} • ${S.weather==='unknown'?'weather not set':S.weather}</div><div class="laStatus">${statusText(x)}</div></div>`).join('');
    card.querySelector('#laAll').innerHTML=animals.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(a=>`<div class="laRow"><span>${a.name}</span><span>${fmtWindows(a)} • ${a.weather==='any'?'any weather':a.weather}</span></div>`).join('');
  }
  render();setInterval(render,2000);
})();