import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/lib/guards";
import { parseObjectId } from "@/lib/validation";
import { fetchSet, fetchSets } from "@/lib/db/sets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (req.method === "GET") {
    if (!req?.query?.user) return res.status(400).json({ message: "User not provided" });
    if (req?.query?.id) {
      const id = parseObjectId(req.query.id);
      if (!id) return res.status(400).json({ message: "Invalid set ID" });
      const set = await fetchSet(id);
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ set });
    }
    const sets = await fetchSets();
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

    return res.status(200).json({ sets });
  }
}
