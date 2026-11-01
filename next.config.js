const { createHash } = require("node:crypto");
const { THEME_SCRIPT } = require("./lib/theme-script");
const { withSentryConfig } = require("@sentry/nextjs/config");

const isDev = process.env.NODE_ENV !== "production";

// The only inline script is the theme one (pages/_document.tsx): production allows exactly it, by hash.
// Dev keeps 'unsafe-inline' and 'unsafe-eval' for Next's dev tooling (a hash would turn 'unsafe-inline' off).
const themeScriptHash = `'sha256-${createHash("sha256").update(THEME_SCRIPT).digest("base64")}'`;

// Card images come from TCGdex (the SDK reads its API) and account pictures from Google.
// The offline service worker re-fetches images, so their hosts are in connect-src too.
const imageHosts = "https://assets.tcgdex.net https://*.googleusercontent.com";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : themeScriptHash}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imageHosts}`,
  "font-src 'self' data:",
  `connect-src 'self' https://api.tcgdex.net ${imageHosts}${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  // yarn test:e2e builds into .next-e2e, so it never touches the .next of a running dev server
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

// Error reporting (lib/monitoring.ts). Browser events go through /monitoring on this origin, so connect-src stays 'self'.
// Source maps are uploaded, then deleted from the build, only when SENTRY_AUTH_TOKEN is set (CI or the hosting build).
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  tunnelRoute: "/monitoring",
  telemetry: false,
  silent: !process.env.CI,
});
