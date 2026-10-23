// Starts a throwaway MongoDB for the database tests, with the same validators and indexes as Atlas (scripts/collection-rules.mjs).
// A one-node replica set, since moving items between lists runs in transactions. Stopped when the run ends.
import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";
import { RULES, validatorOf } from "../../scripts/collection-rules.mjs";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export default async function setup(project: TestProject) {
  const server = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  const uri = server.getUri();
  const client = new MongoClient(uri);
  const db = client.db("collection-manager");
  for (const [name, rules] of Object.entries(RULES) as [string, { schema?: object; indexes: object[] }][]) {
    await db.createCollection(name, rules.schema ? { validator: validatorOf(rules.schema), validationLevel: "strict", validationAction: "error" } : {});
    for (const index of rules.indexes) await db.collection(name).createIndex(index as Record<string, 1>);
  }
  await client.close();
  project.provide("mongoUri", uri);
  return () => server.stop();
}
