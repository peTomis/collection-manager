// The end-to-end server: a throwaway MongoDB with the production rules and the test catalog, then the production build
// (yarn test:e2e builds it into .next-e2e, so a running dev server's .next is left alone). Stops both on exit.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { indexArgs, RULES, validatorOf } from "../scripts/collection-rules.mjs";
import { seed } from "./catalog.mjs";

export const PORT = 5556;
export const SECRET = "e2e-secret";
const MONGO_URI_FILE = ".next-e2e/mongo-uri";

const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
const uri = mongo.getUri();
const client = new MongoClient(uri);
const db = client.db("collection-manager");
for (const [name, rules] of Object.entries(RULES)) {
  await db.createCollection(name, rules.schema ? { validator: validatorOf(rules.schema), validationLevel: "strict", validationAction: "error" } : {});
  for (const index of rules.indexes) await db.collection(name).createIndex(...indexArgs(index));
}
await seed(db);
await client.close();
// For signIn (e2e/session.ts), which creates the users documents the sessions belong to
writeFileSync(MONGO_URI_FILE, uri);

const next = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: "inherit",
  env: { ...process.env, MONGODB_URI: uri, NEXTAUTH_URL: `http://localhost:${PORT}`, NEXTAUTH_SECRET: SECRET, NEXT_DIST_DIR: ".next-e2e", GOOGLE_CLIENT_ID: "e2e", GOOGLE_CLIENT_SECRET: "e2e" },
});
const stop = async () => {
  next.kill();
  await mongo.stop();
  process.exit();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", stop);
