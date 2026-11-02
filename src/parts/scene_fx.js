
// ------------------------------------------------------------------ broadcast look: tone mapping, reflections, floodlight glow, glass hardware, court wear, crowd, ball effects
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const envTex = (() => { try {
  const sky = canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#22345a'); gr.addColorStop(.5, '#0a1222'); gr.addColorStop(1, '#173670');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff6dc'; for (const x of [.12, .38, .62, .88]) g.fillRect(x * w - 7, h * .2, 14, 6); });
  sky.mapping = THREE.EquirectangularReflectionMapping; const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromEquirectangular(sky).texture; pm.dispose(); return t; } catch (e) { return null; } })();
if (envTex) { Object.assign(glassMat, { envMap: envTex, envMapIntensity: 1.8, metalness: .55, roughness: .04, opacity: .17 }); frameMat.envMap = envTex; frameMat.envMapIntensity = .8; glassMat.needsUpdate = frameMat.needsUpdate = true; }
// glass hardware: top rails and steel clips at the panel joints
{ const rail = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, roughness: .3, metalness: .9, envMap: envTex || null });
  const box = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rail); m.position.set(x, y, z); scene.add(m); };
  for (const s of [-1, 1]) { for (const x of [-2.5, 0, 2.5]) for (const y of [.35, 2.65]) box(.07, .14, .06, x, y, s * (COURT_Z - .01));
    for (const sx of [-1, 1]) for (const k of [0, 2]) for (const y of [.35, 2.65]) box(.06, .14, .07, sx * (COURT_X - .01), y, s * (SIDE_GLASS_Z + k + 1)); } }
