import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL(".", import.meta.url)) };

// unit: the pure logic. db: lib/db/ and the API routes against a throwaway MongoDB (tests/db/global-setup.ts).
// tests/offline.test.cjs runs on node:test with its own loader.
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["tests/*.test.ts"] } },
      {
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/db/global-setup.ts"],
          setupFiles: ["tests/db/setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
