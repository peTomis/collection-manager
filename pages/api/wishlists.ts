import { WishlistItemToCreate, WishlistToSave, ItemType } from "@/types/mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { getUserId } from "@/lib/auth";
import {
  acquireWishlistItem,
  addItemToWishlist,
  createWishlist,
  deleteItemFromWishlist,
  deleteWishlist,
  fetchWishlist,
  fetchWishlists,
  fetchWishlistsWithCard,
  renameWishlist,
  setItemTarget,
} from "@/lib/db/wishlists";
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
    if (!requireJson(req, res)) return;

    // Bought: into a binder and off the wishlist, { acquire: { id, wishlist, binder } }
    if (req.body?.acquire) {
      if (validateAcquire(req.body.acquire).error) return res.status(400).json({ message: "Invalid item" });
      const { id, wishlist, binder } = req.body.acquire;
      const acquired = await acquireWishlistItem(user, { id, wishlist, binder });
      if (acquired === "not-found") return res.status(404).json({ message: "Wishlist item or binder not found" });
      if (acquired === "wrong-set") return res.status(422).json({ message: "Only cards of the binder's set can be added" });
      if (acquired === "full") return res.status(409).json({ message: "Binder items limit reached" });
      await updatePortfolio(user);
      return res.status(200).json({});
    }

    // Rename: { rename: { id, name } }
    if (req.body?.rename) {
      const id = parseObjectId(req.body.rename.id);
      if (!id || validateWishlist({ name: req.body.rename.name }).error) return res.status(400).json({ message: "Invalid wishlist name" });
      if (!(await renameWishlist(user, id, String(req.body.rename.name).trim()))) return res.status(404).json({ message: "Wishlist not found" });
      return res.status(200).json({});
    }

    if (req.body?.wishlist) {
      if (validateWishlist(req.body.wishlist).error) return res.status(400).json({ message: "Invalid wishlist data" });
      const items = (req.body.items ?? []) as WishlistItemToCreate[];
      if (validateNewWishlistItems(items).error) return res.status(400).json({ message: "Invalid wishlist item data" });
      const binder = req.body.wishlist.binder as string | undefined;
      const newWishlist = await createWishlist({ name: req.body.wishlist.name, user, ...(binder && { binder }) }, items);
      if (newWishlist === "invalid-item") return res.status(422).json({ message: "Item and price don't match" });
      if (newWishlist === "not-linkable") return res.status(409).json({ message: "Binder not found or already linked" });
      if (newWishlist === "full") return res.status(409).json({ message: "Wishlists limit reached" });
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

      const added = await addItemToWishlist(user, item);
      if (added === "not-found") return res.status(404).json({ message: "Wishlist not found" });
      if (added === "invalid-item") return res.status(422).json({ message: "Item and price don't match" });
      if (added === "full") return res.status(409).json({ message: "Wishlist items limit reached" });
      return res.status(201).json({});
    }

    return res.status(400).json({ message: "Invalid request" });
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
    binder: Joi.string().hex().length(24).optional(),
  });
  return schema.validate(wishlist);
};

const itemFields = {
  name: Joi.string().max(200).required(),
  type: Joi.string().valid(ItemType.CARD, ItemType.SEALED).required(),
  historicPrice: Joi.string().hex().length(24).required(),
  item: Joi.string().hex().length(24).required(),
  target: Joi.number().min(0).max(10_000_000).optional(),
};

const validateWishlistItem = (item: any) => {
  const schema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),
    wishlist: Joi.string().hex().length(24).required(),
    ...itemFields,
  });
  return schema.validate(item);
};

const validateAcquire = (acquire: any) =>
  Joi.object({
    id: Joi.string().hex().length(24).required(),
    wishlist: Joi.string().hex().length(24).required(),
    binder: Joi.string().hex().length(24).required(),
  }).validate(acquire);

// Items created together with their wishlist, which has no id yet
const validateNewWishlistItems = (items: any) => Joi.array().items(Joi.object(itemFields)).max(LIMITS.ITEMS_PER_LIST).validate(items);
