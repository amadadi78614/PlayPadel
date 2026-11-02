# Builds the installable website version (PWA) into ../padelpro/web from padel-doubles-3d.html
import hashlib, json, os, re, shutil
SRC='/home/claude/padel3d/padel-doubles-3d.html'; OUT='/home/claude/padelpro/web'
b=open(SRC).read()
ver=hashlib.sha1(b.encode()).hexdigest()[:10]
head=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
 '<meta name="theme-color" content="#0a1120"><meta name="mobile-web-app-capable" content="yes">'
 '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
 '<meta name="apple-mobile-web-app-title" content="Padel 3D">'
 '<meta name="description" content="Padel Doubles 3D: real padel on your phone. Swipe to hit, bounce serves, glass walls, bandeja, víbora, por cuatro, championships and world rankings.">'
 '<meta property="og:title" content="Padel Doubles 3D"><meta property="og:description" content="Real padel on your phone. Free, no download needed.">'
 '<meta property="og:image" content="icon-512.png">'
 '<link rel="manifest" href="manifest.json"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">'
 '<style>[hidden]{display:none!important}body{margin:0}</style></head><body>\n')
open(os.path.join(OUT,'index.html'),'w').write(head+b+'</body></html>\n')
manifest={"id":"padel-doubles-3d","name":"Padel Doubles 3D","short_name":"Padel 3D","description":"Real padel doubles on your phone: swipe to hit, championships and world rankings.",
 "start_url":"./","scope":"./","display":"fullscreen","display_override":["fullscreen","standalone"],"orientation":"any",
 "background_color":"#0a1120","theme_color":"#0a1120","categories":["games","sports"],
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"},
          {"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
json.dump(manifest,open(os.path.join(OUT,'manifest.json'),'w'),indent=1)
sw='''// Padel Doubles 3D service worker: works offline after the first visit, updates itself on new releases
const CACHE = 'padel3d-%s';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('padel3d-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;                 // rankings + feedback always go to the network
  if (req.mode === 'navigate') {                                                           // the game page: fresh when online, cached when offline
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; }).catch(() => caches.match('index.html')));
    return; }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {                // everything else (three.js, fonts, icons): cache first
    if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; })));
});
''' % ver
open(os.path.join(OUT,'sw.js'),'w').write(sw)
json.dump({"headers":[{"source":"/(.*)","headers":[{"key":"X-Content-Type-Options","value":"nosniff"}]},
  {"source":"/sw.js","headers":[{"key":"Cache-Control","value":"no-cache"}]},
  {"source":"/manifest.json","headers":[{"key":"Content-Type","value":"application/manifest+json"}]}]},open(os.path.join(OUT,'vercel.json'),'w'),indent=1)
import shutil
PLAY='/home/claude/nomz_lpcapture/public/play'
if os.path.isdir(PLAY):
    for n in ['index.html','sw.js','manifest.json','icon-192.png','icon-512.png']: shutil.copy(os.path.join(OUT,n), os.path.join(PLAY,n))
print('web built', ver)
