import { Html, Head, Main, NextScript } from "next/document";
import { THEME_SCRIPT } from "@/lib/theme";

// Points the home screen icon (iOS) and the manifest (Android: icon and launch screen colour) at the dark set when the device is in dark mode,
// and keeps following it while the page is open. The light set is the default for browsers without JavaScript.
const HOME_SCREEN_SCRIPT = `(function () {
  var dark = window.matchMedia("(prefers-color-scheme: dark)");
  var apply = function () {
    document.getElementById("touch-icon").href = dark.matches ? "/apple-touch-icon-dark.png" : "/apple-touch-icon.png";
    document.getElementById("manifest").href = dark.matches ? "/site-dark.webmanifest" : "/site.webmanifest";
  };
  apply();
  dark.addEventListener("change", apply);
})();`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Shared by every page; titles and descriptions are per page (components/metadata.tsx) */}
        <meta name="application-name" content="Collection Manager" />
        <meta name="apple-mobile-web-app-title" content="Collection" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Home screen icon and launch colour: fixed once the app is added, so they follow the device theme at that moment (see HOME_SCREEN_SCRIPT) */}
        <link id="touch-icon" rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link id="manifest" rel="manifest" href="/site.webmanifest" />
        <script dangerouslySetInnerHTML={{ __html: HOME_SCREEN_SCRIPT }} />
        <meta name="theme-color" content="#f6f4ef" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#161512" media="(prefers-color-scheme: dark)" />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
