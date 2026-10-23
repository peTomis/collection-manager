import { describe, expect, test } from "vitest";
import { Catalog, priceKey } from "@/lib/catalog";
import {
  availableLanguages,
  availableVersions,
  candidatesOf,
  listItems,
  newListSummary,
  ownedCountBySet,
  ownedPriceIds,
  parseDiscount,
  pickAvailable,
  selectCandidates,
  setBinderOf,
  toggle,
} from "@/lib/new-list";
import { CardVariantType as V, ItemType, Language as L } from "@/types/mongodb";
import { binder, binderItem, card, historicPrice, sealed } from "./factories";

// Charizard in English (regular and 1st edition) and Italian, Blastoise in English without a price yet, a sealed box in English
const charizard = card({
  _id: "charizard",
  variants: [
    { type: V.REGULAR, language: L.ENGLISH, url: "" },
    { type: V.FIRST_EDITION, language: L.ENGLISH, url: "" },
    { type: V.REGULAR, language: L.ITALIAN, url: "" },
  ],
});
const blastoise = card({ _id: "blastoise", name: "Blastoise", variants: [{ type: V.REGULAR, language: L.ENGLISH, url: "" }] });
const box = sealed({ _id: "box", variants: [{ language: L.ENGLISH, url: "" }] });
const price = (id: string, value: number) => ({ ...historicPrice({ price: value }), _id: id });
const catalog: Catalog = {
  cards: [charizard, blastoise],
  sealed: [box],
  prices: new Map([
    [priceKey("charizard", L.ENGLISH, V.REGULAR), price("cz-en", 100)],
    [priceKey("charizard", L.ENGLISH, V.FIRST_EDITION), price("cz-en-1e", 1000)],
    [priceKey("charizard", L.ITALIAN, V.REGULAR), price("cz-it", 80)],
    [priceKey("box", L.ENGLISH), price("box-en", 500)],
  ]),
};
const ids = (candidates: { historicPrice?: { _id: string } }[]) => candidates.map((c) => c.historicPrice?._id ?? "no price");

describe("what a set offers", () => {
  test("one candidate per version in the chosen languages and versions, cards and sealed by scope", () => {
    expect(ids(candidatesOf(catalog, "cards", [L.ENGLISH], [V.REGULAR]))).toEqual(["cz-en", "no price"]);
    expect(ids(candidatesOf(catalog, "cards", [L.ENGLISH, L.ITALIAN], [V.REGULAR, V.FIRST_EDITION]))).toEqual(["cz-en", "cz-en-1e", "cz-it", "no price"]);
    expect(ids(candidatesOf(catalog, "sealed", [L.ENGLISH], [V.REGULAR]))).toEqual(["box-en"]);
    expect(ids(candidatesOf(catalog, "both", [L.ITALIAN], [V.REGULAR]))).toEqual(["cz-it"]);
  });

  test("languages with something in scope, and versions in the chosen languages", () => {
    expect(availableLanguages(catalog, "cards").map((l) => l.value)).toEqual([L.ENGLISH, L.ITALIAN]);
    expect(availableLanguages(catalog, "sealed").map((l) => l.value)).toEqual([L.ENGLISH]);
    expect(availableVersions(catalog, [L.ENGLISH])).toEqual([V.REGULAR, V.FIRST_EDITION]);
    expect(availableVersions(catalog, [L.ITALIAN])).toEqual([V.REGULAR]);
  });

  test("the chosen options on offer, or the first one offered", () => {
    expect(pickAvailable([L.ITALIAN, L.JAPANESE], [L.ENGLISH, L.ITALIAN])).toEqual([L.ITALIAN]);
    expect(pickAvailable([L.JAPANESE], [L.ENGLISH, L.ITALIAN])).toEqual([L.ENGLISH]);
    expect(pickAvailable([L.ENGLISH], [])).toEqual([]);
  });

  test("toggling keeps at least one", () => {
    expect(toggle([L.ENGLISH], L.ITALIAN)).toEqual([L.ENGLISH, L.ITALIAN]);
    expect(toggle([L.ENGLISH, L.ITALIAN], L.ENGLISH)).toEqual([L.ITALIAN]);
    expect(toggle([L.ENGLISH], L.ENGLISH)).toEqual([L.ENGLISH]);
  });
});

