import { Db, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { parseObjectId, queryString } from "@/lib/validation";

const fetchCardsBySet = async (set: string) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const games = await db.collection("cards").find({ set }).sort({}).toArray();
  return JSON.parse(JSON.stringify(games));
};

export const fetchCard = async (_id: ObjectId) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const set = await db.collection("cards").findOne({ _id });
  return JSON.parse(JSON.stringify(set));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    if (!req?.query?.user) return res.status(400).json({ message: "User not provided" });
    if (req?.query?.id) {
      const id = parseObjectId(req.query.id);
      if (!id) return res.status(400).json({ message: "Invalid card ID" });
      const card = await fetchCard(id);
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ card });
    }
    const set = queryString(req.query.set);
    if (!set) return res.status(400).json({ message: "Set not provided" });
    const cards = await fetchCardsBySet(set);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ cards });
  }
}