// floodlight glow + soft light beams through the haze
const glowTex = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, 'rgba(255,250,230,1)'); r.addColorStop(.18, 'rgba(255,240,200,.55)'); r.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
const beams = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const head = new THREE.Vector3(sx * 7.2, 8, sz * 11.3);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .9 }));
  glow.position.copy(head); glow.scale.set(4.2, 4.2, 1); scene.add(glow);
  const target = new THREE.Vector3(sx * 1.5, 0, sz * 4), dir = target.clone().sub(head), len = dir.length(); dir.normalize();
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.4, len, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate()); beam.position.copy(head).addScaledVector(dir, len / 2); scene.add(beam); beams.push(beam);
}
// court wear: lighter, sandier patches where players stand (serve spots, net, centre of the baseline)
{ const wear = canvasTex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h);
    const spot = (x, y, r, a) => { const gr = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w); gr.addColorStop(0, `rgba(255,248,225,${a})`); gr.addColorStop(1, 'rgba(255,248,225,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
    for (const y of [.12, .88]) { spot(.26, y, .22, .1); spot(.74, y, .22, .1); spot(.5, y + (y < .5 ? -.06 : .06), .3, .07); }
    for (const y of [.36, .64]) { spot(.3, y, .18, .06); spot(.7, y, .18, .06); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,250,235,${Math.random() * .22})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } });   // sand sparkle
  const m = new THREE.Mesh(new THREE.PlaneGeometry(COURT_X * 2, COURT_Z * 2), new THREE.MeshBasicMaterial({ map: wear, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .002; scene.add(m); }
// crowd: tiered stands with fans that bounce, and stand up when a point is won
const CROWD = { bodies: null, heads: null, n: 0, seeds: [], hype: 0, lastPts: -1, frame: 0 };
{ const rows = 6, cols = 42, n = rows * cols * 2, dummy = new THREE.Object3D();
  const step = new THREE.MeshStandardMaterial({ color: 0x141c2c, roughness: 1 });
  for (const sx of [-1, 1]) for (let r = 0; r < rows; r++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.34, .5 + r * .5, 26), step); s.position.set(sx * (7.75 + r * .32), (.5 + r * .5) / 2 - .1, 0); scene.add(s); }
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.15, .26, 3, 8), new THREE.MeshStandardMaterial({ roughness: .9 }), n);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.105, 10, 8), new THREE.MeshStandardMaterial({ roughness: .8 }), n);
  const shirts = ['#ff8a3d', '#e5484d', '#2a9d8f', '#ffd166', '#8ecae6', '#f3f6fb', '#3a86ff', '#9b5de5', '#06d6a0', '#1b2333'].map(c => new THREE.Color(c));
  const skins = LOOK.skin.map(c => new THREE.Color(c)); let i = 0;
  for (const sx of [-1, 1]) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = sx * (7.75 + r * .32), y = .5 + r * .5 - .1, z = -12.3 + c * .6 + (Math.random() - .5) * .18;
    CROWD.seeds.push({ x, y, z, ph: Math.random() * 6.3, sp: 2 + Math.random() * 2.5, fan: Math.random() < .35 });
    bodies.setColorAt(i, shirts[(Math.random() * shirts.length) | 0]); heads.setColorAt(i, skins[(Math.random() * skins.length) | 0]);
    dummy.position.set(x, y + .3, z); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix); dummy.position.y = y + .62; dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix); i++; }
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage); heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(bodies, heads); Object.assign(CROWD, { bodies, heads, n, dummy }); }
// ball: squash on the bounce, stretch at speed, a flash where it hits the glass
const FX = { pvx: 0, pvy: 0, pvz: 0, squash: 0, flashes: [] };
for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.RingGeometry(.08, .3, 28), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  f.visible = false; scene.add(f); FX.flashes.push({ m: f, t: 0 }); }
function glassFlash(x, y, z, alongZ) { const f = FX.flashes.find(q => q.t <= 0) || FX.flashes[0]; f.t = .32; f.m.visible = true; f.m.position.set(x, y, z); f.m.rotation.set(0, alongZ ? 0 : Math.PI / 2, 0); }
function fxTick(dt) {
  const low = typeof qLevel !== 'undefined' && qLevel === 'low', t = performance.now() / 1000;
  beams.forEach(b => { b.visible = !low; });
  // ball effects
  ballGlow.visible = ballMesh.visible && !low; ballGlow.position.copy(ballMesh.position); ballGlow.material.color.setHex(S.superT > 0 ? 0xff7a2f : 0xe6ff6a);
  if (typeof ball !== 'undefined' && ballMesh.visible) {
    if (FX.pvy < -1 && ball.vy > 0 && ball.y < .35) FX.squash = .09;
    const nearZ = Math.abs(ball.z) > COURT_Z - .45 && ball.y < BACK_GLASS_H, nearX = Math.abs(ball.x) > COURT_X - .45 && ball.y < SIDE_H && Math.abs(ball.z) > SIDE_GLASS_Z;
    if (nearZ && FX.pvz * ball.vz < 0 && Math.abs(FX.pvz) > 3) glassFlash(ball.x, ball.y, Math.sign(ball.z) * (COURT_Z - .02), true);
    if (nearX && FX.pvx * ball.vx < 0 && Math.abs(FX.pvx) > 3) glassFlash(Math.sign(ball.x) * (COURT_X - .02), ball.y, ball.z, false);
    FX.pvx = ball.vx; FX.pvy = ball.vy; FX.pvz = ball.vz;
    if (FX.squash > 0) { FX.squash -= dt; const s = Math.max(0, FX.squash / .09); ballMesh.rotation.set(0, 0, 0); ballMesh.scale.set(1 + .28 * s, 1 - .34 * s, 1 + .28 * s); }
    else { const v = Math.hypot(ball.vx, ball.vy, ball.vz), k = clamp((v - 12) / 22, 0, .45);
      if (k > 0) { ballMesh.lookAt(ball.x + ball.vx, ball.y + ball.vy, ball.z + ball.vz); ballMesh.scale.set(1 - k * .25, 1 - k * .25, 1 + k); } else ballMesh.scale.set(1, 1, 1); } }
  FX.flashes.forEach(f => { if (f.t > 0) { f.t -= dt; const k = 1 - f.t / .32; f.m.scale.setScalar(1 + k * 2.4); f.m.material.opacity = .85 * (1 - k); if (f.t <= 0) f.m.visible = false; } });
  // crowd
  if (typeof S !== 'undefined' && S.stats) { const pts = S.stats.ptsWon + S.stats.ptsLost; if (CROWD.lastPts >= 0 && pts > CROWD.lastPts) CROWD.hype = 1.6; CROWD.lastPts = pts; }
  CROWD.hype = Math.max(0, CROWD.hype - dt * .55);
  if (low && (CROWD.frame++ % 4)) return;
  const d = CROWD.dummy, h = Math.min(1, CROWD.hype);
  for (let i = 0; i < CROWD.n; i++) { const s = CROWD.seeds[i], wave = Math.sin(t * s.sp + s.ph), up = s.fan ? h * (.22 + .1 * Math.max(0, wave)) : h * .08;
    const y = s.y + up + wave * .018;
    d.position.set(s.x, y + .3, s.z); d.rotation.set(0, 0, wave * .04 * (1 + h * 3)); d.updateMatrix(); CROWD.bodies.setMatrixAt(i, d.matrix);
    d.position.set(s.x, y + .62, s.z); d.rotation.set(0, 0, 0); d.updateMatrix(); CROWD.heads.setMatrixAt(i, d.matrix); }
  CROWD.bodies.instanceMatrix.needsUpdate = CROWD.heads.instanceMatrix.needsUpdate = true;
}
// LED scoreboard above the far glass, roof trusses, ball glow
const SB = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.5), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.position.set(0, 5.4, -(COURT_Z + 2.4)); scene.add(m);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.05, 1.75, .14), new THREE.MeshStandardMaterial({ color: 0x0c111b, roughness: .6, metalness: .5 }));
  frame.position.set(0, 5.4, -(COURT_Z + 2.48)); scene.add(frame);
  for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.12, 4.6, .12), frame.material); post.position.set(sx * 2.2, 2.3, -(COURT_Z + 2.5)); scene.add(post); }
  return { c, tex }; })();
