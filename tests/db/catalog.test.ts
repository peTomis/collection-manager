// The catalog routes visitors can reach without signing in: cards, sealed, sets, prices and historic prices
import { beforeAll, describe, expect, test, vi } from "vitest";
import { getDb } from "@/lib/mongodb";
import { CardVariantType, ItemType, Language } from "@/types/mongodb";
import { LIMITS } from "@/lib/limits";
import cards from "@/pages/api/cards";
import sealed from "@/pages/api/sealed";
import sets from "@/pages/api/sets";
import prices from "@/pages/api/prices";
import historicPrices from "@/pages/api/historic-prices";
import { seedCatalog } from "./fixtures";
import { call, inOneWindow, visitor } from "./call";

// The session is never read: these routes must work for visitors
vi.mock("@/lib/auth", () => ({ getUserId: vi.fn(() => Promise.reject(new Error("catalog routes must not read the session"))) }));

const CACHED = "public, s-maxage=3600, stale-while-revalidate=86400";

let catalog: Awaited<ReturnType<typeof seedCatalog>>;
beforeAll(async () => {
  catalog = await seedCatalog();
  const db = await getDb();
  // Two days of prices for Charizard, inserted out of order, and one for the booster box
  await db.collection("card-prices").insertMany([
    { card: catalog.charizard.item, language: Language.ENGLISH, type: CardVariantType.REGULAR, price: 310, items: 4, timestamp: 2 },
    { card: catalog.charizard.item, language: Language.ENGLISH, type: CardVariantType.REGULAR, price: 300, items: 5, timestamp: 1 },
    { card: catalog.charizard.item, language: Language.ITALIAN, type: CardVariantType.REGULAR, price: 250, items: 1, timestamp: 1 },
  ]);
  await db.collection("sealed-prices").insertOne({ sealed: catalog.box.item, language: Language.ENGLISH, price: 5000, items: 2, timestamp: 1 });
});


describe("every catalog route", () => {
  test("is open to visitors, needs no user in the query, and only reads", async () => {
    const { base } = catalog.sets;
    expect((await call(cards, { query: { set: String(base) } })).status).toBe(200);
    expect((await call(sealed, { query: { set: String(base) } })).status).toBe(200);
    expect((await call(sets)).status).toBe(200);
    for (const handler of [cards, sealed, sets, prices]) {
      const refused = await call(handler, { method: "POST", body: {} });
      expect(refused.status).toBe(405);
      expect(refused.headers.Allow).toBe("GET");
    }
    expect((await call(historicPrices, { method: "DELETE" })).status).toBe(405);
  });
});

describe("/api/cards", () => {
  test("one card by id, or the cards of a set, cached", async () => {
    const one = await call(cards, { query: { id: catalog.charizard.item } });
    expect(one.body.card.name).toBe("Charizard");
    expect(one.headers["Cache-Control"]).toBe(CACHED);
    const ofSet = await call(cards, { query: { set: String(catalog.sets.base) } });
    expect(ofSet.body.cards.map((c: { name: string }) => c.name).sort()).toEqual(["Blastoise", "Charizard"]);
    expect(ofSet.headers["Cache-Control"]).toBe(CACHED);
  });

  test("refuses malformed ids and a missing set", async () => {
    expect((await call(cards, { query: { id: "nope" } })).status).toBe(400);
    expect((await call(cards, { query: { id: "zz".repeat(12) } })).status).toBe(400);
    expect((await call(cards)).status).toBe(400);
  });
});

describe("/api/sealed", () => {
  test("one product by id, or the products of a set or a type", async () => {
    expect((await call(sealed, { query: { id: catalog.box.item } })).body.sealed.name).toBe("Booster Box");
    expect((await call(sealed, { query: { set: String(catalog.sets.base) } })).body.sealed).toHaveLength(1);
    expect((await call(sealed, { query: { set: String(catalog.sets.jungle) } })).body.sealed).toEqual([]);
    const byType = await call(sealed, { query: { type: "Booster Box" } });
    expect(byType.body.sealed.map((s: { _id: string }) => s._id)).toContain(catalog.box.item);
  });

  test("refuses malformed ids and a request without set or type", async () => {
    expect((await call(sealed, { query: { id: "nope" } })).status).toBe(400);
    expect((await call(sealed)).status).toBe(400);
  });
});

describe("/api/sets", () => {
  test("all sets, or one by id", async () => {
    const all = await call(sets);
    expect(all.body.sets.map((s: { _id: string }) => String(s._id))).toEqual(expect.arrayContaining([String(catalog.sets.base), String(catalog.sets.jungle)]));
    expect((await call(sets, { query: { id: String(catalog.sets.jungle) } })).body.set.name).toBe("Jungle");
    expect((await call(sets, { query: { id: "nope" } })).status).toBe(400);
  });
});

