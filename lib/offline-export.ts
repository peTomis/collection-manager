import type { OfflineCatalog, OfflineIndex } from "./offline-data";

// A streaming response keeps the single download bounded to one set in memory.
// The completion marker is required: a disconnected transfer can never become active.
export async function readOfflineExport(response: Response, user: string, onCatalog: (set: string, catalog: OfflineCatalog) => Promise<void>): Promise<OfflineIndex> {
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}). Reload and try again.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let index: OfflineIndex | undefined;
  const received = new Set<string>();
  let complete = false;
  const consume = async (line: string) => {
    if (!line.trim()) return;
    const record = JSON.parse(line);
    if (complete) throw new Error("Invalid offline download.");
    if (record.type === "error") throw new Error(record.message);
    if (record.type === "index") {
      if (
        index ||
        record.user !== user ||
        !Array.isArray(record.index?.sets) ||
        !Array.isArray(record.index?.binders) ||
        !Array.isArray(record.index?.wishlists) ||
        !record.index?.portfolio
      )
        throw new Error("The download does not match your account or is incomplete.");
      index = { ...record.index, cards: [], sealed: [] };
      if (user !== "demo" && [...index!.binders, ...index!.wishlists, index!.portfolio].some((r) => String(r.user) !== user))
        throw new Error("The download does not match your account.");
    } else if (record.type === "catalog") {
      if (!index || received.has(record.set) || !index.sets.some((s) => s._id === record.set)) throw new Error("Unexpected set in offline download.");
      const catalog: OfflineCatalog = record.catalog;
      if (![catalog?.cards, catalog?.sealed, catalog?.historicPrices, catalog?.prices, catalog?.images].every(Array.isArray)) throw new Error("Incomplete offline catalog.");
      await onCatalog(record.set, catalog);
      for (const { _id, name, number, set } of catalog.cards) index.cards.push({ _id, name, number, set });
      index.sealed.push(...catalog.sealed);
      received.add(record.set);
    } else if (record.type === "complete") {
      if (!index || received.size !== index.sets.length) throw new Error("Incomplete offline download.");
      complete = true;
    } else throw new Error("Invalid offline download.");
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        await consume(line);
      }
      if (done) break;
    }
    if (buffer.trim()) await consume(buffer);
    if (!complete || !index) throw new Error("Offline download was interrupted. Please try again.");
    return index;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
