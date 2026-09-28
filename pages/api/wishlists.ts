import { Wishlist, WishlistItem, WishlistToSave, ItemType } from "@/types/mongodb";
import { Db, ObjectId, WithoutId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { getUserId } from "@/lib/auth";
import { LIMITS, parseObjectId } from "@/lib/validation";
import * as Joi from "joi";

const countWishlists = async (user: ObjectId): Promise<number> => {
  await client.connect();
  return client.db("collection-manager").collection("wishlists").countDocuments({ user });
};

const countWishlistItems = async (wishlist: string, user: ObjectId): Promise<number> => {
  await client.connect();
  return client.db("collection-manager").collection("wishlist-items").countDocuments({ wishlist, user });
};

const fetchWishlists = async (user: ObjectId): Promise<Wishlist[]> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const items = await db.collection("wishlists").find({ user }).sort({}).toArray();
  return items as unknown as Wishlist[];
};

const fetchWishlistsWithCard = async (user: ObjectId): Promise<Wishlist[]> => {
  await client.connect();
  const db: Db = client.db("collection-manager");

  const pipeline = [
    { $match: { user } },
    {
      $lookup: {
        from: "wishlist-items",
        let: { wishlistId: "$_id", userId: "$user" },
        pipeline: [
          {
            $match: {
              // Items carry their owner too: only the wishlist owner's items are joined
              $expr: { $and: [{ $eq: [{ $toObjectId: "$wishlist" }, "$$wishlistId"] }, { $eq: ["$user", "$$userId"] }] },
            },
          },

          // ITEM: cards vs sealed
          {
            $lookup: {
              from: "cards",
              let: { itemId: "$item", t: "$type" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$$t", "card"] }, { $eq: ["$_id", { $toObjectId: "$$itemId" }] }],
                    },
                  },
                },
              ],
              as: "itemCard",
            },
          },
          {
            $lookup: {
              from: "sealed",
              let: { itemId: "$item", t: "$type" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $ne: ["$$t", "card"] }, // or $eq: ["$$t", "sealed"]
                        { $eq: ["$_id", { $toObjectId: "$$itemId" }] },
                      ],
                    },
                  },
                },
              ],
              as: "itemSealed",
            },
          },
          {
            $set: {
              item: { $first: { $concatArrays: ["$itemCard", "$itemSealed"] } },
            },
          },
          { $unset: ["itemCard", "itemSealed"] },

          // HISTORIC PRICE: card-historic-prices vs sealed-historic-prices
          {
            $lookup: {
              from: "card-historic-prices",
              let: { priceId: "$historicPrice", t: "$type" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$$t", "card"] }, { $eq: ["$_id", { $toObjectId: "$$priceId" }] }],
                    },
                  },
                },
              ],
              as: "hpCard",
            },
          },
          {
            $lookup: {
              from: "sealed-historic-prices",
              let: { priceId: "$historicPrice", t: "$type" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $ne: ["$$t", "card"] }, { $eq: ["$_id", { $toObjectId: "$$priceId" }] }],
                    },
                  },
                },
              ],
              as: "hpSealed",
            },
          },
          {
            $set: {
              historicPrice: {
                $first: { $concatArrays: ["$hpCard", "$hpSealed"] },
              },
            },
          },
          { $unset: ["hpCard", "hpSealed"] },
        ],
        as: "items",
      },
    },
  ];

  const items = await db.collection<Wishlist>("wishlists").aggregate<Wishlist & { items: WishlistItem[] }>(pipeline).toArray();

  return items;
};

const fetchWishlist = async (_id: ObjectId, user: ObjectId): Promise<Wishlist> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const item = await db.collection("wishlists").findOne({ _id, user });
  return JSON.parse(JSON.stringify(item));
};

const saveWishlist = async (wishlist: WithoutId<Wishlist>): Promise<Wishlist> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const result = await db.collection("wishlists").insertOne(wishlist);
  return JSON.parse(JSON.stringify({ ...wishlist, _id: result.insertedId }));
};

const deleteWishlist = async (id: string, user: ObjectId): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const result = await db.collection("wishlists").deleteOne({ _id, user });
  if (result.deletedCount !== 1) return false;
  await db.collection("wishlist-items").deleteMany({ wishlist: id, user });
  return true;
};

