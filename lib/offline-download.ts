import { DEMO_USER } from "@/types/constants";
import { getOfflineMeta, setOfflineMeta, setOfflineBusy } from "./offline";
import { deleteSnapshot, offlineStore } from "./offline-store";
import { readOfflineExport } from "./offline-export";

const ROUTES = ["/", "/database", "/binders", "/wishlists"];
export async function prepareWorker() {
  // next dev rebuilds on every edit: a cached shell would keep failing Fast Refresh and reload forever.
  if (process.env.NODE_ENV === "development") throw new Error("Offline mode needs a production build (next build && next start).");
  if (!("serviceWorker" in navigator) || !window.isSecureContext) throw new Error("Offline mode needs HTTPS and a browser that supports offline storage.");
  await navigator.serviceWorker.register("/offline-sw.js", { scope: "/" });
  await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error("Offline page setup timed out. Please try again.")), 30000))]);
  if (!navigator.serviceWorker.controller)
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("controllerchange", done);
        resolve();
      };
      const timer = setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", done);
        reject(new Error("Reload this page and try the offline download again."));
      }, 15000);
      navigator.serviceWorker.addEventListener("controllerchange", done);
    });
}
async function checkedFetch(url: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("Download timed out. Check your connection and try again.")), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Download failed (${response.status}). Keep the app online and try again.`);
    // Finish reading the body before clearing the timeout, including on an unreliable connection.
    return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
async function saveShell(cache: Cache, signal: AbortSignal) {
  const resources = new Set<string>();
  for (const route of ROUTES) {
    const response = await checkedFetch(route, signal);
    const html = await response.clone().text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script[src], link[rel=stylesheet], link[rel=preload], link[rel=modulepreload]").forEach((el) => {
      const value = el.getAttribute("src") ?? el.getAttribute("href");
      if (value && new URL(value, location.origin).origin === location.origin) resources.add(new URL(value, location.origin).href);
    });
    await cache.put(route, response);
  }
  // Include fonts and modules already used by this page, including dynamically loaded dependencies.
  performance.getEntriesByType("resource").forEach((entry) => {
    if (new URL(entry.name).origin === location.origin && new URL(entry.name).pathname.startsWith("/_next/static/")) resources.add(entry.name);
  });
  for (const url of resources) {
    const response = await checkedFetch(url, signal);
    if (new URL(url).pathname.endsWith(".css")) {
      const css = await response.clone().text();
      for (const match of css.matchAll(/url\(["']?([^\s)'"\n]+)["']?\)/g)) {
        const asset = new URL(match[1], url);
        if (asset.origin === location.origin) resources.add(asset.href);
      }
    }
    await cache.put(url, response);
  }
}

export async function downloadOffline(user: string, progress: (text: string) => void, signal: AbortSignal) {
  // The server only serves the download to a signed-in account
  if (user === DEMO_USER) throw new Error("Sign in to use offline mode.");
  const id = crypto.randomUUID();
  const previous = getOfflineMeta();
  setOfflineBusy(true);
  try {
    progress("Preparing offline pages…");
    await prepareWorker();
    await navigator.storage?.persist?.();
    const cache = await caches.open(`cm-offline-${id}`);
    await saveShell(cache, signal);
    progress("Downloading the complete database and collection…");
    // Exactly one API operation, including private collection data. Images are left out: they would make the download far larger.
    const response = await fetch(`/api/offline?user=${encodeURIComponent(user)}`, { signal, cache: "no-store" });
    let downloadedSets = 0;
    const index = await readOfflineExport(response, user, async (set, catalog) => {
      signal.throwIfAborted();
      await offlineStore(`${id}:set:${set}`, catalog);
      progress(`Downloading database… ${++downloadedSets} sets saved`);
    });
    progress("Saving binders, wishlists and portfolio…");
    signal.throwIfAborted();
    await offlineStore(`${id}:index`, index);
    signal.throwIfAborted();
    await setOfflineMeta({ id, user, enabled: true, savedAt: Date.now() });
    if (previous) await deleteSnapshot(previous.id).catch(console.error);
    return getOfflineMeta()!;
  } catch (error) {
    await deleteSnapshot(id).catch(console.error);
    if (error instanceof DOMException && error.name === "QuotaExceededError")
      throw new Error("There is not enough storage on this device. Free some space and try the download again.");
    throw error;
  } finally {
    setOfflineBusy(false);
  }
}

export async function disableOffline() {
  const meta = getOfflineMeta();
  if (!meta) return;
  // Do not unlock a stale authenticated screen without confirming the live session.
  const response = await fetch("/api/auth/session", { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Reconnect before turning off offline mode.");
  await setOfflineMeta({ ...meta, enabled: false });
}

export async function clearOfflineDownload() {
  const meta = getOfflineMeta();
  if (!meta) return;
  await setOfflineMeta({ ...meta, enabled: false });
  await deleteSnapshot(meta.id);
  localStorage.removeItem("cm-offline");
}
