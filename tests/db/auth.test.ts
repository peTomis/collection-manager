// Who a user is: the NextAuth callbacks map a Google account to one users document, and getUserId reads it back from the session
import { describe, expect, test, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions, getUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

vi.mock("next-auth", async (original) => ({ ...(await original<typeof import("next-auth")>()), getServerSession: vi.fn() }));

// The callbacks, called with only the fields NextAuth passes in each case
const jwt = authOptions.callbacks!.jwt as unknown as (params: object) => Promise<{ userId?: string }>;
const session = authOptions.callbacks!.session as unknown as (params: object) => Promise<{ user?: { id?: string } }>;

// A Google sign-in as NextAuth hands it to the jwt callback
const signIn = (googleId: string, profile: { email?: string; name?: string; image?: string } = {}) =>
  jwt({ token: {}, account: { provider: "google", type: "oauth", providerAccountId: googleId }, user: { id: googleId, email: "ash@example.com", name: "Ash", image: null, ...profile } });

const googleId = () => `google-${new ObjectId()}`;

describe("signing in", () => {
  test("the same Google account is always the same user, and different accounts never share one", async () => {
    const id = googleId();
    const first = (await signIn(id)).userId;
    const again = (await signIn(id)).userId;
    const other = (await signIn(googleId())).userId;
    expect(first).toMatch(/^[0-9a-f]{24}$/);
    expect(again).toBe(first);
    expect(other).not.toBe(first);
    expect(await (await getDb()).collection("users").countDocuments({ providerId: id })).toBe(1);
  });

  test("keeps the profile up to date, but not the creation date", async () => {
    const id = googleId();
    const userId = (await signIn(id, { name: "Ash" })).userId!;
    const users = (await getDb()).collection("users");
    const created = await users.findOne({ _id: new ObjectId(userId) });
    await signIn(id, { name: "Ash Ketchum", email: "ketchum@example.com" });
    const updated = await users.findOne({ _id: new ObjectId(userId) });
    expect(updated).toMatchObject({ provider: "google", providerId: id, name: "Ash Ketchum", email: "ketchum@example.com", createdAt: created!.createdAt });
    expect(updated!.lastLoginAt).toBeGreaterThanOrEqual(created!.lastLoginAt);
  });

  test("later requests keep the token as it is", async () => {
    const token = { userId: new ObjectId().toHexString() };
    expect(await jwt({ token })).toEqual(token);
  });

  test("the session exposes the user id from the token", async () => {
    const userId = new ObjectId().toHexString();
    const result = await session({ session: { user: { name: "Ash" }, expires: "" }, token: { userId } });
    expect(result.user?.id).toBe(userId);
  });
});

describe("getUserId", () => {
  const req = {} as NextApiRequest;
  const res = {} as NextApiResponse;

  test("is the session's user, as an ObjectId", async () => {
    const id = new ObjectId((await signIn(googleId())).userId);
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: id.toHexString() }, expires: "" });
    expect(await getUserId(req, res)).toEqual(id);
  });

  // The session cookie stays valid until it expires (on another device, say): it must not write a collection nobody owns
  test("is null once the account is deleted, though its session is still valid", async () => {
    const id = new ObjectId((await signIn(googleId())).userId);
    await (await getDb()).collection("users").deleteOne({ _id: id });
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: id.toHexString() }, expires: "" });
    expect(await getUserId(req, res)).toBeNull();
  });

  test("is null without a session, a user id, or with a malformed one", async () => {
    for (const value of [null, { expires: "" }, { user: {}, expires: "" }, { user: { id: "not-an-id" }, expires: "" }]) {
      vi.mocked(getServerSession).mockResolvedValueOnce(value);
      expect(await getUserId(req, res)).toBeNull();
    }
  });
});

describe("the first sign-in", () => {
  // Without the unique index (scripts/collection-rules.mjs) every round of this created several users
  test("creates one user even when requests race", async () => {
    for (let round = 0; round < 5; round++) {
      const id = googleId();
      const ids = await Promise.all(Array.from({ length: 50 }, () => signIn(id).then((t) => t.userId)));
      expect(new Set(ids).size).toBe(1);
      expect(await (await getDb()).collection("users").countDocuments({ providerId: id })).toBe(1);
    }
  });
});
