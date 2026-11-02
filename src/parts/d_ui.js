
// ------------------------------------------------------------------ opponents + tournaments
function makeOpp(band) {
  const lp = settings.roster === 'lowveld' ? makeLowveldPair(band) : null;
  const names = lp ? lp.players.map(p => surname(p[0])) : [...SURNAMES].sort(() => Math.random() - .5).slice(0, 2), kit = lp ? LP_FR[lp.fr][1] : pick(KITS);
  const ratings = [rand(band[0], band[1]), rand(band[0], band[1])];
  const looks = [0, 1].map(i => ({ skin: pick(LOOK.skin), hair: pick(LOOK.hair), hairColor: pick(LOOK.hairColor), shirt: i ? shade(kit, .78) : kit, shorts: pick(['#1b2333', '#0b0b0b', '#f3f6fb']), racket: pick(LOOK.racket), hand: Math.random() < .15 ? 'L' : 'R' }));
  return { name: names.join(' / '), short: names.join(' & '), ratings, styles: [pick(['attacker', 'defender', 'allround']), pick(['attacker', 'defender', 'allround'])],
    looks, nums: [1 + Math.floor(Math.random() * 30), 1 + Math.floor(Math.random() * 30)], kit, rating: Math.round((ratings[0] + ratings[1]) * 50),
    team: lp ? LP_FR[lp.fr][0] : '', full: lp ? lp.players.map(p => p[0]) : null };
}
const ourName = () => (career.name || 'You') + ' + ' + PART[career.partner].short;
function enterTier(id) {
  const t = TIER[id], teams = [{ us: true, name: ourName(), rating: teamRating(career.partner) }];
  for (let i = 1; i < t.size; i++) { const o = makeOpp(t.band); teams.push({ name: o.name, rating: o.rating, opp: o }); }
  const order = teams.map((_, i) => i).sort(() => Math.random() - .5), r0 = [];
  for (let i = 0; i < order.length; i += 2) r0.push({ a: order[i], b: order[i + 1], w: null, score: '' });
  career.tour = { tier: id, teams, rounds: [r0], round: 0, out: false };
  saveCareer(); showBracket();
}
function ourMatch() { const T = career.tour; return T && T.rounds[T.round].find(m => (m.a === 0 || m.b === 0) && m.w === null); }
function simMatch(m, teams) {
  const ra = teams[m.a].rating, rb = teams[m.b].rating, pA = 1 / (1 + Math.exp(-(ra - rb) / 9));
  m.w = Math.random() < pA ? m.a : m.b; const l = Math.floor(Math.random() * 3); m.score = m.w === m.a ? '3–' + l : l + '–3';
}
function advanceTour(won, score) {
  const T = career.tour, m = ourMatch(); if (!m) return null;
  m.w = won ? 0 : (m.a === 0 ? m.b : m.a); m.score = m.a === 0 ? score : score.split('–').reverse().join('–');
  T.rounds[T.round].forEach(x => { if (x.w === null) simMatch(x, T.teams); });
  const rounds = ROUND_NAMES[TIER[T.tier].size];
  if (!won) { T.out = true; return { done: true, place: rounds[T.round] }; }
  if (T.round === rounds.length - 1) return { done: true, place: 'Champion' };
  const winners = T.rounds[T.round].map(x => x.w), next = [];
  for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1], w: null, score: '' });
  T.rounds.push(next); T.round++;
  return { done: false };
}

