// Server-side error reporting (see lib/monitoring.ts). Next calls register() once per server instance,
// and onRequestError for every error thrown while rendering a page or running an API route.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { sentryOptions } = await import("@/lib/monitoring");
    Sentry.init(sentryOptions);
  }
}

export const onRequestError = Sentry.captureRequestError;