describe("/api/prices", () => {
  const charizard = () => ({ id: catalog.charizard.item, type: ItemType.CARD, language: Language.ENGLISH, variant: CardVariantType.REGULAR });

  test("the daily prices of one version, oldest first, cached", async () => {
    const card = await call(prices, { query: charizard(), headers: visitor() });
    expect(card.body.prices.map((p: { price: number }) => p.price)).toEqual([300, 310]);
    expect(card.headers["Cache-Control"]).toBe(CACHED);
    const italian = await call(prices, { query: { ...charizard(), language: Language.ITALIAN }, headers: visitor() });
    expect(italian.body.prices.map((p: { price: number }) => p.price)).toEqual([250]);
    const box = await call(prices, { query: { id: catalog.box.item, type: ItemType.SEALED, language: Language.ENGLISH }, headers: visitor() });
    expect(box.body.prices.map((p: { price: number }) => p.price)).toEqual([5000]);
  });

  test("refuses anything but a well-formed version", async () => {
    const headers = visitor();
    for (const query of [
      { ...charizard(), id: "nope" },
      { ...charizard(), type: "bulk" },
      { ...charizard(), language: "fr" },
      { ...charizard(), variant: "holo" },
      { id: catalog.charizard.item, type: ItemType.CARD },
    ]) {
      expect((await call(prices, { query, headers })).status).toBe(400);
    }
  });

  test("limits each address, without caching the refusal", async () => {
    inOneWindow();
    const headers = visitor();
    for (let i = 0; i < 120; i++) expect((await call(prices, { query: charizard(), headers })).status).toBe(200);
    const limited = await call(prices, { query: charizard(), headers });
    expect(limited.status).toBe(429);
    expect(limited.headers["Cache-Control"]).toBe("no-store");
    expect(Number(limited.headers["Retry-After"])).toBeGreaterThan(0);
    expect((await call(prices, { query: charizard(), headers: visitor() })).status).toBe(200);
  });
});

describe("/api/historic-prices", () => {
  const versions = () => [
    { type: ItemType.CARD, item: catalog.charizard.item, language: Language.ENGLISH, variant: CardVariantType.REGULAR },
    { type: ItemType.SEALED, item: catalog.box.item, language: Language.ENGLISH },
  ];

  test("a batch of versions, cards and sealed together, with the body as JSON or as text", async () => {
    const asJson = await call(historicPrices, { method: "POST", body: { items: versions() }, headers: visitor() });
    expect(asJson.status).toBe(200);
    expect(asJson.body.historicPrices.map((p: { _id: string }) => String(p._id)).sort()).toEqual([catalog.charizard.historicPrice, catalog.box.historicPrice].sort());
    // The client posts a string without a content type
    const asText = await call(historicPrices, { method: "POST", body: JSON.stringify({ items: versions() }), json: false, headers: visitor() });
    expect(asText.body.historicPrices).toHaveLength(2);
  });

  test("refuses malformed batches, oversized ones and query operators", async () => {
    const headers = visitor();
    const post = (body: unknown) => call(historicPrices, { method: "POST", body, headers });
    expect((await post({})).status).toBe(400);
    expect((await call(historicPrices, { method: "POST", body: "{not json", json: false, headers })).status).toBe(400);
    expect((await post({ items: [{ ...versions()[0], item: { $ne: null } }] })).status).toBe(400);
    expect((await post({ items: [{ ...versions()[0], language: { $exists: true } }] })).status).toBe(400);
    expect((await post({ items: Array.from({ length: LIMITS.HISTORIC_PRICES_BATCH + 1 }, () => versions()[0]) })).status).toBe(400);
  });

  test("unknown fields never reach the query", async () => {
    const result = await call(historicPrices, { method: "POST", body: { items: [{ ...versions()[0], card: { $ne: null }, $where: "1" }] }, headers: visitor() });
    expect(result.status).toBe(200);
    expect(result.body.historicPrices.map((p: { _id: string }) => String(p._id))).toEqual([catalog.charizard.historicPrice]);
  });

  test("one version by query, cached, and validated like the prices", async () => {
    const one = await call(historicPrices, { query: { id: catalog.box.item, type: ItemType.SEALED, language: Language.ENGLISH }, headers: visitor() });
    expect(String(one.body.historicPrice._id)).toBe(catalog.box.historicPrice);
    expect(one.headers["Cache-Control"]).toBe(CACHED);
    expect((await call(historicPrices, { query: { id: catalog.box.item, type: "bulk", language: Language.ENGLISH }, headers: visitor() })).status).toBe(400);
  });

  test("limits batches per address", async () => {
    inOneWindow();
    const headers = visitor();
    for (let i = 0; i < 60; i++) expect((await call(historicPrices, { method: "POST", body: { items: versions() }, headers })).status).toBe(200);
    const limited = await call(historicPrices, { method: "POST", body: { items: versions() }, headers });
    expect(limited.status).toBe(429);
    expect(limited.headers["Cache-Control"]).toBe("no-store");
    // Another address isn't affected
    expect((await call(historicPrices, { method: "POST", body: { items: versions() }, headers: visitor() })).status).toBe(200);
  });
});
