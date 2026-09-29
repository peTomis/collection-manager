import "../styles/tailwind.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { Providers } from "@/redux/provider";
import { useDispatch } from "@/redux/store";
import { setUser } from "@/redux/slices/user";
import { DEMO_USER } from "@/types/constants";
import { fontVariables } from "@/lib/fonts";
import { useHomeScreenIcons } from "@/lib/home-screen";

// Signed in users see their own collection, everyone else sees the demo one.
function SessionUser() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();

  useEffect(() => {
    if (status === "loading") return;
    dispatch(setUser(session?.user?.id ?? DEMO_USER));
  }, [status, session?.user?.id]);

  return null;
}

function CustomApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useHomeScreenIcons();
  return (
    <SessionProvider session={session}>
      <Providers>
        <SessionUser />
        <div className={fontVariables}>
          <Component {...pageProps} />
        </div>
      </Providers>
    </SessionProvider>
  );
}

export default CustomApp;