// ------------------------------------------------------------------ rewards
function finishMatch(forfeit) {
  if (S.ctx && S.ctx.mode === 'challenge') { if (forfeit && CH) { CH.done = false; CH.stars = 0; } return finishChallenge(); }
  $('hud').hidden = true; prompt(''); ring.visible = boxHL.visible = reticle.visible = false;
  const ctx = S.ctx, won = !forfeit && S.matchWinner === 'P', st = S.stats, score = S.gP + '–' + S.gC;
  const t = ctx.mode === 'career' ? TIER[career.tour.tier] : null, mult = t ? t.xp : .5;
  let xp = Math.round((30 + 4 * st.ptsWon + 10 * st.winners + (won ? 50 : 10)) * mult), coins = t && won ? 15 * t.stars : 0;
  let headline = won ? 'Match won' : (forfeit ? 'Retired' : 'Match lost'), eyebrow = ctx.label || 'Quick match', extra = '';
  if (ctx.mode === 'career') {
    const res = advanceTour(won, forfeit ? '0–3' : score);
    if (res && res.done) {
      const place = res.place, prizeShare = { Champion: 1, Final: .4, 'Semi-final': .18, 'Quarter-final': .08 }[place] || 0;
      const prize = Math.round(t.prize * prizeShare); coins += prize;
      xp += Math.round((place === 'Champion' ? 150 : place === 'Final' ? 70 : 25) * t.xp);
      if (place === 'Champion') { career.titles[t.id] = (career.titles[t.id] || 0) + 1; headline = 'Champions!'; eyebrow = t.name; extra = 'You lift the ' + t.name + ' trophy.'; sfx('cheer'); buzz([40, 60, 40, 60, 80]); }
      else extra = 'Knocked out in the ' + place.toLowerCase() + '. Prize money: ' + prize + '.';
      career.lastTour = { tier: t.id, place }; career.tour = null;
    } else if (res) extra = 'Through to the ' + ROUND_NAMES[t.size][career.tour.round].toLowerCase() + '.';
  }
  if (won) career.record.w++; else career.record.l++;
  career.coins += coins; const ups = gainXp(xp);
  saveCareer();
  $('resEyebrow').textContent = eyebrow; $('resTitle').innerHTML = won ? headline.replace(/(won|Champions!)/, '<em>$1</em>') : headline;
  $('resSub').textContent = (forfeit ? 'You retired from the match.' : 'You and ' + PART[ctx.partner].short + ' ' + (won ? 'beat ' : 'lost to ') + ctx.opp.name + ' ' + score + '.') + (extra ? ' ' + extra : '');
  $('resLevel').hidden = !ups; $('resLevel').textContent = 'Level ' + career.level + ' reached · +' + ups * 2 + ' skill points';
  const rows = [['XP', '+' + xp, 'lime'], ['Coins', '+' + coins, 'gold'], ['Your winners', st.winners], ['Your errors', st.errors], ['Smashes', st.smashes],
    ['Bandejas', st.bandejas], ['Víboras', st.viboras], ['Drop shots', st.drops], ['Chiquitas', st.chiquitas], ['Longest rally', st.longest]];
  $('resStats').innerHTML = rows.map(([k, v, c]) => `<div class="stat ${c || ''}"><b>${v}</b><span>${k}</span></div>`).join('');
  $('btnResNext').textContent = ctx.mode === 'career' ? (career.tour ? 'Back to the draw' : 'Championships') : 'Play again';
  $('btnResNext').onclick = () => { if (ctx.mode === 'career') { career.tour ? showBracket() : showChamps(); } else showToss({ ...ctx, opp: makeOpp(diffBand()) }); };
  showScreen('result');
}

function gainXp(xp) { addWeekXp(xp); career.xp += xp; let ups = 0;
  while (career.xp >= xpNeed(career.level) && career.level < 40) { career.xp -= xpNeed(career.level); career.level++; career.sp += 2; ups++; } return ups; }
