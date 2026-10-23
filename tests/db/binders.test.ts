import { beforeAll, describe, expect, test } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  addItemToBinder,
  changeItemQuantity,
  createBinder,
  deleteBinder,
  deleteItemFromBinder,
  deleteItemsFromBinder,
  fetchBinders,
  fetchBindersWithCard,
  itemsFitSet,
  removeBinderSet,
  renameBinder,
  unlinkBinder,
} from "@/lib/db/binders";
import { createWishlist, fetchWishlistsWithCard } from "@/lib/db/wishlists";
import { LIMITS } from "@/lib/limits";
import { BinderWithItems, WishlistWithItems } from "@/types/mongodb";
import { idOf, newUser, seedCatalog } from "./fixtures";

let catalog: Awaited<ReturnType<typeof seedCatalog>>;
beforeAll(async () => {
  catalog = await seedCatalog();
});

const withItems = async (user: ObjectId, id: string) => ((await fetchBindersWithCard(user)) as BinderWithItems[]).find((b) => String(b._id) === id)!;
const wanted = async (user: ObjectId, id: string) => ((await fetchWishlistsWithCard(user)) as WishlistWithItems[]).find((w) => String(w._id) === id)!.items;

describe("binders", () => {
  test("are created, renamed, unset from their set and deleted with their items, only by their owner", async () => {
    const [user, other] = [newUser(), newUser()];
    const id = idOf(await createBinder({ name: "Vintage", user, set: catalog.sets.base }));
    await addItemToBinder(user, { ...catalog.charizard, binder: id, quantity: 1 });

    expect(await renameBinder(other, new ObjectId(id), "Mine now")).toBe(false);
    expect(await removeBinderSet(other, new ObjectId(id))).toBe(false);
    expect(await deleteBinder(id, other)).toBe(false);

    expect(await renameBinder(user, new ObjectId(id), "Vintage 1999")).toBe(true);
    expect(await removeBinderSet(user, new ObjectId(id))).toBe(true);
    expect(await fetchBinders(user)).toMatchObject([{ name: "Vintage 1999" }]);
    expect((await fetchBinders(user))[0]).not.toHaveProperty("set");

    expect(await deleteBinder(id, user)).toBe(true);
    expect(await fetchBinders(user)).toEqual([]);
    expect(await (await getDb()).collection("binder-items").countDocuments({ user })).toBe(0);
  });

  test(`stop at ${LIMITS.LISTS_PER_USER} per user`, async () => {
    const user = newUser();
    for (let i = 0; i < LIMITS.LISTS_PER_USER; i++) idOf(await createBinder({ name: `Binder ${i}`, user }));
    expect(await createBinder({ name: "One too many", user })).toBe("full");
    expect(await fetchBinders(user)).toHaveLength(LIMITS.LISTS_PER_USER);
  });

  test("come back with their items joined to their product and price, and only their owner's items", async () => {
    const [user, other] = [newUser(), newUser()];
    const id = idOf(await createBinder({ name: "Mixed", user }, [{ ...catalog.charizard, quantity: 2 }, { ...catalog.box, quantity: 1 }]));
    // Someone else's item pointing at this binder never shows up in it
    await (await getDb()).collection("binder-items").insertOne({ ...catalog.blastoise, quantity: 1, binder: id, user: other });

    const binder = await withItems(user, id);
    expect(binder.items.map((i) => [i.item.name, i.historicPrice.price, i.quantity])).toEqual([
      ["Charizard", 300, 2],
      ["Booster Box", 5000, 1],
    ]);
    expect(await fetchBindersWithCard(other)).toEqual([]);
  });
});

