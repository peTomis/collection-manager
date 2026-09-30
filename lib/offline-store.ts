// Browser-only storage. Each completed download has its own namespace; partial downloads never replace it.
export const OFFLINE_DB = "collection-manager-offline";
export const OFFLINE_META = "cm-offline";
export interface OfflineMeta {
  id: string;
  user: string;
  savedAt: number;
  enabled: boolean;
  missingImages: number;
}
export const openOfflineDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("snapshots");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
export async function offlineStore<T>(key: string, value?: T): Promise<T | undefined> {
  const db = await openOfflineDB();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction("snapshots", value === undefined ? "readonly" : "readwrite");
      const request = value === undefined ? tx.objectStore("snapshots").get(key) : tx.objectStore("snapshots").put(value, key);
      tx.oncomplete = () => resolve(value === undefined ? request.result : value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Offline storage was interrupted."));
    });
  } finally {
    db.close();
  }
}
export async function deleteSnapshot(id: string) {
  const db = await openOfflineDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("snapshots", "readwrite");
      const store = tx.objectStore("snapshots");
      const request = store.openCursor(IDBKeyRange.bound(`${id}:`, `${id}:\uffff`));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await caches.delete(`cm-offline-${id}`);
  } finally {
    db.close();
  }
}

// Share concurrent reads of the same set (the catalog requests prices in several batches).
const reads = new Map<string, Promise<unknown>>();
export function readOffline<T>(key: string): Promise<T | undefined> {
  let pending = reads.get(key);
  if (!pending) {
    pending = offlineStore<T>(key).catch((error) => {
      reads.delete(key);
      throw error;
    });
    reads.set(key, pending);
    if (reads.size > 4) reads.delete(reads.keys().next().value!);
  }
  return pending as Promise<T | undefined>;
}
