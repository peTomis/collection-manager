/* App-shell cache only (no images). Personal API responses are never cached here. */
const DB = "collection-manager-offline";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
async function activeSnapshot() {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("snapshots");
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("snapshots", "readonly");
      const get = tx.objectStore("snapshots").get("active");
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    };
  });
}
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || (url.origin === self.location.origin && url.pathname.startsWith("/api/"))) return;
  event.respondWith(
    (async () => {
      const meta = await activeSnapshot();
      if (!meta?.enabled) return fetch(request);
      const cache = await caches.open(`cm-offline-${meta.id}`);
      let key = request;
      if (request.mode === "navigate" && url.origin === self.location.origin) key = url.pathname;
      const saved = await cache.match(key);
      if (saved) return saved;
      // Images aren't downloaded: fail them at once so the placeholders show, and never let an external resource hang offline browsing.
      if (request.destination === "image") return new Response("", { status: 404 });
      if (url.pathname.startsWith("/_next/webpack-hmr")) return fetch(request);
      return new Response("This resource was not included in the offline download.", { status: 503 });
    })(),
  );
});
