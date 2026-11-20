/**
 * sw.js — Service Worker ETLE Dishub (cakupan /etle/).
 * - Aset statis (?v=versi): cache-first → buka instan, termasuk saat sinyal lemah.
 * - config.js & halaman: network-first (perubahan URL backend langsung terpakai), cadangan dari cache.
 * - Panggilan API Apps Script, login Google, QR: TIDAK pernah di-cache.
 * Naikkan VERSI bersamaan dengan js/versi.js agar cache lama dibuang.
 */
const VERSI = '1.3.4';
const CACHE = 'etle-' + VERSI;
const FONT = 'sarpras-font';
const ASET = [
  './', './index.html', './manifest.webmanifest',
  '../css/app.css?v=' + VERSI, '../js/versi.js?v=' + VERSI, '../js/core.js?v=' + VERSI, '../js/ui.js?v=' + VERSI,
  '../js/shell.js?v=' + VERSI, '../js/etle.js?v=' + VERSI,
  '../fonts/plus-jakarta-sans-latin.woff2?fv=1', '../fonts/jetbrains-mono-latin.woff2?fv=1',
  '../icons/logo.svg', '../icons/icon-192.png?v=' + VERSI, '../icons/icon-512.png?v=' + VERSI, '../icons/icon-maskable-512.png?v=' + VERSI
];
const LEWAT = /script\.google(usercontent)?\.com|accounts\.google\.com|oauth2\.googleapis|api\.qrserver\.com|tile\.openstreetmap|unpkg\.com|drive\.google\.com|googleusercontent\.com\/d\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASET.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.indexOf('etle-') === 0 && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function jaringanDulu(req, cadangan) {
  return fetch(req).then((res) => {
    if (res && res.ok) { const salin = res.clone(); caches.open(CACHE).then((c) => c.put(req, salin)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: false }).then((r) => r || (cadangan ? caches.match(cadangan) : Response.error())));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (LEWAT.test(url.href)) return;                       // API & layanan luar: langsung ke jaringan

  if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) { // font: pakai cache, segarkan di latar
    e.respondWith(caches.open(FONT).then((c) => c.match(req).then((hit) => {
      const ambil = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || ambil;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') { e.respondWith(jaringanDulu(req, './index.html')); return; }
  if (/\/js\/config\.js$/.test(url.pathname)) { e.respondWith(jaringanDulu(req)); return; }

  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok && url.search.indexOf('v=') > -1) { const salin = res.clone(); caches.open(CACHE).then((c) => c.put(req, salin)); }
    return res;
  })));
});
