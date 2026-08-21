(() => {
  if (document.getElementById('loginPlanButton')) return;

  const style = document.createElement('style');
  style.textContent = `
    .loginBtn{width:100%;margin-top:10px;background:linear-gradient(180deg,#8ff0a8,#63d986);box-shadow:0 8px 20px #0005}
    .loginPlan{display:none;margin-top:10px;border:1px solid #3d7751;background:#0b1c12;border-radius:14px;padding:12px}
    .loginPlan.show{display:block}
    .loginPlan ol{margin:8px 0 0;padding-left:22px}
    .loginPlan li{margin:8px 0;line-height:1.4}
    .loginPlan .planWhy{display:block;color:var(--muted);font-size:11px;margin-top:2px}
  `;
  document.head.appendChild(style);

  const hero = document.querySelector('.hero');
  const nexts = hero && hero.querySelector('.nexts');
  if (!hero || !nexts) return;

  const button = document.createElement('button');
  button.id = 'loginPlanButton';
  button.className = 'loginBtn';
  button.textContent = '🎮 I Just Logged In — Build My Plan';

  const panel = document.createElement('div');
  panel.className = 'loginPlan';
  panel.id = 'loginPlanPanel';
  panel.innerHTML = '<div class="rank">YOUR SESSION PLAN</div><div class="mini" id="loginPlanTime"></div><ol id="loginPlanList"></ol>';

  nexts.insertAdjacentElement('afterend', panel);
  nexts.insertAdjacentElement('afterend', button);

  function buildPlan() {
    if (typeof pull === 'function') pull();
    const plan = [];
    const add = (x, w) => plan.push({x, w});
    const cs = typeof cayoState === 'function' ? cayoState() : 'none';
    const count = Object.values(S.prep || {}).filter(Boolean).length;

    if (S.cayoStage === 'finale') {
      add('Run your Cayo finale first', 'It is already ready, so cash it out before doing filler work.');
    } else if (cs === 'hard') {
      add('Start the next Cayo setup immediately', 'Your Hard Mode setup window is open; protect that window first.');
    } else if (S.cayoStage === 'intel') {
      add('Finish Gather Intel', 'Get the target and best solo loot area scoped before anything else.');
    } else if (S.cayoStage === 'preps' && count < 5) {
      add('Finish the remaining Cayo preps', `${5-count} essential prep${5-count===1?'':'s'} left.`);
    } else if ((cs === 'normal' || cs === 'none') && S.cayoStage === 'ready') {
      add('Start Gather Intel for Cayo', 'Cayo is available and is your strongest large solo payout block.');
    }

    if (typeof bonusLive === 'function' && bonusLive() && S.vipMulti >= 5 && left(S.vipEnd) <= 0) {
      add('Run boosted VIP Work', 'The temporary 5× bonus is live, so use it between Cayo steps.');
    }

    if (left(S.secEnd) <= 0) {
      add('Run a fast Agency Security Contract', 'Good filler that also progresses your Agency safe income.');
    }

    if (cs === 'cool') {
      add('Fill the Cayo cooldown efficiently', `Cayo has ${fmt(left(S.cayoEnd))} left. Alternate VIP Work and Agency jobs instead of waiting.`);
    }

    if (!S.dreWeekly) {
      add('Use Dr. Dre for a longer money block', 'Your first weekly host completion is still open; use it when you want a longer guaranteed session.');
    }

    add('Before logging off: check Cayo again', 'If the cooldown has ended, start the next setup during the Hard Mode window before leaving.');

    const seen = new Set();
    const clean = plan.filter(o => !seen.has(o.x) && seen.add(o.x)).slice(0, 6);
    document.getElementById('loginPlanList').innerHTML = clean.map(o => `<li><b>${o.x}</b><span class="planWhy">${o.w}</span></li>`).join('');
    document.getElementById('loginPlanTime').textContent = 'Built from your saved timers and status at ' + new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
    panel.classList.add('show');
    panel.scrollIntoView({behavior:'smooth', block:'nearest'});
    if (typeof toast === 'function') toast('Session plan updated');
  }

  button.addEventListener('click', buildPlan);
})();
