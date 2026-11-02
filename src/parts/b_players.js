
// ------------------------------------------------------------------ players: jointed models
const matCache = new Map();
function mat(color, rough = .75, extra) { const k = color + rough + (extra ? JSON.stringify(extra) : ''); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, ...(extra || {}) })); return matCache.get(k); }
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }
function shirtTexture(color, num) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = shade(color, .72); g.fillRect(w * .22, 0, 10, h); g.fillRect(w * .78 - 10, 0, 10, h);     // side panels
    g.fillStyle = shade(color, 1.25); g.fillRect(0, 0, w, 7);                                                // collar band
    g.fillStyle = shade(color, .45); g.font = '800 64px "Saira Condensed", Arial Narrow, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num), w * .5, h * .56);                                                                 // number on the back
    g.font = '800 20px "Saira Condensed", Arial Narrow, sans-serif'; g.fillText('PADEL', w * .06, h * .3); g.fillText('PADEL', w * .94, h * .3);
  });
}
const racketGeo = (() => {
  const s = new THREE.Shape(); s.absellipse(0, -.33, .13, .155, 0, Math.PI * 2, false);
  for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) { if ((r === 0 || r === 3) && Math.abs(c) === 2) continue;
    const h = new THREE.Path(); h.absarc(c * .042, -.25 - r * .052, .0075, 0, Math.PI * 2, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: .028, bevelEnabled: true, bevelThickness: .004, bevelSize: .006, bevelSegments: 1, curveSegments: 20 });
  g.translate(0, 0, -.014); return g;
})();
const throatGeo = new THREE.CylinderGeometry(.016, .02, .2, 8);
const CONTACT_MAT = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: .55, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })() });
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const GEO = {
  torso: lathe([[.001, -.25], [.16, -.25], [.175, -.15], [.185, -.02], [.205, .12], [.215, .2], [.2, .245], [.12, .27], [.001, .27]]),     // waist → chest → shoulders
  shorts: lathe([[.001, -.16], [.178, -.16], [.184, -.12], [.178, -.02], [.168, .07], [.001, .07]]),
  thigh: new THREE.CapsuleGeometry(.066, .3, 4, 12), calf: new THREE.CapsuleGeometry(.05, .3, 4, 12),
  upper: new THREE.CapsuleGeometry(.047, .2, 4, 10), fore: new THREE.CapsuleGeometry(.038, .2, 4, 10),
  leg: new THREE.CapsuleGeometry(.074, .05, 4, 12), sleeve: new THREE.CapsuleGeometry(.062, .06, 4, 12),
  shoe: new THREE.CapsuleGeometry(.052, .16, 4, 12), sole: new THREE.BoxGeometry(.1, .022, .25), hand: new THREE.SphereGeometry(.045, 12, 10),
  collar: new THREE.TorusGeometry(.07, .018, 8, 20), toe: new THREE.SphereGeometry(.055, 12, 8), lace: new THREE.BoxGeometry(.006, .03, .12),
  stripe: new THREE.BoxGeometry(.012, .17, .05), band: new THREE.TorusGeometry(.04, .016, 8, 16), contact: new THREE.CircleGeometry(.55, 24), skull: new THREE.SphereGeometry(.115, 24, 18), brow: new THREE.CapsuleGeometry(.008, .035, 2, 6),
};
function makePlayer(look, num, marker) {
  const g = new THREE.Group(), J = {};
  const skin = mat(look.skin, .7), shirtM = new THREE.MeshStandardMaterial({ map: shirtTexture(look.shirt, num), roughness: .8 });
  const shorts = mat(look.shorts, .85), sock = mat('#f3f6fb', .9), shoe = mat('#f3f6fb', .5), sole = mat(shade(look.shirt, .8), .6), hairM = mat(look.hairColor, .9);
  const pelvis = new THREE.Group(); pelvis.position.y = .9; g.add(pelvis); J.pelvis = pelvis;
  const sh = new THREE.Mesh(GEO.shorts, shorts); sh.position.y = -.03; pelvis.add(sh);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(GEO.stripe, mat(look.shirt, .7)); st.position.set(s * .182, -.06, 0); st.rotation.z = s * .1; pelvis.add(st); }
  J.legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * .095, -.1, 0); pelvis.add(hip);
    const thighSleeve = new THREE.Mesh(GEO.leg, shorts); thighSleeve.position.y = -.09; hip.add(thighSleeve);
    const thigh = new THREE.Mesh(GEO.thigh, skin); thigh.position.y = -.21; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -.4; hip.add(knee);
    const calf = new THREE.Mesh(GEO.calf, skin); calf.position.y = -.19; calf.scale.set(1, 1, 1.08); knee.add(calf);
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(.045, .043, .1, 10), sock); sk.position.y = -.34; knee.add(sk);
    const foot = new THREE.Group(); foot.position.y = -.4; knee.add(foot);
    const sh1 = new THREE.Mesh(GEO.shoe, shoe); sh1.rotation.x = Math.PI / 2; sh1.scale.set(1, 1, .72); sh1.position.set(0, -.012, .05); foot.add(sh1);
    const sh2 = new THREE.Mesh(GEO.sole, sole); sh2.position.set(0, -.05, .05); foot.add(sh2);
    const cap = new THREE.Mesh(GEO.toe, mat(shade(look.shirt, .9), .5)); cap.position.set(0, -.03, .155); cap.scale.set(1, .55, .8); foot.add(cap);
    const lace = new THREE.Mesh(GEO.lace, mat(look.racket, .5)); lace.position.set(s * .052, -.012, .05); foot.add(lace);
    J.legs.push({ hip, knee });
  }
  const torso = new THREE.Group(); torso.position.y = .06; pelvis.add(torso); J.torso = torso;
  const chest = new THREE.Mesh(GEO.torso, shirtM); chest.position.y = .26; chest.scale.set(1.02, 1, .78); torso.add(chest);
  const collar = new THREE.Mesh(GEO.collar, mat(shade(look.shirt, .7), .8)); collar.rotation.x = Math.PI / 2; collar.position.y = .53; collar.scale.set(1, 1.15, 1); torso.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .055, .09, 10), skin); neck.position.y = .57; torso.add(neck);
  const head = new THREE.Group(); head.position.y = .71; torso.add(head); J.head = head;
  const skull = new THREE.Mesh(GEO.skull, skin); skull.scale.set(.9, 1.06, 1); head.add(skull);
  const jaw = new THREE.Mesh(GEO.skull, skin); jaw.scale.set(.62, .5, .7); jaw.position.set(0, -.062, .022); head.add(jaw);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(GEO.brow, hairM); b.rotation.z = Math.PI / 2 + s * .12; b.position.set(s * .04, .045, .104); head.add(b); }
  const mouth = new THREE.Mesh(GEO.brow, mat('#7a3b2e', .6)); mouth.rotation.z = Math.PI / 2; mouth.scale.set(.8, .9, .6); mouth.position.set(0, -.058, .1); head.add(mouth);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), mat('#14161c', .3)); e.position.set(s * .038, .015, .1); head.add(e);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), skin); ear.position.set(s * .108, 0, 0); ear.scale.set(.5, 1, .8); head.add(ear); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.016, .04, 6), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -.012, .115); head.add(nose);
  const hairCap = (sc = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.126 * sc, 20, 12, 0, Math.PI * 2, 0, Math.PI * .58), hairM); m.position.set(0, .016, -.012); m.scale.set(.98, 1.08, 1.08); return m; };
  const st = look.hair;
  if (st === 'short' || st === 'long' || st === 'ponytail' || st === 'headband') head.add(hairCap());
  if (st === 'buzz') { const m = hairCap(.985); m.material = mat(shade(look.hairColor, 1.1), 1); head.add(m); }
  if (st === 'long') { const b = new THREE.Mesh(new THREE.BoxGeometry(.2, .24, .06, 1, 1, 1), hairM); b.position.set(0, -.1, -.085); head.add(b); }
  if (st === 'ponytail') { const k = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), hairM); k.position.set(0, .03, -.125); head.add(k);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.03, .012, .2, 8), hairM); t.position.set(0, -.07, -.145); t.rotation.x = .25; head.add(t); }
  if (st === 'headband') { const b = new THREE.Mesh(new THREE.TorusGeometry(.115, .016, 6, 24), mat(look.racket, .6)); b.rotation.x = Math.PI / 2; b.position.y = .045; head.add(b); }
  if (st === 'cap') { const c = new THREE.Mesh(new THREE.SphereGeometry(.124, 18, 10, 0, Math.PI * 2, 0, Math.PI * .5), mat(look.racket, .6)); c.position.y = .02; head.add(c);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .012, 18, 1, false, -Math.PI / 2, Math.PI), mat(look.racket, .6)); v.position.set(0, .03, .07); v.scale.set(1, 1, .9); head.add(v); }
  J.arms = [];
  for (const s of [-1, 1]) {           // s = -1 is the right arm (model faces +z, so its right is -x)
    const shY = new THREE.Group(); shY.position.set(s * .245, .47, 0); torso.add(shY);
    const shX = new THREE.Group(); shY.add(shX);
    const sleeve = new THREE.Mesh(GEO.sleeve, mat(look.shirt, .8)); sleeve.position.y = -.04; shX.add(sleeve);
    const up = new THREE.Mesh(GEO.upper, skin); up.position.y = -.16; shX.add(up);
    const elbow = new THREE.Group(); elbow.position.y = -.29; shX.add(elbow);
    const fore = new THREE.Mesh(GEO.fore, skin); fore.position.y = -.13; elbow.add(fore);
    const hand = new THREE.Mesh(GEO.hand, skin); hand.scale.set(1, 1.15, .85); hand.position.y = -.28; elbow.add(hand);
    if (s === -1) { const band = new THREE.Mesh(GEO.band, mat(look.racket, .8)); band.rotation.x = Math.PI / 2; band.position.y = -.225; elbow.add(band); }
    const arm = { shY, shX, elbow };
    if (s === -1) { const rk = new THREE.Group(); rk.position.y = -.29; elbow.add(rk);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .14, 8), mat('#1b1b1b', .5)); grip.position.y = -.02; rk.add(grip);
      const throat = new THREE.Mesh(throatGeo, mat(shade(look.racket, .7), .4)); throat.position.y = -.14; rk.add(throat);
      const head = new THREE.Mesh(racketGeo, [mat(look.racket, .4, { metalness: .15 }), mat('#16191f', .35)]); head.position.y = -.02; rk.add(head);
      arm.racket = rk; }
    J.arms.push(arm);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const contact = new THREE.Mesh(GEO.contact, CONTACT_MAT); contact.rotation.x = -Math.PI / 2; contact.position.y = .009; g.add(contact);   // soft shadow that grounds the feet
  const lefty = look.hand === 'L';
  if (lefty) { g.scale.x = -1; const t = shirtM.map; t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.needsUpdate = true; }   // mirror the body; keep the shirt number readable
  if (marker) { const m = new THREE.Mesh(new THREE.RingGeometry(.42, .5, 32), new THREE.MeshBasicMaterial({ color: marker, transparent: true, opacity: .9, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = .012; g.add(m); J.marker = m; }
  // pose state (smoothed)
  J.pose = { rY: -.4, rX: -.75, rE: .6, lY: .35, lX: -.5, lE: .7, tw: 0, legs: [[-.3, .55], [-.3, .55]], py: 0 };
  return { g, J, lefty };
}
function disposeModel(m) { if (!m) return; m.g.parent && m.g.parent.remove(m.g);
  m.g.traverse(o => { if (o.isMesh) { if (o.geometry !== racketGeo && o.geometry !== throatGeo) o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(mm => { if (mm.map) { mm.map.dispose(); mm.dispose(); } }); } }); }
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
// pose solver: swing types fore / back / over / serve, plus ready crouch and run cycle
function animatePlayer(p, dt) {
  const J = p.mesh.J, P = J.pose, k = Math.min(1, dt * 14), t = performance.now() / 1000;
  const sp = Math.hypot(p.vx, p.vz), m = clamp(sp / 4, 0, 1), ph = p.run;
  let rY = -.4, rX = -.75 + Math.sin(ph) * .35 * m, rE = .6, lY = .35, lX = -.45 - Math.sin(ph) * .5 * m, lE = .7, tw = 0, py = -.05 * (1 - m) + Math.sin(t * 2.2 + (p.x || 0)) * .006;
  let lean = .14 * m, side = 0, headX = 0, spread = .07;
  const gy = p.mesh.g.rotation.y, fwd = p.vx * Math.sin(gy) + p.vz * Math.cos(gy), lat = p.vx * Math.cos(gy) - p.vz * Math.sin(gy);
  const shuffle = sp > .6 && Math.abs(lat) > Math.abs(fwd) * 1.15;          // sideways: shuffle steps instead of a running stride
  let legs = [[lerp(-.32, Math.sin(ph) * .8, m), lerp(.6, .25 + Math.max(0, -Math.sin(ph)) * 1.2, m)],
              [lerp(-.32, -Math.sin(ph) * .8, m), lerp(.6, .25 + Math.max(0, Math.sin(ph)) * 1.2, m)]];
  if (shuffle) { const st = Math.abs(Math.sin(ph * .9)); legs = [[-.25 - st * .15, .55 + st * .25], [-.25 - (1 - st) * .15, .55 + (1 - st) * .25]]; spread = .12 + st * .22; lean = .08; rX = -.9; lX = -.7; py -= .05; }
  if (p.prep && !(p.swing > 0)) {           // racket back early, like a real player reading the ball
    if (p.prep === 'fore') { rY = -1.45; rX = -1.0; rE = .7; tw = -.45; lX = -.9; lY = .9; }
    else if (p.prep === 'back') { rY = 1.35; rX = -.95; rE = .9; tw = .5; lX = -.7; lY = .9; }
    else { rX = 2.5; rE = 1.2; lX = 2.9; lY = 0; tw = .25; }
    py -= .04; }
  if (p.split > 0) { const s = clamp(p.split / .24, 0, 1); py += Math.sin(s * Math.PI) * .07; spread = .22; }
  const cy = p.cy == null ? 1 : p.cy, reach = -1.2 - clamp((cy - 1) * .75, -.45, .55);    // arm meets the ball's height
  if (p.prep === 'fore' || p.prep === 'back') { rX = reach + .2; if (cy < .7) py -= (.7 - cy) * .22; }
  if (p.swing > 0) {
    const s = ease(clamp(1 - p.swing / .32, 0, 1));
    if (cy < .7 && p.swingType !== 'over' && p.swingType !== 'serve') { py -= (.7 - cy) * .28; lean += (.7 - cy) * .5; }   // get down to low balls
    switch (p.swingType) {
      case 'fore': rX = lerp(reach, reach - .5, Math.max(0, s - .6) * 2.5); rY = lerp(-1.8, 1.3, s); rE = lerp(.5, s > .7 ? .9 : .15, s); tw = lerp(-.6, .6, s); lX = lerp(-.9, -.4, s); lY = lerp(.9, .4, s); break;
      case 'back': rX = reach + .05; rY = lerp(1.6, -1.1, s); rE = lerp(.9, .15, s); tw = lerp(.6, -.45, s); lX = lerp(-.8, -.3, s); lY = lerp(1.0, .5, s); break;
      case 'over': rY = .1; rX = lerp(2.7, 4.5, s); rE = lerp(1.3, .1, s); tw = lerp(.35, -.25, s); lX = lerp(3.0, .3, s); lY = 0; py = Math.sin(s * Math.PI) * .14;
        legs = [[-.15, .3], [-.15, .3]]; lean = lerp(-.1, .25, s); break;
      case 'serve': rY = -.55; rX = lerp(1.1, -1.25, s); rE = lerp(.35, .15, s); tw = lerp(-.35, .3, s); lX = lerp(-.7, -.2, s); lY = .5;        // underhand, below the waist
        lean = .22; py = -.07; legs = [[-.45, .7], [.15, .35]]; break;
    }
  }
  if (p.lunge > 0) { const s = Math.sin(clamp(p.lunge / .35, 0, 1) * Math.PI); py -= .13 * s; lean += .22 * s; side = (p.lungeDir || 1) * .22 * s;
    legs[0] = [lerp(legs[0][0], -.95, s), lerp(legs[0][1], .95, s)]; legs[1] = [lerp(legs[1][0], .35, s), lerp(legs[1][1], .3, s)]; }
  if (p.celebrate > 0 && !(p.swing > 0)) {
    if (p.celeType === 'win') { const pump = Math.abs(Math.sin(t * 10)); lX = 2.4 + pump * .5; lE = 1.4 + pump * .4; lY = .1; if (p.celebrate > .5) { rX = 2.4; rE = .5; rY = .2; } py += Math.abs(Math.sin(t * 9)) * .05 * clamp(p.celebrate, 0, 1); }
    else { headX = .38; lean = .2; rX = -.25; rE = .2; lX = -.15; lE = .15; } }
  const k2 = Math.min(1, k * (p.swing > 0 ? 3 : 1.6));
  P.rY = lerp(P.rY, rY, k2); P.rX = lerp(P.rX, rX, k2); P.rE = lerp(P.rE, rE, k); P.lY = lerp(P.lY, lY, k); P.lX = lerp(P.lX, lX, k); P.lE = lerp(P.lE, lE, k);
  P.tw = lerp(P.tw, tw, k); P.py = lerp(P.py, py, k);
  for (let i = 0; i < 2; i++) { P.legs[i][0] = lerp(P.legs[i][0], legs[i][0], k); P.legs[i][1] = lerp(P.legs[i][1], legs[i][1], k); }
  const [R_, L_] = J.arms;
  R_.shY.rotation.y = P.rY; R_.shX.rotation.x = P.rX; R_.elbow.rotation.x = -P.rE;
  L_.shY.rotation.y = P.lY; L_.shX.rotation.x = P.lX; L_.elbow.rotation.x = -P.lE;
  if (R_.racket) R_.racket.rotation.set(-.15, 0, 0);
  J.torso.rotation.y = P.tw; J.pelvis.position.y = .9 + P.py;
  J.torso.rotation.x = lerp(J.torso.rotation.x, lean, k); J.torso.rotation.z = lerp(J.torso.rotation.z, side, k); J.head.rotation.x = lerp(J.head.rotation.x, headX, k);
  if (typeof ball !== 'undefined' && p.x != null) { let yaw = Math.atan2(ball.x - p.x, ball.z - p.z) - gy - P.tw; yaw = ((yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;   // eyes on the ball
    J.head.rotation.y = lerp(J.head.rotation.y, clamp(yaw, -.9, .9) * (p.mesh.lefty ? -1 : 1), k); }
  J.legs.forEach((l, i) => { l.hip.rotation.x = P.legs[i][0]; l.knee.rotation.x = P.legs[i][1]; l.hip.rotation.z = lerp(l.hip.rotation.z, (i ? 1 : -1) * spread, k); });
}
