// Server only: fixed-window request limits, counted in MongoDB so they hold across server instances
import client from "@/lib/mongodb";

interface Window {
  _id: string;
  count: number;
  expiresAt: Date;
}

let indexed: Promise<unknown> | undefined;

// Whether one more request for key fits in the current window. retryAfter: seconds until the next window.
export const rateLimit = async (key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> => {
  await client.connect();
  const windows = client.db("collection-manager").collection<Window>("rate-limits");
  // MongoDB removes the windows once they expire
  indexed ??= windows.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => {
    indexed = undefined;
    console.error("Rate limit index failed", error);
  });
  const window = Math.floor(Date.now() / windowMs);
  const expiresAt = new Date((window + 1) * windowMs);
  const count = () => windows.findOneAndUpdate({ _id: `${key}:${window}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, returnDocument: "after" });
  // The first two requests of a window can race on the upsert: the one that loses retries as a plain update
  const counted = await count().catch((error) => (error?.code === 11000 ? count() : Promise.reject(error)));
  return { ok: (counted?.count ?? 0) <= limit, retryAfter: Math.ceil((expiresAt.getTime() - Date.now()) / 1000) };
};
