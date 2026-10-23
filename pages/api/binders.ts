import { BinderItemToCreate, BinderToSave, ItemType } from "@/types/mongodb";
import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { getUserId } from "@/lib/auth";
import {
  addItemToBinder,
  changeItemQuantity,
  createBinder,
  deleteBinder,
  deleteItemFromBinder,
  deleteItemsFromBinder,
  fetchBinder,
  fetchBinders,
  fetchBindersWithCard,
  itemsFitSet,
  removeBinderSet,
  renameBinder,
  unlinkBinder,
} from "@/lib/db/binders";
import { setExists } from "@/lib/db/sets";
import { updatePortfolio } from "@/lib/db/portfolios";
import { LIMITS, parseObjectId } from "@/lib/validation";
import { allowMethods, requireJson } from "@/lib/guards";
import * as Joi from "joi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET", "POST", "DELETE"])) return;
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
    if (!requireJson(req, res)) return;

    // Unlink a binder and its wishlist: both stay, and stop mirroring each other
    if (req.body?.unlink) {
      const id = parseObjectId(req.body.unlink);
      if (!id) return res.status(400).json({ message: "Invalid binder ID" });
      if (!(await unlinkBinder(user, id))) return res.status(404).json({ message: "Binder not found" });
      return res.status(200).json({});
    }

    // Drop a set binder's set: it then takes any card or sealed product
    if (req.body?.removeSet) {
      const id = parseObjectId(req.body.removeSet);
      if (!id) return res.status(400).json({ message: "Invalid binder ID" });
      if (!(await removeBinderSet(user, id))) return res.status(404).json({ message: "Binder not found" });
      return res.status(200).json({});
    }

    // Rename: { rename: { id, name } }
    if (req.body?.rename) {
      const id = parseObjectId(req.body.rename.id);
      if (!id || validateBinder({ name: req.body.rename.name }).error) return res.status(400).json({ message: "Invalid binder name" });
      if (!(await renameBinder(user, id, String(req.body.rename.name).trim()))) return res.status(404).json({ message: "Binder not found" });
      return res.status(200).json({});
    }

    if (req.body?.binder) {
      if (validateBinder(req.body.binder).error) return res.status(400).json({ message: "Invalid binder data" });
      const items = (req.body.items ?? []) as BinderItemToCreate[];
      if (validateNewBinderItems(items).error) return res.status(400).json({ message: "Invalid binder item data" });
      const set = req.body.binder.set ? new ObjectId(req.body.binder.set as string) : undefined;
      if (set && !(await setExists(set))) return res.status(400).json({ message: "Set not found" });
      if (set && items.length && !(await itemsFitSet(set, items))) return res.status(422).json({ message: "Only cards of the binder's set can be added" });
      const wishlist = req.body.binder.wishlist as string | undefined;
      const newBinder = await createBinder({ name: req.body.binder.name, user, ...(set && { set }), ...(wishlist && { wishlist }) }, items);
      if (newBinder === "invalid-item") return res.status(422).json({ message: "Item and price don't match" });
      if (newBinder === "not-linkable") return res.status(409).json({ message: "Wishlist not found or already linked" });
      if (newBinder === "full") return res.status(409).json({ message: "Binders limit reached" });
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

      const added = await addItemToBinder(user, item);
      if (added === "not-found") return res.status(404).json({ message: "Binder not found" });
      if (added === "invalid-item") return res.status(422).json({ message: "Item and price don't match" });
      if (added === "wrong-set") return res.status(422).json({ message: "Only cards of the binder's set can be added" });
      if (added === "full") return res.status(409).json({ message: "Binder items limit reached" });
      await updatePortfolio(user);
      return res.status(201).json({});
    }

    return res.status(400).json({ message: "Invalid request" });
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
    wishlist: Joi.string().hex().length(24).optional(),
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
