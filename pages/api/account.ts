import { NextApiRequest, NextApiResponse } from "next";
import * as Joi from "joi";
import { getUserId } from "@/lib/auth";
import { allowMethods, requireJson } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { deleteAccount, exportAccount } from "@/lib/db/account";

// Each export reads the whole collection: plenty for a user, too few to load the server with
const EXPORTS_PER_HOUR = 10;

// GET: download everything stored about the signed-in user, as JSON. DELETE { confirm: true }: delete the account and its collection.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowMethods(req, res, ["GET", "DELETE"])) return;
  const user = await getUserId(req, res);
  if (!user) return res.status(401).json({ message: "Sign in to manage your account" });

  if (req.method === "GET") {
    const limit = await rateLimit(`account-export:${user}`, EXPORTS_PER_HOUR, 60 * 60 * 1000);
    if (!limit.ok) {
      res.setHeader("Retry-After", String(limit.retryAfter));
      return res.status(429).json({ message: `Too many downloads. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` });
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", `attachment; filename="binderly-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.status(200).json(await exportAccount(user));
  }

  // DELETE: the body must confirm it, so a stray request can't delete an account
  if (!requireJson(req, res)) return;
  if (Joi.object({ confirm: Joi.valid(true).required() }).validate(req.body).error) return res.status(400).json({ message: "Confirm the deletion" });
  if (!(await deleteAccount(user))) return res.status(404).json({ message: "Account not found" });
  return res.status(200).json({});
}