// ------------------------------------------------------------------ screens
const SCREENS = ['home', 'challenges', 'champs', 'bracketView', 'player', 'partners', 'quick', 'toss', 'pause', 'result', 'training', 'leaders', 'settings', 'feedback'];
function showScreen(id) {
  SCREENS.forEach(s => { $(s).hidden = s !== id; });
  if (id) { S.phase = 'menu'; S.paused = false; $('hud').hidden = true; if (id !== 'pause') crowd(false); }
  document.querySelectorAll('.coins').forEach(el => { if (el.id !== 'homeCoins' && el.id !== 'chalStars') el.textContent = career.coins; });
}
function initials(n) { return (n || 'You').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function renderHome() {
  $('homeName').textContent = career.name || 'You'; const av = $('homeAvatar'); av.textContent = initials(career.name); av.style.background = career.look.shirt;
  $('homeLvl').textContent = `Level ${career.level} · ${career.record.w}–${career.record.l} record · team rating ${teamRating(career.partner)}`;
  $('homeXp').style.width = Math.round(career.xp / xpNeed(career.level) * 100) + '%';
  $('homeCoins').textContent = career.coins;
  $('homeTrophies').innerHTML = TIERS.filter(t => career.titles[t.id]).map(t => `<span class="trophy">${t.name}${career.titles[t.id] > 1 ? ' ×' + career.titles[t.id] : ''}</span>`).join('');
  const T = career.tour; $('champHint').textContent = T ? `In progress: ${TIER[T.tier].name} · ${ROUND_NAMES[TIER[T.tier].size][T.round]}` : 'Win titles from the Lowveld Club Open to the World Padel Finals.';
  $('spBadge').hidden = !career.sp; $('spBadge').textContent = career.sp + ' skill point' + (career.sp > 1 ? 's' : '') + ' to spend';
  $('partnerHint').textContent = `Partner: ${PART[career.partner].name} (${partnerRating(PART[career.partner])})`;
  const done = DRILLS.filter(d => career.drills[d.id]).length; $('trainHint').textContent = done ? `Best scores in ${done} of ${DRILLS.length} drills. Earn XP between tournaments.` : 'Ball-machine drills that earn XP.';
  $('leadHint').textContent = `${careerPoints(career)} ranking points · ${career.week.key === weekKey() ? career.week.xp : 0} XP this week`;
  renderSaveState();
}
function goHome() { showScreen('home'); renderHome(); rebuildMenuScene(); }
function tierState(t) {
  const lv = career.level >= t.minLevel, prev = !t.needs || career.titles[t.needs];
  return { open: lv || (t.needs && career.titles[t.needs]) || !t.needs, why: !t.needs ? '' : `Reach level ${t.minLevel} or win the ${TIER[t.needs].name}` , lv, prev };
}
function showChamps() {
  const T = career.tour;
  $('tierList').innerHTML = TIERS.map(t => { const st = tierState(t), active = T && T.tier === t.id, busy = T && !active;
    const btn = active ? `<button class="btn small" data-tier="${t.id}">Continue</button>` : st.open ? `<button class="btn small" data-tier="${t.id}" ${busy ? 'disabled' : ''}>Enter</button>` : `<button class="btn small ghost" disabled>Locked</button>`;
    return `<div class="tier ${st.open ? '' : 'locked'}"><div><h3>${t.name} <span class="stars">${'★'.repeat(t.stars)}</span></h3>
      <p>${t.size} teams · winner's prize ${t.prize} coins · opponents rated ${Math.round(t.band[0] * 100)}–${Math.round(t.band[1] * 100)}${career.titles[t.id] ? ' · won ×' + career.titles[t.id] : ''}</p>
      ${st.open ? (busy ? '<p>Finish your current championship first.</p>' : '') : `<p>${st.why}</p>`}</div>${btn}</div>`; }).join('');
  showScreen('champs');
}
$('tierList').addEventListener('click', e => { const b = e.target.closest('button[data-tier]'); if (!b || b.disabled) return;
  if (career.tour && career.tour.tier === b.dataset.tier) showBracket(); else enterTier(b.dataset.tier); });
function showBracket() {
  const T = career.tour; if (!T) return showChamps();
  T.teams[0].name = ourName(); T.teams[0].rating = teamRating(career.partner);
  const t = TIER[T.tier], names = ROUND_NAMES[t.size], m = ourMatch();
  $('brTier').textContent = t.name; $('brTitle').textContent = names[T.round];
  const opp = m ? T.teams[m.a === 0 ? m.b : m.a] : null;
  $('brSub').textContent = opp ? `${ourName()} (rated ${T.teams[0].rating}) against ${opp.opp && opp.opp.full ? opp.opp.full.join(' & ') + ' of ' + opp.opp.team : opp.name} (rated ${opp.rating}).` : '';
  let html = '';
  for (let r = 0; r < names.length; r++) {
    const matches = T.rounds[r] || Array.from({ length: t.size / Math.pow(2, r + 1) }, () => null);
    html += `<div class="round"><h4>${names[r]}</h4>` + matches.map(x => { if (!x) return `<div class="match"><div><span class="rating">To be decided</span></div><div><span class="rating">To be decided</span></div></div>`;
      const row = i => { const tm = T.teams[i], cls = [tm.us ? 'us' : '', x.w === null ? '' : x.w === i ? 'won' : 'lost'].join(' ');
        return `<div class="${cls}"><span>${tm.name}</span><span class="rating">${tm.rating}</span></div>`; };
      return `<div class="match ${x === m ? 'next' : ''}">${row(x.a)}${row(x.b)}${x.score ? `<div><span class="rating">Score</span><span>${x.score}</span></div>` : ''}</div>`; }).join('') + `</div>`;
  }
  $('bracket').innerHTML = html; $('btnRetire').textContent = 'Withdraw from this championship'; $('btnRetire').dataset.armed = '';
  showScreen('bracketView');
}
$('btnPlayNext').addEventListener('click', () => { const T = career.tour, m = ourMatch(); if (!m) return;
  const opp = T.teams[m.a === 0 ? m.b : m.a].opp, t = TIER[T.tier];
  showToss({ mode: 'career', partner: career.partner, games: 3, opp, label: t.name + ' · ' + ROUND_NAMES[t.size][T.round] }); });
$('btnRetire').addEventListener('click', e => { const b = e.currentTarget;
  if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to withdraw (no prize money)'; return; }
  career.tour = null; saveCareer(); showChamps(); });
let partnersReturn = 'home';
$('btnPartnerFromBr').addEventListener('click', () => { partnersReturn = 'bracket'; showPartners(); });

// partners
function avatarHTML(look, name) { return `<div class="avatar" style="background:${look.shirt}">${initials(name)}</div>`; }
function showPartners() {
  $('partnerGrid').innerHTML = PARTNERS.map(p => { const owned = career.owned.includes(p.id), sel = career.partner === p.id;
    const bars = [['Speed', p.st.speed], ['Control', p.st.control], ['Reach', p.st.reach], ['Power', p.st.power]]
      .map(([k, v]) => `<span>${k}</span><i><b style="width:${v * 10}%"></b></i><span>${v}</span>`).join('');
    let btn;
    if (sel) btn = `<button class="btn small" disabled>Your partner</button>`;
    else if (owned) btn = `<button class="btn small" data-pick="${p.id}">Play with ${p.short}</button>`;
    else if (career.level < p.lvl) btn = `<button class="btn small ghost" disabled>Reach level ${p.lvl}</button>`;
    else btn = `<button class="btn small" data-buy="${p.id}" ${career.coins < p.cost ? 'disabled' : ''}>Sign for ${p.cost} coins</button>`;
    return `<div class="pcard ${sel ? 'sel' : ''}"><header>${avatarHTML(p.look, p.name)}<div><h3>${p.name}</h3><div class="role">${ROLE[p.style]} · rated ${partnerRating(p)}</div></div></header>
      <div class="mini">${bars}</div><p class="bio">${p.bio}</p>${btn}</div>`; }).join('');
  showScreen('partners');
}
$('partnerGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.buy) { const p = PART[b.dataset.buy]; if (career.coins < p.cost) return; career.coins -= p.cost; career.owned.push(p.id); career.partner = p.id; sfx('cheer', .6); }
  if (b.dataset.pick) career.partner = b.dataset.pick;
  saveCareer(); showPartners(); });
