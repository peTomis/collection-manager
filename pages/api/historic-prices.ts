import { Db } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { LIMITS, queryString } from "@/lib/validation";
import * as Joi from "joi";
import { CardHistoricPrice, CardVariantType, HistoricPrice, ItemType, Language, SealedHistoricPrice } from "@/types/mongodb";

// One version of an item whose price is requested (variant: cards only)
interface PriceRequest {
  type: ItemType;
  item: string;
  language: Language;
  variant?: CardVariantType;
}

const fetchCardHistoricPrices = async (db: Db, items: PriceRequest[]): Promise<CardHistoricPrice[]> => {
  const cards = items.filter((item) => item.type === ItemType.CARD);
  if (cards.length === 0) return [];
  const prices = await db
    .collection("card-historic-prices")
    .find({
      $or: cards.map((item) => ({
        card: item.item,
        language: item.language,
        type: item.variant,
      })),
    })
    .sort({})
    .toArray();
  return JSON.parse(JSON.stringify(prices));
};

export const fetchSealedHistoricPrices = async (db: Db, items: PriceRequest[]): Promise<SealedHistoricPrice[]> => {
  const sealed = items.filter((item) => item.type === ItemType.SEALED);
  if (sealed.length === 0) return [];
  const prices = await db
    .collection("sealed-historic-prices")
    .find({
      $or: sealed.map((item) => ({
        sealed: item.item,
        language: item.language,
      })),
    })
    .sort({})
    .toArray();

  return JSON.parse(JSON.stringify(prices));
};

const fetchHistoricPrices = async (items: PriceRequest[]): Promise<HistoricPrice[]> => {
  await client.connect();

  const db: Db = client.db("collection-manager");

  const cardPrices = await fetchCardHistoricPrices(db, items);
  const sealedPrices = await fetchSealedHistoricPrices(db, items);

  return [...(cardPrices ?? []), ...(sealedPrices ?? [])];
};

const fetchCardHistoricPrice = async (card: string, language: string, type: CardVariantType): Promise<CardHistoricPrice> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const price = await db.collection("card-historic-prices").findOne({ card, language, type });
  return JSON.parse(JSON.stringify(price));
};

const fetchSealedHistoricPrice = async (sealed: string, language: string): Promise<SealedHistoricPrice> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const price = await db.collection("sealed-historic-prices").findOne({ sealed, language });
  return JSON.parse(JSON.stringify(price));
};

const fetchHistoricPrice = async (type: ItemType, id: string, language: string, variant: CardVariantType): Promise<HistoricPrice> => {
  if (type === ItemType.CARD) return await fetchCardHistoricPrice(id, language, variant);
  return await fetchSealedHistoricPrice(id, language);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    if (!req?.query?.user) return res.status(400).json({ message: "User not provided" });
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ message: "Invalid JSON" });
    }
    const { value, error } = validateItems(body?.items);
    if (error) return res.status(400).json({ message: "Invalid items" });
    // Only the validated fields reach the query, so no operators can be injected
    const items = value.map(({ type, item, language, variant }: PriceRequest) => ({ type, item, language, variant })) as PriceRequest[];
    const historicPrices = await fetchHistoricPrices(items);
    return res.status(200).json({ historicPrices });
  }
  if (req.method === "GET") {
    if (!req?.query?.user) return res.status(400).json({ message: "User not provided" });
    const id = queryString(req.query.id);
    const type = queryString(req.query.type);
    const language = queryString(req.query.language);
    if (!id) return res.status(400).json({ message: "Item not provided" });
    if (!type) return res.status(400).json({ message: "Type not provided" });
    if (!language) return res.status(400).json({ message: "Language not provided" });
    const historicPrice = await fetchHistoricPrice(type as ItemType, id, language, (queryString(req.query.variant) ?? null) as CardVariantType);
    return res.status(200).json({ historicPrice });
  }
}

const validateItems = (items: unknown) => {
  const schema = Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid(ItemType.CARD, ItemType.SEALED).required(),
        item: Joi.string().hex().length(24).required(),
        language: Joi.string()
          .valid(...Object.values(Language))
          .required(),
        variant: Joi.string()
          .valid(...Object.values(CardVariantType))
          .allow(null)
          .optional(),
      }).unknown(true),
    )
    .max(LIMITS.HISTORIC_PRICES_BATCH)
    .required();
  return schema.validate(items);
};
