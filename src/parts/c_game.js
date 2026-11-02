
// ------------------------------------------------------------------ match state
const players = {
  Player:      { team: 'P', home: [-2.3, 8.4], human: true },
  Partner:     { team: 'P', home: [ 2.3, 8.4] },
  'CPU Left':  { team: 'C', home: [-2.3, -8.4], zone: [-9, 0] },
  'CPU Right': { team: 'C', home: [ 2.3, -8.4], zone: [0, 9] },
};
for (const p of Object.values(players)) Object.assign(p, { x: p.home[0], z: p.home[1], vx: 0, vz: 0, swing: 0, swingType: 'fore', cool: 0, target: null, run: 0, mesh: null,
  ai: { speed: 4.8, err: .12, reach: 1, power: 1, style: 'allround' } });
const ball = { x: 0, y: 1, z: 5, vx: 0, vy: 0, vz: 0, out: false, spin: null, spinUsed: true };
const S = {
  mode: 'match', phase: 'menu', lvl: { time: .82, ring: true, auto: false },
  pP: 0, pC: 0, gP: 0, gC: 0, tie: false, serverIdx: 0, server: 'Player', serveX: 1, faults: 0, games: 3,
  rally: { active: false, lastHit: 'P', hitter: null, bounces: 0, serveState: 0, shots: 0 },
  wait: 0, callT: 0, outcome: null, matchWinner: null, paused: false,
  stats: null, order: ['Player', 'CPU Right', 'Partner', 'CPU Left'], serveAim: { x: 0, z: -5 }, lastKind: 'drive', ctx: null,
  simT: 0, slowmo: 0, hitstop: 0, shake: 0, hc: null, humanAims: [],
};
const newStats = () => ({ winners: 0, errors: 0, aces: 0, longest: 0, yourShots: 0, smashes: 0, bandejas: 0, drops: 0, viboras: 0, chiquitas: 0, ptsWon: 0, ptsLost: 0 });
S.stats = newStats();
function applySides() {
  const s = settings.side === 'right' ? 1 : -1;
  Object.assign(players.Player, { home: [s * 2.3, 8.4], sideSign: s });
  Object.assign(players.Partner, { home: [-s * 2.3, 8.4], sideSign: -s });
}
applySides();
// your attributes → physical numbers
function me() { const a = career.attrs; return {
  move: 5.1 + a.speed * .27, reach: 1.06 + a.reach * .055, drive: 11 + a.power * .35, powerDrive: 14 + a.power * .45,
  scatter: .95 - a.control * .07, serveSpeed: 9 + a.serve * .45, serveScatter: .8 - a.serve * .06, smash: 17 + a.smash * .8, kick: a.smash >= 4 }; }
function buildModels(ctx) {
  const looks = { Player: { look: career.look, num: career.num, marker: 0xff8a3d }, Partner: { look: PART[ctx.partner].look, num: PART[ctx.partner].look.num },
    'CPU Left': { look: ctx.opp.looks[0], num: ctx.opp.nums[0] }, 'CPU Right': { look: ctx.opp.looks[1], num: ctx.opp.nums[1] } };
  for (const [k, p] of Object.entries(players)) { disposeModel(p.mesh); const L = looks[k];
    p.mesh = makePlayer(L.look, L.num, L.marker); p.mesh.g.rotation.y = p.team === 'P' ? Math.PI : 0; scene.add(p.mesh.g);
    if (k === 'Player') { const a = new THREE.Mesh(new THREE.ConeGeometry(.16, .3, 4), new THREE.MeshBasicMaterial({ color: 0xff8a3d })); a.rotation.x = Math.PI; a.position.y = 2.35; p.mesh.g.add(a); p.mesh.J.youArrow = a; } }
}
function configureAI(ctx) {
  const pa = PART[ctx.partner], st = pa.st;
  players.Partner.ai = { speed: 4.1 + st.speed * .2, err: clamp(.17 - st.control * .012, .04, .2), reach: .9 + st.reach * .03, power: .9 + st.power * .03, style: pa.style, react: clamp(.24 - st.speed * .015, .08, .22) };
  for (const [i, k] of [[0, 'CPU Left'], [1, 'CPU Right']]) { const r = ctx.opp.ratings[i];
    players[k].ai = { speed: 3.9 + r * 2.1, err: clamp(.21 - r * .14, .05, .22), reach: .92 + r * .18, power: .9 + r * .25, style: ctx.opp.styles[i], react: clamp(.3 - r * .2, .1, .3) }; }
  S.humanAims = [];
}

// ------------------------------------------------------------------ ball physics (pure)
function glassE(b) { return b.spin === 'slice' || b.spin === 'drop' ? .45 : b.spin === 'vibora' ? .5 : b.spin === 'kick' ? .9 : .6; }
function stepBall(b, dt, evs) {
  const pz = b.z;
  b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (pz * b.z <= 0 && pz !== b.z && Math.abs(b.x) <= COURT_X + .1) {
    if (b.y < NET_H) { b.z = Math.sign(pz) * .06; b.vz *= -.18; b.vx *= .3; b.vy = Math.min(b.vy, 0); evs && evs.push({ t: 'net' }); }
    else evs && evs.push({ t: 'cross' });
  }
  if (b.y < R) { b.y = R; if (b.vy < 0) { const imp = -b.vy; let e = .72, h = .84;
    if (b.spin && !b.spinUsed) {
      if (b.spin === 'slice') { e = .46; h = .66; } else if (b.spin === 'drop') { e = .34; h = .42; }
      else if (b.spin === 'kick') { e = 1.04; h = .95; } else if (b.spin === 'top') { e = .8; h = .9; }
      else if (b.spin === 'vibora') { e = .5; h = .8; b.vx += Math.sign(b.vx || 1) * 2.4; }   // sidespin kicks it towards the side glass
      else if (b.spin === 'chiq') { e = .55; h = .75; }
      b.spinUsed = true; }
    b.vy = imp * e; b.vx *= h; b.vz *= h; if (b.vy < .35) b.vy = 0; evs && evs.push({ t: 'floor', imp }); } }
  if (!b.out) {
    if (Math.abs(b.x) > COURT_X - R && Math.abs(b.z) < COURT_Z) {
      if (b.y < SIDE_H) { const glass = Math.abs(b.z) > SIDE_GLASS_Z; b.x = Math.sign(b.x) * (COURT_X - R);
        b.vx *= glass ? -glassE(b) : -.3; if (!glass) { b.vz *= .6; b.vy *= .6; b.vz += rand(-.6, .6); } else { b.vz *= .92; }
        evs && evs.push({ t: 'wall', kind: glass ? 'glass' : 'mesh' });
      } else if (Math.abs(b.x) > COURT_X + .2) { b.out = true; evs && evs.push({ t: 'out' }); }
    }
    if (Math.abs(b.z) > COURT_Z - R && Math.abs(b.x) < COURT_X) {
      if (b.y < BACK_H) { const glass = b.y < BACK_GLASS_H; b.z = Math.sign(b.z) * (COURT_Z - R);
        b.vz *= glass ? -glassE(b) : -.3; if (!glass) { b.vx += rand(-.6, .6); b.vy *= .5; }
        evs && evs.push({ t: 'wall', kind: glass ? 'glass' : 'mesh' });
      } else if (Math.abs(b.z) > COURT_Z + .2) { b.out = true; evs && evs.push({ t: 'out' }); }
    }
  }
}
function predict(maxT = 2.6, dt = 1 / 60) {
  const b = { ...ball }; const pts = []; let bounced = 0, firstBounce = null;
  for (let t = 0; t < maxT; t += dt) { const evs = []; stepBall(b, dt, evs);
    for (const e of evs) if (e.t === 'floor') { bounced++; if (!firstBounce) firstBounce = { x: b.x, z: b.z, t }; }
    pts.push({ x: b.x, y: b.y, z: b.z, t, bounced }); if (bounced >= 2) break; }
  return { pts, firstBounce };
}

