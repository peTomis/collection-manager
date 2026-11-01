import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/mongodb";
import { allowMethods } from "@/lib/guards";
import { parseVersion } from "@/lib/validation";
import { limitAddress } from "@/lib/rate-limit";
import { CardPrice, CardVariantType, ItemType, Price, SealedPrice } from "@/types/mongodb";

const fetchCardPrices = async (card: string, language: string, type: CardVariantType | null): Promise<CardPrice[]> => {
  const db = await getDb();
  const prices = await db.collection("card-prices").find({ card, language, type }).sort({ timestamp: 1 }).toArray();
  return JSON.parse(JSON.stringify(prices));
};

const fetchSealedPrices = async (sealed: string, language: string): Promise<SealedPrice[]> => {
  const db = await getDb();
  const prices = await db.collection("sealed-prices").find({ sealed, language }).sort({ timestamp: 1 }).toArray();
  return JSON.parse(JSON.stringify(prices));
};

// Open to visitors: limited per address, well above what opening item details needs. Cached, so this only bounds what bypasses the cache
const REQUESTS_PER_MINUTE = 120;

export const fetchPrices = async (type: ItemType, id: string, language: string, variant: CardVariantType | null): Promise<Price[]> => {
  if (type === ItemType.CARD) return await fetchCardPrices(id, language, variant);
  return await fetchSealedPrices(id, language);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (req.method === "GET") {
    const version = parseVersion(req.query);
    if (!version) return res.status(400).json({ message: "Invalid item version" });
    if (!(await limitAddress(req, res, "prices", REQUESTS_PER_MINUTE, "Too many requests. Try again in a minute."))) return;
    const prices = await fetchPrices(version.type, version.id, version.language, version.variant);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ prices });
  }
}
