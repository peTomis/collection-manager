// Demo mode (lib/demo-collection.ts) re-implements the collection rules in the browser. The same scenarios run against it
// and against the API routes the signed-in client calls, and must leave the same collection and the same answers.
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getUserId } from "@/lib/auth";
import binders from "@/pages/api/binders";
import wishlists from "@/pages/api/wishlists";
import * as demo from "@/lib/demo-collection";
import { LIMITS } from "@/lib/limits";
import { BinderWithItems, WishlistWithItems } from "@/types/mongodb";
import { newUser, seedCatalog, Version } from "./fixtures";
import { call } from "./call";

vi.mock("@/lib/auth", () => ({ getUserId: vi.fn() }));

// The demo runs in a browser: give it a localStorage
const storage = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) },
  addEventListener: () => {},
  removeEventListener: () => {},
});

type Catalog = Awaited<ReturnType<typeof seedCatalog>>;

// What both sides are asked to do. Ids are each side's own; ok: whether the change was accepted.
interface Collection {
  createBinder(name: string, options?: { set?: ObjectId; wishlist?: string; items?: { version: Version; quantity: number; owned?: boolean }[] }): Promise<string | null>;
  createWishlist(name: string, options?: { binder?: string; items?: { version: Version; target?: number }[] }): Promise<string | null>;
  addToBinder(binder: string, version: Version, quantity: number, owned?: boolean): Promise<boolean>;
  changeQuantity(binder: string, version: Version, quantity: number, owned?: boolean): Promise<boolean>;
  deleteFromBinder(binder: string, versions: Version[]): Promise<void>;
  // "moved" / "acquired", or why not: "wrong-set", "full", "not-found"
  move(from: string, to: string, version: Version, quantity: number, owned: boolean): Promise<string>;
  addToWishlist(wishlist: string, version: Version, target?: number): Promise<boolean>;
  setTarget(wishlist: string, version: Version, target?: number): Promise<void>;
  deleteFromWishlist(wishlist: string, version: Version): Promise<void>;
  acquire(wishlist: string, version: Version, binder: string): Promise<string>;
  rename(type: "binder" | "wishlist", id: string, name: string): Promise<void>;
  unlink(binder: string): Promise<void>;
  removeSet(binder: string): Promise<void>;
  deleteBinder(id: string): Promise<void>;
  deleteWishlist(id: string): Promise<void>;
  lists(): Promise<{ binders: BinderWithItems[]; wishlists: WishlistWithItems[] }>;
}

// The route's status as the reason the demo gives (redux/slices/ maps both the same way)
const reason = (done: string, status: number) => ({ 200: done, 422: "wrong-set", 409: "full", 404: "not-found" })[status] ?? `status ${status}`;

const priceOf = (item: { historicPrice: unknown }) => String((item.historicPrice as { _id: string })._id);
const itemId = (list: { items: { _id: string; historicPrice: unknown }[] } | undefined, version: Version) => {
  const item = list?.items.find((i) => priceOf(i) === version.historicPrice);
  if (!item) throw new Error(`${version.name} is not in the list`);
  return String(item._id);
};

