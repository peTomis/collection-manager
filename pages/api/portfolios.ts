import { NextApiRequest, NextApiResponse } from "next";
import { allowMethods } from "@/lib/guards";
import { getUserId } from "@/lib/auth";
import { fetchPortfolio } from "@/lib/db/portfolios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (req.method === "GET") {
    const user = await getUserId(req, res);
    if (!user) return res.status(401).json({ message: "Sign in to use your collection" });
    const portfolio = await fetchPortfolio(user);
    return res.status(200).json({ portfolio });
  }
}