function scoreboardDraw(a, b, gP, gC, srvTeam, tie) {
  const g = SB.c.getContext('2d'), w = 512, h = 160; g.fillStyle = '#05080e'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,160,255,.06)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);   // LED rows
  g.font = 'bold 22px system-ui,sans-serif'; g.fillStyle = '#ffb703'; g.textAlign = 'left'; g.fillText(tie ? 'TIE-BREAK' : 'LOWVELD PADEL', 18, 30);
  g.textAlign = 'right'; g.fillStyle = '#8ecae6'; g.fillText('GAMES  PTS', w - 18, 30);
  const row = (name, games, pts, y, srv) => { g.textAlign = 'left'; g.font = 'bold 38px system-ui,sans-serif'; g.fillStyle = '#f3f6fb'; g.fillText(name, 40, y);
    if (srv) { g.fillStyle = '#d8f23a'; g.beginPath(); g.arc(22, y - 13, 8, 0, 7); g.fill(); }
    g.textAlign = 'right'; g.fillStyle = '#ffd166'; g.fillText(String(games), w - 150, y); g.fillStyle = '#06d6a0'; g.fillText(String(pts), w - 18, y); };
  row('HOME', gP, a, 82, srvTeam === 'P'); row('AWAY', gC, b, 136, srvTeam === 'C'); SB.tex.needsUpdate = true; }
scoreboardDraw(0, 0, 0, 0, 'P', false);
{ const steel = new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: .7, metalness: .6 });
  for (const z of [-12, -6, 0, 6, 12]) { const b = new THREE.Mesh(new THREE.BoxGeometry(18, .22, .22), steel); b.position.set(0, 9.6, z); scene.add(b);
    const d = new THREE.Mesh(new THREE.BoxGeometry(18, .06, .06), steel); d.position.set(0, 9.1, z); scene.add(d); }
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, 26), steel); r.position.set(sx * 8.9, 9.6, 0); scene.add(r); } }
const ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe6ff6a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .35 }));
ballGlow.scale.set(.55, .55, 1); scene.add(ballGlow);
