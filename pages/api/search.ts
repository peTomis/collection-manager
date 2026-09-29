import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { queryString } from "@/lib/validation";

const LIMITS = { sets: 5, cards: 12, sealed: 6 };

// Matches anywhere in the text, ignoring case; the query is taken literally
const contains = (query: string) => new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

// Sets, cards and sealed products whose name (or set code) contains the query: the top bar's quick search
const search = async (query: string) => {
  await client.connect();
  const db = client.db("collection-manager");
  const match = contains(query);
  const [sets, cards, sealed] = await Promise.all([
    db
      .collection("sets")
      .find({ $or: [{ name: match }, { code: match }] }, { projection: { name: 1, code: 1, releasedAt: 1, tcgdex: 1, cards: 1, sealed: 1 } })
      .sort({ releasedAt: -1 })
      .limit(LIMITS.sets)
      .toArray(),
    db.collection("cards").find({ name: match }, { projection: { name: 1, number: 1, set: 1 } }).limit(LIMITS.cards).toArray(),
    db.collection("sealed").find({ name: match }, { projection: { name: 1, set: 1, type: 1, path: 1 } }).limit(LIMITS.sealed).toArray(),
  ]);
  return JSON.parse(JSON.stringify({ sets, cards, sealed }));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const query = queryString(req.query.q)?.trim() ?? "";
  if (query.length < 2 || query.length > 100) return res.status(200).json({ sets: [], cards: [], sealed: [] });
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json(await search(query));
}
