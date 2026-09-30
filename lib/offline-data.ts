import type { BinderWithItems, WishlistWithItems, Portfolio, Set as PokemonSet, Card, Sealed, HistoricPrice, Price } from "@/types/mongodb";
export interface OfflineCatalog {
  cards: Card[];
  sealed: Sealed[];
  historicPrices: HistoricPrice[];
  prices: Price[];
  images: [number, string][];
}
export interface OfflineIndex {
  sets: PokemonSet[];
  cards: Pick<Card, "_id" | "name" | "number" | "set">[];
  sealed: Sealed[];
  binders: BinderWithItems[];
  wishlists: WishlistWithItems[];
  portfolio: Portfolio;
}
export const matchesPrice = (price: HistoricPrice | Price, id: string, type: string, language: string, variant?: string | null) =>
  ("card" in price ? type === "card" && price.card === id && price.type === variant : type === "sealed" && price.sealed === id) && price.language === language;
export function offlineSearch(index: OfflineIndex, query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 2 || q.length > 100) return { sets: [], cards: [], sealed: [] };
  return {
    sets: index.sets
      .filter((s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q))
      .sort((a, b) => b.releasedAt - a.releasedAt)
      .slice(0, 5),
    cards: index.cards.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 12),
    sealed: index.sealed.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6),
  };
}
