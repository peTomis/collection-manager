// Signs a browser in without Google: the same session cookie NextAuth would set, signed with the e2e server's secret
import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { ObjectId } from "mongodb";

export const BASE_URL = "http://localhost:5556";

export const signIn = async (context: BrowserContext, name = "Ash") => {
  const userId = new ObjectId().toHexString();
  const value = await encode({ token: { name, email: `${name.toLowerCase()}@example.com`, sub: userId, userId }, secret: "e2e-secret" });
  await context.addCookies([{ name: "next-auth.session-token", value, url: BASE_URL, httpOnly: true, sameSite: "Lax" }]);
  return userId;
};
