import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL(".", import.meta.url)) };

// unit: the pure logic. db: lib/db/ and the API routes against a throwaway MongoDB (tests/db/global-setup.ts).
// tests/offline.test.cjs runs on node:test with its own loader.
export default defineConfig({
  resolve: { alias },
  test: {
    // yarn test:coverage. The server code and the logic the client shares with it; screens are left to the end-to-end tests (e2e/)
    coverage: {
      provider: "v8",
      include: ["lib/**", "pages/api/**"],
      // Offline mode is tested by tests/offline.test.cjs on node:test, which this report doesn't count
      exclude: ["lib/theme-script.js", "lib/fonts.ts", "lib/use-*.ts", "lib/offline*.ts", "lib/api-fetch.ts", "pages/api/offline.ts"],
      reporter: ["text-summary", "html", "json-summary"],
    },
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
