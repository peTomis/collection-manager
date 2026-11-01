import { Db } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/mongodb";
import { allowMethods } from "@/lib/guards";
import { LIMITS, parseVersion } from "@/lib/validation";
import { limitAddress } from "@/lib/rate-limit";
import * as Joi from "joi";
import { CardHistoricPrice, CardVariantType, HistoricPrice, ItemType, Language, SealedHistoricPrice } from "@/types/mongodb";

// Open to visitors: a batch reads up to LIMITS.HISTORIC_PRICES_BATCH versions, so batches are limited per address
// (a set in the Database takes one to three, an item detail one)
const BATCHES_PER_MINUTE = 60;
// Single reads are cached, so this only bounds what bypasses the cache
const READS_PER_MINUTE = 120;

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
    .toArray();

  return JSON.parse(JSON.stringify(prices));
};

const fetchHistoricPrices = async (items: PriceRequest[]): Promise<HistoricPrice[]> => {
  const db = await getDb();

  const cardPrices = await fetchCardHistoricPrices(db, items);
  const sealedPrices = await fetchSealedHistoricPrices(db, items);

  return [...(cardPrices ?? []), ...(sealedPrices ?? [])];
};

const fetchCardHistoricPrice = async (card: string, language: string, type: CardVariantType | null): Promise<CardHistoricPrice> => {
  const db = await getDb();
  const price = await db.collection("card-historic-prices").findOne({ card, language, type });
  return JSON.parse(JSON.stringify(price));
};

const fetchSealedHistoricPrice = async (sealed: string, language: string): Promise<SealedHistoricPrice> => {
  const db = await getDb();
  const price = await db.collection("sealed-historic-prices").findOne({ sealed, language });
  return JSON.parse(JSON.stringify(price));
};

const fetchHistoricPrice = async (type: ItemType, id: string, language: string, variant: CardVariantType | null): Promise<HistoricPrice> => {
  if (type === ItemType.CARD) return await fetchCardHistoricPrice(id, language, variant);
  return await fetchSealedHistoricPrice(id, language);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  if (req.method === "POST") {
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ message: "Invalid JSON" });
    }
    const { value, error } = validateItems(body?.items);
    if (error) return res.status(400).json({ message: "Invalid items" });
    if (!(await limitAddress(req, res, "historic-prices", BATCHES_PER_MINUTE, "Too many requests. Try again in a minute."))) return;
    // Only the validated fields reach the query, so no operators can be injected
    const items = value.map(({ type, item, language, variant }: PriceRequest) => ({ type, item, language, variant })) as PriceRequest[];
    const historicPrices = await fetchHistoricPrices(items);
    return res.status(200).json({ historicPrices });
  }
  if (req.method === "GET") {
    const version = parseVersion(req.query);
    if (!version) return res.status(400).json({ message: "Invalid item version" });
    if (!(await limitAddress(req, res, "historic-price", READS_PER_MINUTE, "Too many requests. Try again in a minute."))) return;
    const historicPrice = await fetchHistoricPrice(version.type, version.id, version.language, version.variant);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
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