// ------------------------------------------------------------------ shots
function launchTo(tx, tz, T, netErr) {
  const from = { x: ball.x, y: ball.y, z: ball.z };
  for (let i = 0; i < 8; i++) {
    const vx = (tx - from.x) / T, vz = (tz - from.z) / T, vy = (R - from.y + .5 * G * T * T) / T;
    const tn = vz !== 0 ? -from.z / vz : -1;
    const yn = tn > 0 && tn < T ? from.y + vy * tn - .5 * G * tn * tn : 9;
    if (yn > NET_H + .22 || i === 7) { ball.vx = vx; ball.vy = vy; ball.vz = vz; break; }
    T *= 1.12;
  }
  if (netErr) ball.vy *= .45;
}
const SHOT_NAMES = { drive: '', power: 'Power drive', lob: 'Lob', drop: 'Drop shot', bandeja: 'Bandeja', smash: 'Smash', kick: 'Smash por cuatro', vibora: 'Víbora', chiquita: 'Chiquita', superdrive: 'SUPER ROCKET', supersmash: 'SUPER SMASH' };
const QUAL_NAMES = { perfect: 'Perfect', early: 'Early', late: 'Late' };
function shotTag(kind, team, q) {
  const parts = [q && QUAL_NAMES[q], SHOT_NAMES[kind]].filter(Boolean); if (!parts.length) return; const el = $('shotTag'); el.textContent = parts.join(' · ');
  el.style.color = q === 'perfect' ? 'var(--ball)' : q === 'early' || q === 'late' ? '#ffb347' : team === 'P' ? 'var(--you)' : 'var(--cpu)'; el.classList.add('show'); clearTimeout(shotTag.t); shotTag.t = setTimeout(() => el.classList.remove('show'), 650);
}
function swingTypeFor(p) {
  if (ball.y > 1.6) return 'over';
  let rightSide = p.team === 'P' ? ball.x > p.x : ball.x < p.x;   // right-handed: forehand on the right
  if (p.mesh && p.mesh.lefty) rightSide = !rightSide;              // left-handed: forehand on the left
  return rightSide || Math.abs(ball.x - p.x) < .15 ? 'fore' : 'back';
}
function shot(who, aim) {
  const p = players[who], team = p.team, dir = team === 'P' ? -1 : 1;
  S.prevShot = { who: S.rally.hitter, kind: S.lastKind };          // the shot before this one (forced errors)
  const r = S.rally; r.lastHit = team; r.hitter = who; r.bounces = 0; r.serveState = 0; r.shots++; p.cy = ball.y;   // contact height drives the arm pose
  if (!(p.swing > 0) || p.swing > .17) { if (!(p.swing > 0)) p.swingType = swingTypeFor(p); p.swing = .17; }   // racket meets the ball at the moment of contact p.cool = .35; p.prep = null;
  const Q = p.human ? (aim.quality || 'good') : 'good';
  { const dx = ball.x - p.x, dz = ball.z - p.z, reach = p.human ? reachNow() : p.ai.reach; if (Math.hypot(dx, dz) > reach * .72) { p.lunge = .35; p.lungeDir = Math.sign(p.team === 'P' ? -dx : dx) || 1; } }
  for (const q of Object.values(players)) if (q.team !== team) { q.split = .24; if (!q.human) q.react = q.ai.react || .15; }
  const az = Math.abs(ball.z), overhead = ball.y > 1.6, nearNet = az < 5.2, M = me(), A = p.ai;
  const opp = Object.values(players).filter(q => q.team !== team);
  let kind;
  if (p.human) {
    if (aim.kind === 'pro' && aim.shot === 'super') kind = overhead ? 'supersmash' : 'superdrive';
    else if (aim.kind === 'pro') kind = aim.shot === 'lob' ? 'lob'
      : aim.shot === 'drop' ? (overhead ? 'bandeja' : Math.abs(p.z) < 5.5 ? 'drop' : 'chiquita')
      : aim.shot === 'smash' ? (overhead ? (az < 7.8 ? 'smash' : 'vibora') : 'power')
      : overhead ? (Math.abs(aim.x) > .6 ? 'vibora' : 'bandeja') : aim.power > .6 ? 'power' : 'drive';
    else if (aim.kind === 'lob') kind = 'lob';
    else if (aim.kind === 'tap') kind = overhead ? 'bandeja' : 'drive';
    else if (aim.kind === 'flick') kind = overhead ? (Math.abs(aim.x) > .5 ? 'vibora' : aim.power >= .72 && az < 7.8 ? 'smash' : 'bandeja')   // high ball: angled = víbora, straight hard = smash, straight = bandeja
      : aim.touch ? (Math.abs(p.z) < 5.5 ? 'drop' : 'chiquita') : aim.power >= .72 ? 'power' : 'drive';
    else if (aim.kind === 'side') kind = overhead ? 'vibora' : Math.abs(p.z) < 5.5 ? 'drop' : 'chiquita';
    else if (aim.kind === 'drop') kind = Math.abs(p.z) > 5.5 && !overhead ? 'chiquita' : 'drop';   // from the back a soft ball is a chiquita
    else if (overhead) kind = aim.power > .45 && az < 7.8 ? 'smash' : Math.abs(aim.x) > .55 ? 'vibora' : 'bandeja';
    else kind = aim.power > .55 ? 'power' : 'drive';
  } else {
    const oppAtNet = opp.some(q => Math.abs(q.z) < 5.5), oppDeep = opp.every(q => Math.abs(q.z) > 7);
    const atk = A.style === 'attacker' ? 1.35 : A.style === 'defender' ? .6 : 1, def = A.style === 'defender' ? 1.5 : 1;
    if (overhead) { const r = Math.random();
      kind = nearNet && ball.y > 2 && r < .5 * atk ? 'smash' : r < .5 + .2 * atk ? (Math.random() < .35 * atk ? 'vibora' : 'bandeja') : r < .9 ? 'bandeja' : 'lob'; }
    else if (oppDeep && nearNet && Math.random() < .28 * atk) kind = 'drop';
    else if (oppAtNet && Math.abs(p.z) > 6 && Math.random() < .22 * def) kind = 'chiquita';
    else if (Math.random() < (oppAtNet ? .3 : .08) * def) kind = 'lob';
    else kind = Math.random() < .2 * atk ? 'power' : 'drive';
  }
  let tx;
  const gapL = Math.min(...opp.map(q => Math.abs(q.x + 3))), gapR = Math.min(...opp.map(q => Math.abs(q.x - 3)));
  if (p.human) { const sc = Q === 'perfect' ? .15 : Q === 'good' ? .6 : 1;
    if (aim.kind === 'pro') tx = Math.abs(aim.x) > .25 ? aim.x * 4.3 : settings.assist === '1' ? (gapL > gapR ? -1 : 1) * rand(1.6, 3.4) : rand(-1.2, 1.2);   // left stick aims
    else if (stick() && aim.kind === 'flick') tx = aim.x * 4.3;                         // you aim with the flick
    else if (stick() && aim.kind === 'tap') tx = settings.assist === '1' ? (gapL > gapR ? -1 : 1) * rand(1.6, 3.2) : rand(-1.2, 1.2);
    else tx = settings.assist === '1' && Math.abs(aim.x) < .2 ? (gapL > gapR ? -1 : 1) * rand(1.8, 3.6) : aim.x * 4.2;   // aim assist picks the open side
    tx += rand(-M.scatter, M.scatter) * sc; }
  else { const gapL = Math.min(...opp.map(q => Math.abs(q.x + 3))), gapR = Math.min(...opp.map(q => Math.abs(q.x - 3)));
         tx = (gapL > gapR ? -1 : 1) * rand(1.5, 4.2) + rand(-.6, .6); }
  let tz, T, speed, spin = null, netErr = false, tagKind = kind;
  const power = p.human ? aim.power : rand(.5, 1), pw = p.human ? 1 : A.power;
  switch (kind) {
    case 'lob': tz = dir * rand(8.2, 9.3); T = rand(1.9, 2.3); break;
    case 'drop': tz = dir * rand(1.1, 2.6); T = clamp(.55 + az * .07, .7, 1.3); spin = 'drop'; tx *= .6;
      if (az > 6.5 && Math.random() < (p.human ? .45 - career.attrs.control * .03 : .25)) netErr = true;
      if (p.human) S.stats.drops++; break;
    case 'bandeja': tz = dir * rand(6.3, 8.6); speed = 12.5 * pw; spin = 'slice'; if (p.human) S.stats.bandejas++; break;
    case 'vibora': tz = dir * rand(6.8, 9); tx = Math.sign(tx || (Math.random() < .5 ? -1 : 1)) * rand(2.8, 4.4); speed = (p.human ? 13 + career.attrs.smash * .35 : 15 * pw); spin = 'vibora';
      if (p.human) S.stats.viboras++; break;
    case 'chiquita': tz = dir * rand(2.4, 4.2); tx *= .7; speed = 9.5; spin = 'chiq'; if (p.human) S.stats.chiquitas++; break;
    case 'smash':
      if (ball.y > 2.2 && az < 5.6 && power > .8 && (p.human ? M.kick : A.style === 'attacker' || Math.random() < .4)) { tz = dir * rand(4.2, 5.6); speed = 25; spin = 'kick'; tagKind = 'kick'; }
      else { tz = dir * rand(5.5, 8); speed = p.human ? M.smash + power * 2.5 : 20 * pw; spin = 'top'; }
      if (p.human) S.stats.smashes++; break;
    case 'superdrive': tz = dir * rand(8.4, 9.3); tx = Math.sign(tx || (gapL > gapR ? -1 : 1)) * rand(3.6, 4.4); speed = 25 + career.attrs.power * .4; spin = 'top'; break;
    case 'supersmash': tz = dir * rand(4.4, 5.4); speed = 28 + career.attrs.smash * .4; spin = 'kick'; break;
    case 'power': tz = dir * rand(7, 9.2); speed = p.human ? M.powerDrive : 16 * pw; spin = 'top'; break;
    default: tz = dir * (p.human ? 5 + power * 3.6 + rand(-M.scatter, M.scatter) : rand(5, 9)); speed = p.human ? M.drive + power * 2 : rand(11.5, 14) * pw;
  }
  if (!p.human) {
    let err = A.err * (1 + Math.max(0, r.shots - 10) * .07); if (kind === 'smash' || kind === 'power') err *= 1.4; if (kind === 'bandeja') err *= .7;
    if (Math.random() < err) { const e = Math.random();
      if (e < .4) tz = dir * rand(10.6, 12); else if (e < .7) tx = Math.sign(tx || 1) * rand(5.4, 6.2); else netErr = true; }
  } else {
    S.stats.yourShots++;
    if (Q === 'perfect') { if (speed) speed *= 1.12; S.slowmo = .3; }
    if (Q === 'early') { tx -= Math.sign(p.x || 1) * (settings.controls !== 'classic' ? .7 : 1.3); if (speed) speed *= .95; if (Math.random() < .08) tx = Math.sign(tx || 1) * rand(5.4, 6); }   // pulled across the court
    if (Q === 'late') { tx += Math.sign(tx || p.x || 1) * (settings.controls !== 'classic' ? .7 : 1.3); if (speed) speed *= .9;                                                      // pushed wide and weak
      if (Math.random() < .14) { if (Math.random() < .5) netErr = true; else tz = dir * rand(10.4, 11.5); } }
    S.humanAims.push(Math.sign(tx) || 0); if (S.humanAims.length > 6) S.humanAims.shift();
  }
  const isSuper = kind === 'superdrive' || kind === 'supersmash';
  if (isSuper) { netErr = false; S.energy = 0; if (pro()) S.stamina = Math.max(0, S.stamina - .3); S.slowmo = .7; S.hitstop = .12; S.shake = .5; S.superT = 1.2;
    call('SUPER SHOT!', kind === 'supersmash' ? 'Smash por cuatro' : 'Rocket into the corner', 1.6); if (settings.voice === '1') speak('Super shot!'); sfx('cheer', 1); }
  else if (p.human && S.energy !== undefined) S.energy = Math.min(1, S.energy + (Q === 'perfect' ? .2 : Q === 'good' ? .09 : .03) * (S.stamina < .25 ? .5 : 1));
  if (!T) T = Math.hypot(tx - ball.x, tz - ball.z) / speed;
  launchTo(tx, tz, T, netErr);
  ball.spin = spin; ball.spinUsed = false;
  S.lastKind = tagKind; shotTag(tagKind, team, p.human ? Q : null);
  if (kind === 'smash' && !isSuper) { S.hitstop = p.human ? .07 : .04; S.shake = p.human ? .35 : .18; }
  sfx(kind === 'smash' ? 'smash' : 'hit', kind === 'drop' ? .55 : 1);
  if (p.human) buzz(kind === 'smash' ? [20, 30, 40] : kind === 'drop' ? 14 : 28);
  replan();
}

