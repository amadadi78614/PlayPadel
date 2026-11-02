
// ------------------------------------------------------------------ online (website + Android app): world leaderboard + feedback via Supabase
const BUILD = '__BUILD__', APP_VERSION = '0.9-beta+' + BUILD;
const SB_URL = 'https://eqyiqkllhqjswqrfqwdp.supabase.co', SB_KEY = 'sb_publishable_oeEGuYG6i3AcHT1Sen6wFQ_zLC0O54U';
const EMBEDDED = !!(window.claude && typeof window.claude.use === 'function');    // inside Claude the page uses Claude's own storage instead
const PLATFORM = (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web';
const online = { on: !EMBEDDED, id: null, secret: null, sig: '', busy: false };
const COUNTRIES = [['', 'Not set'], ['ZA', 'South Africa'], ['ES', 'Spain'], ['AR', 'Argentina'], ['IT', 'Italy'], ['SE', 'Sweden'], ['GB', 'United Kingdom'], ['PT', 'Portugal'], ['FR', 'France'],
  ['MX', 'Mexico'], ['AE', 'UAE'], ['SA', 'Saudi Arabia'], ['QA', 'Qatar'], ['KW', 'Kuwait'], ['EG', 'Egypt'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['DE', 'Germany'], ['FI', 'Finland'],
  ['DK', 'Denmark'], ['NO', 'Norway'], ['US', 'United States'], ['BR', 'Brazil'], ['CL', 'Chile'], ['UY', 'Uruguay'], ['PY', 'Paraguay'], ['AU', 'Australia'], ['IN', 'India'], ['PK', 'Pakistan'],
  ['MA', 'Morocco'], ['NG', 'Nigeria'], ['KE', 'Kenya'], ['BW', 'Botswana'], ['NA', 'Namibia'], ['ZW', 'Zimbabwe'], ['MZ', 'Mozambique'], ['IE', 'Ireland'], ['CH', 'Switzerland'], ['AT', 'Austria'], ['PL', 'Poland']];
const flag = c => (c && /^[A-Z]{2}$/.test(c)) ? String.fromCodePoint(...[...c].map(ch => 127397 + ch.charCodeAt(0))) : '';
async function sb(path, body) {
  const r = await fetch(SB_URL + path, { method: body ? 'POST' : 'GET', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('HTTP ' + r.status); const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function onlineInit() {
  if (!online.on) return;
  try { const s = JSON.parse(store.get('online', 'null')); if (s && s.id && s.secret) { online.id = s.id; online.secret = s.secret; } } catch (e) {}
  if (!online.id) {
    const b = new Uint8Array(24); crypto.getRandomValues(b); const secret = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    try { const id = await sb('/rest/v1/rpc/register_player', { p_secret: secret, p_name: career.name || 'Player', p_country: career.country || '', p_platform: PLATFORM, p_version: APP_VERSION });
      online.id = id; online.secret = secret; store.set('online', JSON.stringify({ id, secret })); } catch (e) { return; }
  }
  pushOnline(); renderOnlineBits();
}
function pushOnline() {
  if (!online.on || !online.id || online.busy) return;
  const row = { name: career.name || 'Player', country: career.country || '', shirt: career.look.shirt, level: career.level, titles: career.titles, wins: career.record.w, losses: career.record.l,
    pts: careerPoints(career), week_key: career.week.key || null, week_xp: career.week.xp, partner: PART[career.partner].short, platform: PLATFORM, app_version: APP_VERSION };
  const sig = JSON.stringify(row); if (sig === online.sig) return;
  online.busy = true;
  sb('/rest/v1/rpc/update_player', { p_id: online.id, p_secret: online.secret, p_data: row }).then(() => { online.sig = sig; })
    .catch(() => {}).finally(() => { online.busy = false; });
}
async function loadOnlineLeaders() {
  const cols = 'id,name,country,shirt,level,titles,wins,losses,pts,week_key,week_xp,partner';
  const [all, week] = await Promise.all([sb(`/rest/v1/players?select=${cols}&order=pts.desc&limit=100`), sb(`/rest/v1/players?select=${cols}&week_key=eq.${weekKey()}&order=week_xp.desc&limit=100`)]);
  const seen = new Map(); for (const r of [...(all || []), ...(week || [])]) seen.set(r.id, r);
  return [...seen.values()].map(r => ({ id: r.id, name: r.name, country: r.country, shirt: r.shirt, level: r.level, titles: r.titles, w: r.wins, l: r.losses, pts: r.pts, weekKey: r.week_key, weekXp: r.week_xp, partner: r.partner }));
}
// feedback
let fbRating = 0;
function showFeedback() {
  fbRating = 0; $('fbText').value = ''; $('fbMsg').textContent = ''; $('fbSend').disabled = false; renderStars(); showScreen('feedback');
}
function renderStars() { $('fbStars').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v <= fbRating))); }
$('fbStars').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; fbRating = +b.dataset.v; renderStars(); });
$('fbSend').addEventListener('click', async () => {
  const msg = $('fbText').value.trim(); if (!msg) { $('fbMsg').textContent = 'Write a few words first: what felt good, what felt wrong.'; return; }
  $('fbSend').disabled = true; $('fbMsg').textContent = 'Sending…';
  try { await sb('/rest/v1/rpc/send_feedback', { p_id: online.id, p_secret: online.secret, p_rating: fbRating || null, p_message: msg.slice(0, 2000), p_platform: PLATFORM, p_version: APP_VERSION,
      p_device: (navigator.userAgent || '').slice(0, 200) });
    $('fbMsg').textContent = 'Thanks! Your feedback was sent.'; $('fbText').value = ''; fbRating = 0; renderStars(); }
  catch (e) { $('fbMsg').textContent = 'Could not send. Check your internet connection and try again.'; }
  $('fbSend').disabled = false;
});
function renderOnlineBits() {
  document.querySelectorAll('.online-only').forEach(el => { el.hidden = !online.on; });
  const el = $('saveState'); if (el && online.on) el.textContent = online.id ? 'Saved on this phone · ranked online' : 'Saved on this phone';
  $('verTag').textContent = 'v' + APP_VERSION + (online.on ? ' · ' + PLATFORM : '');
}

