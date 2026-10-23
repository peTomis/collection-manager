import { Binder, BinderWithItems, Card, CardHistoricPrice, CardVariantType, ItemType, ItemWithJoin, Sealed, Set, WishlistItem, WishlistWithItems } from "@/types/mongodb";
import { getPastPrice, getPrice, PricePeriod } from "@/lib/prices";
import { change } from "@/lib/format";
import { LIMITS } from "@/lib/limits";

export const VARIANT_LABELS: Record<CardVariantType, string> = {
  [CardVariantType.FIRST_EDITION]: "1st Edition",
  [CardVariantType.ONE_STAR]: "One Star",
  [CardVariantType.REGULAR]: "Regular",
  [CardVariantType.REVERSE_HOLO]: "Reverse Holo",
  [CardVariantType.SHADOWLESS]: "Shadowless",
  [CardVariantType.TWO_STAR]: "Two Star",
};

export const isSealed = (item: ItemWithJoin) => item.type === ItemType.SEALED;

// Binder items are owned unless they are a missing slot, which counts for nothing but completion
export const isOwned = (item: { owned?: boolean }) => item.owned !== false;

export const cardNumber = (item: ItemWithJoin) => (isSealed(item) ? undefined : (item.item as Card).number);

// Holo subset cards (Aquapolis and Skyridge H1–H32) are stored as 1000 + n, so they sort after the main set: 1030 → "H30".
export const formatCardNumber = (number: number) => (number > 1000 ? `H${number - 1000}` : String(number));
// "4/102" with the set total, "#4" without; holo subset cards have their own numbering, so never a total: "H30".
export const cardNumberLabel = (number: number, total?: number) => (number > 1000 ? formatCardNumber(number) : total ? `${number}/${total}` : `#${number}`);

// "1st Edition" for cards, the product type ("Booster Box") for sealed
export const variantLabel = (item: ItemWithJoin) =>
  isSealed(item) ? (item.item as Sealed).type ?? "Sealed" : VARIANT_LABELS[(item.historicPrice as CardHistoricPrice)?.type] ?? "";

// Local image of a sealed product, if it has one
export const sealedPath = (item: ItemWithJoin) => (isSealed(item) ? (item.item as Sealed).path : undefined);

export const languageLabel = (item: ItemWithJoin) => item.historicPrice?.language?.toUpperCase() ?? "";

export const itemPrice = (item: ItemWithJoin) => (item.historicPrice ? getPrice(item.historicPrice) : 0);

// The set of a set binder, as the string id used by cards (the binder stores an ObjectId, which reaches the client as a string)
export const binderSetId = (binder: Binder) => (binder.set ? String(binder.set) : undefined);

// A set binder only takes cards of its set, any other binder takes everything
export const binderAccepts = (binder: Binder, type: ItemType, item: Card | Sealed) => {
  const set = binderSetId(binder);
  return !set || (type === ItemType.CARD && item.set === set);
};

export const summarizeBinder = (binder: BinderWithItems) => {
  let value = 0;
  let value1w = 0;
  let value1m = 0;
  let cards = 0;
  let sealed = 0;
  let missing = 0;
  for (const item of binder.items) {
    if (!isOwned(item)) {
      missing++;
      continue;
    }
    if (item.historicPrice) {
      value += getPrice(item.historicPrice) * item.quantity;
      value1w += getPastPrice(item.historicPrice, "1w") * item.quantity;
      value1m += getPastPrice(item.historicPrice, "1m") * item.quantity;
    }
    if (item.type === ItemType.SEALED) sealed += item.quantity;
    else cards += item.quantity;
  }
  const count = [cards && `${cards} cards`, sealed && `${sealed} sealed`, missing && `${missing} missing`].filter(Boolean).join(" · ") || "Empty";
  return { value, cards, sealed, missing, count, change1w: change(value, value1w), change1m: change(value, value1m) };
};

// An item moved into a binder that already has the same version: owned wins (an owned item fills a missing slot there),
// and two owned copies add up, within the quantity limit
export const mergeMovedItem = (moved: { quantity: number; owned: boolean }, existing: { quantity: number; owned?: boolean }) => {
  if (!isOwned(existing)) return { quantity: moved.quantity, owned: moved.owned };
  return { quantity: moved.owned ? Math.min(existing.quantity + moved.quantity, LIMITS.QUANTITY) : existing.quantity, owned: true };
};

// Why an item couldn't go into a binder, as the move and "got it" actions report it
export const intoBinderError = (result: "wrong-set" | "full" | "error", binder: string) =>
  result === "full" ? `${binder} is full.` : result === "wrong-set" ? `${binder} doesn't take this item.` : "Couldn't move the item. Try again in a moment.";

// Change of the binder's owned items over a price period, against each item's oldest known price in it
export const binderChange = (binder: BinderWithItems, period: PricePeriod) => {
  let now = 0;
  let then = 0;
  for (const item of binder.items) {
    if (!isOwned(item) || !item.historicPrice) continue;
    now += getPrice(item.historicPrice) * item.quantity;
    then += getPastPrice(item.historicPrice, period) * item.quantity;
  }
  return change(now, then);
};

// How much of a set the binder holds: its own set for a set binder, otherwise the set all its cards come from (if they do)
export const setCompletion = (binder: BinderWithItems, sets: Set[]) => {
  const cards = binder.items.filter((i) => !isSealed(i));
  const setId = binderSetId(binder) ?? cards[0]?.item.set;
  if (!setId || cards.some((i) => i.item.set !== setId)) return null;
  const set = sets.find((s) => s._id === setId);
  if (!set?.cards) return null;
  const owned = new globalThis.Set(cards.filter(isOwned).map((i) => (i.item as Card).number)).size;
  return { set: set.name, owned, total: set.cards, percent: Math.min(100, Math.round((owned / set.cards) * 100)) };
};

// A target price as typed ("12,5" too): rounded to cents, undefined for no target (empty), null when it isn't a price
export const parseTarget = (text: string): number | undefined | null => {
  if (text.trim() === "") return undefined;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
};

// A wishlist item is a "target hit" when its price is at or below the price the user set
export const targetHit = (item: WishlistItem) => item.target !== undefined && itemPrice(item) > 0 && itemPrice(item) <= item.target;

export const summarizeWishlist = (wishlist: WishlistWithItems) => {
  let value = 0;
  let targetValue = 0;
  let sealed = 0;
  for (const item of wishlist.items) {
    const price = itemPrice(item);
    value += price;
    // Items without a target count at their current price
    targetValue += item.target ?? price;
    if (isSealed(item)) sealed++;
  }
  const count = wishlist.items.length;
  return { value, targetValue, count, sealed, cards: count - sealed, hits: wishlist.items.filter(targetHit), label: count === 1 ? "1 item" : `${count} items` };
};