describe("binder items", () => {
  test("must come with one of their own prices, fit a set binder, and go into the user's own binder", async () => {
    const [user, other] = [newUser(), newUser()];
    const setBinder = idOf(await createBinder({ name: "Base Set", user, set: catalog.sets.base }));

    expect(await addItemToBinder(user, { ...catalog.charizard, historicPrice: catalog.blastoise.historicPrice, binder: setBinder, quantity: 1 })).toBe("invalid-item");
    expect(await addItemToBinder(user, { ...catalog.scyther, binder: setBinder, quantity: 1 })).toBe("wrong-set");
    expect(await addItemToBinder(user, { ...catalog.box, binder: setBinder, quantity: 1 })).toBe("wrong-set");
    expect(await addItemToBinder(other, { ...catalog.charizard, binder: setBinder, quantity: 1 })).toBe("not-found");
    idOf(await addItemToBinder(user, { ...catalog.charizard, binder: setBinder, quantity: 1 }));

    expect(await itemsFitSet(catalog.sets.base, [{ ...catalog.charizard, quantity: 1 }])).toBe(true);
    expect(await itemsFitSet(catalog.sets.base, [{ ...catalog.scyther, quantity: 1 }])).toBe(false);
    expect(await createBinder({ name: "Bad prices", user }, [{ ...catalog.charizard, historicPrice: catalog.box.historicPrice, quantity: 1 }])).toBe("invalid-item");
  });

  test(`stop at ${LIMITS.ITEMS_PER_LIST} per binder`, async () => {
    const user = newUser();
    const id = idOf(await createBinder({ name: "Full", user }));
    await (await getDb()).collection("binder-items").insertMany(Array.from({ length: LIMITS.ITEMS_PER_LIST }, () => ({ ...catalog.blastoise, quantity: 1, binder: id, user })));
    expect(await addItemToBinder(user, { ...catalog.charizard, binder: id, quantity: 1 })).toBe("full");
    expect(await (await getDb()).collection("binder-items").countDocuments({ binder: id })).toBe(LIMITS.ITEMS_PER_LIST);
  });

  test("missing slots are wanted by the linked wishlist until owned or removed", async () => {
    const user = newUser();
    const wishlist = idOf(await createWishlist({ name: "Chase", user }));
    const binder = idOf(await createBinder({ name: "Chase", user, wishlist }));

    const slot = idOf(await addItemToBinder(user, { ...catalog.charizard, binder, quantity: 1, owned: false }));
    const other = idOf(await addItemToBinder(user, { ...catalog.blastoise, binder, quantity: 1, owned: false }));
    expect((await wanted(user, wishlist)).map((i) => i.item.name).sort()).toEqual(["Blastoise", "Charizard"]);

    // Owned: off the wishlist
    expect(await changeItemQuantity(user, binder, slot, 1)).toBe(true);
    expect((await wanted(user, wishlist)).map((i) => i.item.name)).toEqual(["Blastoise"]);
    // Missing again: wanted again
    expect(await changeItemQuantity(user, binder, slot, 1, false)).toBe(true);
    expect(await wanted(user, wishlist)).toHaveLength(2);

    expect(await deleteItemFromBinder(user, binder, other)).toBe(true);
    expect(await deleteItemsFromBinder(user, binder, [slot])).toBe(1);
    expect(await wanted(user, wishlist)).toEqual([]);

    // Unlinked, the two stop mirroring
    expect(await unlinkBinder(user, new ObjectId(binder))).toBe(true);
    idOf(await addItemToBinder(user, { ...catalog.charizard, binder, quantity: 1, owned: false }));
    expect(await wanted(user, wishlist)).toEqual([]);
  });

  test("changes and deletes only touch the user's own items", async () => {
    const [user, other] = [newUser(), newUser()];
    const binder = idOf(await createBinder({ name: "Mine", user }));
    const item = idOf(await addItemToBinder(user, { ...catalog.charizard, binder, quantity: 1 }));
    expect(await changeItemQuantity(other, binder, item, 50)).toBe(false);
    expect(await deleteItemFromBinder(other, binder, item)).toBe(false);
    expect(await deleteItemsFromBinder(other, binder, [item])).toBe(0);
    expect((await withItems(user, binder)).items.map((i) => i.quantity)).toEqual([1]);
  });
});
