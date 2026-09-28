import { Html, Head, Main, NextScript } from "next/document";
import { THEME_SCRIPT } from "@/lib/theme";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
