import { Db } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { allowMethods } from "@/lib/guards";
import { queryString } from "@/lib/validation";
import { CardPrice, CardVariantType, ItemType, Price, SealedPrice } from "@/types/mongodb";

const fetchCardPrices = async (card: string, language: string, type: CardVariantType): Promise<CardPrice[]> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const prices = await db.collection("card-prices").find({ card, language, type }).sort({ timestamp: 1 }).toArray();
  return JSON.parse(JSON.stringify(prices));
};

const fetchSealedPrices = async (sealed: string, language: string): Promise<SealedPrice[]> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const prices = await db.collection("sealed-prices").find({ sealed, language }).sort({ timestamp: 1 }).toArray();
  return JSON.parse(JSON.stringify(prices));
};

export const fetchPrices = async (type: ItemType, id: string, language: string, variant: CardVariantType): Promise<Price[]> => {
  if (type === ItemType.CARD) return await fetchCardPrices(id, language, variant);
  return await fetchSealedPrices(id, language);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (req.method === "GET") {
    if (!req?.query?.user) return res.status(400).json({ message: "User not provided" });
    const id = queryString(req.query.id);
    const language = queryString(req.query.language);
    const type = queryString(req.query.type);
    if (!id) return res.status(400).json({ message: "ID not provided" });
    if (!language) return res.status(400).json({ message: "Language not provided" });
    if (!type) return res.status(400).json({ message: "Type not provided" });
    const prices = await fetchPrices(type as ItemType, id, language, (queryString(req.query.variant) ?? null) as CardVariantType);
    return res.status(200).json({ prices });
  }
}
