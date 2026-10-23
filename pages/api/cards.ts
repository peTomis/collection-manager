import { ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/mongodb";
import { allowMethods } from "@/lib/guards";
import { parseObjectId, queryString } from "@/lib/validation";

const fetchCardsBySet = async (set: string) => {
  const db = await getDb();
  const games = await db.collection("cards").find({ set }).toArray();
  return JSON.parse(JSON.stringify(games));
};

export const fetchCard = async (_id: ObjectId) => {
  const db = await getDb();
  const set = await db.collection("cards").findOne({ _id });
  return JSON.parse(JSON.stringify(set));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
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
