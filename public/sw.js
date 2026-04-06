const CACHE = "offertio-v3";
const STATIC = /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/i;

self.addEventListener("install", () => self.skipWaiting());

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
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  // Skip Supabase API and Next.js RSC / route handler requests
  if (url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) return;

  if (STATIC.test(url.pathname)) {
    // Stale-while-revalidate: serve from cache instantly, update in background
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);

        return cached ?? networkPromise;
      })
    );
  }
});
