import { Binder, BinderItem, BinderToSave, CardVariantType, HistoricPrice, Item, ItemType } from "@/types/mongodb";
import { Db, ObjectId, WithoutId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { getUserId } from "@/lib/auth";
import { LIMITS, parseObjectId } from "@/lib/validation";
import * as Joi from "joi";

const countBinders = async (user: ObjectId): Promise<number> => {
  await client.connect();
  return client.db("collection-manager").collection("binders").countDocuments({ user });
};

const countBinderItems = async (binder: string): Promise<number> => {
  await client.connect();
  return client.db("collection-manager").collection("binder-items").countDocuments({ binder });
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
        let: { binderId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: [{ $toObjectId: "$binder" }, "$$binderId"] },
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

  const items = await db.collection<Binder>("binders").aggregate<Binder & { items: (BinderItem & { item: Item; historicPrice: HistoricPrice })[] }>(pipeline).toArray();

  return items;
};

const fetchBinder = async (_id: ObjectId, user: ObjectId): Promise<Binder> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const item = await db.collection("binders").findOne({ _id, user });
  return JSON.parse(JSON.stringify(item));
};

const saveBinder = async (binder: WithoutId<Binder>): Promise<Binder> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const result = await db.collection("binders").insertOne(binder);
  return JSON.parse(JSON.stringify({ ...binder, _id: result.insertedId }));
};

const deleteBinder = async (id: string, user: ObjectId): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const result = await db.collection("binders").deleteOne({ _id, user });
  if (result.deletedCount !== 1) return false;
  await db.collection("binder-items").deleteMany({ binder: id });
  return true;
};

const addItemToBinder = async (user: ObjectId, item: BinderToSave): Promise<BinderItem | null> => {
  const { _id, ...itemData } = item;
  await client.connect();
  const db: Db = client.db("collection-manager");
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(item.binder), user });
  if (!binderData) return null;
  const result = await db.collection("binder-items").insertOne(itemData);
  return JSON.parse(JSON.stringify({ ...item, _id: result.insertedId }));
};

const changeItemQuantity = async (user: ObjectId, binder: string, id: string, quantity: number): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return false;
  const result = await db.collection("binder-items").updateOne({ _id, binder }, { $set: { quantity } });
  return result.modifiedCount === 1;
};

const deleteItemFromBinder = async (user: ObjectId, binder: string, id: string): Promise<boolean> => {
  await client.connect();
  const _id = new ObjectId(id);
  const db: Db = client.db("collection-manager");
  const binderData = await db.collection("binders").findOne({ _id: new ObjectId(binder), user });
  if (!binderData) return false;
  const result = await db.collection("binder-items").deleteOne({ _id, binder });
  return result.deletedCount === 1;
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
      const newBinder = await saveBinder({ name: req.body.binder.name, user });
      return res.status(201).json({ item: newBinder });
    }

    const item = req.body?.item as BinderToSave | undefined;
    if (item) {
      if (validateBinderItem(item).error) {
        return res.status(400).json({ message: "Invalid binder item data" });
      }

      if (item._id) {
        const success = await changeItemQuantity(user, item.binder, item._id, item.quantity);
        if (success) {
          return res.status(200).json({ message: "Binder item updated successfully" });
        } else {
          return res.status(404).json({ message: "Binder item not found" });
        }
      }

      if ((await countBinderItems(item.binder)) >= LIMITS.ITEMS_PER_LIST) return res.status(409).json({ message: "Binder items limit reached" });
      const added = await addItemToBinder(user, item);
      if (!added) return res.status(404).json({ message: "Binder not found" });
      return res.status(201).json({});
    }
  } else if (req.method === "DELETE") {
    if (!parseObjectId(req.query.id)) return res.status(400).json({ message: "Invalid binder ID" });
    if (req?.query?.itemId) {
      if (!parseObjectId(req.query.itemId)) return res.status(400).json({ message: "Invalid item ID" });
      const success = await deleteItemFromBinder(user, req.query.id as string, req.query.itemId as string);
      if (success) {
        return res.status(200).json({ message: "Binder item deleted successfully" });
      } else {
        return res.status(404).json({ message: "Binder item not found" });
      }
    }
    const success = await deleteBinder(req.query.id as string, user);
    if (success) {
      return res.status(200).json({ message: "Binder deleted successfully" });
    } else {
      return res.status(404).json({ message: "Binder not found" });
    }
  }
}

const validateBinder = (binder: any) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(LIMITS.NAME_LENGTH).required(),
  });
  return schema.validate(binder);
};

const validateBinderItem = (item: any) => {
  const schema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    binder: Joi.string().hex().length(24).required(),
    quantity: Joi.number().integer().min(1).max(LIMITS.QUANTITY).required(),
    name: Joi.string().max(200).required(),
    type: Joi.string().valid(ItemType.CARD, ItemType.SEALED).required(),
    historicPrice: Joi.string().hex().length(24).required(),
    item: Joi.string().hex().length(24).required(),
  });
  return schema.validate(item);
};
