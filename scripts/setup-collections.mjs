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
import { indexArgs, RULES, validatorOf } from "./collection-rules.mjs";

const apply = process.argv.includes("--apply");

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
    for (const index of indexes) {
      const [key, options] = indexArgs(index);
      // A unique index can't be built over duplicates: report them, they have to be merged by hand first
      if (options.unique && existing.has(name)) {
        const fields = Object.keys(key);
        const groups = await db
          .collection(name)
          .aggregate([{ $group: { _id: Object.fromEntries(fields.map((f) => [f, `$${f}`])), count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }])
          .toArray();
        if (groups.length) console.warn(`${name}: ${groups.length} duplicate ${fields.join(" + ")} value(s), e.g. ${JSON.stringify(groups[0]._id)}: the unique index will fail until they're merged`);
      }
      if (apply) await db.collection(name).createIndex(key, options);
    }
  }

  for (const [name, { schema, action = "error" }] of Object.entries(RULES)) {
    if (!schema) continue;
    const validator = validatorOf(schema);
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
