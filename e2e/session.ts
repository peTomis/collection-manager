// Signs a browser in without Google: the users document a first sign-in creates, and the session cookie NextAuth would set,
// signed with the e2e server's secret
import type { BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { encode } from "next-auth/jwt";
import { MongoClient, ObjectId } from "mongodb";

export const BASE_URL = "http://localhost:5556";

// The e2e server's throwaway database (e2e/server.mjs writes its address once it's up)
export const withDb = async <T>(fn: (db: ReturnType<MongoClient["db"]>) => Promise<T>): Promise<T> => {
  const client = new MongoClient(readFileSync(".next-e2e/mongo-uri", "utf8"));
  try {
    return await fn(client.db("collection-manager"));
  } finally {
    await client.close();
  }
};

export const signIn = async (context: BrowserContext, name = "Ash") => {
  const user = new ObjectId();
  const email = `${name.toLowerCase()}@example.com`;
  await withDb((db) => db.collection("users").insertOne({ _id: user, provider: "google", providerId: `google-${user}`, email, name, createdAt: Date.now(), lastLoginAt: Date.now() }));
  const userId = user.toHexString();
  const value = await encode({ token: { name, email, sub: userId, userId }, secret: "e2e-secret" });
  await context.addCookies([{ name: "next-auth.session-token", value, url: BASE_URL, httpOnly: true, sameSite: "Lax" }]);
  return userId;
};
