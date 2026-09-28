// Libraries
import { useEffect, useState } from "react";
import TCGdex from "@tcgdex/sdk";

const tcgdex = new TCGdex("en");

// Card image base URLs by card number, e.g. 4 → https://assets.tcgdex.net/en/base/base1/4
export type SetImages = Map<number, string>;

const cache = new Map<string, Promise<SetImages>>();

// One request per set: the set lists every card with its image (the URL needs the series, which we don't store)
const fetchSetImages = (setId: string): Promise<SetImages> => {
  const cached = cache.get(setId);
  if (cached) return cached;
  const request = tcgdex.set
    .get(setId)
    .then((set) => new Map((set?.cards ?? []).filter((c) => c.image).map((c) => [Number(c.localId), c.image!] as [number, string])))
    .catch((error) => {
      console.error(error);
      cache.delete(setId);
      return new Map() as SetImages;
    });
  cache.set(setId, request);
  return request;
};

// Append a quality and format to a TCGdex image base URL
export const cardImage = (base: string, quality: "low" | "high") => `${base}/${quality}.webp`;

// Images of a set's cards, empty until loaded or when the set isn't on TCGdex (tcgdex id missing or unknown)
export const useSetImages = (setId: string | undefined) => {
  const [images, setImages] = useState<SetImages>(new Map());

  useEffect(() => {
    setImages(new Map());
    if (!setId) return;
    let current = true;
    fetchSetImages(setId).then((i) => current && setImages(i));
    return () => {
      current = false;
    };
  }, [setId]);

  return images;
};

// Images of several sets at once, keyed by TCGdex set id (for lists that mix sets, like wishlists)
export const useSetsImages = (setIds: string[]) => {
  const [images, setImages] = useState<Map<string, SetImages>>(new Map());
  const key = Array.from(new Set(setIds.filter(Boolean))).sort().join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    let current = true;
    Promise.all(ids.map(async (id) => [id, await fetchSetImages(id)] as [string, SetImages])).then((entries) => current && setImages(new Map(entries)));
    return () => {
      current = false;
    };
  }, [key]);

  return images;
};

export interface CardInfo {
  rarity?: string;
  illustrator?: string;
}

const infoCache = new Map<string, Promise<CardInfo>>();

// Rarity and illustrator of one card: the set lists the card's TCGdex id, the card itself has the details
const fetchCardInfo = (setId: string, number: number): Promise<CardInfo> => {
  const key = `${setId}|${number}`;
  const cached = infoCache.get(key);
  if (cached) return cached;
  const request = tcgdex.set
    .get(setId)
    .then((set) => set?.cards.find((c) => Number(c.localId) === number))
    .then((resume) => (resume ? tcgdex.card.get(resume.id) : null))
    .then((card): CardInfo => ({ rarity: card?.rarity || undefined, illustrator: card?.illustrator || undefined }))
    .catch((error) => {
      console.error(error);
      infoCache.delete(key);
      return {};
    });
  infoCache.set(key, request);
  return request;
};

// Details of a card for the item detail, empty until loaded or when TCGdex doesn't know the card
export const useCardInfo = (setId: string | undefined, number: number | undefined) => {
  const [info, setInfo] = useState<CardInfo>({});

  useEffect(() => {
    setInfo({});
    if (!setId || number === undefined) return;
    let current = true;
    fetchCardInfo(setId, number).then((i) => current && setInfo(i));
    return () => {
      current = false;
    };
  }, [setId, number]);

  return info;
};
