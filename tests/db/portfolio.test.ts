import { describe, expect, test } from "vitest";
import { getDb } from "@/lib/mongodb";
import { addItemToBinder, createBinder } from "@/lib/db/binders";
import { fetchPortfolio, updatePortfolio } from "@/lib/db/portfolios";
import { idOf, newUser, seedCatalog } from "./fixtures";

describe("the portfolio", () => {
  test("adds up the owned cards and sealed products of all binders, missing slots count for nothing", async () => {
    const catalog = await seedCatalog();
    const user = newUser();
    const [a, b] = [idOf(await createBinder({ name: "A", user })), idOf(await createBinder({ name: "B", user }))];
    await addItemToBinder(user, { ...catalog.charizard, binder: a, quantity: 2 });
    await addItemToBinder(user, { ...catalog.blastoise, binder: a, quantity: 1, owned: false });
    await addItemToBinder(user, { ...catalog.box, binder: b, quantity: 1 });

    await updatePortfolio(user);
    expect(await fetchPortfolio(user)).toMatchObject({ value: 5600, cardsValue: 600, sealedValue: 5000, cardsQuantity: 2, sealedQuantity: 1, historicValue: [] });
  });

  test("keeps the history the daily job wrote", async () => {
    const user = newUser();
    await (await getDb()).collection("portfolios").insertOne({ user, value: 1, historicValue: [{ timestamp: 1, value: 1 }], historicCardsValue: [], historicSealedValue: [] });
    await updatePortfolio(user);
    expect(await fetchPortfolio(user)).toMatchObject({ value: 0, historicValue: [{ timestamp: 1, value: 1 }] });
  });
});
