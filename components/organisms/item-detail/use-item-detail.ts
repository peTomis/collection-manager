import { apiFetch } from "@/lib/api-fetch";
// Libraries
import { useEffect, useState } from "react";

// Types
import { Card, CardHistoricPrice, HistoricPrice, ItemType, Price, Sealed, SealedHistoricPrice } from "@/types/mongodb";
import { historicPriceKey } from "@/containers/database/use-set-catalog";
import { LIMITS } from "@/lib/limits";

const fetchJson = async (url: string, init?: RequestInit) => (await apiFetch(url, init)).json();

// Daily price records of one version, oldest first: each one counts the listings available that day
export const useListings = (user: string | null, kind: ItemType, historicPrice: HistoricPrice | undefined) => {
  const [prices, setPrices] = useState<Price[] | null>(null);

  const id = historicPrice ? (kind === ItemType.CARD ? (historicPrice as CardHistoricPrice).card : (historicPrice as SealedHistoricPrice).sealed) : undefined;
  const language = historicPrice?.language;
  const variant = kind === ItemType.CARD ? (historicPrice as CardHistoricPrice | undefined)?.type : undefined;

  useEffect(() => {
    setPrices(null);
    if (!user || !id || !language) return;
    let current = true;
    fetchJson(`/api/prices?user=${user}&id=${id}&type=${kind}&language=${language}${variant ? `&variant=${variant}` : ""}`)
      .then((data) => current && setPrices(data?.prices ?? []))
      .catch((error) => {
        console.error(error);
        if (current) setPrices([]);
      });
    return () => {
      current = false;
    };
  }, [user, kind, id, language, variant]);

  return prices;
};

// Prices of every version of an item, keyed by priceKey. The database already has them in its catalog (`known`).
export const useVersionPrices = (user: string | null, kind: ItemType, item: Card | Sealed, known?: Map<string, HistoricPrice>) => {
  const [fetched, setFetched] = useState<Map<string, HistoricPrice>>(new Map());

  useEffect(() => {
    setFetched(new Map());
    if (known || !user || !item.variants?.length) return;
    let current = true;
    const items = item.variants.slice(0, LIMITS.HISTORIC_PRICES_BATCH).map((v) => ({ type: kind, item: item._id, language: v.language, variant: "type" in v ? v.type : undefined }));
    fetchJson(`/api/historic-prices?user=${user}`, { method: "POST", body: JSON.stringify({ items }) })
      .then((data) => current && setFetched(new Map(((data?.historicPrices ?? []) as HistoricPrice[]).map((p) => [historicPriceKey(p), p]))))
      .catch(console.error);
    return () => {
      current = false;
    };
  }, [user, kind, item._id, known]);

  return known ?? fetched;
};
