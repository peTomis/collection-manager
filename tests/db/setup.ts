// Before each database test file: point lib/mongodb.ts at the throwaway database, and close its client afterwards.
// lib/mongodb.ts reads the address when it's first imported, so it's only imported later (by the tests, and here in afterAll).
import { afterAll, inject } from "vitest";

process.env.MONGODB_URI = inject("mongoUri");

afterAll(async () => {
  await (await import("@/lib/mongodb")).default.close();
});
