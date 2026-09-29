// Ownership rules for the user data, enforced by MongoDB itself (it has no row-level security, this is the closest):
// - every binder, wishlist, their items and portfolios must carry the ObjectId of the user who owns them
// - an index on `user` for each, since every API query filters by it (pages/api/binders.ts, wishlists.ts, portfolios.ts)
// The API still does the actual access control: it takes the user from the session and adds it to every query.
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
};

const uri = process.env.MONGODB_ADMIN_URI || process.env.MONGODB_URI;
if (!uri) throw new Error('Missing environment variable: "MONGODB_ADMIN_URI" or "MONGODB_URI"');
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db("collection-manager");
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  for (const [name, { schema, indexes, action = "error" }] of Object.entries(RULES)) {
    const validator = { $jsonSchema: { bsonType: "object", ...schema } };
    const invalid = existing.has(name) ? await db.collection(name).countDocuments({ $nor: [validator] }) : 0;
    console.log(`${name}: require ${schema.required.join(", ")} (${action}), index ${indexes.map((i) => JSON.stringify(i)).join(" ")}`);
    if (invalid) console.warn(`  ${invalid} existing document(s) break these rules: they stay, but can't be updated until fixed`);
    if (!apply) continue;

    const options = { validator, validationLevel: "strict", validationAction: action };
    try {
      if (existing.has(name)) await db.command({ collMod: name, ...options });
      else await db.createCollection(name, options);
    } catch (error) {
      if (error.codeName === "AtlasError" || error.codeName === "Unauthorized") {
        throw new Error(`This database user can't change validators (${error.message}). Set MONGODB_ADMIN_URI to an admin user's connection string.`);
      }
      throw error;
    }
    for (const index of indexes) await db.collection(name).createIndex(index);
    console.log("  applied");
  }

  console.log(apply ? "Done." : "Dry run: nothing changed. Run again with --apply to apply.");
} finally {
  await client.close();
}