// ------------------------------------------------------------------ rules
function endRally(winner, reason, isFault) {
  const r = S.rally; if (!r.active) return; r.active = false;
  if (GS.mode === 'move') { stopSteer(); GS.mode = 'done'; }
  if (++DIAG.rallies === 3 || DIAG.rallies === 10) diagSend('auto after ' + DIAG.rallies + ' points');
  S.outcome = { winner, reason, fault: !!isFault }; S.phase = 'after'; S.wait = 1.2; ring.visible = false; boxHL.visible = false;
}
const pointOther = reason => endRally(other(S.rally.lastHit), reason);
const pointLast = reason => endRally(S.rally.lastHit, reason);
const serveAware = (fr, pr) => (S.rally.serveState > 0 ? endRally(null, fr, true) : pointOther(pr));
function inBox(b) { return b.x * S.serveX < 0 && Math.abs(b.z) <= SVC_Z + .02 && Math.abs(b.x) <= COURT_X; }
function rules(evs) {
  if (S.mode === 'drill') return drillRules(evs);
  const r = S.rally;
  for (const e of evs) {
    if (e.t === 'floor') sfx('bounce', clamp(e.imp / 8, .2, 1));
    if (e.t === 'wall') { sfx(e.kind, .8); if (sideOf(ball.z) === 'P') buzz(12); }
    if (!r.active) continue;
    const side = sideOf(ball.z);
    if (e.t === 'cross' || e.t === 'net') {
      if (r.bounces > 0) pointLast(S.lastKind === 'kick' ? 'Smash por cuatro!' : 'It bounced back over the net');
      else if (e.t === 'net') serveAware('Fault · serve in the net', 'Into the net');
    } else if (e.t === 'floor') {
      if (side === r.lastHit) serveAware('Fault · serve did not clear the net', 'Into the net');
      else { r.bounces++;
        if (r.serveState === 1) { if (inBox(ball)) r.serveState = 2; else { endRally(null, 'Fault · outside the service box', true); continue; } }
        if (r.bounces >= 2) pointLast(r.serveState === 2 ? 'Ace!' : S.lastKind === 'drop' ? 'Drop shot winner' : S.lastKind === 'bandeja' ? 'Bandeja winner' : S.lastKind === 'vibora' ? 'Víbora winner' : S.lastKind === 'chiquita' ? 'Chiquita winner' : 'Double bounce'); }
    } else if (e.t === 'wall') {
      if (r.bounces === 0 && side !== r.lastHit) serveAware('Fault · serve hit the ' + (e.kind === 'glass' ? 'glass' : 'fence') + ' first', 'Out · hit the ' + (e.kind === 'glass' ? 'glass' : 'fence') + ' before bouncing');
      else if (r.serveState === 2 && e.kind === 'mesh') endRally(null, 'Fault · serve hit the fence', true);
    } else if (e.t === 'out') {
      if (r.bounces >= 1 && side !== r.lastHit) pointLast(r.serveState === 2 ? 'Ace! Out of the court' : /kick|smash/.test(S.lastKind) ? 'Smash por tres!' : 'Out of the court · winner');
      else serveAware('Fault · serve out', 'Out');
    }
  }
}
function legal(team) { const r = S.rally; return r.active && r.lastHit !== team && sideOf(ball.z) === team && r.serveState !== 1 && r.bounces < 2 && !ball.out; }
function inReach(p, reach) { const dx = ball.x - p.x, dz = ball.z - p.z; return dx * dx + dz * dz < reach * reach && ball.y < (Math.abs(p.z) < 7 ? 2.9 : 2.5); }

// ------------------------------------------------------------------ scoring
const CALLS = ['0', '15', '30', '40'];
function scoreText() {
  if (S.tie) return [String(S.pP), String(S.pC)];
  if (S.pP >= 3 && S.pC >= 3) { if (S.pP === S.pC) return ['40', '40']; return S.pP > S.pC ? ['AD', '40'] : ['40', 'AD']; }
  return [CALLS[S.pP], CALLS[S.pC]];
}
function callScore() {                          // the serving team's score is always called first
  const srvP = players[S.order[S.serverIdx]].team === 'P', a = srvP ? S.pP : S.pC, b = srvP ? S.pC : S.pP;
  if (S.tie) return a + ' – ' + b;
  if (S.pP >= 3 && S.pC >= 3) return S.pP === S.pC ? 'Deuce' : (S.pP > S.pC ? 'Advantage your team' : 'Advantage ' + (S.ctx ? S.ctx.opp.short : 'them'));
  return CALLS[a] + ' – ' + CALLS[b];
}
function awardPoint(w) {
  let msg = '';
  if (w === 'P') { S.pP++; S.stats.ptsWon++; S.energy = Math.min(1, (S.energy || 0) + .12); } else { S.pC++; S.stats.ptsLost++; }
  let gameTo = null;
  if (!S.tie) { if (S.pP >= 4 && S.pP - S.pC >= 2) gameTo = 'P'; else if (S.pC >= 4 && S.pC - S.pP >= 2) gameTo = 'C'; }
  else { if (S.pP >= 7 && S.pP - S.pC >= 2) gameTo = 'P'; else if (S.pC >= 7 && S.pC - S.pP >= 2) gameTo = 'C';
         else if ((S.pP + S.pC) % 2 === 1) S.serverIdx = (S.serverIdx + 1) % 4; }
  if (gameTo) {
    if (gameTo === 'P') S.gP++; else S.gC++;
    const wasTie = S.tie; S.pP = S.pC = 0; S.serverIdx = (S.serverIdx + 1) % 4;
    msg = gameTo === 'P' ? 'Game, your team' : 'Game, ' + (S.ctx ? S.ctx.opp.short : 'opponents');
    const N = S.games;
    if (wasTie || (S.gP >= N && S.gP - S.gC >= 2)) S.matchWinner = S.gP > S.gC ? 'P' : null;
    if (wasTie || (S.gC >= N && S.gC - S.gP >= 2)) S.matchWinner = S.matchWinner || (S.gC > S.gP ? 'C' : null);
    if (!S.matchWinner && S.gP === N && S.gC === N) { S.tie = true; msg += ' · Tie-break, first to 7'; }
  }
  return msg || callScore();
}
function setupServer() {
  S.server = S.order[S.serverIdx];
  const team = players[S.server].team, even = (S.pP + S.pC) % 2 === 0;
  S.serveX = (even ? 1 : -1) * (team === 'P' ? 1 : -1);
  S.faults = 0;
}

// ------------------------------------------------------------------ HUD
function renderBoard() {
  const [a, b] = scoreText(); $('pP').textContent = a; $('pC').textContent = b; $('gP').textContent = S.gP; $('gC').textContent = S.gC;
  const team = players[S.server].team; $('srvP').classList.toggle('on', team === 'P'); $('srvC').classList.toggle('on', team === 'C');
  $('tbtag').hidden = !S.tie;
  try { scoreboardDraw(a, b, S.gP, S.gC, team, S.tie); } catch (e) {}
}
function call(main, sub, secs = 2.2) { const el = $('call'); el.innerHTML = ''; el.append(main); if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
  el.classList.add('show'); S.callT = secs; }
function prompt(t) { const el = $('prompt'); if (!t) { el.hidden = true; return; } el.textContent = t; el.hidden = false; }

