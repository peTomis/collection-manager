// What an error report may carry to Sentry (lib/monitoring.ts): the privacy policy promises no personal data
import { describe, expect, test } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring";

describe("error reports", () => {
  test("keep the stack and the path, and drop cookies, bodies, query strings and the user", () => {
    const event = {
      type: undefined,
      exception: { values: [{ type: "Error", value: "boom" }] },
      request: { url: "https://binderly.petomis.com/api/binders?id=abc&q=charizard", cookies: { "next-auth.session-token": "secret" }, data: { binder: { name: "Mine" } }, query_string: "id=abc" },
      user: { id: "123", email: "ash@example.com", ip_address: "1.2.3.4" },
    } as ErrorEvent;
    const sent = sentryOptions.beforeSend(event);
    expect(sent.exception).toEqual(event.exception);
    expect(sent.request).toEqual({ url: "https://binderly.petomis.com/api/binders" });
    expect(sent.user).toBeUndefined();
  });

  test("are off without a DSN, and never send personal data or traces", () => {
    expect(sentryOptions.enabled).toBe(false);
    expect(sentryOptions.sendDefaultPii).toBe(false);
    expect(sentryOptions.tracesSampleRate).toBe(0);
  });
});
