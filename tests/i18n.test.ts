import { afterEach, describe, expect, test } from "vitest";
import en from "@/lib/i18n/en";
import it from "@/lib/i18n/it";
import { setCurrentLocale } from "@/lib/i18n/core";
import { eur, pct, signedEur } from "@/lib/format";
import { intoBinderError, sealedTypeName, summarizeBinder, summarizeWishlist, variantLabel } from "@/lib/items";
import { newListSummary } from "@/lib/new-list";
import { setEra } from "@/lib/sets";
import { ItemType } from "@/types/mongodb";
import { binder, binderItem, sealed, set, wishlist, wishlistItem } from "./factories";

// The lib/ helpers read the language set by I18nProvider: back to English after each test
afterEach(() => setCurrentLocale("en"));

// Every text of a dictionary, by its path ("common.cancel"); records of labels count as texts
const shape = (messages: object, path = ""): Record<string, string> =>
  Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) =>
      value && typeof value === "object" && !Object.values(value).every((v) => typeof v === "string") ? Object.entries(shape(value, `${path}${key}.`)) : [[`${path}${key}`, typeof value]]
    )
  );

describe("the dictionaries", () => {
  test("Italian has every text of English, of the same kind", () => {
    expect(shape(it)).toEqual(shape(en));
  });

  test("labels of the catalog's values are all translated", () => {
    expect(Object.keys(it.items.variants)).toEqual(Object.keys(en.items.variants));
    expect(Object.keys(it.items.languages)).toEqual(Object.keys(en.items.languages));
  });
});

describe("formats", () => {
  test("prices and changes follow the language", () => {
    setCurrentLocale("it");
    expect(eur(1234.5)).toBe("1234,50 €");
    expect(eur(12345.5)).toBe("12.345,50 €");
    expect(signedEur(-12)).toBe("−12,00 €");
    expect(pct(3.14)).toBe("+3,1%");
    setCurrentLocale("en");
    expect(eur(1234.5)).toBe("€1,234.50");
    expect(pct(1234.5)).toBe("+1234.5%");
  });
});

describe("lib labels", () => {
  test("binder and wishlist summaries count in the current language", () => {
    setCurrentLocale("it");
    expect(summarizeBinder(binder([binderItem({ quantity: 2 }), binderItem({ type: ItemType.SEALED, item: sealed() }), binderItem({ owned: false })])).count).toBe(
      "2 carte · 1 sealed · 1 mancante"
    );
    expect(summarizeBinder(binder([])).count).toBe("Vuoto");
    expect(summarizeWishlist(wishlist([wishlistItem(10)])).label).toBe("1 elemento");
  });

  test("collector terms stay in English: variants, product types and eras", () => {
    setCurrentLocale("it");
    expect(variantLabel(binderItem())).toBe("Regular");
    expect(setEra(set({ name: "151", releasedAt: Date.parse("2023-09-22") }))).toBe("Scarlet & Violet");
    expect(setEra(set({ name: "Base Set", releasedAt: Date.parse("1999-01-09") }))).toBe("Wizards of the Coast");
    expect(sealedTypeName("Booster Box")).toBe("Booster Box");
    expect(summarizeBinder(binder([])).count).toBe("Vuoto");
    expect(intoBinderError("full", "Base")).toBe("Base è pieno.");
  });

  test("the new list summary", () => {
    const options = { type: "wishlist" as const, missing: false, linked: false, loading: false, toAdd: 2, total: 180, withoutPrice: 0 };
    setCurrentLocale("it");
    expect(newListSummary({ ...options, set: undefined })).toBe("Parte vuota. Aggiungi elementi dal Database.");
    expect(newListSummary({ ...options, set: { name: "Base Set" } })).toBe("2 elementi · circa 180,00 € per completare");
  });
});

describe("error messages", () => {
  test("the server's and lib/'s messages are translated where shown, unknown ones stay as they are", () => {
    expect(it.error("Sign in to use offline mode.")).toBe("Accedi per usare la modalità offline.");
    expect(it.error("Too many downloads. Try again in 3 minutes.")).toBe("Troppi download. Riprova tra 3 minuti.");
    expect(it.error("Download failed (503). Keep the app online and try again.")).toBe("Download non riuscito (503). Resta online e riprova.");
    expect(it.error("Something new")).toBe("Something new");
    expect(en.error("Sign in to use offline mode.")).toBe("Sign in to use offline mode.");
  });
});
