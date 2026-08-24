(()=>{
  if(window.__rdoResumeSyncLoaded)return;window.__rdoResumeSyncLoaded=true;

  const MAIN_KEY='rdo_manager_v3';
  let lastResume=0;

  function reloadMainState(){
    try{
      const raw=localStorage.getItem(MAIN_KEY);
      if(!raw)return;
      const fresh=JSON.parse(raw);
      if(typeof S!=='undefined'&&S&&typeof S==='object'){
        Object.keys(fresh).forEach(k=>{S[k]=fresh[k]});
      }
    }catch(e){}
  }

  function forceFreshRender(){
    reloadMainState();
    try{if(typeof render==='function')render()}catch(e){}
    // Some add-on modules maintain their own timers. This event gives them an
    // immediate wake-up signal in addition to their normal intervals/pageshow handlers.
    try{window.dispatchEvent(new CustomEvent('rdo:resume-sync',{detail:{now:Date.now()}}))}catch(e){}
  }

  function resume(){
    const n=Date.now();
    // iOS can fire focus/pageshow/visibilitychange together. One recalculation is enough.
    if(n-lastResume<150)return;
    lastResume=n;
    forceFreshRender();
    // Safari sometimes paints its back-forward snapshot before JS gets a turn.
    // Re-render a few frames later so the visible counters cannot remain stale.
    setTimeout(forceFreshRender,60);
    setTimeout(forceFreshRender,300);
    setTimeout(forceFreshRender,1000);
  }

  window.addEventListener('pageshow',resume,{passive:true});
  window.addEventListener('focus',resume,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume()},{passive:true});
  window.addEventListener('storage',e=>{if(e.key===MAIN_KEY)resume()});

  // Small foreground watchdog. The timers themselves are still calculated from
  // absolute Date.now() end-times, not by subtracting one second per tick.
  setInterval(()=>{if(!document.hidden)forceFreshRender()},5000);
  resume();
})();