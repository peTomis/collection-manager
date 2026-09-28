// Generates the static demo collection (public/demo-collection.json) shown to visitors who are not signed in.
// It only reads the catalog: items point to real cards/sealed products, with the prices of the day it runs.
// Demo edits never reach the database, they are saved in the visitor's browser (lib/demo-collection.ts).
//
// Usage: node --env-file=.env scripts/generate-demo.mjs
import { writeFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

const OUTPUT = new URL("../public/demo-collection.json", import.meta.url);
const DEMO_USER = "demo"; // Keep in sync with DEMO_USER in types/constants.ts
const DAY = 24 * 60 * 60 * 1000;

const BINDERS = [
  { name: "Vintage favourites", cards: 12, sealed: 0 },
  { name: "Modern chase cards", cards: 10, sealed: 0 },
  { name: "Sealed vault", cards: 0, sealed: 6 },
];
const WISHLISTS = [{ name: "Grails", cards: 8, sealed: 2 }];

if (!process.env.MONGODB_URI) throw new Error('Missing environment variable: "MONGODB_URI"');
const client = new MongoClient(process.env.MONGODB_URI);

// Random priced historic prices, joined with the item they refer to.
const samplePriced = async (db, type, size) => {
  if (size === 0) return [];
  const [pricesCollection, itemsCollection, itemField] = type === "card" ? ["card-historic-prices", "cards", "card"] : ["sealed-historic-prices", "sealed", "sealed"];

  return db
    .collection(pricesCollection)
    .aggregate([
      { $match: { price: { $gt: 0 } } },
      { $sample: { size } },
      { $lookup: { from: itemsCollection, let: { id: `$${itemField}` }, pipeline: [{ $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$id" }] } } }], as: "item" } },
      { $unwind: "$item" },
    ])
    .toArray();
};

// Same shape the API returns for binders/wishlists "withcards": item and historicPrice are joined documents.
const toItem = ({ item, ...historicPrice }, type) => ({
  _id: new ObjectId().toString(),
  name: item.name,
  type,
  item,
  historicPrice,
});

// Fake 90 days of portfolio history ending at the given value (the app rescales it to the current demo value).
const history = (value) => {
  let current = value;
  const points = [];
  for (let i = 0; i < 90; i++) {
    points.unshift({ timestamp: Date.now() - i * DAY, value: Math.round(current * 100) / 100 });
    current = current / (1 + (Math.random() - 0.45) * 0.03);
  }
  return points;
};

const run = async () => {
  await client.connect();
  const db = client.db("collection-manager");

  const binders = [];
  for (const binder of BINDERS) {
    const _id = new ObjectId().toString();
    const cards = (await samplePriced(db, "card", binder.cards)).map((hp) => ({ ...toItem(hp, "card"), binder: _id, quantity: 1 + Math.floor(Math.random() * 3) }));
    const sealed = (await samplePriced(db, "sealed", binder.sealed)).map((hp) => ({ ...toItem(hp, "sealed"), binder: _id, quantity: 1 + Math.floor(Math.random() * 2) }));
    binders.push({ _id, user: DEMO_USER, name: binder.name, items: [...cards, ...sealed] });
    console.log(`Binder "${binder.name}": ${cards.length + sealed.length} items`);
  }

  const wishlists = [];
  for (const wishlist of WISHLISTS) {
    const _id = new ObjectId().toString();
    const items = [...(await samplePriced(db, "card", wishlist.cards)).map((hp) => toItem(hp, "card")), ...(await samplePriced(db, "sealed", wishlist.sealed)).map((hp) => toItem(hp, "sealed"))];
    wishlists.push({ _id, user: DEMO_USER, name: wishlist.name, items: items.map((item) => ({ ...item, wishlist: _id })) });
    console.log(`Wishlist "${wishlist.name}": ${items.length} items`);
  }

  const value = binders.flatMap((b) => b.items).reduce((acc, item) => acc + item.historicPrice.price * item.quantity, 0);
  const demo = { generatedAt: Date.now(), binders, wishlists, historicValue: history(value) };

  writeFileSync(OUTPUT, JSON.stringify(demo));
  console.log(`Portfolio: ${value.toFixed(2)} -> ${OUTPUT.pathname}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
