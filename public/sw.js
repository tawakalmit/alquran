/* Workbox-based service worker
   - Uses Workbox CDN (v6) for routing and caching strategies
   - Pre-caches a small app shell and applies runtime caching for http(s) resources
   - Skips caching for non-http(s) schemes (e.g. chrome-extension://)
*/

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE_NAME = 'alquran-runtime-cache-v1'
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

if (self.workbox) {
  const {precaching, routing, strategies, core, expiration, cacheableResponse} = workbox

  core.skipWaiting()
  core.clientsClaim()

  // Do not precache app shell or serve cached navigation responses.
  // Force network for navigation and all HTTP(S) requests so revisits
  // precached index.html is available for navigation requests.
  precaching.precacheAndRoute(APP_SHELL.map((url) => ({url, revision: String(Date.now())})))

  // Serve index.html for navigation requests (SPA fallback).
  // Use Workbox's precache cache key to ensure the cached entry is found.
  const precachedIndex = precaching.getCacheKeyForURL('/index.html')
  routing.registerNavigationRoute(precachedIndex, {
    blacklist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  })

  // Force network-only for all same-origin and cross-origin HTTP(S) requests.
  routing.registerRoute(
    ({url}) => (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === self.location.origin,
    new strategies.NetworkFirst({
      cacheName: CACHE_NAME,
      plugins: [
        new expiration.ExpirationPlugin({maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60}),
        new cacheableResponse.CacheableResponsePlugin({statuses: [0, 200]}),
      ],
    }),
  )

  // Runtime caching for cross-origin HTTP(S) assets — StaleWhileRevalidate
  routing.registerRoute(
    ({url}) => (url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== self.location.origin,
    new strategies.StaleWhileRevalidate({
      cacheName: 'external-resources-cache',
      plugins: [new expiration.ExpirationPlugin({maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60})],
    }),
  )

} else {
  // Fallback minimal service worker if Workbox fails to load
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
    )
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ).then(() => self.clients.claim()),
    )
  })

  self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return

    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('/index.html'))),
    )
  })
}
