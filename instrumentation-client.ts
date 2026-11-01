// Browser error reporting (see lib/monitoring.ts). Events go through the app's own /monitoring route
// (tunnelRoute in next.config.js), so the CSP needs no Sentry host and ad blockers don't drop them.
import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring";

Sentry.init(sentryOptions);