$('partnersBack').addEventListener('click', () => { if (partnersReturn === 'bracket') showBracket(); else goHome(); });

// my player
const ATTR_HINT = Object.fromEntries(ATTRS.map(a => [a[0], a[2]]));
const skillPrice = v => 80 + 40 * v;             // coins for one point when you have no skill points left
const RESET_COST = 50;
function renderSkills() {
  const need = xpNeed(career.level);
  $('plLvl').textContent = career.level; $('plSp').textContent = career.sp; $('plXp').style.width = Math.round(career.xp / need * 100) + '%';
  $('plXpTxt').textContent = `${career.xp} / ${need} XP to level ${career.level + 1}`;
  document.querySelector('.sp-pill').classList.toggle('empty', !career.sp);
  document.querySelectorAll('.coins').forEach(el => { if (el.id !== 'homeCoins' && el.id !== 'chalStars') el.textContent = career.coins; });
  $('attrList').innerHTML = ATTRS.map(([k, lab]) => { const v = career.attrs[k], price = skillPrice(v), max = v >= 10;
    const label = max ? 'MAX' : career.sp ? '+1' : '🪙' + price, can = !max && (career.sp > 0 || career.coins >= price);
    return `<div class="attr"><span class="lab">${lab}</span><div class="meter">${Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</div>
      <span class="val">${v}</span><button class="plus ${career.sp || max ? '' : 'buy'}" data-attr="${k}" aria-label="Raise ${lab}" ${can ? '' : 'disabled'}>${label}</button><span class="hint">${ATTR_HINT[k]}</span></div>`; }).join('');
  const spent = Object.values(career.attrs).reduce((a, v) => a + v - 3, 0);
  $('btnResetSkills').disabled = spent <= 0 || career.coins < RESET_COST;
  $('btnResetSkills').textContent = spent > 0 ? `Reset skills · get ${spent} points back · 🪙${RESET_COST}` : 'Reset skills';
}
$('attrList').addEventListener('click', e => { const b = e.target.closest('button[data-attr]'); if (!b || b.disabled) return;
  const k = b.dataset.attr, v = career.attrs[k], lab = ATTRS.find(a => a[0] === k)[1]; if (v >= 10) return;
  if (career.sp > 0) { career.sp--; $('spMsg').textContent = `${lab} ${v} → ${v + 1}. Used 1 skill point, ${career.sp} left.`; }
  else if (career.coins >= skillPrice(v)) { career.coins -= skillPrice(v); $('spMsg').textContent = `${lab} ${v} → ${v + 1}. Paid ${skillPrice(v)} coins.`; }
  else return;
  career.attrs[k]++; saveCareer(); renderSkills(); previewSwing('fore'); sfx('cheer', .25); });
