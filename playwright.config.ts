// End-to-end journeys on the production build, against a throwaway MongoDB (e2e/server.mjs). Run with yarn test:e2e.
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./e2e/session";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // English whatever the machine's language: the journeys find controls by their English names (the app follows the browser's language)
  use: { baseURL: BASE_URL, trace: "retain-on-failure", locale: "en-US" },
  // Desktop and phone layouts differ (the rail, the detail panel): run both
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "node e2e/server.mjs", url: BASE_URL, timeout: 120_000, reuseExistingServer: false },
});
