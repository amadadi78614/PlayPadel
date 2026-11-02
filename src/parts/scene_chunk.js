// ------------------------------------------------------------------ audio (synthesised, no files)
let actx = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } try { if (actx && actx.state === 'suspended') actx.resume(); } catch (e) {} return actx; }
function noise(ctx, dur) { const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur | 0), ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; return s; }
let noiseBuf = null;
function nz(ctx, dur) { if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loopStart = 0; s.loopEnd = 2; s.loop = dur > 1.9; return s; }
let master = null;
function out(ctx) { if (!master) { master = ctx.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 4; master.connect(ctx.destination); } return master; }
function env(ctx, t, peak, a, d) { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); return g; }
function tone(ctx, t, type, f0, f1, dur, vol, dest) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = env(ctx, t, vol, .002, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05); }
function burst(ctx, t, ftype, freq, q, dur, vol, dest, off = 0) { const n = nz(ctx, dur), f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q;
  const g = env(ctx, t, vol, .001, dur); n.connect(f); f.connect(g); g.connect(dest); n.start(t, off + Math.random()); n.stop(t + dur + .05); }
function sfx(kind, vol = 1) {
  if (!settings.sound) return; const ctx = audio(); if (!ctx) return; const t = ctx.currentTime + .005, o = out(ctx), pr = .92 + Math.random() * .16;
  if (kind === 'hit' || kind === 'smash' || kind === 'soft') {
    // padel "pock": hollow foam-core body + short string/face crack
    const big = kind === 'smash', soft = kind === 'soft';
    tone(ctx, t, 'sine', (big ? 210 : 260) * pr, 90, big ? .09 : .06, (soft ? .25 : .6) * vol, o);
    burst(ctx, t, 'bandpass', (big ? 1500 : 1900) * pr, 2.2, big ? .05 : .035, (soft ? .2 : .55) * vol, o);
    burst(ctx, t, 'highpass', 4200, .7, .012, (soft ? .08 : .3) * vol, o);
  } else if (kind === 'glass') {
    // dull thud of a ball on 12 mm tempered glass, with a faint ring
    tone(ctx, t, 'sine', 140 * pr, 55, .16, .55 * vol, o);
    burst(ctx, t, 'lowpass', 900, .8, .09, .35 * vol, o);
    tone(ctx, t + .005, 'sine', 2900 * pr, 2700, .32, .025 * vol, o);
  } else if (kind === 'mesh') {
    // fence rattle: a few metallic ticks through a comb-like resonator
    for (let i = 0; i < 6; i++) burst(ctx, t + i * .022 + Math.random() * .01, 'bandpass', 3000 + Math.random() * 2500, 9, .05, (.22 - i * .03) * vol, o);
    tone(ctx, t, 'sine', 110, 70, .12, .2 * vol, o);
  } else if (kind === 'bounce') {
    tone(ctx, t, 'sine', 120 * pr, 70, .05, .25 * vol, o); burst(ctx, t, 'bandpass', 700, 1.2, .025, .12 * vol, o);
  } else if (kind === 'squeak') {
    tone(ctx, t, 'triangle', 2300 * pr, 3100, .07, .05 * vol, o);
  } else if (kind === 'cheer' || kind === 'groan') { applause(kind === 'cheer' ? vol : vol * .35, kind === 'groan'); }
}
function applause(vol = 1, ooh = false) {
  if (!settings.sound) return; const ctx = audio(); if (!ctx) return; const t0 = ctx.currentTime, o = out(ctx);
  if (ooh) { const n = nz(ctx, 1.2), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(420, t0); f.frequency.linearRampToValueAtTime(300, t0 + 1); f.Q.value = 4;
    const g = env(ctx, t0, .16 * vol, .25, .9); n.connect(f); f.connect(g); g.connect(o); n.start(t0, Math.random()); n.stop(t0 + 1.3); return; }
  const claps = Math.round(40 * Math.min(1.5, vol));
  for (let i = 0; i < claps; i++) { const t = t0 + Math.pow(Math.random(), 1.6) * 1.5; burst(ctx, t, 'bandpass', 1100 + Math.random() * 1400, 1.4, .03, (.05 + Math.random() * .06) * vol, o); }
  const n = nz(ctx, 1.6), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .6;
  const g = env(ctx, t0, .07 * vol, .2, 1.3); n.connect(f); f.connect(g); g.connect(o); n.start(t0, Math.random()); n.stop(t0 + 1.7);
}
let crowdNode = null;
function crowd(on) {
  const ctx = actx; if (!ctx) return;
  if (!on || !settings.sound) { if (crowdNode) { try { crowdNode.g.gain.setTargetAtTime(0, ctx.currentTime, .3); const n = crowdNode.n; setTimeout(() => { try { n.stop(); } catch (e) {} }, 1500); } catch (e) {} crowdNode = null; } return; }
  if (crowdNode) return;
  const n = nz(ctx, 3); n.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = .5;
  const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(.022, ctx.currentTime, 1);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .17; lg.gain.value = .008; lfo.connect(lg); lg.connect(g.gain); lfo.start();
  n.connect(f); f.connect(g); g.connect(out(ctx)); n.start(); crowdNode = { n, g };
}
const SAY = { '0': 'love', '15': 'fifteen', '30': 'thirty', '40': 'forty', 'AD': 'advantage' };
function speak(text) {
  if (!settings.sound || settings.voice !== '1' || !('speechSynthesis' in window)) return;
  try { let t = String(text).replace(/·/g, ',').replace(/\s*–\s*/g, ' ');
    t = t.replace(/^(\d+|AD) (\d+|AD)$/, (m, a, b) => a === b ? (a === '40' ? 'deuce' : (SAY[a] || a) + ' all') : (SAY[a] || a) + ' ' + (SAY[b] || b));
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 1.04; u.pitch = .95; u.volume = .9; speechSynthesis.speak(u); } catch (e) {}
}
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

