/* Only public application files are cached. Account APIs always use the network. */
const VERSION = '0.24.0';
const CACHE = 'echo-shell-' + VERSION;
const ROOT = new URL('./', self.location.href);
const ASSETS = ['index.html','supabase.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
const assetURLs = new Set(ASSETS.map(path => new URL(path, ROOT).href));
const HTML = new URL('index.html', ROOT).href;
self.addEventListener('install', event => event.waitUntil((async () => {
  const responses = await Promise.all(ASSETS.map(async path => {
    const url = new URL(path, ROOT).href;
    const response = await fetch(url, {cache:'reload', credentials:'omit'});
    if (!response.ok || response.redirected) throw new Error('Shell unavailable');
    if (path === 'index.html' && !(await response.clone().text()).includes('const APP_VERSION = "' + VERSION + '"')) throw new Error('Version mismatch');
    return [url,response];
  }));
  const cache = await caches.open(CACHE);
  await Promise.all(responses.map(([url,response]) => cache.put(url,response)));
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('echo-shell-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
// No automatic skipWaiting: open answers must never be interrupted by an update.
self.addEventListener('message', event => {
  if (event.data?.type === 'ECHO_APPLY_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin) return;
  if (request.mode === 'navigate' && [ROOT.pathname, new URL(HTML).pathname].includes(url.pathname)) {
    event.respondWith((async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        try {
          const response = await fetch(request, {signal:controller.signal, cache:'no-cache'});
          if (!response.ok) throw new Error('Navigation unavailable');
          return response; // Never store auth URLs, tokens, or navigation responses.
        } finally { clearTimeout(timer); }
      } catch (error) {
        const cached = await caches.match(HTML, {cacheName:CACHE});
        if (cached) return cached;
        throw error;
      }
    })());
  } else if (!url.search && assetURLs.has(url.href)) {
    event.respondWith(caches.match(url.href, {cacheName:CACHE}).then(cached => cached || fetch(request)));
  }
});
