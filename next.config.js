const { createHash } = require("node:crypto");
const { THEME_SCRIPT } = require("./lib/theme-script");

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

module.exports = {
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
