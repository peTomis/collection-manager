// The catalog the end-to-end server starts with, with fixed ids so the tests can open its pages
import { ObjectId } from "mongodb";

const history = (price) => ({ price, items: 5, timestamp: Date.now(), updating: false, prices1d: [price], prices1w: [price], prices1m: [price], prices1y: [price], average1d: price, average1w: price, average1m: price, average1y: price });

export const IDS = {
  base: "65f000000000000000000001",
  charizard: "65f000000000000000000101",
  blastoise: "65f000000000000000000102",
  box: "65f000000000000000000201",
};

export const seed = async (db) => {
  const id = (key) => new ObjectId(IDS[key]);
  await db.collection("sets").insertOne({ _id: id("base"), name: "Base Set", url: "Base-Set", code: "BS", cards: 102, sealed: 1, tcgdex: "base1", releasedAt: Date.parse("1999-01-09") });
  const card = (key, name, number, price) => [
    { _id: id(key), name, number, set: IDS.base, variants: [{ type: "regular", language: "en", url: `https://www.cardmarket.com/en/Pokemon/Products/Singles/Base-Set/${name}` }] },
    { card: IDS[key], set: IDS.base, type: "regular", language: "en", url: `https://www.cardmarket.com/en/Pokemon/Products/Singles/Base-Set/${name}`, ...history(price) },
  ];
  const cards = [card("charizard", "Charizard", 4, 300), card("blastoise", "Blastoise", 2, 100)];
  await db.collection("cards").insertMany(cards.map(([c]) => c));
  await db.collection("card-historic-prices").insertMany(cards.map(([, h]) => h));
  await db.collection("sealed").insertOne({ _id: id("box"), name: "Base Set Booster Box", set: IDS.base, type: "Booster Box", variants: [{ language: "en", url: "https://www.cardmarket.com/en/Pokemon/Products/Booster-Boxes/Base-Set-Booster-Box" }] });
  await db.collection("sealed-historic-prices").insertOne({ sealed: IDS.box, set: IDS.base, language: "en", url: "https://www.cardmarket.com/en/Pokemon/Products/Booster-Boxes/Base-Set-Booster-Box", ...history(5000) });
};
