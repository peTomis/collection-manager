import { describe, expect, test } from "vitest";
import { getPastPrice, getPrice } from "@/lib/prices";
import { historicPrice } from "./factories";

describe("getPrice", () => {
  test("is the current price when there is one", () => {
    expect(getPrice(historicPrice({ price: 12, prices1y: [5, 8] }))).toBe(12);
  });

  test("falls back to the latest known day of the year when today is missing (-1)", () => {
    expect(getPrice(historicPrice({ price: -1, prices1y: [5, 8, -1, -1] }))).toBe(8);
  });

  test("is 0 without any price", () => {
    expect(getPrice(historicPrice({ price: 0 }))).toBe(0);
    expect(getPrice(historicPrice({ price: -1, prices1y: [-1, -1] }))).toBe(0);
  });
});

describe("getPastPrice", () => {
  test("is the oldest known price in the period, skipping missing days", () => {
    const hp = historicPrice({ price: 20, prices1w: [-1, 10, 15], prices1m: [7, 10] });
    expect(getPastPrice(hp, "1w")).toBe(10);
    expect(getPastPrice(hp, "1m")).toBe(7);
  });

  test("is the current price when the period has no history, so the change is 0", () => {
    expect(getPastPrice(historicPrice({ price: 20, prices1d: [-1] }), "1d")).toBe(20);
    expect(getPastPrice(historicPrice({ price: 20 }), "1y")).toBe(20);
  });
});
