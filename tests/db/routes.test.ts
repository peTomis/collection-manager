// The API routes end to end on the throwaway database. Only the session is faked: getUserId returns whoever is "signed in".
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { ObjectId } from "mongodb";
import { getUserId } from "@/lib/auth";
import binders from "@/pages/api/binders";
import wishlists from "@/pages/api/wishlists";
import search from "@/pages/api/search";
import portfolios from "@/pages/api/portfolios";
import { fetchPortfolio } from "@/lib/db/portfolios";
import { LIMITS } from "@/lib/limits";
import { newUser, seedCatalog } from "./fixtures";
import { call, inOneWindow, visitor } from "./call";

vi.mock("@/lib/auth", () => ({ getUserId: vi.fn() }));

let catalog: Awaited<ReturnType<typeof seedCatalog>>;
let user: ObjectId;
beforeAll(async () => {
  catalog = await seedCatalog();
});
beforeEach(() => {
  user = newUser();
  vi.mocked(getUserId).mockResolvedValue(user);
});

describe("every collection route", () => {
  test("needs a session, only takes its methods, and writes only as JSON", async () => {
    for (const handler of [binders, wishlists]) {
      vi.mocked(getUserId).mockResolvedValueOnce(null);
      expect((await call(handler)).status).toBe(401);
      const put = await call(handler, { method: "PUT" });
      expect(put.status).toBe(405);
      expect(put.headers.Allow).toBe("GET, POST, DELETE");
      // A plain form post (no JSON content type) is refused: other origins can send those with the cookie
      expect((await call(handler, { method: "POST", body: "name=x", json: false })).status).toBe(415);
    }
  });

  test("works on the session's user, whatever user the query names", async () => {
    const created = await call(binders, { method: "POST", body: { binder: { name: "Mine" } } });
    expect(created.status).toBe(201);
    vi.mocked(getUserId).mockResolvedValue(newUser());
    const other = await call(binders, { query: { user: String(user), withcards: "true" } });
    expect(other.body.items).toEqual([]);
  });
});

describe("/api/binders", () => {
  test("validates what it stores", async () => {
    const post = (body: unknown) => call(binders, { method: "POST", body });
    expect((await post({ binder: { name: " " } })).status).toBe(400);
    expect((await post({ binder: { name: "x".repeat(LIMITS.NAME_LENGTH + 1) } })).status).toBe(400);
    expect((await post({ binder: { name: "Ok", set: "not-an-id" } })).status).toBe(400);
    expect((await post({ binder: { name: "Ok", set: String(new ObjectId()) } })).status).toBe(400);
    expect((await post({ binder: { name: "Ok" }, items: [{ ...catalog.charizard, quantity: 0 }] })).status).toBe(400);
    expect((await post({ binder: { name: "Ok" }, items: [{ ...catalog.charizard, quantity: 1, $where: "1" }] })).status).toBe(400);
    expect((await post({ move: { id: "x", from: "y", to: "z", quantity: 1, owned: true } })).status).toBe(400);
    expect((await post({ unknown: true })).status).toBe(400);
    expect((await call(binders, { method: "DELETE", query: { id: "nope" } })).status).toBe(400);
  });

  test("creates a set binder, refuses what doesn't fit it, and moves items, keeping the portfolio in step", async () => {
    const set = await call(binders, { method: "POST", body: { binder: { name: "Base Set", set: String(catalog.sets.base) }, items: [{ ...catalog.charizard, quantity: 2 }] } });
    expect(set.status).toBe(201);
    const setBinder = set.body.item._id;
    expect((await call(binders, { method: "POST", body: { binder: { name: "Bad", set: String(catalog.sets.base) }, items: [{ ...catalog.scyther, quantity: 1 }] } })).status).toBe(422);
    expect((await call(binders, { method: "POST", body: { item: { ...catalog.scyther, binder: setBinder, quantity: 1 } } })).status).toBe(422);
    expect((await call(binders, { method: "POST", body: { item: { ...catalog.charizard, historicPrice: catalog.blastoise.historicPrice, binder: setBinder, quantity: 1 } } })).status).toBe(422);
    expect((await fetchPortfolio(user)).value).toBe(600);

    const other = (await call(binders, { method: "POST", body: { binder: { name: "Other" } } })).body.item._id;
    const list = await call(binders, { query: { withcards: "true" } });
    const item = list.body.items.find((b: { _id: unknown }) => String(b._id) === setBinder).items[0]._id;
    const moved = await call(binders, { method: "POST", body: { move: { id: String(item), from: setBinder, to: other, quantity: 3, owned: true } } });
    expect(moved.status).toBe(200);
    expect((await fetchPortfolio(user)).value).toBe(900);
    expect((await call(binders, { method: "POST", body: { move: { id: String(item), from: setBinder, to: other, quantity: 1, owned: true } } })).status).toBe(404);
  });
});

