(() => {
'use strict';
// ------------------------------------------------------------------ constants (metres, seconds)
const COURT_X = 5, COURT_Z = 10, NET_H = 0.9, SVC_Z = 6.95, G = 9.81, R = 0.035;
const SIDE_GLASS_Z = 6, BACK_H = 4, BACK_GLASS_H = 3, SIDE_H = 3;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const sideOf = z => (z > 0 ? 'P' : 'C');
const other = t => (t === 'P' ? 'C' : 'P');
const store = { get(k, d) { try { const v = localStorage.getItem('padel3d.' + k); return v == null ? d : v; } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem('padel3d.' + k, v); } catch (e) {} } };
const settings = { games: +store.get('games', 3), diff: store.get('diff', 'easy'), cam: store.get('cam_v2', 'behind'), sound: store.get('sound', '1') === '1',
  side: store.get('side', 'left'), first: store.get('first', 'you'), start: 'serve', auto: store.get('auto', '0'), ring: store.get('ring', '1'),
  controls: store.get('controls_v3', 'stick'), roster: store.get('roster', 'lowveld'), court: store.get('court', 'blue'), assist: store.get('assist', '1'), voice: store.get('voice', '1'), quality: store.get('quality', 'auto') };

// ------------------------------------------------------------------ look options
const LOOK = {
  skin: ['#f3cfa5', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'],
  hair: ['short', 'buzz', 'long', 'ponytail', 'cap', 'headband', 'bald'],
  hairColor: ['#1b1b1b', '#4a2c17', '#8a5a2b', '#d9b26a', '#b03a2e', '#d8d8d8'],
  shirt: ['#ff8a3d', '#2a9d8f', '#3a86ff', '#9b5de5', '#f4f1de', '#ef476f', '#06d6a0', '#ffd166'],
  shorts: ['#1b2333', '#f3f6fb', '#264653', '#3d405b', '#0b0b0b'],
  racket: ['#ff8a3d', '#d8f23a', '#00bbf9', '#e5484d', '#f3f6fb', '#9b5de5'],
};
const HAIR_NAMES = { short: 'Short', buzz: 'Buzz', long: 'Long', ponytail: 'Ponytail', cap: 'Cap', headband: 'Headband', bald: 'Shaved' };

// ------------------------------------------------------------------ partners (fictional players)
const PARTNERS = [
  { id: 'sipho',  name: 'Sipho Mahlangu', short: 'Sipho',  style: 'allround', cost: 0,    lvl: 1,  st: { speed: 4, control: 4, reach: 4, power: 3 },
    bio: 'Club regular. Steady from the back, rarely gives away cheap points.', look: { skin: '#8d5524', hair: 'buzz', hairColor: '#1b1b1b', shirt: '#ffd166', shorts: '#1b2333', racket: '#ffd166', num: 4 } },
  { id: 'carla',  name: 'Carla Mendes',   short: 'Carla',  style: 'defender', cost: 0,    lvl: 1,  st: { speed: 3, control: 5, reach: 4, power: 3 },
    bio: 'Patient defender. Lives off the back glass and loves a lob.', look: { skin: '#e0ac69', hair: 'ponytail', hairColor: '#4a2c17', shirt: '#8ecae6', shorts: '#f3f6fb', racket: '#00bbf9', num: 11, hand: 'L' } },
  { id: 'thabo',  name: 'Thabo Nkosi',    short: 'Thabo',  style: 'attacker', cost: 250,  lvl: 3,  st: { speed: 5, control: 4, reach: 5, power: 6 },
    bio: 'Big forehand, bigger smash. Takes the net at every chance.', look: { skin: '#5c3a1e', hair: 'headband', hairColor: '#1b1b1b', shirt: '#06d6a0', shorts: '#0b0b0b', racket: '#d8f23a', num: 9 } },
  { id: 'ayesha', name: 'Ayesha Patel',   short: 'Ayesha', style: 'defender', cost: 450,  lvl: 5,  st: { speed: 6, control: 6, reach: 5, power: 4 },
    bio: 'Quick feet and clean bandejas. Hard to get a ball past.', look: { skin: '#c68642', hair: 'long', hairColor: '#1b1b1b', shirt: '#9b5de5', shorts: '#1b2333', racket: '#9b5de5', num: 21 } },
  { id: 'pieter', name: 'Pieter van Wyk', short: 'Pieter', style: 'attacker', cost: 700,  lvl: 7,  st: { speed: 5, control: 6, reach: 7, power: 7 },
    bio: 'Tall and long-armed. Finishes points por cuatro.', look: { skin: '#f3cfa5', hair: 'short', hairColor: '#d9b26a', shirt: '#3a86ff', shorts: '#f3f6fb', racket: '#f3f6fb', num: 7 } },
  { id: 'naledi', name: 'Naledi Khumalo', short: 'Naledi', style: 'allround', cost: 1000, lvl: 9,  st: { speed: 7, control: 7, reach: 6, power: 6 },
    bio: 'Complete player. Reads the game a shot ahead.', look: { skin: '#8d5524', hair: 'ponytail', hairColor: '#1b1b1b', shirt: '#ef476f', shorts: '#1b2333', racket: '#e5484d', num: 3 } },
  { id: 'diego',  name: 'Diego Ruiz',     short: 'Diego',  style: 'attacker', cost: 1600, lvl: 12, st: { speed: 7, control: 8, reach: 7, power: 8 },
    bio: 'Former tour pro. Vicious bandeja, fearless at the net.', look: { skin: '#e0ac69', hair: 'cap', hairColor: '#4a2c17', shirt: '#f4f1de', shorts: '#264653', racket: '#ff8a3d', num: 10, hand: 'L' } },
  { id: 'lerato', name: 'Lerato Dlamini', short: 'Lerato', style: 'allround', cost: 2500, lvl: 15, st: { speed: 9, control: 8, reach: 8, power: 8 },
    bio: 'National champion. The best partner on the circuit.', look: { skin: '#5c3a1e', hair: 'long', hairColor: '#1b1b1b', shirt: '#ffd166', shorts: '#0b0b0b', racket: '#d8f23a', num: 1 } },
];
const PART = Object.fromEntries(PARTNERS.map(p => [p.id, p]));
const ROLE = { attacker: 'Attacker', defender: 'Defender', allround: 'All-rounder' };

// ------------------------------------------------------------------ championships (fictional events)
const TIERS = [
  { id: 'club',     name: 'Lowveld Club Open',      size: 4, minLevel: 1,  needs: null,       band: [.12, .38], prize: 150,  xp: 1.0, stars: 1 },
  { id: 'regional', name: 'Mpumalanga Masters',     size: 8, minLevel: 4,  needs: 'club',     band: [.30, .58], prize: 350,  xp: 1.4, stars: 2 },
  { id: 'national', name: 'SA National Championship', size: 8, minLevel: 8, needs: 'regional', band: [.50, .78], prize: 750,  xp: 1.9, stars: 3 },
  { id: 'world',    name: 'World Padel Finals',     size: 8, minLevel: 12, needs: 'national', band: [.70, .95], prize: 1600, xp: 2.6, stars: 4 },
];
const TIER = Object.fromEntries(TIERS.map(t => [t.id, t]));
const SURNAMES = ['Mokoena', 'Smit', 'Naidoo', 'Botha', 'Molefe', 'Pillay', 'Venter', 'Ndlovu', 'Fourie', 'Khoza', 'Garcia', 'Rossi', 'Silva', 'Moreno',
  'Dube', 'Jacobs', 'Sithole', 'Marais', 'Ferreira', 'Ortega', 'Lopez', 'Mthembu', 'Pretorius', 'Zulu', 'Bianchi', 'Costa', 'Nel', 'Radebe'];
const KITS = ['#e5484d', '#3a86ff', '#8338ec', '#06d6a0', '#ef476f', '#fb8500', '#118ab2', '#c9184a'];
const ROUND_NAMES = { 8: ['Quarter-final', 'Semi-final', 'Final'], 4: ['Semi-final', 'Final'] };

// ------------------------------------------------------------------ career + saving
const ATTRS = [
  ['power', 'Power', 'Drive and smash pace'], ['control', 'Control', 'Aim accuracy, safer bandejas and drops'],
  ['speed', 'Speed', 'Footspeed around the court'], ['reach', 'Reach', 'How far you can stretch for a ball'],
  ['serve', 'Serve', 'Serve pace and placement'], ['smash', 'Overhead', 'Smash pace; unlocks por cuatro at 4+'],
];
function newCareer() {
  return { v: 1, name: 'You', num: 8, look: { skin: '#c68642', hair: 'short', hairColor: '#1b1b1b', shirt: '#ff8a3d', shorts: '#1b2333', racket: '#ff8a3d' },
    level: 1, xp: 0, sp: 2, attrs: { power: 3, control: 3, speed: 3, reach: 3, serve: 3, smash: 3 }, coins: 100,
    owned: ['sipho', 'carla'], partner: 'sipho', country: '', titles: {}, record: { w: 0, l: 0 }, tour: null, drills: {}, challenges: {}, week: { key: '', xp: 0 }, updatedAt: 0 };
}
function migrate(c) { const base = newCareer(); if (!c || typeof c !== 'object') return base;
  const out = { ...base, ...c, look: { ...base.look, ...(c.look || {}) }, attrs: { ...base.attrs, ...(c.attrs || {}) }, record: { ...base.record, ...(c.record || {}) }, titles: { ...(c.titles || {}) }, drills: { ...(c.drills || {}) }, challenges: { ...(c.challenges || {}) }, week: { ...base.week, ...(c.week || {}) } };
  if (!Array.isArray(out.owned) || !out.owned.length) out.owned = base.owned; if (!PART[out.partner]) out.partner = out.owned[0]; return out; }
let career = (() => { try { return migrate(JSON.parse(store.get('career', 'null'))); } catch (e) { return newCareer(); } })();
const xpNeed = l => 120 + 70 * (l - 1);
let cloud = { doc: null, busy: false, pending: false, ok: false, db: null, uid: null, lbDoc: null, lbSig: '', lbDenied: false };
function weekKey(d = new Date()) {            // ISO week, e.g. 2026-W44
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y + '-W' + String(w).padStart(2, '0'); }
function addWeekXp(xp) { const k = weekKey(); if (career.week.key !== k) career.week = { key: k, xp: 0 }; career.week.xp += xp; }
const TITLE_PTS = { club: 100, regional: 250, national: 500, world: 1000 };
function careerPoints(c) { return Object.entries(c.titles || {}).reduce((s, [k, n]) => s + (TITLE_PTS[k] || 0) * n, 0) + c.level * 20 + (c.record ? c.record.w : 0) * 5; }
function pushLeaderboard() {
  if (typeof pushOnline === 'function') pushOnline();
  if (!cloud.lbDoc || cloud.lbDenied) return;
  const row = { name: career.name || 'Player', shirt: career.look.shirt, level: career.level, titles: { ...career.titles }, w: career.record.w, l: career.record.l,
    pts: careerPoints(career), weekKey: career.week.key, weekXp: career.week.xp, partner: PART[career.partner].short };
  const sig = JSON.stringify(row); if (sig === cloud.lbSig) return; cloud.lbSig = sig;
  cloud.lbDoc.set({ ...row, updatedAt: Date.now() }).catch(() => { cloud.lbDenied = true; cloud.lbSig = ''; });
}
function saveCareer() {
  career.updatedAt = Date.now(); store.set('career', JSON.stringify(career));
  if (cloud.doc) { if (cloud.busy) { cloud.pending = true; return; } cloud.busy = true;
    cloud.doc.set({ json: JSON.stringify(career), updatedAt: career.updatedAt })
      .then(() => { cloud.ok = true; }).catch(() => { cloud.ok = false; })
      .finally(() => { cloud.busy = false; renderSaveState(); if (cloud.pending) { cloud.pending = false; saveCareer(); } }); }
  pushLeaderboard(); renderSaveState();
}
function renderSaveState() { const el = $('saveState'); if (el && typeof online !== 'undefined' && online.on) return renderOnlineBits(); if (el) el.textContent = cloud.doc ? (cloud.ok ? 'Saved to your account' : 'Saving to your account…') : 'Saved on this device'; }
async function initCloud() {
  if (!(window.claude && typeof window.claude.use === 'function')) return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return; const id = await user.id(); if (!id) return;
    const doc = db.doc('data/users/' + id + '/career');
    const snap = await Promise.race([doc.get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
    if (snap.exists) { const d = snap.data() || {};
      if ((d.updatedAt || 0) > (career.updatedAt || 0)) { try { career = migrate(JSON.parse(d.json)); store.set('career', JSON.stringify(career)); } catch (e) {} } }
    cloud.doc = doc; cloud.ok = true; cloud.db = db; cloud.uid = id; cloud.lbDoc = db.doc('leaderboard/' + id);
    if (!snap.exists || (career.updatedAt || 0) > ((snap.data() || {}).updatedAt || 0)) saveCareer();
    renderSaveState(); if (typeof renderHome === 'function' && !$('home').hidden) renderHome();
  } catch (e) { cloud.doc = null; renderSaveState(); }
}
function teamRating(partnerId) { const a = career.attrs, p = PART[partnerId].st;
  const me = (a.power + a.control + a.speed + a.reach + a.serve + a.smash) / 60, pa = (p.speed + p.control + p.reach + p.power) / 40;
  return Math.round(((me + pa) / 2) * 100); }
const partnerRating = p => Math.round((p.st.speed + p.st.control + p.st.reach + p.st.power) / 40 * 100);
