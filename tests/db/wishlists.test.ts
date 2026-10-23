import { beforeAll, describe, expect, test } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { addItemToBinder, createBinder, fetchBindersWithCard } from "@/lib/db/binders";
import {
  addItemToWishlist,
  createWishlist,
  deleteItemFromWishlist,
  deleteWishlist,
  fetchWishlist,
  fetchWishlistsWithCard,
  renameWishlist,
  setItemTarget,
} from "@/lib/db/wishlists";
import { fetchPortfolio, updatePortfolio } from "@/lib/db/portfolios";
import { BinderWithItems, WishlistWithItems } from "@/types/mongodb";
import { idOf, newUser, seedCatalog } from "./fixtures";

let catalog: Awaited<ReturnType<typeof seedCatalog>>;
beforeAll(async () => {
  catalog = await seedCatalog();
});

const binderItems = async (user: ObjectId, id: string) =>
  ((await fetchBindersWithCard(user)) as BinderWithItems[]).find((b) => String(b._id) === id)!.items.map((i) => ({ name: i.item.name, quantity: i.quantity, owned: i.owned !== false }));
const wished = async (user: ObjectId, id: string) => ((await fetchWishlistsWithCard(user)) as WishlistWithItems[]).find((w) => String(w._id) === id)!.items;

describe("wishlists", () => {
  test("link to a binder of the user's that isn't linked yet", async () => {
    const [user, other] = [newUser(), newUser()];
    const binder = idOf(await createBinder({ name: "Binder", user }));
    expect(await createWishlist({ name: "Theirs", user: other, binder })).toBe("not-linkable");
    const wishlist = idOf(await createWishlist({ name: "Linked", user, binder }));
    expect(await createWishlist({ name: "Second", user, binder })).toBe("not-linkable");
    expect((await fetchWishlist(new ObjectId(wishlist), user)).binder).toBe(binder);
    expect(await renameWishlist(other, new ObjectId(wishlist), "Mine")).toBe(false);
    expect(await renameWishlist(user, new ObjectId(wishlist), "Chase")).toBe(true);
  });

  test("items wished in a linked wishlist become missing slots of its binder, unless the binder can't take them", async () => {
    const user = newUser();
    const binder = idOf(await createBinder({ name: "Base Set", user, set: catalog.sets.base }));
    const wishlist = idOf(await createWishlist({ name: "Base Set", user, binder }));

    const charizard = idOf(await addItemToWishlist(user, { ...catalog.charizard, wishlist, target: 250 }));
    idOf(await addItemToWishlist(user, { ...catalog.scyther, wishlist }));
    expect(await binderItems(user, binder)).toEqual([{ name: "Charizard", quantity: 1, owned: false }]);

    expect(await setItemTarget(user, wishlist, charizard, 200)).toBe(true);
    expect((await wished(user, wishlist)).find((i) => String(i._id) === charizard)?.target).toBe(200);
    expect(await setItemTarget(user, wishlist, charizard)).toBe(true);
    expect((await wished(user, wishlist)).find((i) => String(i._id) === charizard)).not.toHaveProperty("target");

    // Removed from the wishlist: the binder stops tracking it as missing
    expect(await deleteItemFromWishlist(user, wishlist, charizard)).toBe(true);
    expect(await binderItems(user, binder)).toEqual([]);
  });

  test("removing an item keeps the copies the binder owns", async () => {
    const user = newUser();
    const binder = idOf(await createBinder({ name: "Binder", user }));
    const wishlist = idOf(await createWishlist({ name: "Wishlist", user, binder }));
    await addItemToBinder(user, { ...catalog.charizard, binder, quantity: 2 });
    const wish = idOf(await addItemToWishlist(user, { ...catalog.charizard, wishlist }));
    expect(await deleteItemFromWishlist(user, wishlist, wish)).toBe(true);
    expect(await binderItems(user, binder)).toEqual([{ name: "Charizard", quantity: 2, owned: true }]);
  });

  test("a deleted wishlist takes its linked binder along, and the portfolio follows", async () => {
    const user = newUser();
    const binder = idOf(await createBinder({ name: "Binder", user }));
    const wishlist = idOf(await createWishlist({ name: "Wishlist", user, binder }));
    await addItemToBinder(user, { ...catalog.charizard, binder, quantity: 2 });
    await updatePortfolio(user);
    expect((await fetchPortfolio(user)).value).toBe(600);

    expect(await deleteWishlist(wishlist, newUser())).toBe(false);
    expect(await deleteWishlist(wishlist, user)).toBe(true);
    expect(await fetchBindersWithCard(user)).toEqual([]);
    expect(await (await getDb()).collection("binder-items").countDocuments({ user })).toBe(0);
    expect((await fetchPortfolio(user)).value).toBe(0);
  });

  test("items must come with one of their own prices", async () => {
    const user = newUser();
    const wishlist = idOf(await createWishlist({ name: "Wishlist", user }));
    expect(await addItemToWishlist(user, { ...catalog.box, historicPrice: catalog.charizard.historicPrice, wishlist })).toBe("invalid-item");
    expect(await addItemToWishlist(newUser(), { ...catalog.box, wishlist })).toBe("not-found");
  });
});
