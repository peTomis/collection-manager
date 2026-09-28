import { Db, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { parseObjectId } from "@/lib/validation";

const fetchSets = async () => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const games = await db.collection("sets").find({}).sort({}).toArray();
  return JSON.parse(JSON.stringify(games));
};

export const fetchSet = async (_id: ObjectId) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const set = await db.collection("sets").findOne({ _id });
  return JSON.parse(JSON.stringify(set));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
