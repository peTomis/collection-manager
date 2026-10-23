import { describe, expect, test } from "vitest";
import { change, deltaColor, eur, pct, signedEur } from "@/lib/format";

describe("format", () => {
  test("eur always has two decimals", () => {
    expect(eur(1234.5)).toBe("€1,234.50");
    expect(eur(0)).toBe("€0.00");
  });

  test("signed values use + and a true minus sign, zero counts as a gain", () => {
    expect(signedEur(12)).toBe("+€12.00");
    expect(signedEur(-12)).toBe("−€12.00");
    expect(pct(3.14)).toBe("+3.1%");
    expect(pct(-3.16)).toBe("−3.2%");
    expect(pct(0)).toBe("+0.0%");
    expect(deltaColor(0)).toBe("text-gain");
    expect(deltaColor(-0.1)).toBe("text-loss");
  });

  test("change is a percentage, 0 when there is nothing to compare with", () => {
    expect(change(150, 100)).toBe(50);
    expect(change(50, 100)).toBe(-50);
    expect(change(100, 0)).toBe(0);
  });
});
