import { describe, expect, test } from "vitest";
import { groupByEra, setEra } from "@/lib/sets";
import { localCardImage, tcgdexNumber, tcgdexSetId } from "@/lib/tcgdex-ids";
import { cardImage } from "@/lib/tcgdex";
import { Set } from "@/types/mongodb";

const set = (name: string, released?: string) => ({ _id: name, name, releasedAt: released ? Date.parse(released) : 0 }) as Set;

describe("set eras", () => {
  test("from the release date, starting on the day the era's first set came out", () => {
    expect(setEra(set("Base Set", "1999-01-09"))).toBe("Wizards of the Coast");
    expect(setEra(set("Skyridge", "2003-05-12"))).toBe("Wizards of the Coast");
    expect(setEra(set("EX Ruby & Sapphire", "2003-06-18"))).toBe("EX");
    expect(setEra(set("151", "2023-09-22"))).toBe("Scarlet & Violet");
    // Before the first era (promos) counts as the first; no date is "Other"
    expect(setEra(set("Promo", "1998-12-01"))).toBe("Wizards of the Coast");
    expect(setEra(set("Unknown"))).toBe("Other");
  });

  test("groups consecutive sets of one era, keeping their order", () => {
    const groups = groupByEra([set("Base Set", "1999-01-09"), set("Jungle", "1999-06-16"), set("EX Ruby & Sapphire", "2003-06-18"), set("Unknown")]);
    expect(groups.map((g) => [g.era, g.sets.map((s) => s.name)])).toEqual([
      ["Wizards of the Coast", ["Base Set", "Jungle"]],
      ["EX", ["EX Ruby & Sapphire"]],
      ["Other", ["Unknown"]],
    ]);
  });
});

describe("TCGdex ids and images", () => {
  test("151 has its own TCGdex id, every other set keeps ours", () => {
    expect(tcgdexSetId("sv3pt5")).toBe("sv03.5");
    expect(tcgdexSetId("base1")).toBe("base1");
  });

  test("card numbers: holo subset cards are 1000 + n, ids without a number are NaN", () => {
    expect(tcgdexNumber("4")).toBe(4);
    expect(tcgdexNumber("H30")).toBe(1030);
    expect(tcgdexNumber("H01")).toBe(1001);
    expect(tcgdexNumber("50a")).toBeNaN();
  });

  test("image URLs: TCGdex in webp (151 in png), our own copies only in low", () => {
    expect(cardImage("https://assets.tcgdex.net/en/base/base1/4", "high")).toBe("https://assets.tcgdex.net/en/base/base1/4/high.webp");
    expect(cardImage("https://assets.tcgdex.net/en/sv/sv03.5/199", "low")).toBe("https://assets.tcgdex.net/en/sv/sv03.5/199/low.png");
    expect(localCardImage("ecard2", 1030)).toBe("/cards/ecard2/H30");
    expect(cardImage(localCardImage("ecard2", 1030), "high")).toBe("/cards/ecard2/H30/low.webp");
  });
});
