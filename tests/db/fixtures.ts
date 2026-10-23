// A small catalog in the throwaway database, and a fresh user per test so tests never see each other's lists
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { CardVariantType, ItemType, Language } from "@/types/mongodb";

export const newUser = () => new ObjectId();

// An item version as the API takes it: the product, its price document, and its name
export interface Version {
  type: ItemType;
  item: string;
  historicPrice: string;
  name: string;
}

const prices = (price: number) => ({ price, prices1d: [price], prices1w: [price], prices1m: [price], prices1y: [price], average1d: price, average1w: price, average1m: price, average1y: price, url: "", updating: false });

// Two sets: Base Set with two cards and a booster box, Jungle with one card. Fresh ids each call.
export const seedCatalog = async () => {
  const db = await getDb();
  const [base, jungle] = [new ObjectId(), new ObjectId()];
  await db.collection("sets").insertMany([
    { _id: base, name: "Base Set", code: "BS", url: "Base-Set", cards: 102, sealed: 1, releasedAt: 0 },
    { _id: jungle, name: "Jungle", code: "JU", url: "Jungle", cards: 64, sealed: 0, releasedAt: 1 },
  ]);
  const card = async (name: string, set: ObjectId, price: number): Promise<Version> => {
    const { insertedId } = await db.collection("cards").insertOne({ name, number: 4, set: String(set), variants: [{ type: CardVariantType.REGULAR, language: Language.ENGLISH, url: "" }] });
    const hp = await db.collection("card-historic-prices").insertOne({ card: String(insertedId), language: Language.ENGLISH, type: CardVariantType.REGULAR, ...prices(price) });
    return { type: ItemType.CARD, item: String(insertedId), historicPrice: String(hp.insertedId), name };
  };
  const charizard = await card("Charizard", base, 300);
  const blastoise = await card("Blastoise", base, 100);
  const scyther = await card("Scyther", jungle, 10);
  const { insertedId } = await db.collection("sealed").insertOne({ name: "Booster Box", set: String(base), type: "Booster Box", variants: [{ language: Language.ENGLISH, url: "" }] });
  const hp = await db.collection("sealed-historic-prices").insertOne({ sealed: String(insertedId), language: Language.ENGLISH, ...prices(5000) });
  const box: Version = { type: ItemType.SEALED, item: String(insertedId), historicPrice: String(hp.insertedId), name: "Booster Box" };
  return { sets: { base, jungle }, charizard, blastoise, scyther, box };
};

// The _id of a created list or item (they come back as JSON, with string ids), failing on any other result
export const idOf = (result: unknown): string => {
  if (!result || typeof result !== "object" || !("_id" in result)) throw new Error(`Expected a document, got ${JSON.stringify(result)}`);
  return String(result._id);
};
