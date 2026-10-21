import { getOfflineMeta } from "./offline";
// Libraries
import { useEffect, useState } from "react";
import TCGdex from "@tcgdex/sdk";
import { localCardImage, tcgdexNumber, tcgdexSetId } from "./tcgdex-ids";

const tcgdex = new TCGdex("en");

// Card image base URLs by card number, e.g. 4 → https://assets.tcgdex.net/en/base/base1/4
export type SetImages = Map<number, string>;

const cache = new Map<string, Promise<SetImages>>();

// One request per set: the set lists every card with its image (the URL needs the series, which we don't store).
// Cards it lists without an image get our own copy, if there is one (CardArt removes itself otherwise).
const fetchSetImages = (setId: string): Promise<SetImages> => {
  // Offline downloads don't include images
  if (getOfflineMeta()?.enabled) return Promise.resolve(new Map());
  const cached = cache.get(setId);
  if (cached) return cached;
  const request = tcgdex.set
    .get(tcgdexSetId(setId))
    .then((set) => {
      const images: SetImages = new Map();
      for (const c of set?.cards ?? []) {
        const number = tcgdexNumber(c.localId);
        if (!Number.isNaN(number)) images.set(number, c.image ?? localCardImage(setId, number));
      }
      return images;
    })
    .catch((error) => {
      console.error(error);
      cache.delete(setId);
      return new Map() as SetImages;
    });
  cache.set(setId, request);
  return request;
};

// Append a quality and format to a card image base URL: TCGdex's, or our own copy, which only has the low one
export const cardImage = (base: string, quality: "low" | "high") =>
  base.startsWith("/cards/") ? `${base}/low.webp` : `${base}/${quality}.${base.startsWith("https://assets.tcgdex.net/en/sv/sv03.5/") ? "png" : "webp"}`;

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
  if (getOfflineMeta()?.enabled) return Promise.resolve({});
  const key = `${setId}|${number}`;
  const cached = infoCache.get(key);
  if (cached) return cached;
  const request = tcgdex.set
    .get(tcgdexSetId(setId))
    .then((set) => set?.cards.find((c) => tcgdexNumber(c.localId) === number))
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
