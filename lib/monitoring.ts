// Error reporting to Sentry, shared by the browser (instrumentation-client.ts) and the server (instrumentation.ts).
// Off without NEXT_PUBLIC_SENTRY_DSN: errors then only reach the console and the hosting logs.
import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// What leaves the app: errors only, no performance tracing or session replay, and no personal data.
// Events carry the stack and the URL path; the user is never named (no cookies, email or IP).
export const sentryOptions = {
  dsn,
  enabled: !!dsn && process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "production",
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: (event: ErrorEvent) => {
    // Query strings can hold ids and searches: keep only the path
    if (event.request?.url) event.request.url = event.request.url.split("?")[0];
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.query_string;
    }
    delete event.user;
    return event;
  },
};

// An error the code recovers from but someone should know about: logged, and sent to Sentry when it's on
export const reportError = (message: string, error: unknown) => {
  console.error(message, error);
  Sentry.captureException(error, { extra: { message } });
};
