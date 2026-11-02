
// ------------------------------------------------------------------ training drills (ball machine)
const DRILLS = [
  { id: 'serve', name: 'Serve placement', start: null, zone: 0,
    desc: 'Ten serves, alternating right and left box. Land on the orange target: T, body or wide. 3 points on target, 2 close, 1 in the box.' },
  { id: 'glass', name: 'Back-glass defence', start: [-.6, 6.6], zone: 6.5,
    desc: 'Fast balls into your back corner. Let them bounce and come off the glass, then return deep: 3 points off the glass into the deep zone.' },
  { id: 'bandeja', name: 'Bandeja', start: [-.8, 5.3], zone: 6.5,
    desc: 'Lobs over your head. Hit the high ball for a bandeja (aim wide for a víbora) into the deep zone: 3 points.' },
  { id: 'smash', name: 'Smash', start: [-.6, 3.2], zone: 5,
    desc: 'Short high balls near the net. Hit hard to smash (fast swipe, or SMASH in Console mode). A full smash that kicks back over is por cuatro: 3 points.' },
];
const DRILL = Object.fromEntries(DRILLS.map(d => [d.id, d]));
const BALLS = 10;
let D = null;
// machine, scoring zone and serve target
const machine = new THREE.Group();
{ const body = new THREE.Mesh(new THREE.BoxGeometry(.7, .7, .6), mat('#1b2333', .5, { metalness: .4 })); body.position.y = .45; machine.add(body);
  const hop = new THREE.Mesh(new THREE.CylinderGeometry(.32, .2, .35, 16, 1, true), mat('#d8f23a', .6)); hop.position.y = .95; machine.add(hop);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .5, 12), mat('#2a3a5c', .4)); tube.rotation.x = Math.PI / 2.6; tube.position.set(0, .7, .35); machine.add(tube);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .05, 14), mat('#0b0b0b', .8)); w.rotation.z = Math.PI / 2; w.position.set(sx * .37, .1, 0); machine.add(w); }
  machine.traverse(o => { if (o.isMesh) o.castShadow = true; }); machine.position.set(0, 0, -8.6); machine.visible = false; scene.add(machine); }
const zoneMesh = new THREE.Mesh(new THREE.PlaneGeometry(COURT_X * 2, 1), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: .3, depthWrite: false }));
zoneMesh.rotation.x = -Math.PI / 2; zoneMesh.visible = false; scene.add(zoneMesh);
const target = new THREE.Group();
target.add(new THREE.Mesh(new THREE.RingGeometry(.72, .82, 40), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: .95, depthWrite: false })));
target.add(new THREE.Mesh(new THREE.CircleGeometry(.32, 30), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: .8, depthWrite: false })));
target.rotation.x = -Math.PI / 2; target.position.y = .01; target.visible = false; scene.add(target);
function drillReset() { machine.visible = zoneMesh.visible = target.visible = false; D = null; }