// ------------------------------------------------------------------ input
const input = { mx: 0, mz: 0, swingT: 0, aim: { x: 0, power: 0, kind: 'auto' }, tap: false, keys: new Set(), joyId: null, joy0: null, swId: null, sw0: null };
const inMatch = () => !['menu', 'done'].includes(S.phase);
function swingStart() {
  input.tap = true; $('swing').classList.add('hot');
  if (S.phase !== 'rally') { input.swingT = .45; return; }
  const P = players.Player; if (input.swingT > 0 || P.swing > .2) return;      // already mid-swing
  const c = S.hc; let q = 'good', win = .3;
  if (c) { const d = c.ttc - LEAD; q = Math.abs(d) <= .06 ? 'perfect' : (d > .2 ? 'early' : d < -.07 ? 'late' : 'good');
    if (c.ttc > .8) { P.swing = .32; P.swingType = c.type; input.swingT = 0; shotTag('', 'P', 'early'); $('shotTag').textContent = 'Too early'; return; }
    win = c.ttc + .15; }
  else if (legal('P') && inReach(P, reachNow())) q = 'late';
  input.quality = q; input.swingT = win; input.delta = c ? c.ttc - LEAD : -.2;
}
addEventListener('error', e => { const el = $('errBox'); if (!el) return; el.hidden = false; el.textContent = 'Game error: ' + (e.message || e) + (e.lineno ? ' @' + e.lineno : '') + ' · screenshot this for support'; });
const stick = () => settings.controls === 'stick';
const returnAssist = () => settings.assist === '1' && S.phase === 'rally' && S.rally.serveState > 0 && S.rally.lastHit !== 'P';   // returning serve: assist steps you in
const pro = () => settings.controls === 'pro';
// Console controls: left thumb = run + aim, right = DRIVE / LOB / DROP / SMASH. Hold to build power, release as the ring closes.
const PRO = { id: null, shot: null, t0: 0, btn: null };
const proCharge = () => PRO.id === null ? 0 : clamp((performance.now() - PRO.t0) / 650, 0, 1);
function proRelease(auto) {
  if (PRO.id === null) return; const charge = proCharge();
  input.aim = { kind: 'pro', shot: PRO.shot, x: clamp(input.mx + ((input.keys.has('arrowright') || input.keys.has('d')) ? 1 : 0) - ((input.keys.has('arrowleft') || input.keys.has('a')) ? 1 : 0), -1, 1),
    power: PRO.shot === 'smash' ? .55 + charge * .45 : charge };
  if (PRO.btn) PRO.btn.classList.remove('hot'); PRO.id = null; PRO.btn = null; $('pwr').classList.remove('on');
  swingStart(); if (auto) { input.quality = 'late'; }
}
let padMode = '';
function padState() {
  const m = !['serveWait', 'humanServe', 'aiServe'].includes(S.phase) ? 'play' : S.server === 'Player' ? 'me' : 'them';
  if (m === padMode) return; padMode = m; document.body.classList.toggle('srv-me', m === 'me'); document.body.classList.toggle('srv-them', m === 'them');
  $('pbDrive').textContent = m === 'me' ? 'SERVE' : 'DRIVE';
}
function meters() {
  if (S.aimShow > 0) { S.aimShow -= 1 / 60; reticle.visible = S.aimShow > 0; if (S.serveAim) reticle.position.set(S.serveAim.x, .012, S.serveAim.z); }
  if (S.energy === undefined) return; $('supFill').style.width = (S.energy * 100) + '%'; $('stamFill').style.width = (S.stamina * 100) + '%';
  $('stamFill').classList.toggle('low', S.stamina < .3);
  const ready = S.energy >= 1 && S.stamina >= .3 && S.mode === 'match'; $('meters').classList.toggle('ready', ready);
  const show = ready && S.phase === 'rally'; if ($('pbSuper').hidden === show) $('pbSuper').hidden = !show;
  if (S.superT > 0) S.superT -= 1 / 60; const sup = S.superT > 0; ballMesh.material.emissive.setHex(sup ? 0xff5a1f : 0x5a6b00); trail.forEach(m => m.material.color.setHex(sup ? 0xff7a2f : 0xd8f23a));
}
function proTick() { padState(); meters(); if (!pro() && PRO.id === null) return;
  if (PRO.id === null) return; const c = proCharge(); $('pwrFill').style.width = (c * 100) + '%';
  if (S.phase === 'rally' && S.hc && S.hc.ttc <= LEAD - .1 && legal('P')) proRelease(true);      // held too long: you still hit, but late
}
for (const b of document.querySelectorAll('.pb')) {
  b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audio(); if (!inMatch()) return; if (PRO.id !== null && performance.now() - PRO.t0 < 2500) return;
    if (['serveWait', 'humanServe', 'aiServe'].includes(S.phase) && (S.server !== 'Player' || b.dataset.shot !== 'drive' || performance.now() - (S.serveStart || 0) < 500)) return;
    if (PRO.btn) PRO.btn.classList.remove('hot');
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    Object.assign(PRO, { id: e.pointerId, shot: b.dataset.shot, t0: performance.now(), btn: b }); b.classList.add('hot'); $('pwr').classList.add('on'); $('pwrFill').style.width = '0%'; });
  const up = e => { if (e.pointerId === PRO.id) proRelease(false); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
}
// Stick-style gestures, one thumb anywhere:
//   flick  = hit towards where you flick (angle = direction, length/speed = power; long fast flick on a high ball = smash)
//   short soft flick = touch shot (drop at the net, chiquita from the back) · flick down = lob · tap = safe drive (bandeja on a high ball)
//   press and hold, then drag = move your player yourself (auto-run takes over again when you let go)
const GS = { id: null, t0: 0, x0: 0, y0: 0, mode: null, ax: 0, ay: 0 };
function aimFromFlick(dx, dy, ms) {
  const len = Math.hypot(dx, dy), speed = len / Math.max(ms, 16);
  if (dy > 22 && dy > Math.abs(dx) * .6) return { x: clamp(dx / 100, -1, 1), power: 0, kind: 'lob' };
  const ang = Math.atan2(dx, Math.max(-dy, 1));                     // 0 = straight at the opponents
  const a = { x: clamp(ang / .75, -1, 1), power: clamp((len - 60) / 230 + (speed - 1.2) * .3, 0, 1), kind: 'flick', touch: len < 75 && speed < .6 };
  if (S.energy >= 1 && (S.stamina ?? 1) >= .3 && a.power > .85 && !a.touch) return { kind: 'pro', shot: 'super', x: a.x, power: a.power };   // full SUPER bar: a hard swipe fires the super shot
  return a;
}
// swipe trail so you can see your stroke
const fx = { pts: [] };
function fxAdd(x, y) { fx.pts.push([x, y, performance.now()]); if (fx.pts.length > 40) fx.pts.shift(); }
function fxDraw() {
  const c = $('swipeFx'); if (!c) return; const now = performance.now(); fx.pts = fx.pts.filter(p => now - p[2] < 320);
  const dpr = Math.min(devicePixelRatio || 1, 2); if (c.width !== innerWidth * dpr) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight); if (fx.pts.length < 2) return;
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 1; i < fx.pts.length; i++) { const a = fx.pts[i - 1], b = fx.pts[i], age = (now - b[2]) / 320;
    g.strokeStyle = `rgba(216,242,58,${(1 - age) * .85})`; g.lineWidth = 3 + 9 * (1 - age) * (i / fx.pts.length); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
}
function stickVec(dx, dy, m) { const d = Math.hypot(dx, dy); if (d < 1) return [0, 0, 0, 0];
  const n = Math.min(1, d / m), k = n < .1 ? 0 : Math.pow((n - .1) / .9, .55);          // 10% dead zone, then fast response
  return [dx / d * k, dy / d * k, dx / d * Math.min(d, m), dy / d * Math.min(d, m)]; }
function steerTo(x, y) { const [mx, mz, kx, ky] = stickVec(x - GS.ax, y - GS.ay, 46);
  input.mx = mx; input.mz = mz; input.steer = true; $('joyKnob').style.transform = `translate(${kx}px,${ky}px)`; }
function startSteer(x, y) { GS.mode = 'move'; GS.ax = x; GS.ay = y; const j = $('joy'); j.classList.add('active'); j.style.left = (x - 60) + 'px'; j.style.top = (y - 60) + 'px'; j.style.bottom = 'auto'; }
function stopSteer() { input.steer = false; input.mx = input.mz = 0; const j = $('joy'); j.classList.remove('active'); j.style.left = j.style.top = j.style.bottom = ''; $('joyKnob').style.transform = ''; }
function stickTick() { fxDraw();             // touch and hold on the right, then drag = run (same as the left thumb)
  if (stick() && GS.id !== null && GS.mode === null && S.phase === 'rally' && performance.now() - GS.t0 > 260 && (GS.lastD || 0) < 12) { startSteer(GS.x0, GS.y0); GS.auto = true; GS.moved = false; } }
const myServeReady = () => S.phase === 'serveWait' && S.server === 'Player' && performance.now() - (S.serveStart || 0) > 400;
const preServePhase = () => (S.phase === 'serveWait' || S.phase === 'aiServe') && S.mode === 'match';
function walkTo(dx, dy) {                   // drag before the serve: walk to a new spot (server stays behind the service line, in his half)
  const P = players.Player, srv = S.server === 'Player', sx = S.serveX;
  let x = GS.px + dx / 40, z = GS.pz + dy / 55;
  if (srv) { x = sx > 0 ? clamp(x, .4, COURT_X - .4) : clamp(x, -COURT_X + .4, -.4); z = clamp(z, 7.2, COURT_Z - .4); }
  else { x = clamp(x, -COURT_X + .4, COURT_X - .4); z = clamp(z, 5, COURT_Z - .4); }
  P.target = [x, z]; }
function startToss() { S.toss = { t: 0 }; players.Player.swing = 0; prompt('Swipe up after the bounce'); }
function simpleServe(dx, dy, ms) {          // swipe during the toss: sideways aims inside the box, speed adds pace, top of the toss = best
  const sx = S.serveX, a = S.serveAim, speed = Math.hypot(dx, dy) / Math.max(ms, 16), t = S.toss ? S.toss.t - .43 : .38;
  a.x = clamp(-sx * 2.6 + clamp(dx / 90, -1, 1) * 2.1, sx > 0 ? -4.8 : .4, sx > 0 ? -.4 : 4.8); reticle.position.set(a.x, .012, a.z);
  const top = t > .22 && t < .58; if (top) shotTag('', 'P', 'perfect');
  input.aim = { x: 0, power: clamp((speed - .4) * .8, 0, 1) * (top ? 1 : .6), kind: 'auto' }; input.swId = null; S.aimShow = 1.1;
  S.tossY = ball.y; S.toss = null; S.phase = 'humanServe'; S.wait = .02; }      // simple mode: the player runs by himself, you only swipe
