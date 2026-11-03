import OfflineGate from "@/components/organisms/offline-gate";
import "../styles/tailwind.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { Providers } from "@/redux/provider";
import { I18nProvider } from "@/lib/i18n";
import { fontVariables } from "@/lib/fonts";
import { useHomeScreenIcons } from "@/lib/home-screen";

function CustomApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useHomeScreenIcons();
  return (
    <SessionProvider session={session}>
      <Providers>
        <I18nProvider>
          <OfflineGate>
            <div className={fontVariables}>
              <Component {...pageProps} />
            </div>
          </OfflineGate>
        </I18nProvider>
      </Providers>
    </SessionProvider>
  );
}

export default CustomApp;
