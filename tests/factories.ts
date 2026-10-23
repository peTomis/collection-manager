// Minimal collection objects for the tests: only the fields the logic reads, the rest cast away
import { BinderItem, BinderWithItems, Card, CardVariantType, HistoricPrice, ItemType, Language, Sealed, Set, WishlistItem, WishlistWithItems } from "@/types/mongodb";

type Prices = Partial<Pick<HistoricPrice, "price" | "prices1d" | "prices1w" | "prices1m" | "prices1y">>;

export const historicPrice = (prices: Prices = {}): HistoricPrice =>
  ({
    _id: "hp",
    card: "card",
    type: CardVariantType.REGULAR,
    language: Language.ENGLISH,
    price: 0,
    prices1d: [],
    prices1w: [],
    prices1m: [],
    prices1y: [],
    ...prices,
  }) as unknown as HistoricPrice;

export const card = (fields: Partial<Card> = {}): Card => ({ _id: "card", name: "Charizard", number: 4, set: "base", variants: [], ...fields });

export const sealed = (fields: Partial<Sealed> = {}): Sealed => ({ _id: "sealed", name: "Booster Box", set: "base", variants: [], ...fields }) as Sealed;

export const binderItem = (fields: Partial<BinderItem> & Prices = {}): BinderItem => {
  const { price, prices1d, prices1w, prices1m, prices1y, ...rest } = fields;
  return {
    _id: "item",
    name: "Charizard",
    type: ItemType.CARD,
    item: card(),
    historicPrice: historicPrice({ price, prices1d, prices1w, prices1m, prices1y }),
    binder: "binder",
    quantity: 1,
    ...rest,
  };
};

export const binder = (items: BinderItem[], fields: Partial<BinderWithItems> = {}): BinderWithItems =>
  ({ _id: "binder", name: "Binder", items, ...fields }) as BinderWithItems;

export const wishlistItem = (price: number, target?: number, type = ItemType.CARD): WishlistItem => ({
  _id: "wish",
  name: "Charizard",
  type,
  item: type === ItemType.SEALED ? sealed() : card(),
  historicPrice: historicPrice({ price }),
  wishlist: "wishlist",
  target,
});

export const wishlist = (items: WishlistItem[]): WishlistWithItems => ({ _id: "wishlist", name: "Wishlist", items }) as unknown as WishlistWithItems;

export const set = (fields: Partial<Set> = {}): Set => ({ _id: "base", name: "Base Set", cards: 102, ...fields }) as Set;
