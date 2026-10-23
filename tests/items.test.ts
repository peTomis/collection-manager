import { describe, expect, test } from "vitest";
import { ObjectId } from "mongodb";
import { binderAccepts, binderChange, cardNumberLabel, formatCardNumber, mergeMovedItem, parseTarget, setCompletion, summarizeBinder, summarizeWishlist, targetHit } from "@/lib/items";
import { LIMITS } from "@/lib/limits";
import { ItemType } from "@/types/mongodb";
import { binder, binderItem, card, sealed, set, wishlist, wishlistItem } from "./factories";

describe("card numbers", () => {
  test("holo subset cards (1000 + n) show as Hn and never with the set total", () => {
    expect(formatCardNumber(1030)).toBe("H30");
    expect(cardNumberLabel(1030, 32)).toBe("H30");
  });

  test("regular cards show the set total when known", () => {
    expect(cardNumberLabel(4, 102)).toBe("4/102");
    expect(cardNumberLabel(4)).toBe("#4");
  });
});

describe("summarizeBinder", () => {
  test("values owned items by quantity and compares them with their past prices", () => {
    const summary = summarizeBinder(
      binder([
        binderItem({ quantity: 2, price: 15, prices1w: [10], prices1m: [5] }),
        binderItem({ type: ItemType.SEALED, item: sealed(), price: 100, prices1w: [100], prices1m: [125] }),
      ])
    );
    expect(summary.value).toBe(130);
    expect(summary.cards).toBe(2);
    expect(summary.sealed).toBe(1);
    expect(summary.change1w).toBeCloseTo((130 / 120 - 1) * 100);
    expect(summary.change1m).toBeCloseTo((130 / 135 - 1) * 100);
    expect(summary.count).toBe("2 cards · 1 sealed");
  });

  test("missing slots count for nothing but the missing total", () => {
    const summary = summarizeBinder(binder([binderItem({ price: 10 }), binderItem({ owned: false, price: 500 })]));
    expect(summary.value).toBe(10);
    expect(summary.missing).toBe(1);
    expect(summary.count).toBe("1 cards · 1 missing");
  });

  test("an empty binder", () => {
    expect(summarizeBinder(binder([]))).toMatchObject({ value: 0, count: "Empty", change1w: 0, change1m: 0 });
  });
});

describe("binderChange", () => {
  const items = [binderItem({ quantity: 3, price: 20, prices1d: [18], prices1y: [10] }), binderItem({ owned: false, price: 100, prices1d: [1], prices1y: [1] })];

  test("is the change of the owned items over the given period", () => {
    expect(binderChange(binder(items), "1d")).toBeCloseTo((20 / 18 - 1) * 100);
    expect(binderChange(binder(items), "1y")).toBe(100);
  });

  test("is 0 for items without history in the period", () => {
    expect(binderChange(binder(items), "1w")).toBe(0);
    expect(binderChange(binder([]), "1m")).toBe(0);
  });
});

describe("mergeMovedItem", () => {
  test("two owned copies add up, within the quantity limit", () => {
    expect(mergeMovedItem({ quantity: 2, owned: true }, { quantity: 3 })).toEqual({ quantity: 5, owned: true });
    expect(mergeMovedItem({ quantity: LIMITS.QUANTITY, owned: true }, { quantity: 1 })).toEqual({ quantity: LIMITS.QUANTITY, owned: true });
  });

  test("an owned item fills a missing slot", () => {
    expect(mergeMovedItem({ quantity: 2, owned: true }, { quantity: 1, owned: false })).toEqual({ quantity: 2, owned: true });
  });

  test("a missing item moved onto an owned one leaves it as it is", () => {
    expect(mergeMovedItem({ quantity: 1, owned: false }, { quantity: 3 })).toEqual({ quantity: 3, owned: true });
  });

  test("missing onto missing stays missing", () => {
    expect(mergeMovedItem({ quantity: 1, owned: false }, { quantity: 1, owned: false })).toEqual({ quantity: 1, owned: false });
  });
});

describe("binderAccepts", () => {
  const setId = new ObjectId();

  test("a set binder only takes cards of its set", () => {
    const setBinder = binder([], { set: setId });
    expect(binderAccepts(setBinder, ItemType.CARD, card({ set: String(setId) }))).toBe(true);
    expect(binderAccepts(setBinder, ItemType.CARD, card({ set: "other" }))).toBe(false);
    expect(binderAccepts(setBinder, ItemType.SEALED, sealed({ set: String(setId) }))).toBe(false);
  });

  test("any other binder takes everything", () => {
    expect(binderAccepts(binder([]), ItemType.SEALED, sealed())).toBe(true);
  });
});

describe("setCompletion", () => {
  test("counts distinct owned numbers of the set the cards come from", () => {
    const completion = setCompletion(
      binder([binderItem({ item: card({ number: 4 }) }), binderItem({ item: card({ number: 4 }) }), binderItem({ item: card({ number: 5 }), owned: false })]),
      [set({ cards: 102 })]
    );
    expect(completion).toEqual({ set: "Base Set", owned: 1, total: 102, percent: 1 });
  });

  test("is null when the cards come from different sets or the set is unknown", () => {
    expect(setCompletion(binder([binderItem({ item: card({ set: "base" }) }), binderItem({ item: card({ set: "jungle" }) })]), [set()])).toBeNull();
    expect(setCompletion(binder([binderItem()]), [])).toBeNull();
  });
});

describe("parseTarget", () => {
  test("a price rounded to cents, with a dot or a comma", () => {
    expect(parseTarget("12.345")).toBe(12.35);
    expect(parseTarget("12,5")).toBe(12.5);
    expect(parseTarget("0")).toBe(0);
  });

  test("empty is no target, anything else that isn't a price is invalid", () => {
    expect(parseTarget("  ")).toBeUndefined();
    expect(parseTarget("-1")).toBeNull();
    expect(parseTarget("abc")).toBeNull();
  });
});

describe("wishlists", () => {
  test("a target is hit when the price is at or below it", () => {
    expect(targetHit(wishlistItem(10, 10))).toBe(true);
    expect(targetHit(wishlistItem(11, 10))).toBe(false);
    expect(targetHit(wishlistItem(10))).toBe(false);
    expect(targetHit(wishlistItem(0, 10))).toBe(false);
  });

  test("items without a target count at their current price", () => {
    const summary = summarizeWishlist(wishlist([wishlistItem(10, 8), wishlistItem(20), wishlistItem(50, 60, ItemType.SEALED)]));
    expect(summary).toMatchObject({ value: 80, targetValue: 88, count: 3, cards: 2, sealed: 1, label: "3 items" });
    expect(summary.hits).toHaveLength(1);
  });
});
