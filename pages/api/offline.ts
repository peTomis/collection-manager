// One authenticated HTTP response streams the complete offline snapshot.
import type { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { getUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { queryString } from "@/lib/validation";
import { fetchSets } from "./sets";
import { fetchBindersWithCard } from "./binders";
import { fetchWishlistsWithCard } from "./wishlists";
import { fetchPortfolio } from "./portfolios";

export const config = { api: { responseLimit: false } };
export const maxDuration = 300;

// Each download streams the whole database: enough for retries, too few to use it to load the server
const DOWNLOADS_PER_HOUR = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const owner = await getUserId(req, res);
  if (!owner) return res.status(401).json({ message: "Sign in to use offline mode." });
  const user = String(owner);
  // The query only detects an expired/changed session; it never selects someone else's collection.
  if (queryString(req.query.user) !== user) return res.status(409).json({ message: "Your account changed. Reload and try again." });
  const limit = await rateLimit(`offline:${user}`, DOWNLOADS_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    return res.status(429).json({ message: `Too many offline downloads. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` });
  }
  const controller = new AbortController();
  const close = () => controller.abort();
  res.on("close", close);
  const send = async (record: unknown) => {
    controller.signal.throwIfAborted();
    if (res.write(JSON.stringify(record) + "\n")) return;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        res.off("drain", drained);
        res.off("close", closed);
      };
      const drained = () => {
        cleanup();
        resolve();
      };
      const closed = () => {
        cleanup();
        reject(new Error("Download disconnected"));
      };
      res.once("drain", drained);
      res.once("close", closed);
    });
  };
  try {
    await client.connect();
    const db = client.db("collection-manager");
    const [sets, binders, wishlists, portfolio] = await Promise.all([fetchSets(), fetchBindersWithCard(owner), fetchWishlistsWithCard(owner), fetchPortfolio(owner)]);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");
    res.setHeader("X-Accel-Buffering", "no");
    await send({
      type: "index",
      user,
      index: {
        sets,
        binders,
        wishlists,
        portfolio: portfolio ?? {
          _id: user,
          user,
          value: 0,
          cardsValue: 0,
          sealedValue: 0,
          cardsQuantity: 0,
          sealedQuantity: 0,
          historicValue: [],
          historicCardsValue: [],
          historicSealedValue: [],
        },
      },
    });
    for (const set of sets) {
      controller.signal.throwIfAborted();
      const setId = String(set._id);
      const [cards, sealed] = await Promise.all([db.collection("cards").find({ set: setId }).toArray(), db.collection("sealed").find({ set: setId }).toArray()]);
      const cardIds = cards.map((c) => String(c._id));
      const sealedIds = sealed.map((s) => String(s._id));
      const readPrices = (collection: string, field: string, ids: string[]) =>
        ids.length
          ? db
              .collection(collection)
              .find({ [field]: { $in: ids } })
              .toArray()
          : [];
      const [cardHistory, sealedHistory, cardPrices, sealedPrices] = await Promise.all([
        readPrices("card-historic-prices", "card", cardIds),
        readPrices("sealed-historic-prices", "sealed", sealedIds),
        readPrices("card-prices", "card", cardIds),
        readPrices("sealed-prices", "sealed", sealedIds),
      ]);
      let images: [number, string][] = [];
      if (set.tcgdex && cards.length) {
        const id = set.tcgdex === "sv3pt5" ? "sv03.5" : set.tcgdex;
        try {
          const response = await fetch(`https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(id)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
          if (response.ok) {
            const data = await response.json();
            images = (data.cards ?? []).filter((c: { image?: string }) => c.image).map((c: { localId: string; image: string }) => [Number(c.localId), c.image]);
          }
        } catch (error) {
          if (controller.signal.aborted) throw error;
        }
      }
      await send({ type: "catalog", set: setId, catalog: { cards, sealed, historicPrices: [...cardHistory, ...sealedHistory], prices: [...cardPrices, ...sealedPrices], images } });
    }
    await send({ type: "complete" });
    res.end();
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error("Offline export failed", error);
      if (!res.headersSent) res.status(500).json({ message: "Offline download failed. Please try again." });
      else res.end(JSON.stringify({ type: "error", message: "Offline download was interrupted. Please try again." }) + "\n");
    }
  } finally {
    res.off("close", close);
  }
}