$('btnResetSkills').addEventListener('click', () => { const spent = Object.values(career.attrs).reduce((a, v) => a + v - 3, 0);
  if (spent <= 0 || career.coins < RESET_COST) return;
  career.coins -= RESET_COST; for (const k of Object.keys(career.attrs)) career.attrs[k] = 3; career.sp += spent;
  $('spMsg').textContent = `Skills reset. You have ${career.sp} skill points to spend again.`; saveCareer(); renderSkills(); });
function renderLook() {
  const L = career.look, sw = (key, list) => `<div class="swatches">${list.map(c => `<button class="sw" data-look="${key}" data-v="${c}" style="background:${c}" aria-label="${key} ${c}" aria-pressed="${L[key] === c}"></button>`).join('')}</div>`;
  $('lookOpts').innerHTML = `
    <label for="inName">Name</label><input id="inName" class="txt" maxlength="14" value="${(career.name || '').replace(/"/g, '&quot;')}">
    <label for="inCountry">Country</label><select id="inCountry" class="txt">${COUNTRIES.map(([c, n]) => `<option value="${c}" ${career.country === c ? 'selected' : ''}>${flag(c)} ${n}</option>`).join('')}</select>
    <label for="inNum">Number</label><input id="inNum" class="txt" type="number" min="1" max="99" value="${career.num}" style="max-width:90px">
    <span class="lab">Plays</span><div class="seg"><button data-look="hand" data-v="R" aria-pressed="${L.hand !== 'L'}">Right-handed</button><button data-look="hand" data-v="L" aria-pressed="${L.hand === 'L'}">Left-handed</button></div>
    <span class="lab">Skin</span>${sw('skin', LOOK.skin)}
    <span class="lab">Hair</span><div class="seg">${LOOK.hair.map(h => `<button data-look="hair" data-v="${h}" aria-pressed="${L.hair === h}">${HAIR_NAMES[h]}</button>`).join('')}</div>
    <span class="lab">Hair colour</span>${sw('hairColor', LOOK.hairColor)}
    <span class="lab">Shirt</span>${sw('shirt', LOOK.shirt)}
    <span class="lab">Shorts</span>${sw('shorts', LOOK.shorts)}
    <span class="lab">Racket</span>${sw('racket', LOOK.racket)}`;
  $('inName').addEventListener('input', e => { career.name = e.target.value.trim().slice(0, 14) || 'You'; saveSoon(); });
  $('inCountry').addEventListener('change', e => { career.country = e.target.value; saveSoon(); });
  $('inNum').addEventListener('change', e => { career.num = clamp(Math.round(+e.target.value || 8), 1, 99); e.target.value = career.num; saveSoon(); rebuildPreview(); });
}
$('lookOpts').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b) return;
  career.look[b.dataset.look] = b.dataset.v; saveSoon(); renderLook(); rebuildPreview(); });
let saveT = 0; function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveCareer, 600); }
function setTab(skills) { $('tabSkills').setAttribute('aria-selected', String(skills)); $('tabLook').setAttribute('aria-selected', String(!skills));
  $('paneSkills').hidden = !skills; $('paneLook').hidden = skills; }
