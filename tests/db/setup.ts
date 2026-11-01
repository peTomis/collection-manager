// Before each database test file: point lib/mongodb.ts at the throwaway database, and close its client afterwards.
// lib/mongodb.ts reads the address when it's first imported, so it's only imported later (by the tests, and here in afterAll).
import { afterAll, afterEach, inject, vi } from "vitest";

process.env.MONGODB_URI = inject("mongoUri");

// A test that froze the clock for a rate limit (inOneWindow) gives it back even when it fails
afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await (await import("@/lib/mongodb")).default.close();
});
