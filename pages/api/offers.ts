import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/lib/guards";
import { parseVersion } from "@/lib/validation";
import { limitAddress } from "@/lib/rate-limit";
import { fetchOffers } from "@/lib/db/offers";

// Open to visitors: limited per address like the prices an item detail reads with it. Cached, so this only bounds what bypasses the cache
const REQUESTS_PER_MINUTE = 120;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (req.method === "GET") {
    const version = parseVersion(req.query);
    if (!version) return res.status(400).json({ message: "Invalid item version" });
    if (!(await limitAddress(req, res, "offers", REQUESTS_PER_MINUTE, "Too many requests. Try again in a minute."))) return;
    const offers = await fetchOffers(version.type, version.id, version.language, version.variant);
    // The scraper runs every few hours
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(offers);
  }
}