function aimFromSwipe(dx, dy) { input.aim = { x: clamp(dx / 90, -1, 1), power: clamp(-dy / 110, 0, 1), kind: dy > 55 ? 'lob' : 'auto' }; }
function keyAim(kind) { const k = input.keys;
  return { x: (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0), power: k.has('arrowup') || k.has('w') ? 1 : 0, kind }; }
addEventListener('keydown', e => {
  if (!inMatch()) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  input.keys.add(e.key.toLowerCase());
  const proKey = { j: 'drive', k: 'lob', l: 'drop', i: 'smash', u: 'super' }[e.key.toLowerCase()];
  if (proKey === 'super' && !(S.energy >= 1 && S.stamina >= .3)) return;
  if (pro() && proKey && !e.repeat && PRO.id === null) { Object.assign(PRO, { id: 'key:' + e.key.toLowerCase(), shot: proKey, t0: performance.now(), btn: null }); $('pwr').classList.add('on'); }
  if (e.key === ' ' && !e.repeat) { const k = input.keys;
    if (stick()) { const sx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
      input.aim = k.has('shift') ? { x: sx, power: 0, kind: 'lob' } : k.has('z') ? { x: sx, power: 0, kind: 'flick', touch: true } : { x: sx * .9, power: k.has('arrowup') || k.has('w') ? 1 : .45, kind: sx || k.has('arrowup') || k.has('w') ? 'flick' : 'tap' }; }
    else input.aim = keyAim(k.has('shift') ? 'lob' : 'auto');
    swingStart(); }
  if ((e.key === 'z' || e.key === 'Z') && !e.repeat) { input.aim = keyAim('drop'); swingStart(); }
  if (e.key.toLowerCase() === 'p' || e.key === 'Escape') togglePause();
});
addEventListener('keyup', e => { if (PRO.id === 'key:' + e.key.toLowerCase()) proRelease(false); input.keys.delete(e.key.toLowerCase()); if (e.key === ' ') $('swing').classList.remove('hot'); });
addEventListener('blur', () => input.keys.clear());
stageEl.addEventListener('pointerdown', e => {
  audio(); if (!inMatch()) return;
  if (stick()) {
    if (e.clientX < innerWidth * .45 && input.joyId === null && (S.phase === 'rally' || preServePhase())) {      // left thumb: run
      input.joyId = e.pointerId; input.joy0 = [e.clientX, e.clientY]; input.steer = true;
      const j = $('joy'); j.classList.add('active'); j.style.left = (e.clientX - 60) + 'px'; j.style.top = (e.clientY - 60) + 'px'; j.style.bottom = 'auto'; return; }
    if (GS.id !== null) return;
    Object.assign(GS, { id: e.pointerId, t0: e.timeStamp || performance.now(), x0: e.clientX, y0: e.clientY, mode: null, lastD: 0, px: players.Player.x, pz: players.Player.z });   // touch time, not processing time fx.pts = []; fxAdd(e.clientX, e.clientY);
    return; }
  if (pro()) { if (input.joyId !== null) return; input.joyId = e.pointerId; input.joy0 = [e.clientX, e.clientY]; input.steer = true;
    const j = $('joy'); j.classList.add('active'); j.style.left = (e.clientX - 60) + 'px'; j.style.top = (e.clientY - 60) + 'px'; j.style.bottom = 'auto'; return; }
  const left = !stick() && e.clientX < innerWidth * .45;    // stick mode: the whole screen is the swing area
  if (left && input.joyId === null) { input.joyId = e.pointerId; input.joy0 = [e.clientX, e.clientY];
    const j = $('joy'); j.style.left = (e.clientX - 60) + 'px'; j.style.top = (e.clientY - 60) + 'px'; j.style.bottom = 'auto'; }
  else if (!left && input.swId === null) { input.swId = e.pointerId; input.sw0 = [e.clientX, e.clientY]; input.aim = { x: 0, power: 0, kind: 'auto' };
    input.aim0 = S.serveAim ? { ...S.serveAim } : null; swingStart(); }
});
stageEl.addEventListener('pointermove', e => {
  if (stick() && e.pointerId === input.joyId) { const [mx, mz, kx, ky] = stickVec(e.clientX - input.joy0[0], e.clientY - input.joy0[1], 46);
    input.mx = mx; input.mz = mz; input.steer = true; $('joyKnob').style.transform = `translate(${kx}px,${ky}px)`; return; }
  if (stick()) { if (e.pointerId !== GS.id) return;
    const dx = e.clientX - GS.x0, dy = e.clientY - GS.y0, ms = (e.timeStamp || performance.now()) - GS.t0; GS.lastD = Math.hypot(dx, dy); fxAdd(e.clientX, e.clientY);
    if (preServePhase() && !S.toss && (GS.mode === 'walk' || (GS.mode === null && GS.lastD > 10))) { GS.mode = 'walk'; walkTo(dx, dy); return; }
    if (GS.mode === null && GS.lastD > 28) {
      if (myServeReady() && S.toss) { GS.mode = 'serve'; if (S.toss.t > .45) simpleServe(dx, dy, ms); else S.toss.queued = [dx, dy, ms]; }
      else if (S.phase === 'rally' && ms < 280) { GS.mode = 'flick'; input.aim = aimFromFlick(dx, dy, ms); swingStart(); }     // quick swipe = shot
      else if (S.phase === 'rally') { startSteer(GS.x0, GS.y0); GS.auto = false; GS.moved = true; steerTo(e.clientX, e.clientY); } }                            // slow drag = run
    else if (GS.mode === 'move' && GS.auto && !GS.moved && ms < 280 && GS.lastD > 28 && S.phase === 'rally') {   // a slow frame started 'run' before the flick arrived: it was a shot
      stopSteer(); GS.mode = 'flick'; input.aim = aimFromFlick(dx, dy, ms); swingStart(); }
    else if (GS.mode === 'move') { GS.moved = true; steerTo(e.clientX, e.clientY); }
    else if (GS.mode === 'flick' && input.swingT > 0) input.aim = aimFromFlick(dx, dy, Math.min(ms, 450));        // keep refining until the ball is struck
    return; }
  if (e.pointerId === input.joyId) { const [mx, mz, kx, ky] = stickVec(e.clientX - input.joy0[0], e.clientY - input.joy0[1], 46);
    input.mx = mx; input.mz = mz; if (pro()) input.steer = true; $('joyKnob').style.transform = `translate(${kx}px,${ky}px)`; }
  if (e.pointerId === input.swId) { const dx = e.clientX - input.sw0[0], dy = e.clientY - input.sw0[1];
    if (stick() && S.phase === 'humanServe' && input.aim0) {          // drag the serve target, release to serve
      const sx = S.serveX, a = S.serveAim; a.x = clamp(input.aim0.x + dx / 55, sx > 0 ? -5.2 : .2, sx > 0 ? -.2 : 5.2); a.z = clamp(input.aim0.z + dy / 55, -7.9, -.9);
      reticle.position.set(a.x, .012, a.z); input.aim = { x: 0, power: 0, kind: 'auto' }; }
    else (stick() ? aimFromSwipeStick : aimFromSwipe)(dx, dy); }
});
let dragCancels = 0;
function endPointer(e) {
  if (e.type === 'pointercancel' && (e.pointerId === input.joyId || (e.pointerId === GS.id && GS.mode === 'move')) && ++dragCancels === 2)
    call('Your phone interrupted the drag', EMBEDDED ? 'Tip: play at lowveldpadel.co.za/play in Chrome for full control' : 'Tip: tap full screen (top right) and try again', 4);
  if (stick() && e.pointerId === GS.id) {
    if (GS.mode === null && (e.timeStamp || performance.now()) - GS.t0 < 450) { if (myServeReady() && !S.toss) startToss(); else if (S.phase === 'rally') { input.aim = { x: 0, power: 0, kind: 'tap' }; swingStart(); } }
    if (GS.mode === 'move') stopSteer();
    GS.id = null; GS.mode = null; $('swing').classList.remove('hot');
    if (e.pointerId !== input.swId) return; }
  if (e.pointerId === input.joyId) { input.joyId = null; input.mx = input.mz = 0; input.steer = false; $('joy').classList.remove('active'); $('joyKnob').style.transform = ''; const j = $('joy'); j.style.left = ''; j.style.top = ''; j.style.bottom = ''; }
  if (e.pointerId === input.swId) { input.swId = null; input.swingT = Math.max(input.swingT, .18); $('swing').classList.remove('hot'); }
}
// keep the host app / browser from grabbing drags (scroll, pull-to-refresh, swipe-to-close): otherwise a held drag gets cancelled and the player stops
for (const t of ['touchstart', 'touchmove']) {
  stageEl.addEventListener(t, e => { if (inMatch()) e.preventDefault(); }, { passive: false });
  document.addEventListener(t, e => { if (inMatch() && e.target.closest && !e.target.closest('button, input, select, textarea, a, .overlay')) e.preventDefault(); }, { passive: false }); }
