// Server only: keeps a binder and its linked wishlist in step.
// The wishlist holds the binder's missing items, one per version (matched by price id): what is missing in one is wanted in the other.
import { Db, ObjectId } from "mongodb";
import { ItemType } from "@/types/mongodb";

interface MirroredItem {
  name: string;
  type: ItemType;
  item: string;
  historicPrice: string;
}

// A binder item became (or was created as) missing: the wishlist wants it. Owned: the wishlist no longer does.
export const mirrorToWishlist = async (db: Db, user: ObjectId, wishlist: string | undefined, item: MirroredItem, missing: boolean) => {
  if (!wishlist) return;
  const match = { wishlist, user, historicPrice: item.historicPrice };
  if (!missing) {
    await db.collection("wishlist-items").deleteMany(match);
    return;
  }
  await db.collection("wishlist-items").updateOne(match, { $setOnInsert: { name: item.name, type: item.type, item: item.item } }, { upsert: true });
};

// Missing binder items gone from the binder leave the wishlist too
export const unmirrorFromWishlist = async (db: Db, user: ObjectId, wishlist: string | undefined, historicPrices: string[]) => {
  if (!wishlist || !historicPrices.length) return;
  await db.collection("wishlist-items").deleteMany({ wishlist, user, historicPrice: { $in: historicPrices } });
};

// An item added to the wishlist becomes a missing slot in the binder, unless the binder has it already or can't take it
export const mirrorToBinder = async (db: Db, user: ObjectId, binder: string | undefined, item: MirroredItem) => {
  if (!binder) return;
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return;
  // A set binder only takes cards of its set
  if (binderData.set) {
    const card = item.type === ItemType.CARD ? await db.collection("cards").findOne({ _id: new ObjectId(item.item) }) : null;
    if (card?.set !== String(binderData.set)) return;
  }
  await db
    .collection("binder-items")
    .updateOne({ binder, user, historicPrice: item.historicPrice }, { $setOnInsert: { name: item.name, type: item.type, item: item.item, quantity: 1, owned: false } }, { upsert: true });
};

// An item removed from the wishlist is no longer tracked as missing in the binder (owned copies stay)
export const unmirrorFromBinder = async (db: Db, user: ObjectId, binder: string | undefined, historicPrice: string) => {
  if (!binder) return;
  await db.collection("binder-items").deleteMany({ binder, user, historicPrice, owned: false });
};

// The list linked to one being created, if it belongs to the user and isn't linked yet
export const linkable = async (db: Db, user: ObjectId, collection: "binders" | "wishlists", id: string | undefined) => {
  if (!id) return true;
  const field = collection === "binders" ? "wishlist" : "binder";
  return (await db.collection(collection).countDocuments({ _id: new ObjectId(id), user, [field]: { $exists: false } }, { limit: 1 })) === 1;
};

// Point the other list back at the new one, or drop its link when the new one is deleted
export const setLink = async (db: Db, user: ObjectId, collection: "binders" | "wishlists", id: string | undefined, to: string | undefined) => {
  if (!id) return;
  const field = collection === "binders" ? "wishlist" : "binder";
  await db.collection(collection).updateOne({ _id: new ObjectId(id), user }, to ? { $set: { [field]: to } } : { $unset: { [field]: "" } });
};
