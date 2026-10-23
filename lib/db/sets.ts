// Server only: the sets in the database
import { Db, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

// How many documents each set has in a collection (cards and sealed reference their set by its id as a string)
const countBySet = async (db: Db, collection: string): Promise<Map<string, number>> => {
  const groups = await db
    .collection(collection)
    .aggregate<{ _id: string; count: number }>([{ $group: { _id: "$set", count: { $sum: 1 } } }])
    .toArray();
  return new Map(groups.map((g) => [String(g._id), g.count]));
};

export const fetchSets = async () => {
  const db = await getDb();
  const [games, cards, sealed] = await Promise.all([db.collection("sets").find({}).toArray(), countBySet(db, "cards"), countBySet(db, "sealed")]);
  const withCounts = games.map((set) => ({ ...set, counts: { cards: cards.get(String(set._id)) ?? 0, sealed: sealed.get(String(set._id)) ?? 0 } }));
  return JSON.parse(JSON.stringify(withCounts));
};

export const fetchSet = async (_id: ObjectId) => {
  const db = await getDb();
  const set = await db.collection("sets").findOne({ _id });
  return JSON.parse(JSON.stringify(set));
};

export const setExists = async (_id: ObjectId): Promise<boolean> => {
  const db = await getDb();
  return (await db.collection("sets").countDocuments({ _id }, { limit: 1 })) === 1;
};
