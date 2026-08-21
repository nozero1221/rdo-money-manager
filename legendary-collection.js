(()=>{
  if(window.__rdoLegendaryCollectionLoaded)return;window.__rdoLegendaryCollectionLoaded=true;

  const animals=[
    ['Teca Gator','alligator'],['Sun Gator','alligator'],
    ['Owiza Bear','bear'],['Ridgeback Bear','bear'],
    ['Zizi Beaver','beaver'],['Moon Beaver','beaver'],
    ['Tatanka Bison','bison'],['Winyan Bison','bison'],
    ['Cogi Boar','boar'],['Wakpa Boar','boar'],
    ['Mud Runner Buck','buck'],['Snow Buck','buck'],
    ['Iguga Cougar','cougar'],['Maza Cougar','cougar'],
    ['Red Streak Coyote','coyote'],['Midnight Paw Coyote','coyote'],
    ['Katata Elk','elk'],['Ozula Elk','elk'],
    ['Ota Fox','fox'],['Marble Fox','fox'],
    ['Snowflake Moose','moose'],['Knight Moose','moose'],
    ['Nightwalker Panther','panther'],['Ghost Panther','panther'],
    ['Gabbro Horn Ram','ram'],['Chalk Horn Ram','ram'],
    ['Emerald Wolf','wolf'],['Onyx Wolf','wolf']
  ].map(([name,species])=>({name,species,id:name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}));

  const KEY='rdo_legendary_collection_v1';
  const COOLDOWN=72*60*60*1000;
  let S={got:{},cooldowns:{}};
  try{S={...S,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}
  const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
  const left=species=>Math.max(0,(S.cooldowns[species]||0)-Date.now());
  const fmt=ms=>{
    if(ms<=0)return'READY';
    const total=Math.ceil(ms/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
    return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  };
  const label=s=>s.charAt(0).toUpperCase()+s.slice(1);

  const style=document.createElement('style');
  style.textContent=`
    .lcCard{background:#211a14;border:1px solid #49382a;border-radius:17px;padding:14px;grid-column:1/-1}.lcTop{display:flex;justify-content:space-between;align-items:center;gap:8px}.lcTop h2{font-size:17px;margin:0}.lcProg{font-size:11px;border:1px solid #49382a;border-radius:999px;padding:5px 8px;color:#74cb96;background:#14251b;white-space:nowrap}.lcSub{font-size:11px;color:#b7a998;line-height:1.45;margin-top:5px}.lcTip{margin-top:9px;border:1px solid #6f5423;background:#28200e;border-radius:11px;padding:9px;font-size:11px;line-height:1.45}.lcSpecies{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:10px}.lcSpeciesBox{border:1px solid #49382a;background:#18130f;border-radius:11px;padding:8px}.lcSpeciesBox b{display:block;font-size:12px}.lcSpeciesBox span{font-size:10px;color:#b7a998}.lcSpeciesBox.cool{border-color:#7d602b;background:#28200e}.lcList{display:grid;gap:8px;margin-top:10px}.lcRow{border:1px solid #49382a;background:#18130f;border-radius:13px;padding:10px}.lcRow.cool{border-color:#7d602b;background:#28200e}.lcName{font-size:14px;font-weight:900}.lcMeta{font-size:10px;color:#b7a998;margin-top:3px}.lcActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.lcCheck{display:flex;align-items:center;gap:7px;border:1px solid #49382a;border-radius:10px;padding:8px;font-size:12px}.lcCheck input{width:auto;margin:0;transform:scale(1.15)}.lcFound{min-height:40px;border-radius:10px;border:0;background:#e5a04b;color:#17120e;font-weight:900;padding:8px}.lcFound:disabled{opacity:.45}.lcReset{margin-top:10px;width:100%;min-height:42px;border-radius:11px;background:#342a21;color:#f6eee4;border:1px solid #49382a;font-weight:900}.lcCooldownNote{font-size:11px;font-weight:900;margin-top:6px;color:#f0c764}.lcBar{height:9px;border:1px solid #34291f;background:#15110e;border-radius:999px;overflow:hidden;margin-top:9px}.lcFill{height:100%;background:#e5a04b;width:0}
    @media(max-width:430px){.lcSpecies,.lcActions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const card=document.createElement('section');card.className='lcCard';
  card.innerHTML=`
    <div class="lcTop"><div><h2>✅ Legendary Animal Collection + Cooldowns</h2><div class="lcSub">Check off animals you have gotten. Tap <b>Found Now</b> when you actually encounter one to start the 72-hour real-time cooldown for that whole species.</div></div><div class="lcProg" id="lcProg">0 / 28</div></div>
    <div class="lcBar"><div class="lcFill" id="lcFill"></div></div>
    <div class="lcTip"><b>Random encounter tip:</b> Legendary Animals are free-roam dynamic events. If a hideout, rescue, ambush, revenue-agent roadblock, stranger event, or similar encounter is active in the same area, clear it or leave far enough for it to despawn before checking the Legendary spawn again. A quieter/less-busy session generally gives dynamic events more room to appear.</div>
    <div class="lcSpecies" id="lcSpecies"></div>
    <div class="lcList" id="lcList"></div>
    <button class="lcReset" id="lcReset" type="button">Reset Collection Checkmarks Only</button>
  `;

  const anchor=document.querySelector('.laCard')||document.querySelector('.natMG');
  if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',card);
  else (document.querySelector('.grid')||document.querySelector('.wrap')||document.body).appendChild(card);

  function startCooldown(a){
    S.got[a.id]=true;
    S.cooldowns[a.species]=Date.now()+COOLDOWN;
    save();render();
  }

  function render(){
    const got=animals.filter(a=>S.got[a.id]).length;
    card.querySelector('#lcProg').textContent=`${got} / 28`;
    card.querySelector('#lcFill').style.width=(got/28*100)+'%';

    const species=[...new Set(animals.map(a=>a.species))];
    card.querySelector('#lcSpecies').innerHTML=species.map(s=>{
      const rem=left(s),names=animals.filter(a=>a.species===s).map(a=>a.name).join(' + ');
      return `<div class="lcSpeciesBox ${rem?'cool':''}"><b>${label(s)} — ${rem?'COOLDOWN':'READY'}</b><span>${rem?fmt(rem):'Both variants can be hunted'}<br>${names}</span></div>`;
    }).join('');

    card.querySelector('#lcList').innerHTML=animals.map(a=>{
      const rem=left(a.species),checked=!!S.got[a.id];
      return `<div class="lcRow ${rem?'cool':''}" data-id="${a.id}"><div class="lcName">${a.name}</div><div class="lcMeta">Species: ${label(a.species)} • ${rem?'same-species cooldown active':'eligible by species cooldown'}</div>${rem?`<div class="lcCooldownNote">⏳ ${fmt(rem)} remaining</div>`:''}<div class="lcActions"><label class="lcCheck"><input type="checkbox" data-check="${a.id}" ${checked?'checked':''}> I have this animal</label><button class="lcFound" data-found="${a.id}" type="button" ${rem?'disabled':''}>${rem?'Species on cooldown':'Found Now → Start 72h'}</button></div></div>`;
    }).join('');

    card.querySelectorAll('[data-check]').forEach(el=>el.addEventListener('change',()=>{S.got[el.dataset.check]=el.checked;save();render()}));
    card.querySelectorAll('[data-found]').forEach(btn=>btn.addEventListener('click',()=>{const a=animals.find(x=>x.id===btn.dataset.found);if(a)startCooldown(a)}));

    // Add cooldown warnings to the existing time/weather advisor without changing its saved clock.
    document.querySelectorAll('.laPick').forEach(p=>{
      const name=p.querySelector('.laName')?.textContent?.trim();
      const a=animals.find(x=>x.name===name);if(!a)return;
      const rem=left(a.species);
      p.classList.toggle('warn',!!rem);
      let note=p.querySelector('.lcAdvisorCooldown');
      if(rem){
        if(!note){note=document.createElement('div');note.className='lcAdvisorCooldown lcCooldownNote';p.appendChild(note)}
        note.textContent=`🚫 ${label(a.species)} species cooldown: ${fmt(rem)} remaining`;
      }else if(note)note.remove();
    });
  }

  card.querySelector('#lcReset').addEventListener('click',()=>{
    if(!confirm('Reset only the 28 collection checkmarks? Active cooldown timers will stay.'))return;
    S.got={};save();render();
  });

  render();setInterval(render,1000);
})();