document.documentElement.style.overscrollBehavior = 'none'; document.body.style.overscrollBehavior = 'none';
stageEl.addEventListener('pointerup', endPointer); stageEl.addEventListener('pointercancel', endPointer);
addEventListener('contextmenu', e => e.preventDefault());
for (const [id, kind] of [['btnLob', 'lob'], ['btnDrop', 'drop']]) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); audio(); input.aim = { x: 0, power: 0, kind }; swingStart(); b.classList.add('hot'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { b.classList.remove('hot'); $('swing').classList.remove('hot'); });
}

// ------------------------------------------------------------------ point flow
function placeForServe() {
  const srv = players[S.server], team = srv.team, s = team === 'P' ? 1 : -1, sx = S.serveX;
  for (const [k, p] of Object.entries(players)) {
    if (k === S.server) p.target = [sx * 2.4, s * 7.6];
    else if (p.team === team) p.target = [-sx * 2.4, s * 3.6];
    else p.target = [p.home[0], p.home[1] * 1.02];
  }
  const oppSide = team === 'P' ? -1 : 1;
  boxHL.position.set(-sx * COURT_X / 2, .006, oppSide * SVC_Z / 2); boxHL.visible = true;
  if (srv.human) { S.serveAim = { x: -sx * 2.6, z: oppSide * 5.6 }; reticle.visible = !stick(); } else reticle.visible = false; S.toss = null;
}
function moveServeAim(dt) {
  const k = input.keys, sx = S.serveX;
  const ax = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0) + input.mx;
  const az = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0) + input.mz;
  const a = S.serveAim; a.x = clamp(a.x + ax * 3.4 * dt, sx > 0 ? -5.2 : .2, sx > 0 ? -.2 : 5.2); a.z = clamp(a.z + az * 3.4 * dt, -7.9, -.9);
  reticle.position.set(a.x, .012, a.z);
}
function newPoint() {
  setupServer(); renderBoard(); placeForServe();
  S.phase = 'serveWait'; S.rally.active = false; S.rally.serveState = 0; input.tap = false; S.autoServe = 2.2; S.serveStart = performance.now(); PRO.id = null; $('pwr').classList.remove('on'); document.querySelectorAll('.pb.hot').forEach(b => b.classList.remove('hot'));
  prompt(S.server === 'Player' ? (mobile ? (pro() ? 'Your serve · move with the stick · hold SERVE, steer the target, release' : stick() ? 'Your serve · tap to bounce, then swipe up' : 'Left thumb places your serve · tap swing') : 'Arrows place your serve · space to serve') : (mobile ? (pro() || stick() ? (S.server === 'Partner' ? PART[career.partner].short + ' serves' : 'Opponents serve') : 'Tap swing when ready') : 'Press space when ready'));
}
function secondServe() { placeForServe(); S.phase = 'serveWait'; input.tap = false; S.serveStart = performance.now();
  if (S.server === 'Player') prompt(mobile ? (pro() ? 'Second serve · hold SERVE and release' : stick() ? 'Second serve · tap to bounce the ball' : 'Second serve · tap swing') : 'Second serve · space'); else { prompt(''); S.phase = 'aiServe'; S.wait = .9; } }
function doServe() {
  const srv = players[S.server], team = srv.team, oppSide = team === 'P' ? -1 : 1, s = team === 'P' ? 1 : -1, M = me();
  if (!(srv.human && (pro() || stick()))) { srv.x = S.serveX * 2.4; srv.z = s * 7.6; }
  Object.assign(ball, { x: srv.x + (team === 'P' ? .5 : -.5) * (srv.mesh && srv.mesh.lefty ? -1 : 1), y: srv.human && S.tossY ? S.tossY : .75, z: srv.z + (team === 'P' ? -.3 : .3), out: false }); S.tossY = 0; S.toss = null;
  Object.assign(S.rally, { active: true, lastHit: team, hitter: S.server, bounces: 0, serveState: 1, shots: 0 });
  let tx = -S.serveX * rand(1.2, 4), tz = oppSide * rand(2.2, 6.2), speed = rand(9.5, 12);
  if (srv.human) { tx = S.serveAim.x + rand(-M.serveScatter, M.serveScatter); tz = S.serveAim.z + rand(-M.serveScatter, M.serveScatter); speed = M.serveSpeed + (input.aim.power || 0) * 3; }
  else if (Math.random() < .04 + srv.ai.err * .4) tz = oppSide * rand(7.2, 8);
  launchTo(tx, tz, Math.hypot(tx - ball.x, tz - ball.z) / speed);
  ball.spin = null; ball.spinUsed = true; reticle.visible = false; S.lastKind = 'serve';
  srv.swing = .32; srv.swingType = 'serve'; sfx('hit'); if (srv.human) buzz(22);
  S.phase = 'rally'; prompt(''); $('legend').classList.add('gone'); trailPts.length = 0; players.Player.target = null; replan();
}
function afterRally() {
  const o = S.outcome;
  if (o.fault) { S.faults++;
    if (S.faults < 2) { call(o.reason, 'Second serve', 1.8); secondServe(); return; }
    o.winner = other(players[S.server].team); o.reason = 'Double fault'; }
  const r = S.rally;
  S.stats.longest = Math.max(S.stats.longest, r.shots);
  if (o.winner === 'P') { if (/Ace/.test(o.reason)) S.stats.aces++; if (r.hitter === 'Player' && r.lastHit === 'P') S.stats.winners++; }
  if (o.winner === 'C' && r.hitter === 'Player' && r.lastHit === 'P') S.stats.errors++;
  const srvTeam = players[S.server].team, servedBy = S.server, gBefore = [S.gP, S.gC];
  const msg = awardPoint(o.winner);
  if (S.ctx && S.ctx.mode === 'challenge') challengeAfterPoint(o, r, srvTeam, servedBy, gBefore);
  sfx(o.winner === 'P' ? 'cheer' : 'groan', /Game/.test(msg) ? 1.3 : .9); buzz(o.winner === 'P' ? [30, 50, 30] : 70);
  for (const q of Object.values(players)) { q.celebrate = 1; q.celeType = q.team === o.winner ? 'win' : 'lose'; }
  call(o.reason, msg, 2.4); renderBoard(); speak(msg);
  if (S.stats.ptsWon + S.stats.ptsLost >= 3) $('legend').classList.add('gone');
  if (S.matchWinner) { S.phase = 'over'; S.wait = 2.6; return; }
  S.phase = 'between'; S.wait = 1.4;
}
function startMatch(ctx) {
  $('legend').classList.remove('gone');
  S.ctx = ctx; S.games = ctx.games; S.mode = 'match'; drillReset();
  S.lvl = { time: .88, ring: settings.ring === '1', auto: settings.auto === '1' || pro() };
  Object.assign(S, { pP: 0, pC: 0, gP: 0, gC: 0, tie: false, serverIdx: 0, matchWinner: null, paused: false, stats: newStats(), energy: 0, stamina: 1, superT: 0 });
  applySides(); buildModels(ctx); configureAI(ctx);
  const ours = settings.first === 'partner' ? ['Partner', 'Player'] : ['Player', 'Partner'];
  const cpu = Math.random() < .5 ? ['CPU Left', 'CPU Right'] : ['CPU Right', 'CPU Left'];
  S.order = settings.start === 'serve' ? [ours[0], cpu[0], ours[1], cpu[1]] : [cpu[0], ours[0], cpu[1], ours[1]];
  for (const p of Object.values(players)) { p.x = p.home[0]; p.z = p.home[1]; p.vx = p.vz = 0; }
  $('nameP').textContent = (career.name || 'You') + ' + ' + PART[ctx.partner].short; $('nameC').textContent = ctx.opp.name;
  $('chipP').style.background = career.look.shirt; $('chipC').style.background = ctx.opp.kit;
  $('round').hidden = !ctx.label; $('round').textContent = ctx.label || '';
  showScreen(null); $('hud').hidden = false; crowd(true);
  newPoint(); setCamera(true); call(ctx.label || 'Quick match', (ctx.opp.full ? 'vs ' + ctx.opp.full.join(' & ') + ' · ' + ctx.opp.team + ' · ' : '') + 'First to ' + ctx.games + ' games', 2.6);
}
function togglePause() { if (!inMatch()) return; S.paused = !S.paused; $('pause').hidden = !S.paused;
  $('pauseNote').textContent = S.ctx && S.ctx.mode === 'career' ? 'Quitting a championship match counts as a loss.' : ''; }

