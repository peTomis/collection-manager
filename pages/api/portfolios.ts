import { Db, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/mongodb";
import { getUserId } from "@/lib/auth";

export const fetchPortfolio = async (user: ObjectId) => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const portfolio = await db.collection("portfolios").findOne({ user });
  return JSON.parse(JSON.stringify(portfolio));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const portfolio = await fetchPortfolio(await getUserId(req, res));
    return res.status(200).json({ portfolio });
  }
}
