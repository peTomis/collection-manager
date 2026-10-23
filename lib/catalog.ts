import { Card, CardHistoricPrice, CardVariantType, HistoricPrice, Language, Sealed, SealedHistoricPrice } from "@/types/mongodb";

// Every card and sealed product of a set, with the prices of all their versions (loaded by containers/database/use-set-catalog.ts)
export interface Catalog {
  cards: Card[];
  sealed: Sealed[];
  prices: Map<string, HistoricPrice>;
}

// Key of a price in the catalog: one per item, language and (for cards) variant type
export const priceKey = (item: string, language: Language, type?: CardVariantType) => `${item}|${language}|${type ?? ""}`;

export const historicPriceKey = (price: HistoricPrice) =>
  "card" in price ? priceKey(price.card, price.language, (price as CardHistoricPrice).type) : priceKey((price as SealedHistoricPrice).sealed, price.language);
