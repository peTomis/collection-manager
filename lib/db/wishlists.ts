// Server only: a user's wishlists and their items in the database
import { ObjectId } from "mongodb";
import { Wishlist, WishlistItem, WishlistItemToCreate, WishlistToSave } from "@/types/mongodb";
import { getDb } from "@/lib/mongodb";
import { deleteLinked, linkable, mirrorToBinder, setLink, unmirrorFromBinder } from "@/lib/mirror";
import { LIMITS } from "@/lib/limits";
import { insertCapped } from "@/lib/caps";
import { fetchListsWithItems, pricesMatchItems } from "./lists";
import { updatePortfolio } from "./portfolios";

export const fetchWishlists = async (user: ObjectId): Promise<Wishlist[]> => {
  const db = await getDb();
  const items = await db.collection("wishlists").find({ user }).toArray();
  return items as unknown as Wishlist[];
};

export const fetchWishlistsWithCard = async (user: ObjectId): Promise<Wishlist[]> => fetchListsWithItems<Wishlist & { items: WishlistItem[] }>(await getDb(), "wishlist", user);

export const fetchWishlist = async (_id: ObjectId, user: ObjectId): Promise<Wishlist> => {
  const db = await getDb();
  const item = await db.collection("wishlists").findOne({ _id, user });
  return JSON.parse(JSON.stringify(item));
};

// items: the wishlist's first items, e.g. a whole set added at once.
// A linked binder keeps its missing items in step with the wishlist (the caller sends matching items): it must exist and be free.
export const createWishlist = async (wishlist: Omit<Wishlist, "_id">, items: WishlistItemToCreate[] = []): Promise<Wishlist | "invalid-item" | "not-linkable" | "full"> => {
  const db = await getDb();
  if (!(await pricesMatchItems(db, items))) return "invalid-item";
  if (!(await linkable(db, wishlist.user, "binders", wishlist.binder))) return "not-linkable";
  const insertedId = await insertCapped(db, "wishlists", wishlist, { user: wishlist.user }, LIMITS.LISTS_PER_USER);
  if (!insertedId) return "full";
  const id = String(insertedId);
  if (items.length) {
    // Only the known fields are stored, stamped with the owner
    await db.collection("wishlist-items").insertMany(
      items.map((i) => ({
        name: i.name,
        type: i.type,
        item: i.item,
        historicPrice: i.historicPrice,
        wishlist: id,
        user: wishlist.user,
        ...(i.target !== undefined && { target: i.target }),
      }))
    );
  }
  await setLink(db, wishlist.user, "binders", wishlist.binder, id);
  return JSON.parse(JSON.stringify({ ...wishlist, _id: insertedId }));
};

export const renameWishlist = async (user: ObjectId, _id: ObjectId, name: string): Promise<boolean> => {
  const db = await getDb();
  const result = await db.collection("wishlists").updateOne({ _id, user }, { $set: { name } });
  return result.matchedCount === 1;
};

export const deleteWishlist = async (id: string, user: ObjectId): Promise<boolean> => {
  const db = await getDb();
  const _id = new ObjectId(id);
  const deleted = await db.collection("wishlists").findOneAndDelete({ _id, user });
  if (!deleted) return false;
  await db.collection("wishlist-items").deleteMany({ wishlist: id, user });
  // The linked binder goes too, and what it owned leaves the portfolio
  if (await deleteLinked(db, user, "binders", deleted.binder)) await updatePortfolio(user);
  return true;
};

export const addItemToWishlist = async (user: ObjectId, item: WishlistToSave): Promise<WishlistItem | "not-found" | "invalid-item" | "full"> => {
  const db = await getDb();
  if (!(await pricesMatchItems(db, [item]))) return "invalid-item";
  const wishlistData = await db.collection("wishlists").findOne({ _id: new ObjectId(item.wishlist), user });
  if (!wishlistData) return "not-found";
  // Only the known fields are stored, stamped with the owner
  const itemData = {
    name: item.name,
    type: item.type,
    item: item.item,
    historicPrice: item.historicPrice,
    wishlist: item.wishlist,
    user,
    ...(item.target !== undefined && { target: item.target }),
  };
  const insertedId = await insertCapped(db, "wishlist-items", itemData, { wishlist: item.wishlist, user }, LIMITS.ITEMS_PER_LIST);
  if (!insertedId) return "full";
  await mirrorToBinder(db, user, wishlistData.binder, item);
  return JSON.parse(JSON.stringify({ ...itemData, _id: insertedId }));
};

export const setItemTarget = async (user: ObjectId, wishlist: string, id: string, target?: number): Promise<boolean> => {
  const db = await getDb();
  const _id = new ObjectId(id);
  const wishlistData = await db.collection("wishlists").findOne({ _id: new ObjectId(wishlist), user });
  if (!wishlistData) return false;
  const update = target === undefined ? { $unset: { target: "" } } : { $set: { target } };
  const result = await db.collection("wishlist-items").updateOne({ _id, wishlist, user }, update);
  return result.matchedCount === 1;
};

export const deleteItemFromWishlist = async (user: ObjectId, wishlist: string, id: string): Promise<boolean> => {
  const db = await getDb();
  const _id = new ObjectId(id);
  const wishlistData = await db.collection("wishlists").findOne({ _id: new ObjectId(wishlist), user });
  if (!wishlistData) return false;
  const deleted = await db.collection("wishlist-items").findOneAndDelete({ _id, wishlist, user });
  if (!deleted) return false;
  await unmirrorFromBinder(db, user, wishlistData.binder, deleted.historicPrice);
  return true;
};