describe("/api/wishlists", () => {
  test("got it: into the binder, off the wishlist, and into the portfolio", async () => {
    const wishlist = (await call(wishlists, { method: "POST", body: { wishlist: { name: "Chase" }, items: [{ ...catalog.box, target: 4000 }] } })).body.item._id;
    const binder = (await call(binders, { method: "POST", body: { binder: { name: "Vault" } } })).body.item._id;
    const list = await call(wishlists, { query: { withcards: "true" } });
    const item = String(list.body.items[0].items[0]._id);

    expect((await call(wishlists, { method: "POST", body: { acquire: { id: item, wishlist, binder: "nope" } } })).status).toBe(400);
    expect((await call(wishlists, { method: "POST", body: { acquire: { id: item, wishlist, binder } } })).status).toBe(200);
    expect((await call(wishlists, { query: { withcards: "true" } })).body.items[0].items).toEqual([]);
    expect((await fetchPortfolio(user)).sealedValue).toBe(5000);
  });

  test("validates targets", async () => {
    const wishlist = (await call(wishlists, { method: "POST", body: { wishlist: { name: "W" } } })).body.item._id;
    expect((await call(wishlists, { method: "POST", body: { item: { ...catalog.charizard, wishlist, target: -1 } } })).status).toBe(400);
    expect((await call(wishlists, { method: "POST", body: { item: { ...catalog.charizard, wishlist, target: 250 } } })).status).toBe(201);
  });
});

describe("/api/portfolios", () => {
  test("is the session user's portfolio, and needs a session", async () => {
    const binder = (await call(binders, { method: "POST", body: { binder: { name: "Vault" }, items: [{ ...catalog.charizard, quantity: 2 }] } })).body.item._id;
    expect(binder).toBeTruthy();
    const portfolio = await call(portfolios);
    expect(portfolio.body.portfolio).toMatchObject({ user: String(user), cardsValue: 600, cardsQuantity: 2, value: 600 });
    expect((await call(portfolios, { method: "POST", body: {} })).status).toBe(405);
    vi.mocked(getUserId).mockResolvedValueOnce(null);
    expect((await call(portfolios)).status).toBe(401);
  });
});

describe("/api/search", () => {
  test("finds the catalog by name, and limits each address", async () => {
    inOneWindow();
    const headers = visitor();
    const found = await call(search, { query: { q: "chari" }, headers });
    expect(found.body.cards.map((c: { name: string }) => c.name)).toContain("Charizard");
    for (let i = 1; i < 60; i++) expect((await call(search, { query: { q: "chari" }, headers })).status).toBe(200);
    const limited = await call(search, { query: { q: "chari" }, headers });
    expect(limited.status).toBe(429);
    expect(limited.headers["Cache-Control"]).toBe("no-store");
    // Another address isn't affected
    expect((await call(search, { query: { q: "chari" }, headers: visitor() })).status).toBe(200);
  });
});