describe("what goes in", () => {
  const candidates = candidatesOf(catalog, "both", [L.ENGLISH], [V.REGULAR, V.FIRST_EDITION]);
  const binders = [
    binder([{ ...binderItem({ item: card({ set: "base" }) }), historicPrice: price("cz-en", 100) }]),
    binder([{ ...binderItem({ owned: false, item: card({ set: "base" }) }), historicPrice: price("cz-en-1e", 1000) }]),
  ];

  test("owned versions are counted by price id, missing slots aren't", () => {
    expect([...ownedPriceIds(binders)]).toEqual(["cz-en"]);
    expect(ownedCountBySet(binders)).toEqual(new Map([["base", 1]]));
  });

  test("items without a price are left out, and owned ones when skipping them", () => {
    const all = selectCandidates(candidates, ownedPriceIds(binders), false);
    expect(ids(all.toAdd)).toEqual(["cz-en", "cz-en-1e", "box-en"]);
    expect(all).toMatchObject({ ownedCount: 1, withoutPrice: 1, total: 1600 });
    expect(ids(selectCandidates(candidates, ownedPriceIds(binders), true).toAdd)).toEqual(["cz-en-1e", "box-en"]);
  });
});

describe("the target discount", () => {
  test("a percentage below 100, empty for none, anything else invalid", () => {
    expect(parseDiscount("10")).toBe(10);
    expect(parseDiscount("12,5")).toBe(12.5);
    expect(parseDiscount(" ")).toBe(0);
    expect(parseDiscount("100")).toBeNull();
    expect(parseDiscount("-5")).toBeNull();
    expect(parseDiscount("abc")).toBeNull();
  });
});

describe("listItems", () => {
  const toAdd = selectCandidates(candidatesOf(catalog, "cards", [L.ENGLISH], [V.REGULAR]), new Set(), false).toAdd;

  test("a binder of missing slots, mirrored by its linked wishlist with targets", () => {
    const { binderItems, wishlistItems } = listItems(toAdd, { type: "binder", missing: true, linked: true, discount: 10 });
    expect(binderItems.map((i) => i.item)).toEqual([{ name: "Charizard", type: ItemType.CARD, item: "charizard", historicPrice: "cz-en", quantity: 1, owned: false }]);
    expect(wishlistItems.map((i) => i.item)).toEqual([{ name: "Charizard", type: ItemType.CARD, item: "charizard", historicPrice: "cz-en", target: 90 }]);
    expect(binderItems[0].details).toEqual({ item: charizard, historicPrice: price("cz-en", 100) });
  });

  test("an owned binder: its linked wishlist starts empty", () => {
    const { binderItems, wishlistItems } = listItems(toAdd, { type: "binder", missing: false, linked: true, discount: 10 });
    expect(binderItems[0].item).not.toHaveProperty("owned");
    expect(wishlistItems).toEqual([]);
  });

  test("a wishlist without targets, and the missing slots of its linked binder", () => {
    const { binderItems, wishlistItems } = listItems(toAdd, { type: "wishlist", missing: false, linked: true, discount: 0 });
    expect(wishlistItems[0].item.target).toBeUndefined();
    expect(binderItems[0].item.owned).toBe(false);
  });

  test("only a cards-only binder is a set binder", () => {
    expect(setBinderOf("base", "cards")).toBe("base");
    expect(setBinderOf("base", "both")).toBeUndefined();
  });
});

describe("newListSummary", () => {
  const binderOptions = { type: "binder" as const, missing: true, linked: false, loading: false, toAdd: 2, total: 0, withoutPrice: 0 };

  test("empty lists", () => {
    expect(newListSummary({ ...binderOptions, set: undefined })).toBe("Starts empty. Add items from the Database.");
    expect(newListSummary({ ...binderOptions, set: undefined, linked: true })).toBe("Both start empty. Missing items stay in sync.");
  });

  test("from a set: loading, too many, nothing, or what will be added", () => {
    const set = { name: "Base Set" };
    expect(newListSummary({ ...binderOptions, set, loading: true })).toBe("Loading Base Set…");
    expect(newListSummary({ ...binderOptions, set, toAdd: 5000 })).toMatch(/^5000 items: a binder holds up to \d+$/);
    expect(newListSummary({ ...binderOptions, set, toAdd: 0 })).toBe("Nothing to add with these options.");
    expect(newListSummary({ ...binderOptions, set, linked: true, withoutPrice: 3 })).toBe("2 slots added as missing, completion tracked · same in a linked wishlist · 3 without a price left out");
    expect(newListSummary({ ...binderOptions, set, missing: false, toAdd: 1 })).toBe("1 item added as owned");
    expect(newListSummary({ ...binderOptions, set, type: "wishlist", missing: false, linked: true, total: 180 })).toBe("2 items · about €180.00 to complete · tracked as missing in a linked binder");
  });
});