$('tabSkills').addEventListener('click', () => setTab(true)); $('tabLook').addEventListener('click', () => setTab(false));
function showPlayer() { renderSkills(); renderLook(); setTab(true); rebuildPreview(); showScreen('player'); }

// live 3D preview of your player
let pv = null;
function initPreview() {
  try {
    const canvas = $('preview'), r2 = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r2.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r2.setSize(240, 280, false); r2.outputEncoding = THREE.sRGBEncoding;
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xdfe9ff, 0x223, .9)); const d = new THREE.DirectionalLight(0xffffff, .9); d.position.set(2, 4, 3); sc.add(d);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(.9, 40), new THREE.MeshStandardMaterial({ color: 0x1f5fcf, roughness: 1 })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
    const cam = new THREE.PerspectiveCamera(32, 240 / 280, .1, 20); cam.position.set(0, 1.25, 3.7); cam.lookAt(0, .95, 0);
    pv = { r2, sc, cam, model: null, p: { vx: 0, vz: 0, run: 0, swing: 0, swingType: 'fore' }, t: 0, k: 0 };
  } catch (e) { pv = null; }
}
function rebuildPreview() { if (!pv) return; if (pv.model) disposeModel(pv.model); pv.model = makePlayer(career.look, career.num); pv.sc.add(pv.model.g); pv.p.mesh = pv.model; }
function previewSwing(type) { if (pv) { pv.p.swing = .32; pv.p.swingType = type; } }
function drawPreview(dt) {
  if (!pv || !pv.model || $('player').hidden) return;
  pv.t += dt; pv.model.g.rotation.y = .4 + pv.t * .7;           // slow turntable: front and back
  if (pv.t > 2.4) { pv.t = 0; pv.k = (pv.k + 1) % 4; previewSwing(['fore', 'over', 'back', 'serve'][pv.k]); }
  pv.p.swing = Math.max(0, pv.p.swing - dt * .8); animatePlayer(pv.p, dt); pv.r2.render(pv.sc, pv.cam);
}

// quick match + toss
const diffBand = () => ({ easy: [.15, .35], normal: [.42, .62], hard: [.72, .92] })[settings.diff] || [.4, .6];
function showQuick() {
  $('qPartner').innerHTML = career.owned.map(id => `<button data-v="${id}" aria-pressed="${career.partner === id}">${PART[id].short}</button>`).join('');
  showScreen('quick');
}
$('qPartner').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; career.partner = b.dataset.v; saveCareer(); showQuick(); });
$('btnQuickGo').addEventListener('click', () => { audio(); showToss({ mode: 'quick', partner: career.partner, games: settings.games, opp: makeOpp(diffBand()), label: '' }); });
let pendingCtx = null;
function showToss(ctx) {
  pendingCtx = ctx; const won = Math.random() < .5, seg = $('optStart');
  if (!won) settings.start = Math.random() < .5 ? 'serve' : 'receive';
  $('tossTitle').textContent = won ? 'You won the toss' : ctx.opp.short + ' won the toss';
  $('tossText').textContent = won ? 'Choose whether your team serves or receives first, then your side.'
    : 'They chose to ' + (settings.start === 'serve' ? 'receive' : 'serve') + ', so your team starts by ' + (settings.start === 'serve' ? 'serving' : 'receiving') + '. Pick your side.';
  seg.querySelectorAll('button').forEach(b => { b.setAttribute('aria-disabled', String(!won)); b.setAttribute('aria-pressed', String(b.dataset.v === settings.start)); });
  showScreen('toss');
}
$('btnStart').addEventListener('click', () => { audio(); if (pendingCtx) startMatch({ ...pendingCtx, partner: career.partner }); });

// menu scene: your team and a sparring pair on court behind the menus
function rebuildMenuScene() { drillReset(); S.mode = 'match'; buildModels({ partner: career.partner, opp: menuOpp }); for (const p of Object.values(players)) { p.x = p.home[0]; p.z = p.home[1]; } }
const menuOpp = makeOpp([.3, .5]);