// ------------------------------------------------------------------ AI
let planT = 0;
function replan() { planT = 0; }
function plan() {
  const r = S.rally; const incoming = r.active ? other(r.lastHit) : null;
  let contact = null, bounceP = null;
  if (incoming) {
    const pr = predict(); bounceP = pr.firstBounce;
    for (const q of pr.pts) { if (sideOf(q.z) !== incoming) continue;
      const okVolley = q.bounced === 0 && Math.abs(q.z) < 5.2 && q.y < 2.3 && q.y > .6 && r.serveState !== 1;
      const okBounce = q.bounced === 1 && q.y < 1.35 && q.y > .12;
      if (okVolley || okBounce) { contact = q; break; } }
    if (!contact) contact = pr.pts.find(q => sideOf(q.z) === incoming && q.bounced === 1) || null;
  }
  for (const [k, p] of Object.entries(players)) {
    if (S.phase !== 'rally') continue;
    if (p.human && !S.lvl.auto && !returnAssist()) continue;
    if (S.mode === 'drill' && !p.human) continue;
    if (!p.human && p.react > 0) continue;                       // still reacting to the last shot
    const s = p.team === 'P' ? 1 : -1;
    if (incoming === p.team && contact) {
      const mine = S.mode === 'drill' ? true : p.team === 'P' ? contact.x * p.sideSign > (p.human ? -.3 : (S.lvl.auto ? 0 : -.3)) : (contact.x >= 0) === (p.zone[0] >= 0);
      if (mine) { p.target = [clamp(contact.x - (p.team === 'P' ? -.25 : .25), -4.6, 4.6), clamp(contact.z + s * .25, s > 0 ? 1.2 : -9.6, s > 0 ? 9.6 : -1.2)]; continue; }
      const mate = teammate(k);                                  // partner of the player taking it: stay level, cover the middle
      p.target = [clamp(p.home[0] * .75 + shadeFor(p), -4, 4), S.lastKind === 'lob' ? s * 8.2 : clamp(Math.abs(mate.z), 4, 8.4) * s]; continue;
    }
    const netBias = p.ai.style === 'attacker' ? .75 : p.ai.style === 'defender' ? .3 : .5;
    if (r.active && r.lastHit === p.team) {                      // we just hit: press the net together or hold the back
      if (p.formFor !== r.shots + ':' + r.hitter) { p.formFor = r.shots + ':' + r.hitter;
        const soft = /lob|bandeja|vibora|drop|chiquita/.test(S.lastKind), hitterAtNet = Math.abs(players[r.hitter] ? players[r.hitter].z : 9) < 6;
        const mateForm = teammate(k).formZ, go = soft || hitterAtNet || Math.random() < netBias * .55;
        p.formZ = mateForm && teammate(k).formFor === p.formFor ? mateForm : (go ? s * 4.2 : s * 7.9); }
      p.target = [p.home[0] * .9 + shadeFor(p), p.formZ];
    } else p.target = [p.home[0] + shadeFor(p), s * 8];
  }
  ring.visible = !!(S.lvl.ring && bounceP && sideOf(bounceP.z) === 'P' && incoming === 'P');
  if (ring.visible) ring.position.set(bounceP.x, .008, bounceP.z);
}
function teammate(k) { return players[{ Player: 'Partner', Partner: 'Player', 'CPU Left': 'CPU Right', 'CPU Right': 'CPU Left' }[k]]; }
function shadeFor(p) { if (p.team !== 'C' || !S.humanAims.length) return 0; return S.humanAims.reduce((a, b) => a + b, 0) / S.humanAims.length * .5; }  // CPUs lean towards your favourite side
function reachNow() { return me().reach + (settings.assist === '1' ? .1 : 0); }
const LEAD = .1;      // press this long before the ball reaches you for a perfect hit
function computeHumanContact() {
  const r = S.rally, P = players.Player;
  if (!(r.active && r.lastHit === 'C' && S.phase === 'rally')) { S.hc = null; return; }
  const b = { ...ball }, reach = reachNow(); let best = null, bounced = r.bounces;
  for (let t = 0; t < 1.2; t += 1 / 60) { const evs = []; stepBall(b, 1 / 60, evs); for (const e of evs) if (e.t === 'floor' && sideOf(b.z) === 'P') bounced++;
    if (bounced >= 2) break;
    if (sideOf(b.z) !== 'P' || (r.serveState === 1 && bounced === 0)) continue;
    if (b.y > (Math.abs(b.z) < 7 ? 2.9 : 2.5)) continue;
    const d = Math.hypot(b.x - P.x, b.z - P.z);
    if (!best || d < best.d) best = { t, d, x: b.x, z: b.z, y: b.y }; else if (best.d < reach && d > best.d + .05) break; }
  S.hc = best && best.d < reach + .35 ? { ttc: best.t, dist: best.d, x: best.x, z: best.z, y: best.y, type: best.y > 1.6 ? 'over' : ((best.x > P.x) !== (career.look.hand === 'L') ? 'fore' : 'back') } : null;
}
function movePlayers(dt) {
  const M = me();
  for (const p of Object.values(players)) {
    if (S.mode === 'drill' && !p.human) continue;
    const speed = p.human ? M.move * (S.mode === 'match' && pro() ? .78 + .22 * Math.min(1, (S.stamina ?? 1) / .35) : 1) : p.ai.speed;
    const keysMove = p.human && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].some(k => input.keys.has(k));
    const preServe = (pro() || stick()) && (S.phase === 'serveWait' || S.phase === 'aiServe') && !(S.server === 'Player' && PRO.id !== null);
    if (p.human && ((!S.lvl.auto && !returnAssist()) || input.steer || (stick() && keysMove)) && (S.phase === 'rally' || (preServe && (input.steer || keysMove)))) {
      const k2 = input.keys; const kx = (k2.has('arrowright') || k2.has('d') ? 1 : 0) - (k2.has('arrowleft') || k2.has('a') ? 1 : 0);
      const kz = (k2.has('arrowdown') || k2.has('s') ? 1 : 0) - (k2.has('arrowup') || k2.has('w') ? 1 : 0);
      let ax = kx + input.mx, az = kz + input.mz; const m = Math.hypot(ax, az); if (m > 1) { ax /= m; az /= m; }
      const ovx = p.vx, ovz = p.vz, a = Math.min(1, dt * ((ax || az) ? 18 : 24)); p.vx += (ax * speed - p.vx) * a; p.vz += (az * speed - p.vz) * a;
      if (settings.assist === '1' && S.hc && S.hc.ttc < .55 && legal('P')) { const dx = S.hc.x - p.x, dz = S.hc.z - p.z, d = Math.hypot(dx, dz), want = reachNow() * .55;   // step into the ball
        if (d > want) { const pull = Math.min(speed * .7, (d - want) / Math.max(.12, S.hc.ttc)); p.vx += (dx / d * pull - p.vx) * .25; p.vz += (dz / d * pull - p.vz) * .25; } }
      if (Math.hypot(ovx - p.vx, ovz - p.vz) > 6 && (p.squeak = (p.squeak || 0) - 1) < 0) { sfx('squeak', .8); p.squeak = 25; }
    } else if (p.target) {
      const dx = p.target[0] - p.x, dz = p.target[1] - p.z, d = Math.hypot(dx, dz), sp = S.phase === 'rally' ? speed : 7;
      const a = Math.min(1, dt * (p.human ? 12 : 9));                     // accelerate and brake instead of snapping
      if (d > .05) { p.vx += (dx / d * Math.min(sp, d * 5) - p.vx) * a; p.vz += (dz / d * Math.min(sp, d * 5) - p.vz) * a; } else { p.vx *= 1 - a; p.vz *= 1 - a; }
    } else { p.vx *= .8; p.vz *= .8; }
    p.x = clamp(p.x + p.vx * dt, -COURT_X + .3, COURT_X - .3);
    p.z = p.team === 'P' ? clamp(p.z + p.vz * dt, .5, COURT_Z - .3) : clamp(p.z + p.vz * dt, -COURT_Z + .3, -.5);
    if (p.human && (pro() || stick()) && (S.phase === 'serveWait' || S.phase === 'aiServe')) {          // free to take position before the serve
      if (S.server === 'Player') { const sx = S.serveX; p.x = sx > 0 ? clamp(p.x, .3, COURT_X - .3) : clamp(p.x, -COURT_X + .3, -.3); p.z = clamp(p.z, 7.1, COURT_Z - .4); }
      if (input.steer) p.target = [p.x, p.z]; }
    p.run += Math.hypot(p.vx, p.vz) * dt * 3.2;
    if (p.human && S.stamina !== undefined && S.mode === 'match' && pro()) { const sp = Math.hypot(p.vx, p.vz) / speed;
      if (S.phase === 'rally') S.stamina = clamp(S.stamina - dt * sp * (input.steer ? .075 : .03) * (1.15 - career.attrs.speed * .05) + (sp < .15 ? dt * .05 : 0), 0, 1);
      else S.stamina = Math.min(1, S.stamina + dt * .22); }
    p.swing = Math.max(0, p.swing - dt); p.cool = Math.max(0, p.cool - dt);
    for (const k of ['split', 'lunge', 'celebrate', 'react']) if (p[k] > 0) p[k] -= dt;
    // racket preparation as the ball comes
    if (p.human) { p.prep = S.hc && S.hc.ttc < .55 ? S.hc.type : null; if (S.hc) p.cy = S.hc.y; }
    else if (S.phase === 'rally') p.cy = ball.y;
    else p.prep = S.phase === 'rally' && legal(p.team) && Math.hypot(ball.x - p.x, ball.z - p.z) < p.ai.reach + 1.6 ? swingTypeFor(p) : null;
  }
}
function tryHits() {
  if (!S.rally.active) return;
  const hum = players.Player;
  if (input.swingT > 0 && legal('P') && inReach(hum, reachNow())) { input.swingT = 0; shot('Player', { ...input.aim, quality: input.quality || 'good' }); return; }
  if (S.mode === 'drill') return;
  for (const k of ['Partner', 'CPU Left', 'CPU Right']) {
    const p = players[k]; if (p.cool > 0 || !legal(p.team)) continue;
    if (S.rally.bounces === 0 && Math.abs(ball.z) > 5.2 && !(ball.y > 1.9)) continue;
    if (inReach(p, p.ai.reach)) {
      const fast = Math.hypot(ball.vx, ball.vz) > 15 || /smash|kick/.test(S.lastKind);
      if (/super/.test(S.lastKind) && p.team === 'C' && Math.random() < .85) { p.cool = .8; continue; }
      if (fast && Math.random() < (p.team === 'C' ? .5 - p.ai.reach * .1 : .3)) { p.cool = .6; continue; }
      if (Math.random() < .55) { shot(k, null); return; }
    }
  }
}

