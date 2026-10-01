import { NextApiRequest, NextApiResponse } from "next";

// Any other method gets a 405 instead of a request left hanging without a response. Whether the route can go on.
export const allowMethods = (req: NextApiRequest, res: NextApiResponse, methods: string[]): boolean => {
  if (req.method && methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ message: "Method not allowed" });
  return false;
};

// Writes only take JSON: a page on another origin (a sibling subdomain included) can't send it
// with the session cookie without a CORS preflight, which this API never grants. A plain form post can.
export const requireJson = (req: NextApiRequest, res: NextApiResponse): boolean => {
  const type = req.headers["content-type"]?.split(";")[0].trim().toLowerCase();
  if (type === "application/json") return true;
  res.status(415).json({ message: "Expected an application/json body" });
  return false;
};