// ------------------------------------------------------------------ wiring
for (const seg of document.querySelectorAll('.seg[data-key]')) {
  const key = seg.dataset.key;
  const sync = () => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(settings[key]) === b.dataset.v)));
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
    settings[key] = key === 'games' ? +b.dataset.v : b.dataset.v; if (key !== 'start') store.set(key === 'controls' ? 'controls_v3' : key === 'cam' ? 'cam_v2' : key, b.dataset.v); sync(); if (key === 'side') applySides(); if (key === 'quality') applyQuality(settings.quality === 'auto' ? (mobile ? 'medium' : 'high') : settings.quality); if (key === 'voice' && settings.voice === '1') speak('Fifteen love'); renderSettingsHint(); if (key === 'controls') applyControlsClass(); if (key === 'roster') applyRoster(); if (key === 'court') setCourtColour(settings.court); });
  sync();
}
document.querySelectorAll('[data-go="home"]').forEach(b => b.addEventListener('click', goHome));
$('goChamps').addEventListener('click', () => { audio(); showChamps(); });
$('goQuick').addEventListener('click', () => { audio(); showQuick(); });
$('goPlayer').addEventListener('click', () => { audio(); showPlayer(); });
$('goPartners').addEventListener('click', () => { audio(); partnersReturn = 'home'; showPartners(); });
$('goTraining').addEventListener('click', () => { audio(); showTraining(); });
$('goSettings').addEventListener('click', () => { audio(); showScreen('settings'); });
$('goFeedback').addEventListener('click', () => { audio(); showFeedback(); });
$('pauseReport').addEventListener('click', async () => { $('reportMsg').textContent = 'Sending…'; $('reportMsg').textContent = (await diagSend('manual from pause menu')) ? 'Sent. Thank you, the developer will look at it.' : 'Could not send. Check your internet connection.'; });
if (/[?&]debug/.test(location.search)) $('dbg').hidden = false;
$('pauseFeedback').addEventListener('click', () => { if (S.ctx && S.ctx.mode === 'career') { S.phase = 'done'; finishMatch(true); } showFeedback(); });
function applyControlsClass() { document.body.classList.toggle('stick', settings.controls === 'stick'); document.body.classList.toggle('pro', settings.controls === 'pro'); }
function renderSettingsHint() { $('settingsHint').textContent = [({ pro: 'Console controls', stick: 'Simple swipe controls' })[settings.controls] || 'Classic controls', settings.assist === '1' ? 'aim assist on' : 'aim assist off', 'graphics ' + settings.quality].join(' · '); }
applyControlsClass();
renderSettingsHint();
$('goLeaders').addEventListener('click', () => { audio(); showLeaders(); });
$('btnResHome').addEventListener('click', goHome);
$('btnPause').addEventListener('click', togglePause);
$('btnResume').addEventListener('click', togglePause);
$('btnQuit').addEventListener('click', () => { $('pause').hidden = true; S.paused = false;
  if (S.ctx && S.ctx.mode === 'career') { S.phase = 'done'; finishMatch(true); } else goHome(); });
$('btnFull').addEventListener('click', () => { try { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); } catch (e) {} });
$('btnSound').addEventListener('click', () => { settings.sound = !settings.sound; store.set('sound', settings.sound ? '1' : '0'); $('snWave').style.opacity = settings.sound ? 1 : .15; });
$('snWave').style.opacity = settings.sound ? 1 : .15;
document.addEventListener('visibilitychange', () => { if (document.hidden && inMatch() && !S.paused) togglePause(); });

initPreview(); goHome(); requestAnimationFrame(frame); initCloud(); renderOnlineBits(); onlineInit();

// test hook (state + fast-forward for automated checks)
window.__padel = { camera, startDrill, D: () => D, S, ball, players, get career() { return career; }, settings, input, awardPoint, scoreText, makeOpp, showToss, startMatch, enterTier,
  advance(sec, cb) { for (let t = 0; t < sec; t += 1 / 60) { if (cb) cb(); update(1 / 60, 1 / 60); } },
  setAuto(on) { S.lvl = { ...S.lvl, auto: on }; }, gesture(dx, dy) { input.aim = { x: 0, power: 0, kind: 'auto' }; swingStart(); aimFromSwipeStick(dx, dy); }, swing(aim) { input.aim = aim || { x: 0, power: .3, kind: 'auto' }; swingStart(); },
  flick(dx, dy, ms) { input.aim = aimFromFlick(dx, dy, ms); swingStart(); return input.aim; }, GS: () => GS, me, startMatch, makeOpp: makeOpp };
})();
