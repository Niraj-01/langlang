// langlang service worker — offline app shell + SRS reviews.
// The feed/reviews run entirely from localStorage, so once the shell is
// cached the app is fully usable offline. API routes are never cached (they
// need the network; the app already degrades gracefully without them).

const CACHE = "langlang-cfe7bc46";
const SHELL = [
  "/",
  "/alphabet",
  "/articles",
  "/boss",
  "/dojo",
  "/draw",
  "/focus",
  "/grammar-de",
  "/hiragana",
  "/kanji",
  "/katakana",
  "/league",
  "/learn",
  "/learn-de",
  "/lesson",
  "/mine",
  "/mistakes",
  "/onboarding",
  "/path",
  "/phrases",
  "/phrases-de",
  "/profile",
  "/progress",
  "/radicals",
  "/reels",
  "/saved",
  "/translate",
  "/translate-de",
  "/vocab-de",
  "/wrapped",
  "/manifest.json",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // always network

  // navigations: network-first, fall back to cached shell so offline loads
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // native pronunciation clips + word illustrations: cache-first, so once a
  // word has been heard/seen ONCE it works offline forever. <audio> elements
  // fetch with a Range header and get a 206 back, which the Cache API refuses
  // to store — so normalize: key by pathname, refetch WITHOUT the range, and
  // answer the media element with the full 200 body (fine for ~7KB clips;
  // every browser accepts a full response to a ranged media request). The
  // manifests need no precache — they're imported into the JS bundle.
  if (url.pathname.startsWith("/audio/") || url.pathname.startsWith("/images/")) {
    event.respondWith(
      caches.match(url.pathname).then(
        (cached) =>
          cached ||
          fetch(url.pathname).then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(url.pathname, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
