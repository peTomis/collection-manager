// Calls an API route the way Next.js would, with a parsed request, and records what it answered
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { vi } from "vitest";

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;

interface Request {
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
  // Send the body as application/json (default) or with no content type
  json?: boolean;
  headers?: Record<string, string>;
}

export const call = async (handler: Handler, { method = "GET", query = {}, body, json = true, headers = {} }: Request = {}) => {
  const result = { status: 200, body: undefined as any, headers: {} as Record<string, string> };
  const res = {
    status: (code: number) => ((result.status = code), res),
    json: (data: unknown) => ((result.body = data), res),
    setHeader: (key: string, value: string) => ((result.headers[key] = value), res),
  };
  const req = { method, query, body, headers: { ...(json && body !== undefined && { "content-type": "application/json" }), ...headers }, socket: { remoteAddress: "127.0.0.1" } };
  await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
  return result;
};

// A fresh client address, so rate limits never carry over between tests
export const visitor = () => ({ "x-real-ip": `visitor-${new ObjectId()}` });

// Rate limits count per minute: hold the clock inside one window so a test never straddles two. tests/db/setup.ts restores it after each test.
export const inOneWindow = () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Math.floor(Date.now() / 60_000) * 60_000 + 1_000);
};
