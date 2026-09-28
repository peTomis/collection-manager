import { BinderItem, BinderWithItems, Card, CardHistoricPrice, CardVariantType, ItemType, Sealed, Set } from "@/types/mongodb";
import { getPastPrice, getPrice } from "@/utils/utils";
import { change } from "@/lib/format";

export const VARIANT_LABELS: Record<CardVariantType, string> = {
  [CardVariantType.FIRST_EDITION]: "1st Edition",
  [CardVariantType.ONE_STAR]: "One Star",
  [CardVariantType.REGULAR]: "Regular",
  [CardVariantType.REVERSE_HOLO]: "Reverse Holo",
  [CardVariantType.SHADOWLESS]: "Shadowless",
  [CardVariantType.TWO_STAR]: "Two Star",
};

export const isSealed = (item: BinderItem) => item.type === ItemType.SEALED;

export const cardNumber = (item: BinderItem) => (isSealed(item) ? undefined : (item.item as Card).number);

// "1st Edition" for cards, the product type ("Booster Box") for sealed
export const variantLabel = (item: BinderItem) =>
  isSealed(item) ? (item.item as Sealed).type ?? "Sealed" : VARIANT_LABELS[(item.historicPrice as CardHistoricPrice)?.type] ?? "";

export const languageLabel = (item: BinderItem) => item.historicPrice?.language?.toUpperCase() ?? "";

export const itemPrice = (item: BinderItem) => (item.historicPrice ? getPrice(item.historicPrice) : 0);

export const summarizeBinder = (binder: BinderWithItems) => {
  let value = 0;
  let value1w = 0;
  let value1m = 0;
  let cards = 0;
  let sealed = 0;
  for (const item of binder.items) {
    if (item.historicPrice) {
      value += getPrice(item.historicPrice) * item.quantity;
      value1w += getPastPrice(item.historicPrice, "1w") * item.quantity;
      value1m += getPastPrice(item.historicPrice, "1m") * item.quantity;
    }
    if (item.type === ItemType.SEALED) sealed += item.quantity;
    else cards += item.quantity;
  }
  const count = [cards && `${cards} cards`, sealed && `${sealed} sealed`].filter(Boolean).join(" · ") || "Empty";
  return { value, cards, sealed, count, change1w: change(value, value1w), change1m: change(value, value1m) };
};

// When every card in the binder comes from one set, how much of that set it holds
export const setCompletion = (binder: BinderWithItems, sets: Set[]) => {
  const cards = binder.items.filter((i) => !isSealed(i));
  if (!cards.length) return null;
  const setId = cards[0].item.set;
  if (cards.some((i) => i.item.set !== setId)) return null;
  const set = sets.find((s) => s._id === setId);
  if (!set?.cards) return null;
  const owned = new globalThis.Set(cards.map((i) => (i.item as Card).number)).size;
  return { set: set.name, owned, total: set.cards, percent: Math.min(100, Math.round((owned / set.cards) * 100)) };
};
