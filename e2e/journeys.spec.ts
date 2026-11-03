// The main journeys through the real app: production build, real API, throwaway database (e2e/server.mjs)
import { expect, test, type Page } from "@playwright/test";
import { IDS } from "./catalog.mjs";
import { readFileSync } from "node:fs";
import { ObjectId } from "mongodb";
import { signIn, withDb } from "./session";

// Add a card of the test catalog from the Database page to the list the add modal picks (the first one).
// Its card has "+ Binder" on desktop and "Add <name>" on phones: whichever is shown.
const addFromDatabase = async (page: Page, name: string) => {
  await page.goto(`/database?set=${IDS.base}`);
  const card = page.getByRole("button", { name: `View ${name}`, exact: true }).locator("..");
  await card.getByRole("button", { name: new RegExp(`^(\\+ Binder|Add ${name})$`) }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Add to binder" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
};

test.describe("signed in", () => {
  test("creates a binder, adds a card from the database, and the portfolio follows", async ({ page, context }) => {
    await signIn(context);
    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: "No binders yet" })).toBeVisible();
    await page.getByRole("button", { name: "+ New binder" }).click();
    await page.getByPlaceholder("e.g. Base Set 1999").fill("Vault");
    await page.getByRole("button", { name: "Create binder" }).click();
    await expect(page.getByRole("heading", { name: "Vault" })).toBeVisible();

    await addFromDatabase(page, "Charizard");

    await page.goto("/binders");
    await expect(page.getByRole("button", { name: "View Charizard" }).first()).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("€300.00").first()).toBeVisible();
  });

  test("never sees another user's collection", async ({ page, context, browser }) => {
    await signIn(context, "Misty");
    await page.goto("/binders");
    await page.getByRole("button", { name: "+ New binder" }).click();
    await page.getByPlaceholder("e.g. Base Set 1999").fill("Misty's binder");
    await page.getByRole("button", { name: "Create binder" }).click();
    await expect(page.getByRole("heading", { name: "Misty's binder" })).toBeVisible();

    const other = await browser.newContext();
    await signIn(other, "Brock");
    const brock = await other.newPage();
    await brock.goto("/binders");
    await expect(brock.getByRole("heading", { name: "No binders yet" })).toBeVisible();
    await expect(brock.getByText("Misty's binder")).toHaveCount(0);
    await other.close();
  });
});

test.describe("account", () => {
  test("downloads everything stored about the user, then deletes the account", async ({ page, context }) => {
    const userId = await signIn(context, "Gary");
    expect((await context.request.post("/api/binders", { data: { binder: { name: "Gary's binder" } } })).status()).toBe(201);
    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: "Gary's binder" })).toBeVisible();
    await page.getByTitle("Settings").filter({ visible: true }).click();

    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download my data" }).click();
    const data = JSON.parse(readFileSync((await (await downloading).path())!, "utf8"));
    expect(data.profile).toMatchObject({ name: "Gary", email: "gary@example.com" });
    expect(data.binders.map((b: { name: string }) => b.name)).toEqual(["Gary's binder"]);

    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your account?" });
    const confirm = dialog.getByRole("button", { name: "Delete account" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel("Type delete to confirm").fill("delete");
    await confirm.click();
    // Signed out, back to the demo collection
    await page.waitForURL("/");
    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: "Vintage favourites" })).toBeVisible();
    const user = new ObjectId(userId);
    expect(await withDb((db) => Promise.all([db.collection("users").countDocuments({ _id: user }), db.collection("binders").countDocuments({ user })]))).toEqual([0, 0]);
  });

  test("the privacy policy is linked from the home page and from Settings on every page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Privacy policy" }).click();
    await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
    await page.goto("/database");
    await page.getByTitle("Settings").filter({ visible: true }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Privacy policy" }).click();
    await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  });
});

test.describe("visitor", () => {
  test("tries the demo collection, and keeps their changes in this browser only", async ({ page, browser }) => {
    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: "Vintage favourites" })).toBeVisible();

    await addFromDatabase(page, "Blastoise");
    await page.goto("/binders");
    await expect(page.getByRole("button", { name: "View Blastoise" }).first()).toBeVisible();
    // Still there after a reload: saved in localStorage
    await page.reload();
    await expect(page.getByRole("button", { name: "View Blastoise" }).first()).toBeVisible();

    // Another browser starts from the untouched demo
    const other = await browser.newContext();
    const fresh = await other.newPage();
    await fresh.goto("/binders");
    await expect(fresh.getByRole("heading", { name: "Vintage favourites" })).toBeVisible();
    await expect(fresh.getByRole("button", { name: "View Blastoise" })).toHaveCount(0);
    await other.close();
  });

  test("sees the Cardmarket offers of a card in its detail", async ({ page }) => {
    await page.goto(`/database?set=${IDS.base}`);
    await page.getByRole("button", { name: "View Charizard", exact: true }).click();
    const detail = page.getByRole("dialog");
    await expect(detail.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    await detail.getByRole("tab", { name: /^Offers/ }).click();
    const offers = detail.getByRole("tabpanel", { name: "Offers" });
    // Cheapest first, then the listing gone since the last scrape
    await expect(offers.getByText(/PSA 9 Mint|Played, light crease|Near mint/)).toHaveText(["Played, light crease", "PSA 9 Mint", "Near mint"]);
    await expect(offers.getByText("No longer listed")).toBeVisible();
    // An edited comment keeps what the listing claimed before
    await expect(offers.getByText("PSA 10 Gem Mint")).toBeVisible();

    // The listings' photos get their own tab, empty for now
    await detail.getByRole("tab", { name: "Photos" }).click();
    await expect(detail.getByRole("tabpanel", { name: "Photos" })).toBeVisible();
  });

  test("can't use the collection API", async ({ request }) => {
    expect((await request.get("/api/binders")).status()).toBe(401);
    expect((await request.post("/api/binders", { data: { binder: { name: "Sneaky" } } })).status()).toBe(401);
  });
});

test.describe("offline mode", () => {
  test("downloads the collection, then browses it without a network, read-only", async ({ page, context }) => {
    await signIn(context);
    const created = await context.request.post("/api/binders", {
      data: { binder: { name: "Convention binder" }, items: [{ name: "Charizard", type: "card", item: IDS.charizard, historicPrice: await historicPriceOf(context.request), quantity: 1 }] },
    });
    expect(created.status()).toBe(201);

    await page.goto("/binders");
    await expect(page.getByRole("heading", { name: "Convention binder" })).toBeVisible();
    await page.getByTitle("Settings").filter({ visible: true }).click();
    await page.getByRole("switch", { name: "Offline mode" }).click();
    // The app reloads into the snapshot
    await expect(page.getByRole("status").filter({ hasText: "Offline snapshot" })).toBeVisible({ timeout: 30_000 });

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Convention binder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "View Charizard" }).first()).toBeVisible();
    await page.goto(`/database?set=${IDS.base}`);
    await expect(page.getByRole("heading", { name: "Base Set" })).toBeVisible();
    // Edits are locked
    const add = page.getByRole("button", { name: /^(\+ Binder|Add Charizard)$/ }).filter({ visible: true }).first();
    await expect(add).toBeDisabled();
  });
});

// Charizard's price document, as the Database page finds it
const historicPriceOf = async (request: import("@playwright/test").APIRequestContext) => {
  const response = await request.post("/api/historic-prices", { data: { items: [{ type: "card", item: IDS.charizard, language: "en", variant: "regular" }] } });
  return (await response.json()).historicPrices[0]._id as string;
};
