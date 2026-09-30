import { getOfflineMeta, isReadOnly } from "./offline";
import { readOffline } from "./offline-store";
import { OfflineCatalog, OfflineIndex, matchesPrice, offlineSearch } from "./offline-data";

// Every application API read goes through this boundary. The snapshot never falls back to live data.
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = new URL(input, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  const method = (init?.method ?? "GET").toUpperCase();
  const read = method === "GET" || (url.pathname === "/api/historic-prices" && method === "POST");
  if (!read && isReadOnly()) throw new Error("Collection editing is locked in offline mode.");
  const meta = getOfflineMeta();
  if (!meta?.enabled) return fetch(input, init);
  if (!read) throw new Error("Offline mode is read-only.");
  const user = url.searchParams.get("user");
  if (user && user !== meta.user) throw new Error("This offline download belongs to another account.");
  const index = await readOffline<OfflineIndex>(`${meta.id}:index`);
  if (!index) throw new Error("Offline download is missing. Reconnect and download it again in Settings.");
  const p = url.searchParams;
  const id = p.get("id");
  const catalog = async (set: string | undefined | null) => {
    if (!set) throw new Error("Item is not included in the offline catalog.");
    const result = await readOffline<OfflineCatalog>(`${meta.id}:set:${set}`);
    if (!result) throw new Error("Offline set is missing. Download again in Settings.");
    return result;
  };
  const setFor = (item: string, type: string) => (type === "card" ? index.cards : index.sealed).find((c) => c._id === item)?.set;
  let data: unknown;
  switch (url.pathname) {
    case "/api/sets":
      data = id ? { set: index.sets.find((s) => s._id === id) } : { sets: index.sets };
      break;
    case "/api/binders":
      data = { items: index.binders };
      break;
    case "/api/wishlists":
      data = { items: index.wishlists };
      break;
    case "/api/portfolios":
      data = { portfolio: index.portfolio };
      break;
    case "/api/search":
      data = offlineSearch(index, p.get("q") ?? "");
      break;
    case "/api/cards": {
      const c = await catalog(p.get("set") ?? setFor(id ?? "", "card"));
      data = id ? { card: c.cards.find((c) => c._id === id) } : { cards: c.cards };
      break;
    }
    case "/api/sealed":
      data = {
        sealed: id ? index.sealed.find((s) => s._id === id) : index.sealed.filter((s) => (p.has("set") ? s.set === p.get("set") : !p.has("type") || s.type === p.get("type"))),
      };
      break;
    case "/api/historic-prices": {
      if (method === "POST") {
        const { items } = JSON.parse(String(init?.body ?? "{}")) as { items: { item: string; type: string; language: string; variant?: string }[] };
        const groups = new Map<string, typeof items>();
        for (const item of items) {
          const set = setFor(item.item, item.type);
          if (set) groups.set(set, [...(groups.get(set) ?? []), item]);
        }
        const prices = await Promise.all(
          [...groups].map(async ([set, requests]) =>
            (await catalog(set)).historicPrices.filter((h) => requests.some((r) => matchesPrice(h, r.item, r.type, r.language, r.variant))),
          ),
        );
        data = { historicPrices: prices.flat() };
      } else {
        const c = await catalog(setFor(id ?? "", p.get("type") ?? ""));
        data = { historicPrice: c.historicPrices.find((h) => matchesPrice(h, id ?? "", p.get("type") ?? "", p.get("language") ?? "", p.get("variant"))) };
      }
      break;
    }
    case "/api/prices": {
      const c = await catalog(setFor(id ?? "", p.get("type") ?? ""));
      data = {
        prices: c.prices.filter((h) => matchesPrice(h, id ?? "", p.get("type") ?? "", p.get("language") ?? "", p.get("variant"))).sort((a, b) => a.timestamp - b.timestamp),
      };
      break;
    }
    default:
      throw new Error(`This resource is unavailable offline: ${url.pathname}`);
  }
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}
