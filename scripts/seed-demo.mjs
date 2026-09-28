// Seeds the read-only demo collection shown to visitors who are not signed in.
// Items point to real cards/sealed products, so the demo shows real scraped prices.
// Idempotent: every run replaces the previous demo data.
//
// Usage: node --env-file=.env scripts/seed-demo.mjs
import { MongoClient, ObjectId } from "mongodb";

// Keep in sync with DEMO_USER in types/constants.ts
const DEMO_USER = new ObjectId("000000000000000000000000");
const DAY = 24 * 60 * 60 * 1000;

const BINDERS = [
  { name: "Vintage favourites", cards: 12, sealed: 0 },
  { name: "Modern chase cards", cards: 10, sealed: 0 },
  { name: "Sealed vault", cards: 0, sealed: 6 },
];
const WISHLISTS = [{ name: "Grails", cards: 8, sealed: 2 }];

if (!process.env.MONGODB_URI) throw new Error('Missing environment variable: "MONGODB_URI"');
const client = new MongoClient(process.env.MONGODB_URI);

// Random priced historic prices, joined with the item they refer to (for its name).
const samplePriced = async (db, type, size) => {
  if (size === 0) return [];
  const [pricesCollection, itemsCollection, itemField] =
    type === "card" ? ["card-historic-prices", "cards", "card"] : ["sealed-historic-prices", "sealed", "sealed"];

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

const toItem = (historicPrice, type) => ({
  name: historicPrice.item.name,
  type,
  item: historicPrice.item._id.toString(),
  historicPrice: historicPrice._id.toString(),
});

// Fake 90 days of portfolio history that ends at the current value.
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

  // Clean previous demo data
  const oldBinders = (await db.collection("binders").find({ user: DEMO_USER }).toArray()).map((b) => b._id.toString());
  const oldWishlists = (await db.collection("wishlists").find({ user: DEMO_USER }).toArray()).map((w) => w._id.toString());
  await db.collection("binder-items").deleteMany({ binder: { $in: oldBinders } });
  await db.collection("wishlist-items").deleteMany({ wishlist: { $in: oldWishlists } });
  await db.collection("binders").deleteMany({ user: DEMO_USER });
  await db.collection("wishlists").deleteMany({ user: DEMO_USER });
  await db.collection("portfolios").deleteMany({ user: DEMO_USER });

  let cardsQuantity = 0;
  let cardsValue = 0;
  let sealedQuantity = 0;
  let sealedValue = 0;

  for (const binder of BINDERS) {
    const _id = new ObjectId();
    await db.collection("binders").insertOne({ _id, user: DEMO_USER, name: binder.name });
    const cards = await samplePriced(db, "card", binder.cards);
    const sealed = await samplePriced(db, "sealed", binder.sealed);
    const items = [
      ...cards.map((hp) => ({ hp, type: "card", quantity: 1 + Math.floor(Math.random() * 3) })),
      ...sealed.map((hp) => ({ hp, type: "sealed", quantity: 1 + Math.floor(Math.random() * 2) })),
    ];
    if (items.length === 0) continue;

    await db.collection("binder-items").insertMany(items.map(({ hp, type, quantity }) => ({ ...toItem(hp, type), binder: _id.toString(), quantity })));
    for (const { hp, type, quantity } of items) {
      if (type === "card") {
        cardsQuantity += quantity;
        cardsValue += hp.price * quantity;
      } else {
        sealedQuantity += quantity;
        sealedValue += hp.price * quantity;
      }
    }
    console.log(`Binder "${binder.name}": ${items.length} items`);
  }

  for (const wishlist of WISHLISTS) {
    const _id = new ObjectId();
    await db.collection("wishlists").insertOne({ _id, user: DEMO_USER, name: wishlist.name });
    const items = [...(await samplePriced(db, "card", wishlist.cards)).map((hp) => toItem(hp, "card")), ...(await samplePriced(db, "sealed", wishlist.sealed)).map((hp) => toItem(hp, "sealed"))];
    if (items.length > 0) await db.collection("wishlist-items").insertMany(items.map((item) => ({ ...item, wishlist: _id.toString() })));
    console.log(`Wishlist "${wishlist.name}": ${items.length} items`);
  }

  await db.collection("portfolios").insertOne({
    user: DEMO_USER,
    value: cardsValue + sealedValue,
    historicValue: history(cardsValue + sealedValue),
    cardsQuantity,
    cardsValue,
    historicCardsValue: history(cardsValue),
    sealedQuantity,
    sealedValue,
    historicSealedValue: history(sealedValue),
  });
  console.log(`Portfolio: ${(cardsValue + sealedValue).toFixed(2)}`);

  // One user document per Google account
  await db.collection("users").createIndex({ provider: 1, providerId: 1 }, { unique: true });
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
