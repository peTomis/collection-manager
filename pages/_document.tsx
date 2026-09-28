import { Html, Head, Main, NextScript } from "next/document";
import { THEME_SCRIPT } from "@/lib/theme";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Shared by every page; titles and descriptions are per page (components/metadata.tsx) */}
        <meta name="application-name" content="Collection Manager" />
        <meta name="apple-mobile-web-app-title" content="Collection" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
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
