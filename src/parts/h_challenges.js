
// ------------------------------------------------------------------ challenges (Stick Cricket style): one goal, 1–3 stars, tiers unlock with stars
const CHALLENGES = [
  { id: 'first', tier: 1, name: 'First blood', desc: 'Win 3 points before your opponents win 3.', goal: { type: 'points', n: 3, fail: 3 }, band: [.15, .35] },
  { id: 'ace', tier: 1, name: 'Serve it out', desc: 'Win a point straight off your serve: an ace, or a return they miss. You serve every point, 8 serves.', goal: { type: 'ace', n: 1 }, limit: 8, setup: { server: 'Player', always: true }, band: [.15, .35] },
  { id: 'drop', tier: 1, name: 'Drop shot artist', desc: 'Win 2 points with a drop shot (short, soft swipe): a winner, or they miss it. 10 points.', goal: { type: 'kind', kinds: ['drop', 'chiquita'], n: 2 }, limit: 10, band: [.15, .4] },
  { id: 'lob', tier: 1, name: 'Over the top', desc: 'Win a point with a lob over the net players (swipe down): a winner, or they miss it. 12 points.', goal: { type: 'kind', kinds: ['lob'], n: 1 }, limit: 12, band: [.15, .4] },
  { id: 'hold', tier: 1, name: 'Hold your serve', desc: 'Win your own service game.', goal: { type: 'game', serving: true }, setup: { server: 'Player' }, band: [.2, .45] },
  { id: 'vibora', tier: 2, name: 'Víbora venom', desc: 'Win 2 points with a víbora (angled swipe on a high ball). 14 points.', goal: { type: 'kind', kinds: ['vibora'], n: 2 }, limit: 14, band: [.3, .55] },
  { id: 'bandeja', tier: 2, name: 'Bandeja wall', desc: 'Win 3 points with a bandeja (straight swipe on a high ball). 15 points.', goal: { type: 'kind', kinds: ['bandeja'], n: 3 }, limit: 15, band: [.3, .55] },
  { id: 'break', tier: 2, name: 'Break of serve', desc: 'Win a game while the opponents are serving.', goal: { type: 'game', serving: false }, setup: { server: 'C' }, band: [.35, .6] },
  { id: 'comeback', tier: 2, name: 'From 0–40', desc: 'You are serving at 0–40. Win the game.', goal: { type: 'game', serving: true }, setup: { server: 'Player', pC: 3 }, band: [.3, .55] },
  { id: 'cuatro', tier: 2, name: 'Por cuatro', desc: 'Win a point with a smash that bounces out of the court (Overhead 4+, or a super smash). 16 points.', goal: { type: 'reason', re: 'cuatro|bounced back over', n: 1 }, limit: 16, band: [.3, .55] },
  { id: 'love', tier: 3, name: 'Flawless', desc: 'Win a game to love (4–0). You have 3 games.', goal: { type: 'love' }, limitGames: 3, band: [.5, .75] },
  { id: 'super', tier: 3, name: 'Super show', desc: 'Win 2 points with super shots (hard flick when SUPER is full). Starts with a full bar. 20 points.', goal: { type: 'kind', kinds: ['superdrive', 'supersmash'], n: 2 }, limit: 20, setup: { energy: 1 }, band: [.5, .75] },
  { id: 'tiebreak', tier: 3, name: 'Tie-break clutch', desc: 'Tie-break at 6–6 and you are 3–5 down. Win it.', goal: { type: 'set' }, games: 6, setup: { tie: true, gP: 6, gC: 6, pP: 3, pC: 5 }, band: [.55, .8] },
  { id: 'saveset', tier: 3, name: 'Save the set', desc: 'You are 3–5 down in the set. Win it.', goal: { type: 'set' }, games: 6, setup: { gP: 3, gC: 5 }, band: [.55, .8] },
  { id: 'giant', tier: 3, name: 'Giant killer', desc: 'Beat a World Finals pair, first to 3 games.', goal: { type: 'set' }, games: 3, band: [.82, .95] },
];
const CH_UNLOCK = { 1: 0, 2: 8, 3: 18 }, CH_TIER = { 1: 'Club', 2: 'Pro', 3: 'Legend' };
const chStars = () => Object.values(career.challenges || {}).reduce((a, b) => a + b, 0);
let CH = null;
function startChallenge(id) {
  const d = CHALLENGES.find(c => c.id === id); if (!d) return;
  CH = { d, pts: 0, won: 0, lost: 0, count: 0, games: 0, gameLost: 0, done: null, stars: 0 };
  const opp = makeOpp(d.band || [.2, .5]);
  startMatch({ mode: 'challenge', id, partner: career.partner, games: d.games || 6, opp, label: 'Challenge · ' + d.name });
  const su = d.setup || {};
  Object.assign(S, { pP: su.pP || 0, pC: su.pC || 0, gP: su.gP || 0, gC: su.gC || 0, tie: !!su.tie });
  if (su.server) S.serverIdx = su.server === 'Player' ? S.order.indexOf('Player') : S.order.findIndex(k => players[k].team === 'C');
  if (su.energy) S.energy = 1;
  newPoint(); renderBoard(); chBanner(); $('chal').hidden = false;
  call(d.name, d.desc, 3.2);
}
function chBanner() {
  if (!CH) return; const g = CH.d.goal, left = CH.d.limit ? ` · ${CH.d.limit - CH.pts} points left` : '';
  const txt = g.type === 'points' ? `Points ${CH.won}/${g.n} · they have ${CH.lost}/${g.fail}`
    : g.type === 'ace' ? `Serve winners ${CH.count}/${g.n}${left}` : g.type === 'kind' || g.type === 'reason' ? `${CH.d.name}: ${CH.count}/${g.n}${left}`
    : g.type === 'game' ? (g.serving ? 'Hold your serve' : 'Break their serve') : g.type === 'love' ? `Win a game to love · game ${CH.games + 1} of ${CH.d.limitGames}` : 'Win the set';
  $('chal').textContent = '🎯 ' + txt;
}
// called after every point while a challenge runs
function challengeAfterPoint(o, r, srvTeam, servedBy, gBefore) {
  if (!CH || CH.done !== null) return; const g = CH.d.goal; CH.pts++;
  if (o.winner === 'P') CH.won++; else { CH.lost++; CH.gameLost++; }
  const gameEnded = S.gP + S.gC !== gBefore[0] + gBefore[1] || S.matchWinner, gameWonByUs = S.gP > gBefore[0] || S.matchWinner === 'P';
  const ourKind = o.winner !== 'P' ? null : r.hitter === 'Player' && r.lastHit === 'P' ? S.lastKind      // clean winner
    : r.lastHit === 'C' && S.prevShot && S.prevShot.who === 'Player' ? S.prevShot.kind : null;                // they missed your shot
  if (g.type === 'points') { if (CH.won >= g.n) CH.done = true; else if (CH.lost >= g.fail) CH.done = false; }
  else if (g.type === 'ace') { if (o.winner === 'P' && servedBy === 'Player' && (/Ace/.test(o.reason) || (r.shots <= 1 && r.lastHit === 'C'))) CH.count++; }
  else if (g.type === 'kind') { if (ourKind && g.kinds.includes(ourKind)) CH.count++; }
  else if (g.type === 'reason') { if (o.winner === 'P' && new RegExp(g.re, 'i').test(o.reason)) CH.count++; }
  else if (g.type === 'game') { if (gameEnded) CH.done = gameWonByUs && (srvTeam === 'P') === g.serving; }
  else if (g.type === 'love') { if (gameEnded) { CH.games++; if (gameWonByUs && CH.gameLost === 0) CH.done = true; else if (CH.games >= CH.d.limitGames) CH.done = false; CH.gameLost = 0; } }
  else if (g.type === 'set') { if (S.matchWinner) CH.done = S.matchWinner === 'P'; }
  if (CH.done === null && g.n && CH.count >= g.n) CH.done = true;
  if (CH.done === null && CH.d.limit && CH.pts >= CH.d.limit) CH.done = false;
  if (CH.done === null && S.matchWinner) CH.done = false;
  if (CH.done === null && CH.d.setup && CH.d.setup.always) S.serverIdx = S.order.indexOf('Player');      // you keep serving
  if (CH.done !== null) {
    const ratio = CH.d.limit ? CH.pts / CH.d.limit : 0;
    CH.stars = !CH.done ? 0 : g.type === 'points' ? (CH.lost === 0 ? 3 : CH.lost === 1 ? 2 : 1)
      : g.type === 'ace' ? (CH.pts <= 2 ? 3 : CH.pts <= 5 ? 2 : 1) : g.type === 'love' ? 4 - CH.games
      : g.type === 'game' || g.type === 'set' ? (CH.lost <= Math.max(1, CH.won * .3) ? 3 : CH.lost <= CH.won * .7 ? 2 : 1)
      : (ratio <= .5 ? 3 : ratio <= .8 ? 2 : 1);
    CH.stars = clamp(CH.stars, 0, 3); S.matchWinner = S.matchWinner || 'X';
  }
  chBanner();
}
function finishChallenge() {
  $('hud').hidden = true; $('chal').hidden = true; prompt(''); ring.visible = boxHL.visible = reticle.visible = false;
  const d = CH.d, prev = (career.challenges || {})[d.id] || 0, gain = Math.max(0, CH.stars - prev);
  career.challenges = career.challenges || {}; if (CH.stars > prev) career.challenges[d.id] = CH.stars;
  const coins = gain * 30, xp = 20 + gain * 25 + (CH.done ? 15 : 0); career.coins += coins; const ups = gainXp(xp); saveCareer();
  $('resEyebrow').textContent = 'Challenge · ' + CH_TIER[d.tier];
  $('resTitle').innerHTML = CH.done ? `<em>${'★'.repeat(CH.stars)}</em>${'☆'.repeat(3 - CH.stars)}` : 'Not this time';
  $('resSub').textContent = d.name + ': ' + (CH.done ? 'challenge complete.' : 'challenge failed. ' + d.desc) + (gain ? ` New best: ${CH.stars} stars.` : '');
  $('resLevel').hidden = !ups; $('resLevel').textContent = 'Level ' + career.level + ' reached · +' + ups * 2 + ' skill points';
  const rows = [['XP', '+' + xp, 'lime'], ['Coins', '+' + coins, 'gold'], ['Points played', CH.pts], ['Won', CH.won], ['Lost', CH.lost], ['Total stars', chStars() + ' / ' + CHALLENGES.length * 3]];
  $('resStats').innerHTML = rows.map(([k, v, c]) => `<div class="stat ${c || ''}"><b>${v}</b><span>${k}</span></div>`).join('');
  $('btnResNext').textContent = CH.done && CH.stars === 3 ? 'Next challenge' : 'Try again';
  const id = d.id, idx = CHALLENGES.findIndex(c => c.id === id), next = CHALLENGES[idx + 1], perfect = CH.done && CH.stars === 3;
  $('btnResNext').onclick = () => { if (perfect && next && chStars() >= CH_UNLOCK[next.tier]) startChallenge(next.id); else startChallenge(id); };
  if (CH.done) { sfx('cheer'); buzz([30, 50, 30]); }
  CH = null; showScreen('result');
}
function showChallenges() {
  const have = chStars(); let html = '';
  for (const t of [1, 2, 3]) { const locked = have < CH_UNLOCK[t];
    html += `<h3 class="eyebrow" style="margin:6px 0 0">${CH_TIER[t]} ${locked ? `· 🔒 needs ${CH_UNLOCK[t]} ★` : ''}</h3>`;
    html += CHALLENGES.filter(c => c.tier === t).map(c => { const st = (career.challenges || {})[c.id] || 0;
      return `<div class="tier ${locked ? 'locked' : ''}"><div><h3>${c.name}</h3><p>${c.desc}</p></div><div style="display:grid;gap:8px;justify-items:end"><div class="stars" style="font-size:20px">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div>
        <button class="btn small" data-chal="${c.id}" ${locked ? 'disabled' : ''}>${st ? 'Replay' : 'Play'}</button></div></div>`; }).join(''); }
  $('chalList').innerHTML = html; showScreen('challenges'); $('chalStars').textContent = have + ' / ' + CHALLENGES.length * 3 + ' ★';
}
$('chalList').addEventListener('click', e => { const b = e.target.closest('button[data-chal]'); if (b && !b.disabled) { audio(); startChallenge(b.dataset.chal); } });
$('goChallenges').addEventListener('click', () => { audio(); showChallenges(); });
