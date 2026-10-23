// Server only: a user's portfolio in the database
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { refreshPortfolio } from "@/lib/portfolio";

export const fetchPortfolio = async (user: ObjectId) => {
  const db = await getDb();
  const portfolio = await db.collection("portfolios").findOne({ user });
  return JSON.parse(JSON.stringify(portfolio));
};

// Keep the portfolio totals in step with the binders. The change itself is already saved, so a failure here only logs.
export const updatePortfolio = async (user: ObjectId) => {
  try {
    await refreshPortfolio(await getDb(), user);
  } catch (error) {
    console.error("Portfolio update failed", error);
  }
};