function startDrill(id) {
  const d = DRILL[id];
  S.mode = 'drill'; S.ctx = { mode: 'drill', partner: career.partner, opp: menuOpp, games: 0, label: 'Training · ' + d.name };
  S.lvl = { time: .82, ring: settings.ring === '1', auto: settings.auto === '1' || stick() };
  Object.assign(S, { pP: 0, pC: 0, gP: 0, gC: 0, tie: false, matchWinner: null, paused: false, stats: newStats() });
  applySides(); buildModels(S.ctx);
  for (const [k, p] of Object.entries(players)) if (k !== 'Player') { p.mesh.g.visible = false; p.x = 0; p.z = -30; }
  D = { id, ball: 0, score: 0, results: [], glassHit: false, zone: d.zone };
  machine.visible = id !== 'serve';
  if (d.zone) { zoneMesh.scale.y = COURT_Z - d.zone; zoneMesh.position.set(0, .005, -(d.zone + COURT_Z) / 2); zoneMesh.visible = true; } else zoneMesh.visible = false;
  $('nameP').textContent = 'Ball'; $('nameC').textContent = 'Score'; $('gP').textContent = ''; $('gC').textContent = '';
  $('chipP').style.background = 'var(--ball)'; $('chipC').style.background = 'var(--you)'; $('srvP').classList.remove('on'); $('srvC').classList.remove('on'); $('tbtag').hidden = true;
  $('round').hidden = false; $('round').textContent = 'Training · ' + d.name;
  showScreen(null); $('hud').hidden = false;
  if (d.start) { players.Player.x = d.start[0]; players.Player.z = d.start[1]; }
  nextBall(); setCamera(true); call(d.name, BALLS + ' balls · watch the zone', 2.4);
}
function drillBoard() { $('pP').textContent = Math.min(D.ball, BALLS) + '/' + BALLS; $('pC').textContent = D.score; }
function nextBall() {
  if (D.ball >= BALLS) { S.phase = 'over'; S.wait = 1.2; prompt(''); target.visible = false; return; }
  D.ball++; D.glassHit = false; drillBoard(); input.tap = false;
  if (D.id === 'serve') {
    S.server = 'Player'; S.serveX = D.ball % 2 ? 1 : -1; S.faults = 0;
    const kind = ['T', 'body', 'wide'][(D.ball - 1) % 3], ax = { T: .55, body: 2.5, wide: 4.3 }[kind];
    D.target = { x: -S.serveX * ax, z: -5.9, kind }; target.position.set(D.target.x, .01, D.target.z); target.visible = true;
    placeForServe(); S.phase = 'serveWait';
    prompt('Aim at the ' + kind + ' target · ' + (mobile ? (stick() ? 'tap to bounce, swipe up (left/right aims)' : pro() ? 'steer the target, hold and release SERVE' : 'tap swing') : 'space'));
  } else {
    players.Player.target = DRILL[D.id].start.slice(); S.phase = 'feed'; S.wait = 1.0; prompt('');
  }
}
function launchFeed() {
  Object.assign(ball, { x: rand(-1.5, 1.5), y: 1.0, z: -8.3, out: false, spin: null, spinUsed: true });
  Object.assign(S.rally, { active: true, lastHit: 'C', hitter: 'Machine', bounces: 0, serveState: 0, shots: 0 });
  if (D.id === 'glass') launchTo(rand(-3.2, 3.2), rand(7.5, 8.6), rand(.95, 1.12));
  else if (D.id === 'bandeja') launchTo(rand(-3, 3), rand(7.2, 8.3), rand(1.7, 1.95));
  else launchTo(rand(-2.5, 2.5), rand(4.4, 5.4), rand(1.45, 1.65));
  S.lastKind = 'feed'; sfx('hit', .5); S.phase = 'rally'; trailPts.length = 0; players.Player.target = null; replan();
}
function drillTick(dt, realDt) {
  if (S.phase === 'feed') { S.wait -= dt; if (S.wait <= 0) launchFeed(); }
  else if (S.phase === 'drillWait') { S.wait -= realDt; if (S.wait <= 0) nextBall(); }
}
function endBall(pts, msg) {
  S.rally.active = false; D.score += pts; D.results.push(pts); drillBoard(); ring.visible = boxHL.visible = reticle.visible = false;
  call(msg, pts ? '+' + pts + (pts === 1 ? ' point' : ' points') : 'No points', 1.5);
  if (pts >= 3) { sfx('cheer', .5); buzz([20, 30, 20]); } else if (!pts) sfx('groan', .4);
  S.phase = 'drillWait'; S.wait = 1.3;
}
function drillRules(evs) {
  const r = S.rally;
  for (const e of evs) {
    if (e.t === 'floor') sfx('bounce', clamp(e.imp / 8, .2, 1));
    if (e.t === 'wall') { sfx(e.kind, .8); if (sideOf(ball.z) === 'P') buzz(12); }
    if (!r.active) continue;
    const side = sideOf(ball.z);
    if (D.id === 'serve') {
      if (e.t === 'floor' && side === 'C') {
        if (!inBox(ball)) { endBall(0, 'Fault · outside the box'); continue; }
        const d = Math.hypot(ball.x - D.target.x, ball.z - D.target.z);
        endBall(d < .8 ? 3 : d < 1.6 ? 2 : 1, d < .8 ? 'On target!' : d < 1.6 ? 'Close' : 'In the box');
      } else if (e.t === 'net' || (e.t === 'floor' && side === 'P') || e.t === 'out' || (e.t === 'wall' && side === 'C')) endBall(0, 'Fault');
      continue;
    }
    if (r.lastHit === 'C') {                         // ball from the machine, on its way to you
      if (e.t === 'wall' && side === 'P' && r.bounces > 0) D.glassHit = true;
      if (e.t === 'floor' && side === 'P') { r.bounces++; if (r.bounces >= 2) endBall(0, 'Missed it'); }
      if (e.t === 'out') endBall(0, 'Missed it');
      continue;
    }
    // your return
    if (e.t === 'net' || (e.t === 'floor' && side === 'P')) { endBall(0, 'Into the net'); continue; }
    if (e.t === 'wall' && side === 'C') { endBall(0, 'Out · hit the ' + (e.kind === 'glass' ? 'glass' : 'fence') + ' first'); continue; }
    if (e.t === 'out') { endBall(0, 'Out'); continue; }
    if (e.t === 'floor' && side === 'C') {
      const deep = Math.abs(ball.z) >= D.zone, k = S.lastKind;
      if (D.id === 'glass') endBall(D.glassHit ? (deep ? 3 : 2) : 1, D.glassHit ? (deep ? 'Off the glass, deep!' : 'Off the glass') : 'Returned · let it reach the glass');
      else if (D.id === 'bandeja') endBall(k === 'bandeja' || k === 'vibora' ? (deep ? 3 : 2) : 1, k === 'bandeja' || k === 'vibora' ? (deep ? SHOT_NAMES[k] + ' into the zone!' : SHOT_NAMES[k] + ' · short') : 'In · try a bandeja');
      else endBall(k === 'kick' ? 3 : k === 'smash' ? (deep ? 2 : 1) : 1, k === 'kick' ? 'Por cuatro!' : k === 'smash' ? (deep ? 'Smash into the zone' : 'Smash · short') : 'In · smash it');
    }
  }
}
function finishDrill() {
  $('hud').hidden = true; prompt(''); ring.visible = boxHL.visible = reticle.visible = target.visible = false;
  const d = DRILL[D.id], prev = career.drills[d.id] || 0, best = Math.max(prev, D.score), xp = D.score * 3;
  career.drills[d.id] = best; const ups = gainXp(xp); saveCareer();
  $('resEyebrow').textContent = 'Training · ' + d.name;
  $('resTitle').innerHTML = D.score > prev ? 'New <em>best</em>' : 'Drill done';
  $('resSub').textContent = `${D.score} points from ${BALLS} balls` + (prev ? ` (previous best ${prev}).` : '.');
  $('resLevel').hidden = !ups; $('resLevel').textContent = 'Level ' + career.level + ' reached · +' + ups * 2 + ' skill points';
  const rows = [['Score', D.score + '/' + BALLS * 3, 'lime'], ['XP', '+' + xp, 'lime'], ['Best', best], ['3-point shots', D.results.filter(x => x >= 3).length], ['Balls in', D.results.filter(x => x > 0).length + '/' + BALLS]];
  $('resStats').innerHTML = rows.map(([k, v, c]) => `<div class="stat ${c || ''}"><b>${v}</b><span>${k}</span></div>`).join('');
  $('btnResNext').textContent = 'Go again'; const id = d.id; $('btnResNext').onclick = () => startDrill(id);
  showScreen('result');
}
function showTraining() {
  $('drillList').innerHTML = DRILLS.map(d => `<div class="tier"><div><h3>${d.name}</h3><p>${d.desc}</p></div>
    <div style="display:grid;gap:8px;justify-items:end"><div class="best">${career.drills[d.id] || '–'}<small>Best of ${BALLS * 3}</small></div><button class="btn small" data-drill="${d.id}">Start</button></div></div>`).join('');
  showScreen('training');
}
$('drillList').addEventListener('click', e => { const b = e.target.closest('button[data-drill]'); if (b) { audio(); startDrill(b.dataset.drill); } });

