// Cache only application assets; never cache microphone data or imported user audio.
const CACHE = 'vas-studio-v9';
const ASSETS = ['./','./index.html','./src/styles.css','./src/app.js','./src/engine.js','./src/dsp.js','./src/project-store.js','./src/recording-utils.js','./src/portable-project.js','./src/zip-store.js','./src/timeline.js','./src/tune-lab.js','./src/pitch-display.js','./src/track-clips.js','./src/studio-mixer.js','./src/studio-mixer-ui.js','./src/studio-mixer.css','./src/tune-lab-ui.js','./src/tune-lab.css','./src/audio-import.js','./src/worklets/capture-processor.js','./src/worklets/voice-processor.js','./assets/icon.svg','./manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && ASSETS.some(asset => new URL(asset,self.registration.scope).pathname === new URL(event.request.url).pathname)) {
      const copy=response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
