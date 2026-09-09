(()=>{
  if(window.__rdoDurableStateLoaded)return;window.__rdoDurableStateLoaded=true;

  const MAIN='rdo_manager_v3';
  const KEYS=[
    MAIN,
    'rdo_moonshine_buyers_v4',
    'rdo_legendary_collection_v1',
    'rdo_legendary_advisor_v2',
    'rdo_nat_mountain_grassland_v1'
  ];
  const COOKIE={
    [MAIN]:'rdo_b_main',
    'rdo_moonshine_buyers_v4':'rdo_b_buy',
    'rdo_legendary_collection_v1':'rdo_b_leg',
    'rdo_legendary_advisor_v2':'rdo_b_adv',
    'rdo_nat_mountain_grassland_v1':'rdo_b_nat'
  };
  const META='_rdo_persist_meta_v1';
  const originalSet=Storage.prototype.setItem;
  const originalGet=Storage.prototype.getItem;
  let internal=false;

  const getMeta=()=>{try{return JSON.parse(originalGet.call(localStorage,META)||'{}')}catch(e){return{}}};
  const setMeta=m=>{try{internal=true;originalSet.call(localStorage,META,JSON.stringify(m))}catch(e){}finally{internal=false}};
  const readCookie=name=>{
    try{
      const prefix=name+'=';
      const part=document.cookie.split('; ').find(x=>x.startsWith(prefix));
      if(!part)return null;
      return JSON.parse(decodeURIComponent(part.slice(prefix.length)));
    }catch(e){return null}
  };
  const writeCookie=(name,wrapper)=>{
    try{
      const encoded=encodeURIComponent(JSON.stringify(wrapper));
      if(encoded.length>3600)return;
      document.cookie=`${name}=${encoded}; Max-Age=31536000; Path=/rdo-money-manager/; SameSite=Lax; Secure`;
    }catch(e){}
  };
  const readHash=()=>{
    try{
      if(!location.hash.startsWith('#rdo='))return null;
      return JSON.parse(decodeURIComponent(location.hash.slice(5)));
    }catch(e){return null}
  };
  const writeHash=wrapper=>{
    try{
      const value=encodeURIComponent(JSON.stringify(wrapper));
      history.replaceState(history.state,'',location.pathname+location.search+'#rdo='+value);
    }catch(e){}
  };

  function mirror(key,value,ts=Date.now()){
    if(!KEYS.includes(key)||typeof value!=='string')return;
    const meta=getMeta();meta[key]=ts;setMeta(meta);
    const wrapper={v:1,ts,data:value};
    writeCookie(COOKIE[key],wrapper);
    if(key===MAIN)writeHash(wrapper);

    // Extra durable copy when IndexedDB is available. This is only a fallback;
    // synchronous cookie/hash restoration happens first on page load.
    try{
      const req=indexedDB.open('rdo-money-manager-state',1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state',{keyPath:'key'})};
      req.onsuccess=()=>{try{const db=req.result;const tx=db.transaction('state','readwrite');tx.objectStore('state').put({key,value,ts});tx.oncomplete=()=>db.close();tx.onerror=()=>db.close()}catch(e){}};
    }catch(e){}
  }

  function bestSyncBackup(key){
    const meta=getMeta();
    const localTs=Number(meta[key]||0);
    let localValue=null;
    try{localValue=originalGet.call(localStorage,key)}catch(e){}
    const candidates=[];
    const c=readCookie(COOKIE[key]);if(c&&typeof c.data==='string')candidates.push(c);
    if(key===MAIN){const h=readHash();if(h&&typeof h.data==='string')candidates.push(h)}
    candidates.sort((a,b)=>(b.ts||0)-(a.ts||0));
    const backup=candidates[0]||null;

    if(localValue!=null&&localValue!==''){
      // Existing state with no timestamp predates this persistence layer. Keep it,
      // timestamp it now, and create backups instead of overwriting it.
      if(!localTs){mirror(key,localValue,Date.now());return localValue}
      if(!backup||localTs>=Number(backup.ts||0))return localValue;
    }
    if(backup){
      try{internal=true;originalSet.call(localStorage,key,backup.data)}catch(e){}finally{internal=false}
      const m=getMeta();m[key]=Number(backup.ts||Date.now());setMeta(m);
      return backup.data;
    }
    return localValue;
  }

  function applyMain(raw){
    if(!raw)return;
    try{
      const fresh=JSON.parse(raw);
      if(typeof S!=='undefined'&&S&&typeof S==='object')Object.assign(S,fresh);
    }catch(e){}
  }

  function restoreSync(){
    let mainRaw=null;
    KEYS.forEach(k=>{const raw=bestSyncBackup(k);if(k===MAIN)mainRaw=raw});
    applyMain(mainRaw);
    try{if(typeof render==='function')render()}catch(e){}
  }

  function persistNow(){
    try{
      if(typeof S!=='undefined'&&S&&typeof S==='object'){
        const raw=JSON.stringify(S);
        internal=true;originalSet.call(localStorage,MAIN,raw);internal=false;
        mirror(MAIN,raw);
      }
    }catch(e){internal=false}
    KEYS.filter(k=>k!==MAIN).forEach(k=>{try{const raw=originalGet.call(localStorage,k);if(raw)mirror(k,raw)}catch(e){}});
  }

  // Transparently mirror every tracker save without changing the older modules.
  Storage.prototype.setItem=function(key,value){
    const out=originalSet.call(this,key,value);
    try{if(!internal&&this===localStorage&&KEYS.includes(String(key)))mirror(String(key),String(value))}catch(e){}
    return out;
  };

  restoreSync();
  persistNow();

  // iOS/Safari/WebView lifecycle: save before suspension, restore from durable
  // timestamps as soon as the page becomes active again.
  const background=()=>persistNow();
  const foreground=()=>{restoreSync();try{window.dispatchEvent(new CustomEvent('rdo:resume-sync',{detail:{now:Date.now()}}))}catch(e){}};
  document.addEventListener('visibilitychange',()=>{document.hidden?background():foreground()},{passive:true});
  window.addEventListener('pagehide',background,{passive:true});
  window.addEventListener('pageshow',foreground,{passive:true});
  window.addEventListener('focus',foreground,{passive:true});
  window.addEventListener('beforeunload',background,{passive:true});
  document.addEventListener('freeze',background,{passive:true});
  document.addEventListener('resume',foreground,{passive:true});

  // Ask supporting browsers for durable storage. Safe to ignore when unsupported.
  try{navigator.storage?.persist?.().catch(()=>{})}catch(e){}

  // If localStorage was lost but IndexedDB survived, recover it asynchronously.
  try{
    const req=indexedDB.open('rdo-money-manager-state',1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state',{keyPath:'key'})};
    req.onsuccess=()=>{
      const db=req.result;let pending=KEYS.length,changed=false;
      KEYS.forEach(k=>{
        try{
          const tx=db.transaction('state','readonly');const g=tx.objectStore('state').get(k);
          g.onsuccess=()=>{
            const item=g.result;const meta=getMeta();const localTs=Number(meta[k]||0);
            if(item&&item.value&&Number(item.ts||0)>localTs){
              try{internal=true;originalSet.call(localStorage,k,item.value);internal=false;meta[k]=item.ts;setMeta(meta);if(k===MAIN)applyMain(item.value);changed=true}catch(e){internal=false}
            }
            if(--pending===0){db.close();if(changed){try{if(typeof render==='function')render()}catch(e){};try{window.dispatchEvent(new CustomEvent('rdo:persist-restored'))}catch(e){}}}
          };
          g.onerror=()=>{if(--pending===0)db.close()};
        }catch(e){if(--pending===0)db.close()}
      });
    };
  }catch(e){}
})();