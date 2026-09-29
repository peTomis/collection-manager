import { Binder, BinderItem, BinderItemToCreate, BinderToSave, ItemType } from "@/types/mongodb";
import { Db, ObjectId, WithoutId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { getUserId } from "@/lib/auth";
import { refreshPortfolio } from "@/lib/portfolio";
import { LIMITS, parseObjectId } from "@/lib/validation";
import * as Joi from "joi";

const countBinders = async (user: ObjectId): Promise<number> => {
  await client.connect();
  return client.db("collection-manager").collection("binders").countDocuments({ user });
};

const countBinderItems = async (binder: string, user: ObjectId): Promise<number> => {
  await client.connect();
  return client.db("collection-manager").collection("binder-items").countDocuments({ binder, user });
};

const fetchBinders = async (user: ObjectId): Promise<Binder[]> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const items = await db.collection("binders").find({ user }).sort({}).toArray();
  return items as unknown as Binder[];
};

const fetchBindersWithCard = async (user: ObjectId): Promise<Binder[]> => {
  await client.connect();
  const db: Db = client.db("collection-manager");

  const pipeline = [
    { $match: { user } },
    {
      $lookup: {
        from: "binder-items",
        let: { binderId: "$_id", userId: "$user" },
        pipeline: [
          {
            $match: {
              // Items carry their owner too: only the binder owner's items are joined
              $expr: { $and: [{ $eq: [{ $toObjectId: "$binder" }, "$$binderId"] }, { $eq: ["$user", "$$userId"] }] },
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

  const items = await db.collection<Binder>("binders").aggregate<Binder & { items: BinderItem[] }>(pipeline).toArray();

  return items;
};

const fetchBinder = async (_id: ObjectId, user: ObjectId): Promise<Binder> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const item = await db.collection("binders").findOne({ _id, user });
  return JSON.parse(JSON.stringify(item));
};

const setExists = async (_id: ObjectId): Promise<boolean> => {
  await client.connect();
  return (await client.db("collection-manager").collection("sets").countDocuments({ _id }, { limit: 1 })) === 1;
};

// A set binder only takes cards of its set: every card must be one of them, and nothing sealed
const itemsFitSet = async (set: ObjectId, items: BinderItemToCreate[]): Promise<boolean> => {
  if (items.some((i) => i.type !== ItemType.CARD)) return false;
  await client.connect();
  const ids = [...new globalThis.Set(items.map((i) => i.item))].map((id) => new ObjectId(id));
  return (await client.db("collection-manager").collection("cards").countDocuments({ _id: { $in: ids }, set: String(set) })) === ids.length;
};

// items: the binder's first items, e.g. a whole set added at once
const saveBinder = async (binder: WithoutId<Binder>, items: BinderItemToCreate[] = []): Promise<Binder> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const result = await db.collection("binders").insertOne(binder);
  const id = String(result.insertedId);
  if (items.length) {
    // Only the known fields are stored, stamped with the owner
    await db
      .collection("binder-items")
      .insertMany(
        items.map((i) => ({ name: i.name, type: i.type, item: i.item, historicPrice: i.historicPrice, quantity: i.quantity, ...(i.owned === false && { owned: false }), binder: id, user: binder.user }))
      );
  }
  return JSON.parse(JSON.stringify({ ...binder, _id: result.insertedId }));
};

const deleteBinder = async (id: string, user: ObjectId): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const result = await db.collection("binders").deleteOne({ _id, user });
  if (result.deletedCount !== 1) return false;
  await db.collection("binder-items").deleteMany({ binder: id, user });
  return true;
};

const addItemToBinder = async (user: ObjectId, item: BinderToSave): Promise<BinderItem | "not-found" | "wrong-set"> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(item.binder), user });
  if (!binderData) return "not-found";
  // A set binder only takes cards of its set
  if (binderData.set) {
    const card = item.type === ItemType.CARD ? await db.collection("cards").findOne({ _id: new ObjectId(item.item) }) : null;
    if (card?.set !== String(binderData.set)) return "wrong-set";
  }
  // Only the known fields are stored, stamped with the owner
  const itemData = { name: item.name, type: item.type, item: item.item, historicPrice: item.historicPrice, quantity: item.quantity, ...(item.owned === false && { owned: false }), binder: item.binder, user };
  const result = await db.collection("binder-items").insertOne(itemData);
  return JSON.parse(JSON.stringify({ ...itemData, _id: result.insertedId }));
};

// owned: false keeps it a missing slot, anything else makes it owned
const changeItemQuantity = async (user: ObjectId, binder: string, id: string, quantity: number, owned?: boolean): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return false;
  const update = owned === false ? { $set: { quantity, owned } } : { $set: { quantity }, $unset: { owned: "" } };
  const result = await db.collection("binder-items").updateOne({ _id, binder, user }, update);
  return result.matchedCount === 1;
};

const deleteItemFromBinder = async (user: ObjectId, binder: string, id: string): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return false;
  const result = await db.collection("binder-items").deleteOne({ _id, binder, user });
  return result.deletedCount === 1;
};

const deleteItemsFromBinder = async (user: ObjectId, binder: string, ids: string[]): Promise<number> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return 0;
  const result = await db.collection("binder-items").deleteMany({ _id: { $in: ids.map((id) => new ObjectId(id)) }, binder, user });
  return result.deletedCount;
};

