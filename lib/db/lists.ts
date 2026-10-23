// Server only: the database side binders and wishlists share
import { Db, Document, ObjectId } from "mongodb";

// Items point to their card or sealed product (and its price) by its id as a string, and the two types live in separate collections:
// convert the id once so each join is a plain match on _id, and only join the collection matching the item's type
const lookupByType = (field: string, cardCollection: string, sealedCollection: string) => [
  { $set: { joinId: { $toObjectId: `$${field}` } } },
  ...[
    { from: cardCollection, as: "byCard", type: { $eq: ["$$t", "card"] } },
    { from: sealedCollection, as: "bySealed", type: { $ne: ["$$t", "card"] } },
  ].map(({ from, as, type }) => ({
    $lookup: { from, localField: "joinId", foreignField: "_id", let: { t: "$type" }, pipeline: [{ $match: { $expr: type } }], as },
  })),
  { $set: { [field]: { $first: { $concatArrays: ["$byCard", "$bySealed"] } } } },
  { $unset: ["joinId", "byCard", "bySealed"] },
];

// Whether every item's historic price is one of that item's own versions, so a price can't be attached to another product
export const pricesMatchItems = async (db: Db, items: { type: string; item: string; historicPrice: string }[]): Promise<boolean> => {
  if (!items.length) return true;
  const read = (collection: string, field: string, type: (t: string) => boolean) => {
    const ids = [...new Set(items.filter((i) => type(i.type)).map((i) => i.historicPrice))].map((id) => new ObjectId(id));
    return ids.length ? db.collection(collection).find({ _id: { $in: ids } }, { projection: { [field]: 1 } }).toArray() : [];
  };
  const [cards, sealed] = await Promise.all([read("card-historic-prices", "card", (t) => t === "card"), read("sealed-historic-prices", "sealed", (t) => t !== "card")]);
  const owner = new Map<string, string>([...cards.map((p) => [String(p._id), String(p.card)] as const), ...sealed.map((p) => [String(p._id), String(p.sealed)] as const)]);
  return items.every((i) => owner.get(i.historicPrice) === i.item);
};

// A user's binders or wishlists with their items, each joined with its card or sealed product and its historic price.
// Lists are in "<list>s", their items in "<list>-items", pointing to their list by its id as a string (matched on the { user, <list> } index).
export const fetchListsWithItems = async <T extends Document>(db: Db, list: "binder" | "wishlist", user: ObjectId): Promise<T[]> => {
  const pipeline = [
    { $match: { user } },
    { $set: { listId: { $toString: "$_id" } } },
    {
      $lookup: {
        from: `${list}-items`,
        localField: "listId",
        foreignField: list,
        let: { userId: "$user" },
        pipeline: [
          // Items carry their owner too: only the list owner's items are joined
          { $match: { $expr: { $eq: ["$user", "$$userId"] } } },
          ...lookupByType("item", "cards", "sealed"),
          ...lookupByType("historicPrice", "card-historic-prices", "sealed-historic-prices"),
        ],
        as: "items",
      },
    },
    { $unset: "listId" },
  ];
  return db.collection(`${list}s`).aggregate<T>(pipeline).toArray();
};
