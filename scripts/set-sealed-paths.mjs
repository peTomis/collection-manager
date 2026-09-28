// Sets `path` (the product image in public/sets/<set>/) on sealed products, and on the copies embedded in the demo collection.
// New sealed products should get their `path` when they are created; this fills in the ones that already exist.
//
// Usage: node --env-file=.env scripts/set-sealed-paths.mjs           (dry run: shows what would change)
//        node --env-file=.env scripts/set-sealed-paths.mjs --apply   (writes the database and public/demo-collection.json)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

const PUBLIC = new URL("../public", import.meta.url).pathname;
const DEMO = new URL("../public/demo-collection.json", import.meta.url);
const apply = process.argv.includes("--apply");

// Sealed product id → image path under public/
const PATHS = {
  // Base Set
  "67aa1e4c6f8f6e42a7bbe4ef": "/sets/base_set/booster.webp", // Base Set Booster
  "67aa1e4c6f8f6e42a7bbe4f2": "/sets/base_set/booster.webp", // Base Set First Edition Booster
  "67aa1e4c6f8f6e42a7bbe4f7": "/sets/base_set/booster_box.webp", // Base Set Booster Box
  "67aa1e4c6f8f6e42a7bbe4fa": "/sets/base_set/two_players_starter_set.webp", // Base Set 2 Player Starter Set
  "67aa1e4c6f8f6e42a7bbe4fd": "/sets/base_set/theme_deck_blackout.webp", // Base Set Blackout Theme Deck
  "67aa1e4c6f8f6e42a7bbe500": "/sets/base_set/theme_deck_overgrowth.webp", // Base Set Overgrowth Theme Deck
  "67aa1e4d6f8f6e42a7bbe503": "/sets/base_set/theme_deck_zap.webp", // Base Set Zap Theme Deck
  "67aa1e4d6f8f6e42a7bbe506": "/sets/base_set/theme_deck_brushfire.webp", // Base Set Brushfire Theme Deck
  // Jungle
  "67aa1e4e6f8f6e42a7bbe52b": "/sets/jungle/booster.webp", // Jungle Booster
  "67aa1e4e6f8f6e42a7bbe52e": "/sets/jungle/booster.webp", // Jungle First Edition Booster
  "67aa1e4e6f8f6e42a7bbe531": "/sets/jungle/booster_box.webp", // Jungle Booster Box
  "67aa1e4e6f8f6e42a7bbe534": "/sets/jungle/theme_deck_water_blast.webp", // Jungle Water Blast Theme Deck
  "67aa1e4e6f8f6e42a7bbe537": "/sets/jungle/theme_deck_power_reserve.webp", // Jungle Power Reserve Theme Deck
};

const missing = Object.values(PATHS).filter((p) => !existsSync(PUBLIC + p));
if (missing.length) throw new Error(`Missing image files: ${[...new Set(missing)].join(", ")}`);

if (!process.env.MONGODB_URI) throw new Error('Missing environment variable: "MONGODB_URI"');
const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();
  const sealed = client.db("collection-manager").collection("sealed");
  const found = await sealed.find({ _id: { $in: Object.keys(PATHS).map((id) => new ObjectId(id)) } }).toArray();

  const unknown = Object.keys(PATHS).filter((id) => !found.some((s) => String(s._id) === id));
  if (unknown.length) console.warn(`Not in the database (skipped): ${unknown.join(", ")}`);

  for (const s of found) {
    const path = PATHS[String(s._id)];
    console.log(`${s.path === path ? "unchanged" : "set      "}  ${s.name}  →  ${path}`);
    if (apply && s.path !== path) await sealed.updateOne({ _id: s._id }, { $set: { path } });
  }

  // The demo collection embeds the sealed documents of its items
  const demo = JSON.parse(readFileSync(DEMO, "utf8"));
  let demoChanges = 0;
  for (const item of [...demo.binders, ...demo.wishlists].flatMap((list) => list.items)) {
    const path = PATHS[item.item?._id];
    if (path && item.item.path !== path) {
      item.item.path = path;
      demoChanges++;
    }
  }
  console.log(`Demo collection: ${demoChanges} item(s) to update`);
  if (apply && demoChanges) writeFileSync(DEMO, JSON.stringify(demo));

  console.log(apply ? "Done." : "Dry run: nothing written. Run again with --apply to save.");
} finally {
  await client.close();
}