// ------------------------------------------------------------------ three.js scene
const stageEl = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const mobile = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
stageEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d1a);
scene.fog = new THREE.Fog(0x070d1a, 30, 70);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x0b1426, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.95);
sun.position.set(-4, 16, 6); sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 13, bottom: -13, near: 1, far: 40 });
scene.add(sun);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// surroundings
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x0c1526, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; scene.add(ground);
// court turf
const COURT_COLOURS = { blue: ['#1f5fcf', 0x173f86], green: ['#2f8a4e', 0x1d5a33], grey: ['#6c7480', 0x434954] };
const makeTurf = hex => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = hex; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,40,.08)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 2); }
}, [6, 12]);
const turf = makeTurf((COURT_COLOURS[settings.court] || COURT_COLOURS.blue)[0]);
const court = new THREE.Mesh(new THREE.PlaneGeometry(COURT_X * 2, COURT_Z * 2), new THREE.MeshStandardMaterial({ map: turf, roughness: .95 }));
court.rotation.x = -Math.PI / 2; court.receiveShadow = true; scene.add(court);
const apron = new THREE.Mesh(new THREE.PlaneGeometry(COURT_X * 2 + 3, COURT_Z * 2 + 3), new THREE.MeshStandardMaterial({ color: 0x173f86, roughness: 1 }));
apron.rotation.x = -Math.PI / 2; apron.position.y = -0.005; apron.receiveShadow = true; scene.add(apron);
function setCourtColour(name) { const c = COURT_COLOURS[name] || COURT_COLOURS.blue; const old = court.material.map;
  court.material.map = makeTurf(c[0]); court.material.needsUpdate = true; if (old) old.dispose(); apron.material.color.setHex(c[1]); }
setCourtColour(settings.court);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xf3f6fb });
function line(w, d, x, z) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); scene.add(m); }
line(COURT_X * 2, 0.05, 0, SVC_Z); line(COURT_X * 2, 0.05, 0, -SVC_Z); line(0.05, SVC_Z * 2, 0, 0);
line(0.05, 0.2, 0, COURT_Z - 0.1); line(0.05, 0.2, 0, -COURT_Z + 0.1);

