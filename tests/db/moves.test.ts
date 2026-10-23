// Moving items between lists runs as one transaction: these check the item ends up in exactly one place, whatever happens
import { beforeAll, describe, expect, test } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { addItemToBinder, createBinder, fetchBindersWithCard, moveBinderItem } from "@/lib/db/binders";
import { acquireWishlistItem, addItemToWishlist, createWishlist, fetchWishlistsWithCard } from "@/lib/db/wishlists";
import { LIMITS } from "@/lib/limits";
import { BinderWithItems, WishlistWithItems } from "@/types/mongodb";
import { idOf, newUser, seedCatalog } from "./fixtures";

let catalog: Awaited<ReturnType<typeof seedCatalog>>;
beforeAll(async () => {
  catalog = await seedCatalog();
});

const items = async (user: ObjectId, id: string) =>
  ((await fetchBindersWithCard(user)) as BinderWithItems[]).find((b) => String(b._id) === id)!.items.map((i) => ({ quantity: i.quantity, owned: i.owned !== false }));
const wished = async (user: ObjectId, id: string) => ((await fetchWishlistsWithCard(user)) as WishlistWithItems[]).find((w) => String(w._id) === id)!.items.map((i) => String(i._id));
const fill = async (user: ObjectId, binder: string) =>
  (await getDb()).collection("binder-items").insertMany(Array.from({ length: LIMITS.ITEMS_PER_LIST }, () => ({ ...catalog.blastoise, quantity: 1, binder, user })));

describe("moving between binders", () => {
  test("moves an item, and merges it with the same version there", async () => {
    const user = newUser();
    const [a, b] = [idOf(await createBinder({ name: "A", user })), idOf(await createBinder({ name: "B", user }))];

    const first = idOf(await addItemToBinder(user, { ...catalog.charizard, binder: a, quantity: 2 }));
    expect(await moveBinderItem(user, { id: first, from: a, to: b, quantity: 2, owned: true })).toBe("moved");
    expect(await items(user, a)).toEqual([]);
    expect(await items(user, b)).toEqual([{ quantity: 2, owned: true }]);

    // Owned copies add up; a missing one moved onto an owned one leaves it as it is
    const second = idOf(await addItemToBinder(user, { ...catalog.charizard, binder: a, quantity: 1 }));
    expect(await moveBinderItem(user, { id: second, from: a, to: b, quantity: 1, owned: true })).toBe("moved");
    expect(await items(user, b)).toEqual([{ quantity: 3, owned: true }]);
    const missing = idOf(await addItemToBinder(user, { ...catalog.charizard, binder: a, quantity: 1, owned: false }));
    expect(await moveBinderItem(user, { id: missing, from: a, to: b, quantity: 1, owned: false })).toBe("moved");
    expect(await items(user, a)).toEqual([]);
    expect(await items(user, b)).toEqual([{ quantity: 3, owned: true }]);
  });

  test("refused by a set binder or a full one, the item stays where it was", async () => {
    const user = newUser();
    const a = idOf(await createBinder({ name: "A", user }));
    const jungle = idOf(await createBinder({ name: "Jungle", user, set: catalog.sets.jungle }));
    const full = idOf(await createBinder({ name: "Full", user }));
    await fill(user, full);

    const item = idOf(await addItemToBinder(user, { ...catalog.charizard, binder: a, quantity: 1 }));
    expect(await moveBinderItem(user, { id: item, from: a, to: jungle, quantity: 1, owned: true })).toBe("wrong-set");
    expect(await moveBinderItem(user, { id: item, from: a, to: full, quantity: 1, owned: true })).toBe("full");
    expect(await items(user, a)).toEqual([{ quantity: 1, owned: true }]);
    expect(await items(user, jungle)).toEqual([]);
    expect(await (await getDb()).collection("binder-items").countDocuments({ binder: full })).toBe(LIMITS.ITEMS_PER_LIST);
  });

  test("only within the user's own binders", async () => {
    const [user, other] = [newUser(), newUser()];
    const [a, b] = [idOf(await createBinder({ name: "A", user })), idOf(await createBinder({ name: "B", user }))];
    const theirs = idOf(await createBinder({ name: "Theirs", user: other }));
    const item = idOf(await addItemToBinder(user, { ...catalog.charizard, binder: a, quantity: 1 }));
    expect(await moveBinderItem(other, { id: item, from: a, to: b, quantity: 1, owned: true })).toBe("not-found");
    expect(await moveBinderItem(user, { id: item, from: a, to: theirs, quantity: 1, owned: true })).toBe("not-found");
    expect(await moveBinderItem(user, { id: item, from: a, to: a, quantity: 1, owned: true })).toBe("not-found");
    expect(await items(user, a)).toEqual([{ quantity: 1, owned: true }]);
  });

  test("a missing item leaves the source's linked wishlist and is wanted by the destination's", async () => {
    const user = newUser();
    const [wa, wb] = [idOf(await createWishlist({ name: "WA", user })), idOf(await createWishlist({ name: "WB", user }))];
    const [a, b] = [idOf(await createBinder({ name: "A", user, wishlist: wa })), idOf(await createBinder({ name: "B", user, wishlist: wb }))];
    const missing = idOf(await addItemToBinder(user, { ...catalog.charizard, binder: a, quantity: 1, owned: false }));
    expect([(await wished(user, wa)).length, (await wished(user, wb)).length]).toEqual([1, 0]);
    expect(await moveBinderItem(user, { id: missing, from: a, to: b, quantity: 1, owned: false })).toBe("moved");
    expect([(await wished(user, wa)).length, (await wished(user, wb)).length]).toEqual([0, 1]);
  });
});