const addItemToWishlist = async (user: ObjectId, item: WishlistToSave): Promise<WishlistItem | null> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const wishlistData = await db.collection("wishlists").findOne({ _id: new ObjectId(item.wishlist), user });
  if (!wishlistData) return null;
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
  const result = await db.collection("wishlist-items").insertOne(itemData);
  return JSON.parse(JSON.stringify({ ...itemData, _id: result.insertedId }));
};

const setItemTarget = async (user: ObjectId, wishlist: string, id: string, target?: number): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const wishlistData = await db.collection("wishlists").findOne({ _id: new ObjectId(wishlist), user });
  if (!wishlistData) return false;
  const update = target === undefined ? { $unset: { target: "" } } : { $set: { target } };
  const result = await db.collection("wishlist-items").updateOne({ _id, wishlist, user }, update);
  return result.matchedCount === 1;
};

const deleteItemFromWishlist = async (user: ObjectId, wishlist: string, id: string): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const wishlistData = await db.collection("wishlists").findOne({ _id: new ObjectId(wishlist), user });
  if (!wishlistData) return false;
  const result = await db.collection("wishlist-items").deleteOne({ _id, wishlist, user });
  return result.deletedCount === 1;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserId(req, res);
  if (!user) return res.status(401).json({ message: "Sign in to use your collection" });

  if (req.method === "GET") {
    if (req?.query?.withcards) {
      const items = await fetchWishlistsWithCard(user);
      return res.status(200).json({ items });
    }
    if (!req?.query?.id) {
      const items = await fetchWishlists(user);
      return res.status(200).json({ items });
    }

    const id = parseObjectId(req.query.id);
    if (!id) return res.status(400).json({ message: "Invalid wishlist ID" });
    const item = await fetchWishlist(id, user);
    return res.status(200).json({ item });
  } else if (req.method === "POST") {
    if (req.body?.wishlist) {
      if (validateWishlist(req.body.wishlist).error) return res.status(400).json({ message: "Invalid wishlist data" });
      if ((await countWishlists(user)) >= LIMITS.LISTS_PER_USER) return res.status(409).json({ message: "Wishlists limit reached" });
      const newWishlist = await saveWishlist({ name: req.body.wishlist.name, user });
      return res.status(201).json({ item: newWishlist });
    }

    const item = req.body?.item as WishlistToSave | undefined;
    if (item) {
      if (validateWishlistItem(item).error) {
        return res.status(400).json({ message: "Invalid wishlist item data" });
      }

      if (item._id) {
        const success = await setItemTarget(user, item.wishlist, item._id, item.target);
        if (success) {
          return res.status(200).json({ message: "Wishlist item updated successfully" });
        } else {
          return res.status(404).json({ message: "Wishlist item not found" });
        }
      }

      if ((await countWishlistItems(item.wishlist, user)) >= LIMITS.ITEMS_PER_LIST) return res.status(409).json({ message: "Wishlist items limit reached" });
      const added = await addItemToWishlist(user, item);
      if (!added) return res.status(404).json({ message: "Wishlist not found" });
      return res.status(201).json({});
    }
  } else if (req.method === "DELETE") {
    if (!parseObjectId(req.query.id)) return res.status(400).json({ message: "Invalid wishlist ID" });
    if (req?.query?.itemId) {
      if (!parseObjectId(req.query.itemId)) return res.status(400).json({ message: "Invalid item ID" });
      const success = await deleteItemFromWishlist(user, req.query.id as string, req.query.itemId as string);
      if (success) {
        return res.status(200).json({ message: "Wishlist item deleted successfully" });
      } else {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
    }
    const success = await deleteWishlist(req.query.id as string, user);
    if (success) {
      return res.status(200).json({ message: "Wishlist deleted successfully" });
    } else {
      return res.status(404).json({ message: "Wishlist not found" });
    }
  }
}

const validateWishlist = (wishlist: any) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(LIMITS.NAME_LENGTH).required(),
  });
  return schema.validate(wishlist);
};

const validateWishlistItem = (item: any) => {
  const schema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    wishlist: Joi.string().hex().length(24).required(),
    name: Joi.string().max(200).required(),
    type: Joi.string().valid(ItemType.CARD, ItemType.SEALED).required(),
    historicPrice: Joi.string().hex().length(24).required(),
    item: Joi.string().hex().length(24).required(),
    target: Joi.number().min(0).max(10_000_000).optional(),
  });
  return schema.validate(item);
};