// walls: glass + mesh
const glassMat = new THREE.MeshStandardMaterial({ color: 0xa8d8ff, transparent: true, opacity: 0.13, roughness: .05, metalness: .1, side: THREE.DoubleSide, depthWrite: false });
const meshTex = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(30,40,55,.85)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }, [1, 1]);
function meshMaterial(rx, ry) { const t = meshTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false }); }
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b2333, roughness: .6, metalness: .5 });
function panel(w, h, mat, x, y, z, ry) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; }
function post(x, z, h) { const p = new THREE.Mesh(new THREE.BoxGeometry(.08, h, .08), frameMat); p.position.set(x, h / 2, z); p.castShadow = true; scene.add(p); }
for (const s of [-1, 1]) {
  panel(COURT_X * 2, BACK_GLASS_H, glassMat, 0, BACK_GLASS_H / 2, s * COURT_Z, 0);               // back glass
  if (s < 0) panel(COURT_X * 2, BACK_H - BACK_GLASS_H, meshMaterial(25, 2.5), 0, BACK_GLASS_H + .5, s * COURT_Z, 0); // camera side left open for the view
  for (const sx of [-1, 1]) {
    panel(COURT_Z - SIDE_GLASS_Z, SIDE_H, glassMat, sx * COURT_X, SIDE_H / 2, s * (SIDE_GLASS_Z + COURT_Z) / 2, Math.PI / 2);
    for (let k = 0; k <= 4; k++) if (s < 0 || k < 3) post(sx * COURT_X, s * (SIDE_GLASS_Z + k), SIDE_H + (k === 4 ? 1 : 0));
  }
  if (s < 0) for (let k = -2; k <= 2; k++) post(k * 2.5, s * COURT_Z, BACK_H);
}
for (const sx of [-1, 1]) panel(SIDE_GLASS_Z * 2, SIDE_H, meshMaterial(30, 7.5), sx * COURT_X, SIDE_H / 2, 0, Math.PI / 2);
// back-glass branding
for (const s of [-1, 1]) {
  const t = canvasTex(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = '800 64px "Saira Condensed", Arial Narrow, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.22)'; g.fillText('PADEL · DOUBLES', w / 2, h / 2 + 4); });
  const m = panel(5, 1.25, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }), 0, 1.7, s * (COURT_Z + .01), s > 0 ? Math.PI : 0);
}
// net
const netTex = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(15,18,24,.9)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, [40, 4]);
const net = new THREE.Mesh(new THREE.PlaneGeometry(COURT_X * 2, NET_H - .06), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
net.position.set(0, (NET_H - .06) / 2, 0); scene.add(net);
const tape = new THREE.Mesh(new THREE.BoxGeometry(COURT_X * 2, .06, .03), lineMat); tape.position.set(0, NET_H - .03, 0); scene.add(tape);
for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.0, 10), frameMat); p.position.set(sx * (COURT_X + .05), .5, 0); scene.add(p); }
// floodlights + stands
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 8, 8), frameMat); pole.position.set(sx * 7.5, 4, sz * 11.5); scene.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, .5, .25), new THREE.MeshBasicMaterial({ color: 0xfff6d6 })); head.position.set(sx * 7.2, 8, sz * 11.3); head.lookAt(0, 0, 0); scene.add(head);
}
const crowdTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#0d1729'; g.fillRect(0, 0, w, h);
  const cols = ['#ff8a3d', '#e5484d', '#2a9d8f', '#ffd166', '#8ecae6', '#c9d3e6'];
  for (let r = 0; r < 6; r++) for (let i = 0; i < 46; i++) { g.fillStyle = cols[(i * 7 + r * 3) % cols.length]; g.globalAlpha = .55;
    g.beginPath(); g.arc(6 + i * 11 + (r % 2) * 5, 12 + r * 20, 4.2, 0, 7); g.fill(); } }, [3, 1]);
for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), new THREE.MeshBasicMaterial({ map: crowdTex }));
  st.position.set(sx * 9.5, 2.2, 0); st.rotation.y = -sx * Math.PI / 2; st.rotation.x = 0; scene.add(st); }

// serve box highlight + landing ring
const boxHL = new THREE.Mesh(new THREE.PlaneGeometry(COURT_X, SVC_Z), new THREE.MeshBasicMaterial({ color: 0xd8f23a, transparent: true, opacity: .24, depthWrite: false }));
boxHL.rotation.x = -Math.PI / 2; boxHL.position.y = .006; boxHL.visible = false; scene.add(boxHL);
const ring = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 28), new THREE.MeshBasicMaterial({ color: 0xd8f23a, transparent: true, opacity: .8, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = .008; ring.visible = false; scene.add(ring);

// serve target (you place it inside the diagonal box)
const reticle = new THREE.Group();
reticle.add(new THREE.Mesh(new THREE.RingGeometry(.5, .64, 36), new THREE.MeshBasicMaterial({ color: 0xd8f23a, transparent: true, opacity: .95, depthWrite: false })));
for (const r of [0, Math.PI / 2]) { const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .08), new THREE.MeshBasicMaterial({ color: 0xd8f23a, transparent: true, opacity: .9, depthWrite: false })); bar.rotation.z = r; reticle.add(bar); }
reticle.rotation.x = -Math.PI / 2; reticle.position.y = .012; reticle.visible = false; scene.add(reticle);

// ball, shadow, trail
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), new THREE.MeshStandardMaterial({ color: 0xd8f23a, emissive: 0x5a6b00, roughness: .5 }));
ballMesh.castShadow = true; scene.add(ballMesh);
const blob = new THREE.Mesh(new THREE.CircleGeometry(.11, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .45, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; scene.add(blob);
const trail = []; for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 - i * .006, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8f23a, transparent: true, opacity: .32 - i * .04, depthWrite: false })); scene.add(m); trail.push(m); }
const trailPts = [];

