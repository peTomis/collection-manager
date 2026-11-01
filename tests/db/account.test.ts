// /api/account: a user downloads everything stored about them, or deletes it all, and never touches anyone else's
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { ObjectId } from "mongodb";
import { getUserId } from "@/lib/auth";
import account from "@/pages/api/account";
import binders from "@/pages/api/binders";
import wishlists from "@/pages/api/wishlists";
import { getDb } from "@/lib/mongodb";
import { newUser, seedCatalog } from "./fixtures";
import { call } from "./call";

vi.mock("@/lib/auth", () => ({ getUserId: vi.fn() }));

const COLLECTIONS = ["users", "binders", "wishlists", "binder-items", "wishlist-items", "portfolios"];

let catalog: Awaited<ReturnType<typeof seedCatalog>>;
beforeAll(async () => {
  catalog = await seedCatalog();
});

// A signed-in user with a profile, a binder holding a card (so a portfolio), and a wishlist
const userWithCollection = async (name: string) => {
  const user = newUser();
  await (await getDb()).collection("users").insertOne({ _id: user, provider: "google", providerId: `google-${user}`, email: `${name}@example.com`, name, createdAt: 1, lastLoginAt: 2 });
  vi.mocked(getUserId).mockResolvedValue(user);
  expect((await call(binders, { method: "POST", body: { binder: { name: `${name}'s binder` }, items: [{ ...catalog.charizard, quantity: 1 }] } })).status).toBe(201);
  expect((await call(wishlists, { method: "POST", body: { wishlist: { name: `${name}'s wishlist` }, items: [catalog.blastoise] } })).status).toBe(201);
  return user;
};

const documentsOf = async (user: ObjectId) => {
  const db = await getDb();
  const counts = await Promise.all(COLLECTIONS.map((name) => db.collection(name).countDocuments(name === "users" ? { _id: user } : { user })));
  return Object.fromEntries(COLLECTIONS.map((name, i) => [name, counts[i]]));
};

let user: ObjectId;
beforeEach(() => {
  user = newUser();
  vi.mocked(getUserId).mockResolvedValue(user);
});

describe("/api/account", () => {
  test("needs a session, only takes GET and DELETE, and deletes only with a JSON confirmation", async () => {
    vi.mocked(getUserId).mockResolvedValueOnce(null);
    expect((await call(account)).status).toBe(401);
    const post = await call(account, { method: "POST", body: {} });
    expect(post.status).toBe(405);
    expect(post.headers.Allow).toBe("GET, DELETE");
    expect((await call(account, { method: "DELETE", body: "confirm=true", json: false })).status).toBe(415);
    for (const body of [{}, { confirm: false }, { confirm: "true" }, { confirm: true, user: String(newUser()) }]) {
      expect((await call(account, { method: "DELETE", body })).status).toBe(400);
    }
  });

  test("downloads the user's profile and collection, and nobody else's", async () => {
    await userWithCollection("misty");
    const ash = await userWithCollection("ash");
    const download = await call(account);
    expect(download.status).toBe(200);
    expect(download.headers["Cache-Control"]).toBe("private, no-store");
    expect(download.headers["Content-Disposition"]).toMatch(/^attachment; filename="binderly-\d{4}-\d{2}-\d{2}\.json"$/);
    const data = download.body;
    expect(data.profile).toEqual({ provider: "google", email: "ash@example.com", name: "ash", createdAt: 1, lastLoginAt: 2 });
    expect(data.binders.map((b: { name: string }) => b.name)).toEqual(["ash's binder"]);
    expect(data.binders[0].items).toHaveLength(1);
    expect(data.wishlists.map((w: { name: string }) => w.name)).toEqual(["ash's wishlist"]);
    expect(data.portfolio.user).toBe(String(ash));
    expect(JSON.stringify(data)).not.toContain("misty");
  });

  test("limits downloads per user", async () => {
    for (let i = 0; i < 10; i++) expect((await call(account)).status).toBe(200);
    const limited = await call(account);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers["Retry-After"])).toBeGreaterThan(0);
  });

  test("deletes every document of the user, and leaves other users alone", async () => {
    const misty = await userWithCollection("misty");
    const ash = await userWithCollection("ash");
    expect(await documentsOf(ash)).toEqual({ users: 1, binders: 1, wishlists: 1, "binder-items": 1, "wishlist-items": 1, portfolios: 1 });

    expect((await call(account, { method: "DELETE", body: { confirm: true } })).status).toBe(200);
    expect(await documentsOf(ash)).toEqual(Object.fromEntries(COLLECTIONS.map((name) => [name, 0])));
    expect(await documentsOf(misty)).toEqual({ users: 1, binders: 1, wishlists: 1, "binder-items": 1, "wishlist-items": 1, portfolios: 1 });
    // A second request finds nothing left to delete
    expect((await call(account, { method: "DELETE", body: { confirm: true } })).status).toBe(404);
  });
});
