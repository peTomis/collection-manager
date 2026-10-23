import { ObjectId } from "mongodb";
import { describe, expect, test } from "vitest";
import { getDb, inTransaction } from "@/lib/mongodb";
import { newUser } from "./fixtures";

describe("the test database", () => {
  test("refuses user data without its owner or with malformed ids, as Atlas does", async () => {
    const db = await getDb();
    await expect(db.collection("binders").insertOne({ name: "No owner" })).rejects.toThrow(/validation/i);
    await expect(db.collection("binder-items").insertOne({ user: newUser(), binder: "nope", item: "x", historicPrice: "y", type: "card", quantity: 1 })).rejects.toThrow(/validation/i);
    await expect(db.collection("binders").insertOne({ name: "Fine", user: newUser() })).resolves.toBeTruthy();
  });

  test("runs transactions: an aborted one leaves nothing behind", async () => {
    const user = newUser();
    await inTransaction(async (db, session) => {
      await db.collection("binders").insertOne({ name: "Rolled back", user }, { session });
      await session.abortTransaction();
    });
    expect(await (await getDb()).collection("binders").countDocuments({ user })).toBe(0);
    expect(ObjectId.isValid(String(user))).toBe(true);
  });
});
