// Server only: fixed-window request limits, counted in MongoDB so they hold across server instances
import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/mongodb";
import { queryString } from "@/lib/validation";

interface Window {
  _id: string;
  count: number;
  expiresAt: Date;
}

let indexed: Promise<unknown> | undefined;

// Whether one more request for key fits in the current window. retryAfter: seconds until the next window.
export const rateLimit = async (key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> => {
  const windows = (await getDb()).collection<Window>("rate-limits");
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

// The client's address as the hosting proxy reports it (the first x-forwarded-for entry is the original client).
// Only trustworthy behind a proxy that overwrites these headers, as Vercel does.
export const clientAddress = (req: NextApiRequest) => queryString(req.headers["x-real-ip"]) ?? queryString(req.headers["x-forwarded-for"])?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "unknown";

// Counts the request against the address's limit for this route; when over it, answers 429 and returns false
export const limitAddress = async (req: NextApiRequest, res: NextApiResponse, route: string, perMinute: number, message: string): Promise<boolean> => {
  const limit = await rateLimit(`${route}:${clientAddress(req)}`, perMinute, 60 * 1000);
  if (limit.ok) return true;
  res.setHeader("Retry-After", String(limit.retryAfter));
  res.setHeader("Cache-Control", "no-store");
  res.status(429).json({ message });
  return false;
};