// ------------------------------------------------------------------ camera + loop
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camLookS = new THREE.Vector3();
function setCamera(snap) {
  const portrait = innerHeight > innerWidth;
  camera.fov = portrait ? 66 : 48; camera.updateProjectionMatrix();
  const bx = S.phase === 'rally' ? ball.x * .15 + players.Player.x * .25 : 0;
  if (settings.cam === 'behind' && S.phase !== 'menu') {
    const P = players.Player, inPlay = S.phase === 'rally' || S.phase === 'humanServe' || S.phase === 'serveWait';
    const px = inPlay ? P.x : 0, pz = inPlay ? clamp(P.z, 2, 10) : 8;
    const lx = S.phase === 'rally' ? px * .45 + ball.x * .25 : px * .4;
    if (portrait) { const lxp = px * .6 + (S.phase === 'rally' ? ball.x * .15 : 0); camPos.set(px, 6.6, pz + 7.6); camLook.set(lxp, 0, pz - 5); }   // narrow screen: stay right behind you
    else { camPos.set(px * .8 + .6, 4.0, pz + 6.0); camLook.set(lx + .3, -.2, pz - 9); }
    camera.fov = portrait ? 76 : 62; camera.updateProjectionMatrix(); }
  else if (settings.cam === 'high') { camPos.set(bx, portrait ? 21 : 17, portrait ? 15 : 13.5); camLook.set(bx * .6, 0, -.8); }
  else if (S.phase === 'menu') { const t = performance.now() / 9000; camPos.set(Math.sin(t) * 13, 5.5, Math.cos(t) * 13); camLook.set(0, .8, 0); }
  else { camPos.set(bx, portrait ? 8.2 : 6.4, portrait ? 19 : 16.8); camLook.set(bx * .5, .4, -2.2); }
  if (snap) { camera.position.copy(camPos); camLookS.copy(camLook); }
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); setCamera(true); }
addEventListener('resize', resize); resize();
let last = performance.now(), acc = 0;
const STEP = 1 / 120;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const sc = S.hitstop > 0 ? .04 : S.slowmo > 0 ? .3 : 1; S.hitstop -= dt; S.slowmo -= dt;
  if (!S.paused && inMatch()) { update(dt * S.lvl.time * sc, dt); autoQuality(dt); }
  draw(dt); renderer.render(scene, camera); drawPreview(dt);
}
function update(dt, realDt) {
  if (S.callT > 0) { S.callT -= realDt; if (S.callT <= 0) $('call').classList.remove('show'); }
  input.swingT = Math.max(0, input.swingT - dt); S.simT += dt;
  computeHumanContact(); stickTick(); proTick(); diagTick(dt);
  { const P = players.Player; if (input.swingT > 0 && S.hc && S.hc.ttc <= .17 && P.swing <= 0 && S.phase === 'rally') { P.swing = .32; P.swingType = S.hc.type; } }
  if (S.phase === 'serveWait') {
    if ((pro() || stick()) && S.server !== 'Player' && (S.autoServe -= realDt) <= 0 && !(stick() && (GS.mode === 'walk' || input.joyId !== null))) input.tap = true;
    if (input.tap) { input.tap = false; if (S.server === 'Player') { S.phase = 'humanServe'; S.wait = stick() && input.swId !== null ? 4 : .35; } else { S.phase = 'aiServe'; S.wait = .55; prompt(''); } }
  } else if (S.phase === 'humanServe') { S.wait -= realDt; if (input.swId === null || S.wait <= 0) doServe();
  } else if (S.phase === 'aiServe') { S.wait -= dt; if (S.wait <= 0) doServe(); }
  if (S.mode === 'drill') drillTick(dt, realDt);
  if (['rally', 'after', 'between', 'over', 'drillWait'].includes(S.phase)) {
    acc += dt; while (acc >= STEP) { acc -= STEP; const evs = []; stepBall(ball, STEP, evs); if (evs.length) { rules(evs); if (evs.some(e => e.t !== 'cross')) replan(); }
      if (S.phase === 'rally') tryHits(); }
  } else acc = 0;
  planT -= dt; if (planT <= 0) { plan(); planT = .18; }
  movePlayers(dt);
  if (S.phase === 'after') { S.wait -= dt; if (S.wait <= 0) afterRally(); }
  else if (S.phase === 'between') { S.wait -= realDt; if (S.wait <= 0) newPoint(); }
  else if (S.phase === 'over') { S.wait -= realDt; if (S.wait <= 0) { S.phase = 'done'; S.mode === 'drill' ? finishDrill() : finishMatch(); } }
  if (S.phase === 'serveWait' && S.server === 'Player' && (!pro() || PRO.id !== null)) moveServeAim(realDt);
  if (['serveWait', 'aiServe', 'humanServe'].includes(S.phase)) {
    const srv = players[S.server], t = performance.now() / 1000;
    let y = srv.human && stick() ? .95 + Math.sin(t * 2) * .02 : .25 + Math.abs(Math.sin(t * 3.2)) * .75;     // simple mode: ball held at the hip until you tap
    if (S.toss && srv.human) { const T = S.toss.t += realDt;
      if (T < .43) y = Math.max(.06, .95 - 4.905 * T * T);                                      // drop
      else { const tb = T - .43; y = .06 + 4.0 * tb - 4.905 * tb * tb; if (!S.toss.b) { S.toss.b = 1; sfx('bounce', .6); }   // bounce up to about waist height
        if (S.toss.queued && tb > .25) { const q = S.toss.queued; S.toss.queued = null; simpleServe(q[0], q[1], q[2]); }
        if (y < .06 && tb > .5) { S.toss = null; y = .95; prompt('Tap to bounce again'); } } }
    Object.assign(ball, { x: srv.x + (srv.team === 'P' ? .5 : -.5) * (srv.mesh && srv.mesh.lefty ? -1 : 1), z: srv.z + (srv.team === 'P' ? -.3 : .3), y, vx: 0, vy: 0, vz: 0, out: false });
  }
}
function draw(dt) {
  fxTick(dt);
  ballMesh.position.set(ball.x, ball.y, ball.z);
  blob.position.set(ball.x, .007, ball.z); blob.material.opacity = clamp(.5 - ball.y * .08, .12, .5); blob.scale.setScalar(1 + ball.y * .15);
  const showBall = inMatch(); ballMesh.visible = showBall; blob.visible = showBall && Math.abs(ball.x) < COURT_X + 1.4 && Math.abs(ball.z) < COURT_Z + 1.4;
  if (S.phase === 'rally' || S.phase === 'after') { trailPts.unshift([ball.x, ball.y, ball.z]); if (trailPts.length > 14) trailPts.pop(); } else trailPts.length = 0;
  trail.forEach((m, i) => { const p = trailPts[i * 2]; m.visible = !!p; if (p) m.position.set(p[0], p[1], p[2]); });
  for (const p of Object.values(players)) {
    if (!p.mesh) continue;
    const g = p.mesh.g; g.position.set(p.x, 0, p.z); if (p.mesh.J.youArrow) { p.mesh.J.youArrow.position.y = 2.35 + Math.sin(performance.now() / 220) * .08; p.mesh.J.youArrow.visible = S.mode === 'match' && inMatch(); }
    const face = p.team === 'P' ? Math.PI : 0, look = Math.atan2(ball.x - p.x, ball.z - p.z);
    const want = face + clamp(((look - face + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -.7, .7);
    g.rotation.y += (want - g.rotation.y) * Math.min(1, dt * 8);
    if (!inMatch()) { p.vx = p.vz = 0; }
    animatePlayer(p, dt);
  }
  const hc = S.hc, P = players.Player;
  approach.visible = !!(hc && S.phase === 'rally' && hc.ttc < 1.1 && inMatch());
  if (approach.visible) { const d = hc.ttc - LEAD; approach.scale.setScalar(.5 + Math.max(0, d) * 3.2); approach.position.set(P.x, .015, P.z);
    approach.material.color.set(Math.abs(d) <= .06 ? 0xd8f23a : 0xf3f6fb); approach.material.opacity = Math.abs(d) <= .06 ? 1 : .7; }
  setCamera(false); camera.position.lerp(camPos, Math.min(1, dt * (settings.cam === 'behind' ? 5 : 2.5))); camLookS.lerp(camLook, Math.min(1, dt * 6)); camera.lookAt(camLookS);
  if (S.shake > 0) { camera.position.x += (Math.random() - .5) * S.shake * .5; camera.position.y += (Math.random() - .5) * S.shake * .4; S.shake -= dt; }
}
// timing meter: a ring that shrinks onto your marker; press when they meet
const approach = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 40), new THREE.MeshBasicMaterial({ color: 0xf3f6fb, transparent: true, opacity: .7, depthWrite: false }));
approach.rotation.x = -Math.PI / 2; approach.visible = false; scene.add(approach);
// rendering quality: auto steps down on slow phones
const QUAL = { high: { pr: Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2), sh: mobile ? 1024 : 2048, shadows: true },
  medium: { pr: Math.min(devicePixelRatio || 1, 1.25), sh: 1024, shadows: true }, low: { pr: 1, sh: 512, shadows: false } };
let qLevel = null, qFrames = 0, qTime = 0;
function applyQuality(l) { if (qLevel === l || !QUAL[l]) return; qLevel = l; const q = QUAL[l];
  renderer.setPixelRatio(q.pr); renderer.setSize(innerWidth, innerHeight, false); sun.castShadow = q.shadows;
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.mapSize.set(q.sh, q.sh); }
function autoQuality(dt) { if (settings.quality !== 'auto') return; qFrames++; qTime += dt;
  if (qTime > 3) { const fps = qFrames / qTime; qFrames = 0; qTime = 0; if (fps < 38) applyQuality(qLevel === 'high' ? 'medium' : 'low'); } }
applyQuality(settings.quality === 'auto' ? (mobile ? 'medium' : 'high') : settings.quality);
