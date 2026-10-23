// Ownership rules for the user data, enforced by MongoDB itself (it has no row-level security, this is the closest):
// - every binder, wishlist, their items and portfolios must carry the ObjectId of the user who owns them
// - an index on `user` for each, since every query filters by it (lib/db/binders.ts, wishlists.ts, portfolios.ts)
// The API still does the actual access control: it takes the user from the session and adds it to every query.
// The catalog and its prices (written by the external scraper) only get the indexes their reads need (lib/db/, pages/api/).
// Safe to run again: validators are replaced and existing indexes are left as they are.
//
// Changing validators needs the dbAdmin role, which the app's own database user shouldn't have: set MONGODB_ADMIN_URI
// to a connection string for an admin user (Atlas: Database Access) for --apply. Without it MONGODB_URI is used.
//
// Usage: node --env-file=.env scripts/setup-collections.mjs           (dry run: shows the rules and documents that break them)
//        node --env-file=.env scripts/setup-collections.mjs --apply   (applies them)
import { MongoClient } from "mongodb";

const apply = process.argv.includes("--apply");

const objectId = { bsonType: "objectId" };
const hexId = { bsonType: "string", pattern: "^[0-9a-f]{24}$" };
const number = { bsonType: ["int", "long", "double", "decimal"] };
const itemType = { enum: ["card", "sealed"] };

const RULES = {
  binders: {
    schema: { required: ["user", "name"], properties: { user: objectId, name: { bsonType: "string" }, set: objectId } },
    indexes: [{ user: 1 }],
  },
  wishlists: {
    schema: { required: ["user", "name"], properties: { user: objectId, name: { bsonType: "string" } } },
    indexes: [{ user: 1 }],
  },
  "binder-items": {
    schema: {
      required: ["user", "binder", "item", "historicPrice", "type", "quantity"],
      properties: { user: objectId, binder: hexId, item: hexId, historicPrice: hexId, type: itemType, quantity: { ...number, minimum: 1 }, owned: { bsonType: "bool" } },
    },
    indexes: [{ user: 1, binder: 1 }],
  },
  "wishlist-items": {
    schema: {
      required: ["user", "wishlist", "item", "historicPrice", "type"],
      properties: { user: objectId, wishlist: hexId, item: hexId, historicPrice: hexId, type: itemType, target: { ...number, minimum: 0 } },
    },
    indexes: [{ user: 1, wishlist: 1 }],
  },
  // Written by the external scraper: only warn (in the MongoDB log) so a mismatch never blocks its daily run
  portfolios: {
    schema: { required: ["user"], properties: { user: objectId } },
    indexes: [{ user: 1 }],
    action: "warn",
  },
  cards: { indexes: [{ set: 1 }] },
  sealed: { indexes: [{ set: 1 }, { type: 1 }] },
  // Price charts read one version's daily prices in order
  "card-prices": { indexes: [{ card: 1, language: 1, type: 1, timestamp: 1 }] },
  "sealed-prices": { indexes: [{ sealed: 1, language: 1, timestamp: 1 }] },
  "card-historic-prices": { indexes: [{ card: 1, language: 1, type: 1 }] },
  "sealed-historic-prices": { indexes: [{ sealed: 1, language: 1 }] },
};

const uri = process.env.MONGODB_ADMIN_URI || process.env.MONGODB_URI;
if (!uri) throw new Error('Missing environment variable: "MONGODB_ADMIN_URI" or "MONGODB_URI"');
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db("collection-manager");
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  // Indexes first: the app's own user can create them, so they're in place even if the validators below are refused
  for (const [name, { schema, indexes, action = "error" }] of Object.entries(RULES)) {
    console.log(`${name}: ${schema ? `require ${schema.required.join(", ")} (${action}), ` : ""}index ${indexes.map((i) => JSON.stringify(i)).join(" ")}`);
    if (apply) for (const index of indexes) await db.collection(name).createIndex(index);
  }

  for (const [name, { schema, action = "error" }] of Object.entries(RULES)) {
    if (!schema) continue;
    const validator = { $jsonSchema: { bsonType: "object", ...schema } };
    const invalid = existing.has(name) ? await db.collection(name).countDocuments({ $nor: [validator] }) : 0;
    if (invalid) console.warn(`${name}: ${invalid} existing document(s) break its rules: they stay, but can't be updated until fixed`);
    if (!apply) continue;

    const options = { validator, validationLevel: "strict", validationAction: action };
    try {
      if (existing.has(name)) await db.command({ collMod: name, ...options });
      else await db.createCollection(name, options);
    } catch (error) {
      if (error.codeName === "AtlasError" || error.codeName === "Unauthorized") {
        throw new Error(`Indexes created, but this database user can't change validators (${error.message}). Set MONGODB_ADMIN_URI to an admin user's connection string.`);
      }
      throw error;
    }
    console.log(`${name}: validator applied`);
  }

  console.log(apply ? "Done." : "Dry run: nothing changed. Run again with --apply to apply.");
} finally {
  await client.close();
}
