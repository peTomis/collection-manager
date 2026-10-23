import { apiFetch } from "@/lib/api-fetch";
// Libraries
import { useEffect, useState } from "react";

// Types
import { Card, HistoricPrice, ItemType, Sealed } from "@/types/mongodb";
import { LIMITS } from "@/lib/limits";

export type Product = { kind: ItemType.CARD; item: Card } | { kind: ItemType.SEALED; item: Sealed };

// Card names carry cardmarket disambiguations like "Charizard (Base Set 4)"
export const displayName = (product: Product) => (product.kind === ItemType.CARD ? product.item.name.replace(/\s*\(.*?\)\s*/g, " ").trim() : product.item.name);

// The catalog's shape and keys are plain logic, shared with lib/
import { Catalog, historicPriceKey, priceKey } from "@/lib/catalog";
export { historicPriceKey, priceKey };
export type { Catalog };

const fetchJson = async (url: string, init?: RequestInit) => (await apiFetch(url, init)).json();

// Every card and sealed product of a set, with the prices of all their variants (fetched in batches)
const fetchCatalog = async (user: string, set: string): Promise<Catalog> => {
  const [cardsData, sealedData] = await Promise.all([fetchJson(`/api/cards?user=${user}&set=${set}`), fetchJson(`/api/sealed?user=${user}&set=${set}`)]);
  const cards: Card[] = (cardsData?.cards ?? []).sort((a: Card, b: Card) => a.number - b.number);
  const sealed: Sealed[] = sealedData?.sealed ?? [];

  const items = [
    ...cards.flatMap((c) => c.variants.map((v) => ({ type: ItemType.CARD, item: c._id, language: v.language, variant: v.type }))),
    ...sealed.flatMap((s) => s.variants.map((v) => ({ type: ItemType.SEALED, item: s._id, language: v.language }))),
  ];
  const batches = Array.from({ length: Math.ceil(items.length / LIMITS.HISTORIC_PRICES_BATCH) }, (_, i) =>
    items.slice(i * LIMITS.HISTORIC_PRICES_BATCH, (i + 1) * LIMITS.HISTORIC_PRICES_BATCH)
  );
  const results = await Promise.all(batches.map((batch) => fetchJson(`/api/historic-prices?user=${user}`, { method: "POST", body: JSON.stringify({ items: batch }) })));
  const prices = new Map<string, HistoricPrice>(results.flatMap((r) => (r?.historicPrices ?? []) as HistoricPrice[]).map((p) => [historicPriceKey(p), p]));

  return { cards, sealed, prices };
};

export const useSetCatalog = (user: string | null, set: string | undefined) => {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    if (!user || !set) return;
    let current = true;
    setCatalog(null);
    fetchCatalog(user, set)
      .then((c) => current && setCatalog(c))
      .catch((error) => {
        console.error(error);
        if (current) setCatalog({ cards: [], sealed: [], prices: new Map() });
      });
    // Ignore a slow response for a set the user already left
    return () => {
      current = false;
    };
  }, [user, set]);

  return catalog;
};