// ------------------------------------------------------------------ friends leaderboard
let lbTab = 'week', lbRows = null;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function myRow() { return { id: online.id || cloud.uid || 'me', name: career.name || 'Player', country: career.country || '', shirt: career.look.shirt, level: career.level, titles: career.titles, w: career.record.w, l: career.record.l,
  pts: careerPoints(career), weekKey: career.week.key, weekXp: career.week.xp, partner: PART[career.partner].short, me: true }; }
function renderLeaders() {
  const wk = weekKey(), mine = myRow();
  let rows = (lbRows || []).filter(r => r.id !== mine.id).concat([mine]);
  if (lbTab === 'country') rows = rows.filter(r => r.me || (career.country && r.country === career.country));
  rows = lbTab === 'week' ? rows.filter(r => r.me || (r.weekKey === wk && r.weekXp > 0)).sort((a, b) => ((b.weekKey === wk ? b.weekXp : 0) - (a.weekKey === wk ? a.weekXp : 0)))
                          : rows.sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const head = `<tr><th>#</th><th>Player</th><th class="num">Level</th><th class="num">Titles</th><th class="num">W–L</th><th class="num">${lbTab === 'week' ? 'XP this week' : 'Points'}</th></tr>`;
  rows = rows.slice(0, 100);
  $('lbTable').innerHTML = head + rows.map((r, i) => { const t = Object.values(r.titles || {}).reduce((a, b) => a + (+b || 0), 0);
    return `<tr class="${r.me ? 'me' : ''}"><td class="rank">${i + 1}</td><td><span class="dot" style="background:${/^#[0-9a-f]{6}$/i.test(r.shirt) ? r.shirt : '#93a3c2'}"></span>${flag(r.country)} ${esc(r.name)}${r.me ? ' (you)' : ''}<br><span class="rating">with ${esc(r.partner || '')}</span></td>
      <td class="num">${+r.level || 1}</td><td class="num">${t}</td><td class="num">${+r.w || 0}–${+r.l || 0}</td><td class="num"><b>${lbTab === 'week' ? (r.weekKey === wk ? +r.weekXp || 0 : 0) : +r.pts || 0}</b></td></tr>`; }).join('');
  $('lbNote').textContent = online.on ? (lbRows === null ? 'Loading the world ranking…' : lbTab === 'country' && !career.country ? 'Set your country in My player → Look to see your national ranking.'
      : `World ranking of everyone playing PlayPadel. Week ${wk.split('-W')[1]}: XP since Monday. All time: titles, level and wins.`)
    : !cloud.db ? 'Only you are shown here. The shared board works when the game is opened in Claude; share it from its Share menu so friends can join.'
    : cloud.lbDenied ? 'You can see the board, but your own row could not be saved. Ask the owner for "can use" access.'
    : lbRows === null ? 'Loading the board…' : `Week ${wk.split('-W')[1]}: XP from matches and training since Monday. All time: titles, level and wins. Everyone the game is shared with appears after their first match.`;
}
async function loadLeaders() {
  if (online.on) { try { lbRows = await loadOnlineLeaders(); } catch (e) { lbRows = lbRows || []; $('lbNote').textContent = 'Could not reach the online ranking. Check your connection.'; return; } return renderLeaders(); }
  if (!cloud.db) { lbRows = []; return renderLeaders(); }
  try { const snap = await Promise.race([cloud.db.collection('leaderboard').get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
    lbRows = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...(d.data() || {}) })); }
  catch (e) { lbRows = lbRows || []; }
  renderLeaders();
}
function setLbTab(t) { lbTab = t; [['lbWeek', 'week'], ['lbAll', 'all'], ['lbCountry', 'country']].forEach(([id, v]) => $(id).setAttribute('aria-selected', String(t === v))); renderLeaders(); }
$('lbWeek').addEventListener('click', () => setLbTab('week')); $('lbAll').addEventListener('click', () => setLbTab('all')); $('lbCountry').addEventListener('click', () => setLbTab('country'));
function showLeaders() { pushLeaderboard(); renderLeaders(); showScreen('leaders'); loadLeaders(); }