describe("got it: from a wishlist into a binder", () => {
  test("into the binder and off the wishlist; one more copy when it's owned already", async () => {
    const user = newUser();
    const [w, b] = [idOf(await createWishlist({ name: "W", user })), idOf(await createBinder({ name: "B", user }))];
    const first = idOf(await addItemToWishlist(user, { ...catalog.charizard, wishlist: w }));
    expect(await acquireWishlistItem(user, { id: first, wishlist: w, binder: b })).toBe("acquired");
    expect(await wished(user, w)).toEqual([]);
    expect(await items(user, b)).toEqual([{ quantity: 1, owned: true }]);

    const second = idOf(await addItemToWishlist(user, { ...catalog.charizard, wishlist: w }));
    expect(await acquireWishlistItem(user, { id: second, wishlist: w, binder: b })).toBe("acquired");
    expect(await items(user, b)).toEqual([{ quantity: 2, owned: true }]);
  });

  test("refused by a set binder, a full one or someone else's, the item stays on the wishlist", async () => {
    const user = newUser();
    const w = idOf(await createWishlist({ name: "W", user }));
    const jungle = idOf(await createBinder({ name: "Jungle", user, set: catalog.sets.jungle }));
    const full = idOf(await createBinder({ name: "Full", user }));
    await fill(user, full);
    const item = idOf(await addItemToWishlist(user, { ...catalog.charizard, wishlist: w }));
    expect(await acquireWishlistItem(user, { id: item, wishlist: w, binder: jungle })).toBe("wrong-set");
    expect(await acquireWishlistItem(user, { id: item, wishlist: w, binder: full })).toBe("full");
    expect(await acquireWishlistItem(newUser(), { id: item, wishlist: w, binder: jungle })).toBe("not-found");
    expect(await wished(user, w)).toEqual([item]);
  });

  test("linked: the binder's missing slot becomes owned; bought elsewhere, the linked binder stops tracking it", async () => {
    const user = newUser();
    const lw = idOf(await createWishlist({ name: "LW", user }));
    const lb = idOf(await createBinder({ name: "LB", user, wishlist: lw }));
    const wanted = idOf(await addItemToWishlist(user, { ...catalog.charizard, wishlist: lw }));
    expect(await items(user, lb)).toEqual([{ quantity: 1, owned: false }]);
    expect(await acquireWishlistItem(user, { id: wanted, wishlist: lw, binder: lb })).toBe("acquired");
    expect(await items(user, lb)).toEqual([{ quantity: 1, owned: true }]);
    expect(await wished(user, lw)).toEqual([]);

    const other = idOf(await createBinder({ name: "Other", user }));
    const elsewhere = idOf(await addItemToWishlist(user, { ...catalog.blastoise, wishlist: lw }));
    expect(await items(user, lb)).toEqual([
      { quantity: 1, owned: true },
      { quantity: 1, owned: false },
    ]);
    expect(await acquireWishlistItem(user, { id: elsewhere, wishlist: lw, binder: other })).toBe("acquired");
    expect(await items(user, other)).toEqual([{ quantity: 1, owned: true }]);
    expect(await items(user, lb)).toEqual([{ quantity: 1, owned: true }]);
    expect(await wished(user, lw)).toEqual([]);
  });
});
