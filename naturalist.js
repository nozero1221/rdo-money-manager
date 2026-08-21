(()=>{
  const animals=[
    {id:'bull_elk',name:'Rocky Mountain Bull Elk',zone:'Cumberland Forest / Little Creek River',time:'Any time • daylight easiest to spot',tip:'Ride the Cumberland Forest roads or Little Creek River valley.'},
    {id:'cow_elk',name:'Rocky Mountain Cow Elk',zone:'Cumberland Forest / Little Creek River',time:'Any time • daylight easiest to spot',tip:'Search the same elk areas as the bull.'},
    {id:'badger',name:'American Badger',zone:'Riggs Station / Tall Trees / Heartlands',time:'Evening & night best',tip:'Ride slowly off-road and use Eagle Eye; badgers are small and easy to pass.'},
    {id:'gray_wolf',name:'Gray Wolf',zone:'Tall Trees / Cumberland Forest',time:'Night is a strong time to check',tip:'Listen for howls and watch for wolf packs on roads.'},
    {id:'timber_wolf',name:'Timber Wolf',zone:'Cumberland Forest / Grizzlies',time:'Night best • roughly 9 PM–6 AM',tip:'This is usually one of the harder samples in the set.'},
    {id:'ram',name:'Rocky Mountain Bighorn Ram',zone:'Grizzlies / Cumberland Forest',time:'Any time • daylight easiest to spot',tip:'Check rocky slopes and mountain roads.'},
    {id:'sheep',name:'Rocky Mountain Bighorn Sheep',zone:'Grizzlies / Cumberland Forest',time:'Any time • daylight easiest to spot',tip:'Often found in the same general areas as the ram.'},
    {id:'coyote',name:'California Valley Coyote',zone:'Cumberland Forest / New Hanover / West Elizabeth',time:'Dusk & night are good',tip:'Listen for yelps and scan open fields.'},
    {id:'buck',name:'Whitetail Buck',zone:'Heartlands / Cumberland Forest',time:'Any time • dawn/dusk are good',tip:'Open grassland around the Heartlands is an easy first check.'},
    {id:'deer',name:'Whitetail Deer',zone:'Heartlands / Cumberland Forest / Thieves Landing',time:'Any time • dawn/dusk are good',tip:'Very common; sample one while doing the other animals.'},
    {id:'boar',name:'Wild Boar',zone:'Strawberry area / Thieves Landing',time:'Evening & night are good',tip:'Search brushy areas and roads around Strawberry and Thieves Landing.'},
    {id:'bison',name:'American Bison',zone:'Great Plains / New Hanover',time:'Any time • daylight easiest to spot',tip:'Large herds make this one of the easiest samples.'},
    {id:'prong_buck',name:'American Pronghorn Buck',zone:'Great Plains / Heartlands',time:'Any time • daylight easiest to spot',tip:'Scan open grassland from horseback.'},
    {id:'prong_doe',name:'American Pronghorn Doe',zone:'Great Plains / Heartlands',time:'Any time • daylight easiest to spot',tip:'Usually found in the same areas as the pronghorn buck.'}
  ];
  const KEY='rdo_nat_mountain_grassland_v1';
  let state={};
  try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){state={}}
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const style=document.createElement('style');
  style.textContent=`
    .natMG{background:#211a14;border:1px solid #49382a;border-radius:17px;padding:14px;grid-column:1/-1}
    .natMG h2{font-size:17px;margin:0}.natMG .natSub{font-size:11px;color:#b7a998;line-height:1.45;margin-top:5px}
    .natTop{display:flex;justify-content:space-between;align-items:center;gap:8px}.natProg{font-size:11px;border:1px solid #49382a;border-radius:999px;padding:5px 8px;color:#74cb96;background:#14251b;white-space:nowrap}
    .natBar{height:9px;border:1px solid #34291f;background:#15110e;border-radius:999px;overflow:hidden;margin:10px 0}.natFill{height:100%;background:#e5a04b;width:0}
    .natRoute{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:9px 0}.natRoute div{border:1px solid #49382a;background:#18130f;border-radius:11px;padding:8px;font-size:11px}.natRoute b{display:block;color:#f6eee4;margin-bottom:2px}.natRoute span{color:#b7a998}
    .natList{display:grid;gap:8px;margin-top:10px}.natAnimal{border:1px solid #49382a;background:#18130f;border-radius:13px;padding:10px}.natAnimal.done{opacity:.66}.natName{font-weight:900;font-size:14px}.natMeta{font-size:11px;color:#b7a998;line-height:1.45;margin-top:4px}.natChecks{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.natCheck{display:flex;align-items:center;gap:7px;border:1px solid #49382a;border-radius:10px;padding:8px;font-size:12px}.natCheck input{width:auto;margin:0;transform:scale(1.15)}
    .natButtons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.natButtons button,.natButtons a{min-height:44px;border-radius:12px;padding:10px;text-decoration:none;font-weight:900;text-align:center;display:flex;align-items:center;justify-content:center}.natPrimary{background:#e5a04b;color:#17120e;border:0}.natSecondary{background:#342a21;color:#f6eee4;border:1px solid #49382a}
    .natMapWrap{display:none;margin-top:10px}.natMapWrap.open{display:block}.natMapNote{font-size:11px;color:#b7a998;line-height:1.45;margin-bottom:7px}.natMapFrame{width:100%;height:520px;border:1px solid #49382a;border-radius:13px;background:#15110e}.natReady{margin-top:9px;padding:9px;border-radius:11px;background:#14251b;border:1px solid #2c6a45;color:#74cb96;font-weight:900;display:none}.natReady.show{display:block}
    @media(max-width:430px){.natRoute,.natChecks,.natButtons{grid-template-columns:1fr}.natMapFrame{height:430px}}
  `;
  document.head.appendChild(style);

  const wrap=document.createElement('section');
  wrap.className='natMG';
  wrap.innerHTML=`
    <div class="natTop"><div><h2>🐾 Mountain & Grassland — 14 Animal Set</h2><div class="natSub">Collect a sample, sell one to Harriet for the stamp, then trade in the full stamped habitat set. The time labels are best-times-to-try, not guaranteed spawn windows.</div></div><div class="natProg" id="natProg">0 / 14 stamped</div></div>
    <div class="natBar"><div class="natFill" id="natFill"></div></div>
    <div class="natRoute">
      <div><b>1 • Day: Heartlands / Great Plains</b><span>Bison, both Pronghorns, Buck, Deer</span></div>
      <div><b>2 • Day: Cumberland / Little Creek</b><span>Both Elk, Bighorns, Buck/Deer, Coyote</span></div>
      <div><b>3 • Day: Grizzlies</b><span>Bighorn Ram + Sheep, extra Elk</span></div>
      <div><b>4 • Night cleanup</b><span>Timber Wolf, Gray Wolf, Badger, Boar, Coyote</span></div>
    </div>
    <div class="natReady" id="natReady">✅ All 14 stamped — trade in Mountain & Grassland in the Animal Field Guide.</div>
    <div class="natButtons">
      <button class="natPrimary" id="natToggleMap" type="button">Show Jean Ropke Animal Map</button>
      <a class="natSecondary" href="https://jeanropke.github.io/RDOMap/" target="_blank" rel="noopener">Open Full Jean Ropke Map ↗</a>
    </div>
    <div class="natMapWrap" id="natMapWrap"><div class="natMapNote"><b>Jean Ropke map:</b> open <b>Animals</b> in its menu to view animal heatmaps/static spawn points. These are community map locations, not live telemetry from your exact lobby.</div><iframe class="natMapFrame" title="Jean Ropke Red Dead Online animal map" loading="lazy" src="https://jeanropke.github.io/RDOMap/"></iframe></div>
    <div class="natList" id="natList"></div>
    <div class="natButtons"><button class="natSecondary" id="natReset" type="button">Reset 14-animal checklist</button><a class="natSecondary" href="https://jeanropke.github.io/RDOMap/" target="_blank" rel="noopener">Map in Safari ↗</a></div>
  `;

  const list=wrap.querySelector('#natList');
  animals.forEach(a=>{
    const row=document.createElement('div'); row.className='natAnimal'; row.dataset.id=a.id;
    row.innerHTML=`<div class="natName">${esc(a.name)}</div><div class="natMeta"><b>Best area:</b> ${esc(a.zone)}<br><b>Best time to try:</b> ${esc(a.time)}<br>${esc(a.tip)}</div><div class="natChecks"><label class="natCheck"><input type="checkbox" data-kind="sampled"> Sample collected</label><label class="natCheck"><input type="checkbox" data-kind="stamped"> Sold to Harriet / stamped</label></div>`;
    const sampled=row.querySelector('[data-kind="sampled"]'), stamped=row.querySelector('[data-kind="stamped"]');
    sampled.checked=!!state[a.id]?.sampled; stamped.checked=!!state[a.id]?.stamped;
    const updateRow=()=>row.classList.toggle('done',stamped.checked);
    [sampled,stamped].forEach(inp=>inp.addEventListener('change',()=>{state[a.id]=state[a.id]||{};state[a.id][inp.dataset.kind]=inp.checked;if(inp.dataset.kind==='stamped'&&inp.checked){sampled.checked=true;state[a.id].sampled=true}save();updateRow();renderProgress()}));
    updateRow(); list.appendChild(row);
  });

  function renderProgress(){const stamped=animals.filter(a=>state[a.id]?.stamped).length;wrap.querySelector('#natProg').textContent=`${stamped} / 14 stamped`;wrap.querySelector('#natFill').style.width=(stamped/14*100)+'%';wrap.querySelector('#natReady').classList.toggle('show',stamped===14)}
  wrap.querySelector('#natToggleMap').addEventListener('click',()=>{const m=wrap.querySelector('#natMapWrap');m.classList.toggle('open');wrap.querySelector('#natToggleMap').textContent=m.classList.contains('open')?'Hide Jean Ropke Map':'Show Jean Ropke Animal Map'});
  wrap.querySelector('#natReset').addEventListener('click',()=>{if(!confirm('Reset all 14 Mountain & Grassland checkboxes?'))return;state={};save();wrap.querySelectorAll('input[type="checkbox"]').forEach(i=>i.checked=false);wrap.querySelectorAll('.natAnimal').forEach(r=>r.classList.remove('done'));renderProgress()});
  renderProgress();

  const cards=[...document.querySelectorAll('.card')];
  const naturalistCard=cards.find(c=>c.textContent.includes('Naturalist'));
  if(naturalistCard&&naturalistCard.parentNode){naturalistCard.insertAdjacentElement('afterend',wrap)}else{(document.querySelector('.grid')||document.querySelector('.wrap')||document.body).appendChild(wrap)}

  const moonshineBuyers=document.createElement('script');
  moonshineBuyers.src='./moonshine-buyers.js?v=1';
  document.body.appendChild(moonshineBuyers);
})();