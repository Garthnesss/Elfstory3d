// ElfStory app-shell service worker (Phase 6 "reach & refinement",
// Phase 7 offline fix).
//
// Navigations are network-first with a cached-index fallback, so an
// online client always gets the fresh deploy and an offline one still
// boots. Same-origin subresources (the hashed JS/CSS bundle, images,
// the manifest) are cache-first and stored at runtime on first fetch —
// without that, an installed copy offline had the shell HTML but no
// application to run. All paths resolve against the registration
// scope, so the same file works at a domain root or under a sub-path.
// Bump the cache name to retire old shells; activation deletes every
// other cache.

const CACHE_NAME = 'elfstory-shell-v2';
const SHELL_PATHS = ['./', './index.html', './manifest.webmanifest', './icons/emblem.svg'];
const shellUrl = (path) => new URL(path, self.registration.scope).toString();
const INDEX_URL = shellUrl('./index.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_PATHS.map(shellUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    // Fresh page when the network answers; the cached index when it doesn't.
    event.respondWith(
      fetch(request).catch(() => caches.match(INDEX_URL, { ignoreSearch: true }))
    );
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        // Runtime-cache same-origin assets (the app bundle above all) so
        // the next offline boot has the whole game, not just the shell.
        // Hashed bundle filenames make a stale copy impossible to serve
        // for a new deploy: a new index references new asset URLs.
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
