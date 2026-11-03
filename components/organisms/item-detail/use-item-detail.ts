import { apiFetch } from "@/lib/api-fetch";
// Libraries
import { useEffect, useState } from "react";

// Types
import { Card, CardHistoricPrice, HistoricPrice, ItemType, Price, Sealed, SealedHistoricPrice, VersionOffers } from "@/types/mongodb";
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
    fetchJson(`/api/prices?id=${id}&type=${kind}&language=${language}${variant ? `&variant=${variant}` : ""}`)
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

// Cardmarket listings of one version, for cards only (the scraper collects them for cards above €100).
// "unavailable": the request failed, e.g. in offline mode, whose download doesn't include them.
export const useOffers = (kind: ItemType, historicPrice: HistoricPrice | undefined) => {
  const [offers, setOffers] = useState<VersionOffers | "unavailable" | null>(null);

  const card = kind === ItemType.CARD ? (historicPrice as CardHistoricPrice | undefined) : undefined;
  const id = card?.card;
  const language = card?.language;
  const variant = card?.type;

  useEffect(() => {
    setOffers(null);
    if (!id || !language) return;
    let current = true;
    fetchJson(`/api/offers?id=${id}&type=${ItemType.CARD}&language=${language}${variant ? `&variant=${variant}` : ""}`)
      .then((data: VersionOffers) => current && setOffers(Array.isArray(data?.listed) ? data : "unavailable"))
      .catch(() => current && setOffers("unavailable"));
    return () => {
      current = false;
    };
  }, [id, language, variant]);

  return offers;
};

// Prices of every version of an item, keyed by priceKey. The database already has them in its catalog (`known`).
export const useVersionPrices = (user: string | null, kind: ItemType, item: Card | Sealed, known?: Map<string, HistoricPrice>) => {
  const [fetched, setFetched] = useState<Map<string, HistoricPrice>>(new Map());

  useEffect(() => {
    setFetched(new Map());
    if (known || !user || !item.variants?.length) return;
    let current = true;
    const items = item.variants.slice(0, LIMITS.HISTORIC_PRICES_BATCH).map((v) => ({ type: kind, item: item._id, language: v.language, variant: "type" in v ? v.type : undefined }));
    fetchJson(`/api/historic-prices`, { method: "POST", body: JSON.stringify({ items }) })
      .then((data) => current && setFetched(new Map(((data?.historicPrices ?? []) as HistoricPrice[]).map((p) => [historicPriceKey(p), p]))))
      .catch(console.error);
    return () => {
      current = false;
    };
  }, [user, kind, item._id, known]);

  return known ?? fetched;
};
