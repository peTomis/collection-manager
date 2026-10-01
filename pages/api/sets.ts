import { Db, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { allowMethods } from "@/lib/guards";
import { parseObjectId } from "@/lib/validation";

// How many documents each set has in a collection (cards and sealed reference their set by its id as a string)
const countBySet = async (db: Db, collection: string): Promise<Map<string, number>> => {
  const groups = await db
    .collection(collection)
    .aggregate<{ _id: string; count: number }>([{ $group: { _id: "$set", count: { $sum: 1 } } }])
    .toArray();
  return new Map(groups.map((g) => [String(g._id), g.count]));
};

export const fetchSets = async () => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const [games, cards, sealed] = await Promise.all([db.collection("sets").find({}).sort({}).toArray(), countBySet(db, "cards"), countBySet(db, "sealed")]);
  const withCounts = games.map((set) => ({ ...set, counts: { cards: cards.get(String(set._id)) ?? 0, sealed: sealed.get(String(set._id)) ?? 0 } }));
  return JSON.parse(JSON.stringify(withCounts));
};

export const fetchSet = async (_id: ObjectId) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const set = await db.collection("sets").findOne({ _id });
  return JSON.parse(JSON.stringify(set));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (req.method === "GET") {
    if (!req?.query?.user) return res.status(400).json({ message: "User not provided" });
    if (req?.query?.id) {
      const id = parseObjectId(req.query.id);
      if (!id) return res.status(400).json({ message: "Invalid set ID" });
      const set = await fetchSet(id);
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ set });
    }
    const sets = await fetchSets();
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

    return res.status(200).json({ sets });
  }
}
