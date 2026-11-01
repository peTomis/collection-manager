// The documents the scraper writes (../collection-manager-backend) must keep the shape types/mongodb.ts reads.
// Needs the backend checked out next to this repository (or BACKEND_DIR): skipped without it.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import { CardVariantType, ItemType, Language } from "@/types/mongodb";
import { ItemSpecificType } from "@/types/constants";

const root = resolve(__dirname, "..");
const backend = resolve(process.env.BACKEND_DIR ?? join(root, "../collection-manager-backend"));
const backendTypes = join(backend, "src/modules/mongodb/types");
const available = existsSync(backendTypes);

// Backend type → the frontend type that reads the same documents
const MIRRORED: [string, string][] = [
  ["card.types:Card", "Card"],
  ["card.types:CardPrice", "CardPrice"],
  ["card.types:CardHistoricPrice", "CardHistoricPrice"],
  ["sealed.types:Sealed", "Sealed"],
  ["sealed.types:SealedPrice", "SealedPrice"],
  ["sealed.types:SealedHistoricPrice", "SealedHistoricPrice"],
  ["set.types:Set", "Set"],
  ["item.types:Portfolio", "Portfolio"],
  ["offer.types:Offer", "Offer"],
];

// Collections the frontend reads that the scraper writes
const SCRAPER_COLLECTIONS = ["cards", "card-historic-prices", "card-prices", "offers", "portfolios", "sealed", "sealed-historic-prices", "sealed-prices", "sets"];

describe.skipIf(!available)("the scraper's documents", () => {
  test("have every field the frontend reads, with a compatible type", () => {
    // Documents reach the frontend as JSON: compare enums by value and ObjectIds as strings
    const source = [
      `import type { ObjectId } from "mongodb";`,
      ...[...new Set(MIRRORED.map(([b]) => b.split(":")[0]))].map((file) => `import type * as ${file.replace(".", "_")} from ${JSON.stringify(join(backendTypes, file))};`),
      `import type * as F from ${JSON.stringify(join(root, "types/mongodb"))};`,
      `type Plain<T> = T extends ObjectId ? string : T extends string ? \`\${T}\` : T extends (infer U)[] ? Plain<U>[] : T extends object ? { [K in keyof T]: Plain<T[K]> } : T;`,
      ...MIRRORED.map(([b, f]) => {
        const [file, name] = b.split(":");
        return `export const ${name}_${f} = (scraped: Plain<${file.replace(".", "_")}.${name}>): Plain<F.${f}> => scraped;`;
      }),
    ].join("\n");
    const dir = mkdtempSync(join(tmpdir(), "contract-"));
    try {
      const file = join(dir, "contract.ts");
      writeFileSync(file, source);
      const program = ts.createProgram([file], {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        baseUrl: root,
        // Both sides on this repository's driver, so they share one ObjectId type
        paths: { "@/*": ["./*"], mongodb: ["./node_modules/mongodb"] },
      });
      const errors = ts
        .getPreEmitDiagnostics(program)
        .filter((d) => d.file?.fileName === file)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
      expect(errors).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("use the same enum values", async () => {
    const enums = await import(join(backendTypes, "enum.types.ts"));
    const sealed = await import(join(backendTypes, "sealed.types.ts"));
    expect(Object.values(enums.Language).sort()).toEqual(Object.values(Language).sort());
    expect(Object.values(enums.CardVariantType).sort()).toEqual(Object.values(CardVariantType).sort());
    expect(Object.values(enums.ItemType).sort()).toEqual(Object.values(ItemType).sort());
    // Every sealed type the scraper writes is one the frontend knows
    expect(Object.values(ItemSpecificType)).toEqual(expect.arrayContaining(Object.values(sealed.SealedType)));
  });

  test("live in the collections the frontend reads", () => {
    const service = readFileSync(join(backend, "src/modules/mongodb/mongodb.service.ts"), "utf8");
    const names = [...(service.match(/enum CollectionName \{([^}]*)\}/)?.[1] ?? "").matchAll(/=\s*'([^']+)'/g)].map((m) => m[1]);
    expect(names).toEqual(expect.arrayContaining(SCRAPER_COLLECTIONS));
  });
});