// Keep the portfolio totals in step with the binders. The change itself is already saved, so a failure here only logs.
const updatePortfolio = async (user: ObjectId) => {
  try {
    await client.connect();
    await refreshPortfolio(client.db("collection-manager"), user);
  } catch (error) {
    console.error("Portfolio update failed", error);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserId(req, res);
  if (!user) return res.status(401).json({ message: "Sign in to use your collection" });

  if (req.method === "GET") {
    if (req?.query?.withcards) {
      const items = await fetchBindersWithCard(user);
      return res.status(200).json({ items });
    }
    if (!req?.query?.id) {
      const items = await fetchBinders(user);
      return res.status(200).json({ items });
    }

    const id = parseObjectId(req.query.id);
    if (!id) return res.status(400).json({ message: "Invalid binder ID" });
    const item = await fetchBinder(id, user);
    return res.status(200).json({ item });
  } else if (req.method === "POST") {
    if (req.body?.binder) {
      if (validateBinder(req.body.binder).error) return res.status(400).json({ message: "Invalid binder data" });
      if ((await countBinders(user)) >= LIMITS.LISTS_PER_USER) return res.status(409).json({ message: "Binders limit reached" });
      const items = (req.body.items ?? []) as BinderItemToCreate[];
      if (validateNewBinderItems(items).error) return res.status(400).json({ message: "Invalid binder item data" });
      const set = req.body.binder.set ? new ObjectId(req.body.binder.set as string) : undefined;
      if (set && !(await setExists(set))) return res.status(400).json({ message: "Set not found" });
      if (set && items.length && !(await itemsFitSet(set, items))) return res.status(422).json({ message: "Only cards of the binder's set can be added" });
      const newBinder = await saveBinder({ name: req.body.binder.name, user, ...(set && { set }) }, items);
      if (items.length) await updatePortfolio(user);
      return res.status(201).json({ item: newBinder });
    }

    const item = req.body?.item as BinderToSave | undefined;
    if (item) {
      if (validateBinderItem(item).error) {
        return res.status(400).json({ message: "Invalid binder item data" });
      }

      if (item._id) {
        const success = await changeItemQuantity(user, item.binder, item._id, item.quantity, item.owned);
        if (success) {
          await updatePortfolio(user);
          return res.status(200).json({ message: "Binder item updated successfully" });
        } else {
          return res.status(404).json({ message: "Binder item not found" });
        }
      }

      if ((await countBinderItems(item.binder, user)) >= LIMITS.ITEMS_PER_LIST) return res.status(409).json({ message: "Binder items limit reached" });
      const added = await addItemToBinder(user, item);
      if (added === "not-found") return res.status(404).json({ message: "Binder not found" });
      if (added === "wrong-set") return res.status(422).json({ message: "Only cards of the binder's set can be added" });
      await updatePortfolio(user);
      return res.status(201).json({});
    }
  } else if (req.method === "DELETE") {
    if (!parseObjectId(req.query.id)) return res.status(400).json({ message: "Invalid binder ID" });
    // Several items at once: their ids in the body
    if (req.body?.itemIds) {
      if (validateItemIds(req.body.itemIds).error) return res.status(400).json({ message: "Invalid item IDs" });
      const deleted = await deleteItemsFromBinder(user, req.query.id as string, req.body.itemIds);
      if (deleted) await updatePortfolio(user);
      return res.status(200).json({ deleted });
    }
    if (req?.query?.itemId) {
      if (!parseObjectId(req.query.itemId)) return res.status(400).json({ message: "Invalid item ID" });
      const success = await deleteItemFromBinder(user, req.query.id as string, req.query.itemId as string);
      if (success) {
        await updatePortfolio(user);
        return res.status(200).json({ message: "Binder item deleted successfully" });
      } else {
        return res.status(404).json({ message: "Binder item not found" });
      }
    }
    const success = await deleteBinder(req.query.id as string, user);
    if (success) {
      await updatePortfolio(user);
      return res.status(200).json({ message: "Binder deleted successfully" });
    } else {
      return res.status(404).json({ message: "Binder not found" });
    }
  }
}

const validateBinder = (binder: any) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(LIMITS.NAME_LENGTH).required(),
    set: Joi.string().hex().length(24).optional(),
  });
  return schema.validate(binder);
};

const itemFields = {
  quantity: Joi.number().integer().min(1).max(LIMITS.QUANTITY).required(),
  name: Joi.string().max(200).required(),
  type: Joi.string().valid(ItemType.CARD, ItemType.SEALED).required(),
  historicPrice: Joi.string().hex().length(24).required(),
  item: Joi.string().hex().length(24).required(),
  owned: Joi.boolean().optional(),
};

const validateBinderItem = (item: any) => {
  const schema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    binder: Joi.string().hex().length(24).required(),
    ...itemFields,
  });
  return schema.validate(item);
};

const validateItemIds = (ids: any) => Joi.array().items(Joi.string().hex().length(24)).min(1).max(LIMITS.ITEMS_PER_LIST).validate(ids);

// Items created together with their binder, which has no id yet
const validateNewBinderItems = (items: any) => Joi.array().items(Joi.object(itemFields)).max(LIMITS.ITEMS_PER_LIST).validate(items);
