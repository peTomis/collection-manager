// Server only: a user's binders and their items in the database
import { ObjectId } from "mongodb";
import { Binder, BinderItem, BinderItemToCreate, BinderToSave, ItemType } from "@/types/mongodb";
import { getDb } from "@/lib/mongodb";
import { deleteLinked, linkable, mirrorToWishlist, setLink, unmirrorFromWishlist } from "@/lib/mirror";
import { LIMITS } from "@/lib/limits";
import { insertCapped } from "@/lib/caps";
import { fetchListsWithItems, pricesMatchItems } from "./lists";

export const fetchBinders = async (user: ObjectId): Promise<Binder[]> => {
  const db = await getDb();
  const items = await db.collection("binders").find({ user }).toArray();
  return items as unknown as Binder[];
};

export const fetchBindersWithCard = async (user: ObjectId): Promise<Binder[]> => fetchListsWithItems<Binder & { items: BinderItem[] }>(await getDb(), "binder", user);

export const fetchBinder = async (_id: ObjectId, user: ObjectId): Promise<Binder> => {
  const db = await getDb();
  const item = await db.collection("binders").findOne({ _id, user });
  return JSON.parse(JSON.stringify(item));
};

// A set binder only takes cards of its set: every card must be one of them, and nothing sealed
export const itemsFitSet = async (set: ObjectId, items: BinderItemToCreate[]): Promise<boolean> => {
  if (items.some((i) => i.type !== ItemType.CARD)) return false;
  const db = await getDb();
  const ids = [...new globalThis.Set(items.map((i) => i.item))].map((id) => new ObjectId(id));
  return (await db.collection("cards").countDocuments({ _id: { $in: ids }, set: String(set) })) === ids.length;
};

// items: the binder's first items, e.g. a whole set added at once.
// A linked wishlist keeps its missing items in step with the binder (the caller sends matching items): it must exist and be free.
export const createBinder = async (binder: Omit<Binder, "_id">, items: BinderItemToCreate[] = []): Promise<Binder | "invalid-item" | "not-linkable" | "full"> => {
  const db = await getDb();
  if (!(await pricesMatchItems(db, items))) return "invalid-item";
  if (!(await linkable(db, binder.user, "wishlists", binder.wishlist))) return "not-linkable";
  const insertedId = await insertCapped(db, "binders", binder, { user: binder.user }, LIMITS.LISTS_PER_USER);
  if (!insertedId) return "full";
  const id = String(insertedId);
  if (items.length) {
    // Only the known fields are stored, stamped with the owner
    await db
      .collection("binder-items")
      .insertMany(
        items.map((i) => ({ name: i.name, type: i.type, item: i.item, historicPrice: i.historicPrice, quantity: i.quantity, ...(i.owned === false && { owned: false }), binder: id, user: binder.user }))
      );
  }
  await setLink(db, binder.user, "wishlists", binder.wishlist, id);
  return JSON.parse(JSON.stringify({ ...binder, _id: insertedId }));
};

export const renameBinder = async (user: ObjectId, _id: ObjectId, name: string): Promise<boolean> => {
  const db = await getDb();
  const result = await db.collection("binders").updateOne({ _id, user }, { $set: { name } });
  return result.matchedCount === 1;
};

// Drop a set binder's set: it then takes any card or sealed product
export const removeBinderSet = async (user: ObjectId, _id: ObjectId): Promise<boolean> => {
  const db = await getDb();
  const result = await db.collection("binders").updateOne({ _id, user }, { $unset: { set: "" } });
  return result.matchedCount === 1;
};

// Unlink a binder and its wishlist: both stay, and stop mirroring each other
export const unlinkBinder = async (user: ObjectId, _id: ObjectId): Promise<boolean> => {
  const db = await getDb();
  const binderData = await db.collection("binders").findOne({ _id, user });
  if (!binderData) return false;
  await setLink(db, user, "binders", String(_id), undefined);
  await setLink(db, user, "wishlists", binderData.wishlist, undefined);
  return true;
};

export const deleteBinder = async (id: string, user: ObjectId): Promise<boolean> => {
  const db = await getDb();
  const _id = new ObjectId(id);
  const deleted = await db.collection("binders").findOneAndDelete({ _id, user });
  if (!deleted) return false;
  await db.collection("binder-items").deleteMany({ binder: id, user });
  // The linked wishlist goes too
  await deleteLinked(db, user, "wishlists", deleted.wishlist);
  return true;
};

export const addItemToBinder = async (user: ObjectId, item: BinderToSave): Promise<BinderItem | "not-found" | "invalid-item" | "wrong-set" | "full"> => {
  const db = await getDb();
  if (!(await pricesMatchItems(db, [item]))) return "invalid-item";
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(item.binder), user });
  if (!binderData) return "not-found";
  // A set binder only takes cards of its set
  if (binderData.set) {
    const card = item.type === ItemType.CARD ? await db.collection("cards").findOne({ _id: new ObjectId(item.item) }) : null;
    if (card?.set !== String(binderData.set)) return "wrong-set";
  }
  // Only the known fields are stored, stamped with the owner
  const itemData = { name: item.name, type: item.type, item: item.item, historicPrice: item.historicPrice, quantity: item.quantity, ...(item.owned === false && { owned: false }), binder: item.binder, user };
  const insertedId = await insertCapped(db, "binder-items", itemData, { binder: item.binder, user }, LIMITS.ITEMS_PER_LIST);
  if (!insertedId) return "full";
  await mirrorToWishlist(db, user, binderData.wishlist, item, item.owned === false);
  return JSON.parse(JSON.stringify({ ...itemData, _id: insertedId }));
};

// owned: false keeps it a missing slot, anything else makes it owned
export const changeItemQuantity = async (user: ObjectId, binder: string, id: string, quantity: number, owned?: boolean): Promise<boolean> => {
  const db = await getDb();
  const _id = new ObjectId(id);
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return false;
  const update = owned === false ? { $set: { quantity, owned } } : { $set: { quantity }, $unset: { owned: "" } };
  const updated = await db.collection("binder-items").findOneAndUpdate({ _id, binder, user }, update);
  if (!updated) return false;
  await mirrorToWishlist(db, user, binderData.wishlist, updated as unknown as BinderToSave, owned === false);
  return true;
};

export const deleteItemFromBinder = async (user: ObjectId, binder: string, id: string): Promise<boolean> => {
  const db = await getDb();
  const _id = new ObjectId(id);
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return false;
  const deleted = await db.collection("binder-items").findOneAndDelete({ _id, binder, user });
  if (!deleted) return false;
  if (deleted.owned === false) await unmirrorFromWishlist(db, user, binderData.wishlist, [deleted.historicPrice]);
  return true;
};

export const deleteItemsFromBinder = async (user: ObjectId, binder: string, ids: string[]): Promise<number> => {
  const db = await getDb();
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return 0;
  const match = { _id: { $in: ids.map((id) => new ObjectId(id)) }, binder, user };
  const missing = await db.collection("binder-items").find({ ...match, owned: false }, { projection: { historicPrice: 1 } }).toArray();
  const result = await db.collection("binder-items").deleteMany(match);
  await unmirrorFromWishlist(db, user, binderData.wishlist, missing.map((i) => i.historicPrice));
  return result.deletedCount;
};