// The collection as the user sees it: lists by name, their link and set, their items by name with quantity, ownership and target
const snapshot = async (collection: Collection, catalog: Catalog) => {
  const { binders, wishlists } = await collection.lists();
  const setName = (set: unknown) => (set ? (String(set) === String(catalog.sets.base) ? "Base Set" : "Jungle") : null);
  const nameOf = (lists: { _id: string; name: string }[], id?: string) => lists.find((l) => String(l._id) === String(id))?.name ?? null;
  return {
    binders: binders
      .map((b) => ({
        name: b.name,
        set: setName(b.set),
        wishlist: nameOf(wishlists, b.wishlist),
        items: b.items.map((i) => `${i.name} x${i.quantity}${i.owned === false ? " missing" : ""}`).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    wishlists: wishlists
      .map((w) => ({ name: w.name, binder: nameOf(binders, w.binder), items: w.items.map((i) => `${i.name}${i.target !== undefined && i.target !== null ? ` @${i.target}` : ""}`).sort() }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
};

// Signed in: the API routes, as redux/slices/ call them
const server = (): Collection => {
  const fields = (v: Version) => ({ name: v.name, type: v.type, item: v.item, historicPrice: v.historicPrice });
  const created = (r: { status: number; body: any }) => (r.status === 201 ? String(r.body.item._id) : null);
  const lists = async () => ({ binders: (await call(binders, { query: { withcards: "true" } })).body.items, wishlists: (await call(wishlists, { query: { withcards: "true" } })).body.items });
  const binder = async (id: string) => (await lists()).binders.find((b: BinderWithItems) => String(b._id) === id);
  const wishlist = async (id: string) => (await lists()).wishlists.find((w: WishlistWithItems) => String(w._id) === id);
  return {
    createBinder: async (name, { set, wishlist, items = [] } = {}) =>
      created(await call(binders, { method: "POST", body: { binder: { name, ...(set && { set: String(set) }), ...(wishlist && { wishlist }) }, items: items.map((i) => ({ ...fields(i.version), quantity: i.quantity, ...(i.owned === false && { owned: false }) })) } })),
    createWishlist: async (name, { binder, items = [] } = {}) =>
      created(await call(wishlists, { method: "POST", body: { wishlist: { name, ...(binder && { binder }) }, items: items.map((i) => ({ ...fields(i.version), ...(i.target !== undefined && { target: i.target }) })) } })),
    addToBinder: async (binder, v, quantity, owned) => (await call(binders, { method: "POST", body: { item: { ...fields(v), binder, quantity, ...(owned === false && { owned }) } } })).status === 201,
    changeQuantity: async (id, v, quantity, owned) =>
      (await call(binders, { method: "POST", body: { item: { ...fields(v), _id: itemId(await binder(id), v), binder: id, quantity, ...(owned !== undefined && { owned }) } } })).status === 200,
    deleteFromBinder: async (id, versions) => {
      const list = await binder(id);
      await call(binders, { method: "DELETE", query: { id }, body: { itemIds: versions.map((v) => itemId(list, v)) } });
    },
    move: async (from, to, v, quantity, owned) => reason("moved", (await call(binders, { method: "POST", body: { move: { id: itemId(await binder(from), v), from, to, quantity, owned } } })).status),
    addToWishlist: async (wishlist, v, target) => (await call(wishlists, { method: "POST", body: { item: { ...fields(v), wishlist, ...(target !== undefined && { target }) } } })).status === 201,
    setTarget: async (id, v, target) => {
      await call(wishlists, { method: "POST", body: { item: { ...fields(v), _id: itemId(await wishlist(id), v), wishlist: id, ...(target !== undefined && { target }) } } });
    },
    deleteFromWishlist: async (id, v) => {
      await call(wishlists, { method: "DELETE", query: { id, itemId: itemId(await wishlist(id), v) } });
    },
    acquire: async (id, v, binder) => reason("acquired", (await call(wishlists, { method: "POST", body: { acquire: { id: itemId(await wishlist(id), v), wishlist: id, binder } } })).status),
    rename: async (type, id, name) => {
      await call(type === "binder" ? binders : wishlists, { method: "POST", body: { rename: { id, name } } });
    },
    unlink: async (id) => {
      await call(binders, { method: "POST", body: { unlink: id } });
    },
    removeSet: async (id) => {
      await call(binders, { method: "POST", body: { removeSet: id } });
    },
    deleteBinder: async (id) => {
      await call(binders, { method: "DELETE", query: { id } });
    },
    deleteWishlist: async (id) => {
      await call(wishlists, { method: "DELETE", query: { id } });
    },
    lists,
  };
};

// Visitor: the demo functions, starting from an empty collection, with the documents the database page hands them
const browser = (details: Map<string, demo.DemoItemDetails>): Collection => {
  const of = (v: Version) => details.get(v.historicPrice)!;
  const fields = (v: Version) => ({ name: v.name, type: v.type, item: v.item, historicPrice: v.historicPrice });
  const lists = async () => ({ binders: await demo.getDemoBinders(), wishlists: await demo.getDemoWishlists() });
  const binder = async (id: string) => (await demo.getDemoBinders()).find((b) => b._id === id);
  const wishlist = async (id: string) => (await demo.getDemoWishlists()).find((w) => w._id === id);
  return {
    createBinder: (name, { set, wishlist, items = [] } = {}) =>
      demo.createDemoBinder(name, set && String(set), items.map((i) => ({ item: { ...fields(i.version), quantity: i.quantity, ...(i.owned === false && { owned: false }) }, details: of(i.version) })), wishlist),
    createWishlist: (name, { binder, items = [] } = {}) => demo.createDemoWishlist(name, items.map((i) => ({ item: { ...fields(i.version), target: i.target }, details: of(i.version) })), binder),
    addToBinder: async (id, v, quantity, owned) => {
      const before = (await binder(id))?.items.length;
      await demo.saveDemoBinderItem({ ...fields(v), binder: id, quantity, ...(owned === false && { owned }) }, of(v));
      return (await binder(id))?.items.length !== before;
    },
    changeQuantity: async (id, v, quantity, owned) => {
      await demo.saveDemoBinderItem({ ...fields(v), _id: itemId(await binder(id), v), binder: id, quantity, owned });
      return true;
    },
    deleteFromBinder: async (id, versions) => {
      const list = await binder(id);
      await demo.deleteDemoBinderItems(id, versions.map((v) => itemId(list, v)));
    },
    move: async (from, to, v, quantity, owned) => demo.moveDemoBinderItem({ id: itemId(await binder(from), v), from, to, quantity, owned }),
    addToWishlist: async (id, v, target) => {
      const before = (await wishlist(id))?.items.length;
      await demo.addDemoWishlistItem({ ...fields(v), wishlist: id, target }, of(v));
      return (await wishlist(id))?.items.length !== before;
    },
    setTarget: async (id, v, target) => demo.setDemoWishlistItemTarget(id, itemId(await wishlist(id), v), target),
    deleteFromWishlist: async (id, v) => demo.deleteDemoWishlistItem(id, itemId(await wishlist(id), v)),
    acquire: async (id, v, binder) => demo.acquireDemoWishlistItem({ id: itemId(await wishlist(id), v), wishlist: id, binder }),
    rename: (type, id, name) => demo.renameDemoList(type, id, name),
    unlink: (id) => demo.unlinkDemoBinder(id),
    removeSet: (id) => demo.removeDemoBinderSet(id),
    deleteBinder: (id) => demo.deleteDemoBinder(id),
    deleteWishlist: (id) => demo.deleteDemoWishlist(id),
    lists,
  };
};

let catalog: Catalog;
let details: Map<string, demo.DemoItemDetails>;
beforeAll(async () => {
  catalog = await seedCatalog();
  const db = await getDb();
  details = new Map();
  for (const v of [catalog.charizard, catalog.blastoise, catalog.scyther, catalog.box]) {
    const [products, prices] = v.type === "card" ? ["cards", "card-historic-prices"] : ["sealed", "sealed-historic-prices"];
    const item = await db.collection(products).findOne({ _id: new ObjectId(v.item) });
    const historicPrice = await db.collection(prices).findOne({ _id: new ObjectId(v.historicPrice) });
    // As the client has them: parsed from JSON
    details.set(v.historicPrice, JSON.parse(JSON.stringify({ item, historicPrice })));
  }
});
beforeEach(() => {
  vi.mocked(getUserId).mockResolvedValue(newUser());
  demo.resetDemoCollection();
  storage.set("demo-collection", JSON.stringify({ generatedAt: 0, binders: [], wishlists: [], historicValue: [] }));
});

// Runs the scenario on both sides; each returns the answers it got, and the collections must match too
const parity = async (scenario: (c: Collection, catalog: Catalog) => Promise<unknown[]>) => {
  const signedIn = server();
  const visitor = browser(details);
  const answers = { server: await scenario(signedIn, catalog), demo: await scenario(visitor, catalog) };
  expect(answers.demo).toEqual(answers.server);
  const collections = { server: await snapshot(signedIn, catalog), demo: await snapshot(visitor, catalog) };
  expect(collections.demo).toEqual(collections.server);
  return collections.server;
};

describe("demo mode follows the server's rules", () => {
  test("binders: create, rename, add, change, missing slots, delete", async () => {
    const result = await parity(async (c, { charizard, blastoise, box }) => {
      const vault = (await c.createBinder("Vault", { items: [{ version: charizard, quantity: 2 }] }))!;
      await c.rename("binder", vault, "Main");
      const answers = [await c.addToBinder(vault, box, 1), await c.addToBinder(vault, blastoise, 1, false)];
      answers.push(await c.changeQuantity(vault, charizard, 3));
      answers.push(await c.changeQuantity(vault, box, 1, false));
      await c.deleteFromBinder(vault, [blastoise]);
      const spare = (await c.createBinder("Spare"))!;
      await c.deleteBinder(spare);
      return answers;
    });
    expect(result.binders).toEqual([{ name: "Main", set: null, wishlist: null, items: ["Booster Box x1 missing", "Charizard x3"] }]);
  });

  test("set binders only take cards of their set, until the set is removed", async () => {
    const result = await parity(async (c, { charizard, scyther, box, ...rest }) => {
      const base = (await c.createBinder("Base", { set: rest.sets.base }))!;
      const answers = [await c.addToBinder(base, charizard, 1), await c.addToBinder(base, scyther, 1), await c.addToBinder(base, box, 1)];
      await c.removeSet(base);
      answers.push(await c.addToBinder(base, scyther, 1));
      return answers;
    });
    expect(result.binders[0]).toEqual({ name: "Base", set: null, wishlist: null, items: ["Charizard x1", "Scyther x1"] });
  });

  test("a linked binder and wishlist mirror each other's missing items", async () => {
    const result = await parity(async (c, { charizard, blastoise, box }) => {
      const binder = (await c.createBinder("Chase binder", { items: [{ version: charizard, quantity: 1, owned: false }] }))!;
      const wishlist = (await c.createWishlist("Chase", { binder, items: [{ version: charizard, target: 250 }] }))!;
      const answers = [await c.addToBinder(binder, blastoise, 1, false)];
      // Wished in the wishlist: a missing slot in the binder
      answers.push(await c.addToWishlist(wishlist, box, 4000));
      await c.setTarget(wishlist, box, 4500);
      // Owned in the binder: no longer wanted
      answers.push(await c.changeQuantity(binder, blastoise, 1, true));
      // Unwished: the missing slot goes, owned copies stay
      await c.deleteFromWishlist(wishlist, box);
      return answers;
    });
    expect(result.binders).toEqual([{ name: "Chase binder", set: null, wishlist: "Chase", items: ["Blastoise x1", "Charizard x1 missing"] }]);
    expect(result.wishlists).toEqual([{ name: "Chase", binder: "Chase binder", items: ["Charizard @250"] }]);
  });

  test("unlinking keeps both lists; deleting one of a linked pair deletes both", async () => {
    const result = await parity(async (c, { charizard }) => {
      const a = (await c.createBinder("A"))!;
      await c.createWishlist("A wants", { binder: a });
      await c.unlink(a);
      await c.addToBinder(a, charizard, 1, false);
      const b = (await c.createBinder("B"))!;
      const bWants = (await c.createWishlist("B wants", { binder: b }))!;
      await c.deleteWishlist(bWants);
      return [];
    });
    expect(result.binders).toEqual([{ name: "A", set: null, wishlist: null, items: ["Charizard x1 missing"] }]);
    expect(result.wishlists).toEqual([{ name: "A wants", binder: null, items: [] }]);
  });

  test("moves merge with the same version, are refused by a set binder, and carry missing slots", async () => {
    const result = await parity(async (c, { charizard, scyther, box, ...rest }) => {
      const from = (await c.createBinder("From", { items: [{ version: charizard, quantity: 2 }, { version: scyther, quantity: 1 }, { version: box, quantity: 1, owned: false }] }))!;
      const to = (await c.createBinder("To", { items: [{ version: charizard, quantity: 1 }] }))!;
      const base = (await c.createBinder("Base", { set: rest.sets.base }))!;
      return [await c.move(from, to, charizard, 2, true), await c.move(from, base, scyther, 1, true), await c.move(from, to, box, 1, false)];
    });
    expect(result.binders).toEqual([
      { name: "Base", set: "Base Set", wishlist: null, items: [] },
      { name: "From", set: null, wishlist: null, items: ["Scyther x1"] },
      { name: "To", set: null, wishlist: null, items: ["Booster Box x1 missing", "Charizard x3"] },
    ]);
  });

  test("got it: into a binder, one more copy when it's there, never into a set binder that can't take it", async () => {
    const result = await parity(async (c, { charizard, scyther, box, ...rest }) => {
      const wishlist = (await c.createWishlist("Wants", { items: [{ version: charizard }, { version: scyther }, { version: box }] }))!;
      const binder = (await c.createBinder("Vault", { items: [{ version: charizard, quantity: 1 }] }))!;
      const base = (await c.createBinder("Base", { set: rest.sets.base }))!;
      return [await c.acquire(wishlist, charizard, binder), await c.acquire(wishlist, scyther, base), await c.acquire(wishlist, box, binder)];
    });
    expect(result.binders).toEqual([
      { name: "Base", set: "Base Set", wishlist: null, items: [] },
      { name: "Vault", set: null, wishlist: null, items: ["Booster Box x1", "Charizard x2"] },
    ]);
    expect(result.wishlists).toEqual([{ name: "Wants", binder: null, items: ["Scyther"] }]);
  });

  test("got it from a linked wishlist: the missing slot becomes owned", async () => {
    const result = await parity(async (c, { charizard }) => {
      const binder = (await c.createBinder("Set", { items: [{ version: charizard, quantity: 1, owned: false }] }))!;
      const wishlist = (await c.createWishlist("Set wants", { binder, items: [{ version: charizard }] }))!;
      return [await c.acquire(wishlist, charizard, binder)];
    });
    expect(result.binders[0].items).toEqual(["Charizard x1"]);
    expect(result.wishlists[0].items).toEqual([]);
  });

  test("lists per user are capped", async () => {
    await parity(async (c) => {
      for (let i = 0; i < LIMITS.LISTS_PER_USER; i++) await c.createBinder(`Binder ${i}`);
      for (let i = 0; i < LIMITS.LISTS_PER_USER; i++) await c.createWishlist(`Wishlist ${i}`);
      return [await c.createBinder("One too many"), await c.createWishlist("One too many")].map((id) => id !== null);
    });
  });

  test("items per list are capped", async () => {
    await parity(async (c, { charizard, blastoise, scyther, box }) => {
      const items = Array.from({ length: LIMITS.ITEMS_PER_LIST - 1 }, () => ({ version: charizard, quantity: 1 }));
      const binder = (await c.createBinder("Full", { items }))!;
      const wishlist = (await c.createWishlist("Full wants", { items: items.map(({ version }) => ({ version })) }))!;
      const answers: unknown[] = [await c.addToBinder(binder, blastoise, 1), await c.addToBinder(binder, scyther, 1), await c.addToWishlist(wishlist, box), await c.addToWishlist(wishlist, scyther)];
      // A full binder still takes what merges with a version it has, and nothing new
      const other = (await c.createBinder("Other", { items: [{ version: box, quantity: 1 }, { version: blastoise, quantity: 1 }] }))!;
      const wants = (await c.createWishlist("Other wants", { items: [{ version: scyther }, { version: blastoise }] }))!;
      answers.push(await c.move(other, binder, box, 1, true), await c.move(other, binder, blastoise, 1, true));
      answers.push(await c.acquire(wants, scyther, binder), await c.acquire(wants, blastoise, binder));
      return answers;
    });
  });

  test("a list can only be linked to one other list", async () => {
    await parity(async (c) => {
      const binder = (await c.createBinder("Binder"))!;
      const wishlist = (await c.createWishlist("Wants", { binder }))!;
      return [await c.createWishlist("Second", { binder }), await c.createBinder("Second", { wishlist })].map((id) => id !== null);
    });
  });
});