// ------------------------------------------------------------------ installable app (PWA) when served from the website
(() => {
  if (EMBEDDED) return;
  const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (standalone || PLATFORM !== 'web') return;
  let deferred = null; const btn = $('btnInstall'), hint = $('installHint');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  btn.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; btn.hidden = true; });
  addEventListener('appinstalled', () => { btn.hidden = true; hint.hidden = true; });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { hint.hidden = false; hint.textContent = 'Install: tap Share, then "Add to Home Screen".'; }
})();

// ------------------------------------------------------------------ diagnostics: what the phone's touches actually do (sent to the developer from the website version)
const DIAG = { ev: [], c: {}, steerT: 0, steerDist: 0, sent: 0, px: null, pz: null, mv: 0, rallies: 0 };
function diagLog(e) {
  const k = e.type; DIAG.c[k] = (DIAG.c[k] || 0) + 1; if (k === 'pointermove' && (DIAG.mv++ % 6)) return;
  const t0 = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0];
  const x = e.clientX != null ? e.clientX : t0 ? t0.clientX : -1, y = e.clientY != null ? e.clientY : t0 ? t0.clientY : -1;
  const tg = e.target ? (e.target.id || (e.target.tagName || '').toLowerCase()) : '?';
  DIAG.ev.push([Math.round(e.timeStamp), k.replace('pointer', 'p.').replace('touch', 't.'), e.pointerType ? e.pointerType[0] : '', e.pointerId != null ? e.pointerId : (e.touches ? e.touches.length : ''),
    Math.round(x), Math.round(y), tg, S.phase, GS.mode, input.joyId !== null ? 1 : 0, input.steer ? 1 : 0]);
  if (DIAG.ev.length > 60) DIAG.ev.shift();
}
for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel']) addEventListener(t, diagLog, { capture: true, passive: true });
function diagTick(dt) {
  const P = players.Player; if (!P) return;
  if (S.phase === 'rally' && input.steer) { DIAG.steerT += dt; if (DIAG.px != null) DIAG.steerDist += Math.hypot(P.x - DIAG.px, P.z - DIAG.pz); }
  DIAG.px = P.x; DIAG.pz = P.z;
  const el = $('dbg'); if (el && !el.hidden) el.textContent = `${BUILD} ${settings.controls} ${S.phase} gs:${GS.mode} joy:${input.joyId} steer:${input.steer ? 1 : 0} m:${input.mx.toFixed(2)},${input.mz.toFixed(2)} me:${P.x.toFixed(1)},${P.z.toFixed(1)} v:${Math.hypot(P.vx, P.vz).toFixed(1)}\n` +
    Object.entries(DIAG.c).map(([k, v]) => k.replace('pointer', 'p').replace('touch', 't') + ':' + v).join(' ') + ` steerT:${DIAG.steerT.toFixed(1)} dist:${DIAG.steerDist.toFixed(1)}`;
}
async function diagSend(reason) {
  if (!online.on || DIAG.sent >= 4) return false; DIAG.sent++;
  const P = players.Player, std = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  const rep = { b: BUILD, r: reason, ua: navigator.userAgent, scr: [innerWidth, innerHeight, devicePixelRatio], tp: navigator.maxTouchPoints, std, ctl: settings.controls, cam: settings.cam, auto: settings.auto, assist: settings.assist,
    hand: career.look.hand, c: DIAG.c, steerT: +DIAG.steerT.toFixed(2), steerDist: +DIAG.steerDist.toFixed(2), me: P ? [+P.x.toFixed(2), +P.z.toFixed(2)] : null, q: qLevel, ev: DIAG.ev };
  let msg = 'DIAG ' + JSON.stringify(rep); while (msg.length > 7900 && rep.ev.length) { rep.ev.shift(); msg = 'DIAG ' + JSON.stringify(rep); }
  try { await sb('/rest/v1/rpc/send_feedback', { p_id: online.id, p_secret: online.secret, p_rating: null, p_message: msg, p_platform: PLATFORM, p_version: APP_VERSION, p_device: (navigator.userAgent || '').slice(0, 300) }); return true; } catch (e) { return false; }
}
