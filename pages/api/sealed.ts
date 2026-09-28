import { Db, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { parseObjectId, queryString } from "@/lib/validation";

const fetchSealedBySet = async (set: string) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const games = await db.collection("sealed").find({ set }).sort({}).toArray();
  return JSON.parse(JSON.stringify(games));
};

const fetchSealedByType = async (type: string) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const games = await db.collection("sealed").find({ type }).sort({}).toArray();
  return JSON.parse(JSON.stringify(games));
};

export const fetchSingleSealed = async (_id: ObjectId) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const set = await db.collection("sealed").findOne({ _id });
  return JSON.parse(JSON.stringify(set));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    if (!req?.query?.user) return res.status(400).json({ message: "User not provided" });
    if (req?.query?.id) {
      const id = parseObjectId(req.query.id);
      if (!id) return res.status(400).json({ message: "Invalid sealed ID" });
      const sealed = await fetchSingleSealed(id);
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ sealed });
    }
    const set = queryString(req.query.set);
    const type = queryString(req.query.type);
    if (!set && !type) return res.status(400).json({ message: "Set or type not provided" });
    const sealed = set ? await fetchSealedBySet(set) : await fetchSealedByType(type as string);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ sealed });
  }
}
