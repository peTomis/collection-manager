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
