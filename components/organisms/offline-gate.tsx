import { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDispatch } from "@/redux/store";
import { setUser } from "@/redux/slices/user";
import { DEMO_USER } from "@/types/constants";
import { getOfflineMeta, setOfflineMeta, useOffline } from "@/lib/offline";
import { offlineStore } from "@/lib/offline-store";
import type { OfflineIndex } from "@/lib/offline-data";

// Restore the saved account before any page starts loading. An expired online session doesn't erase an offline trip.
export default function OfflineGate({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const offline = useOffline();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    const restore = async () => {
      const meta = getOfflineMeta();
      if (meta?.enabled) {
        if (status === "authenticated" && session.user?.id !== meta.user) {
          await setOfflineMeta({ ...meta, enabled: false });
          window.location.reload();
          return;
        }
        const saved = await offlineStore<OfflineIndex>(`${meta.id}:index`);
        if (!saved) throw new Error("The offline download is no longer available on this device. Reconnect and download it again.");
        if (current) {
          dispatch(setUser(meta.user));
          setReady(true);
        }
      } else if (status !== "loading" && current) {
        dispatch(setUser(session?.user?.id ?? DEMO_USER));
        setReady(true);
      }
    };
    restore().catch((error) => current && setError(error.message));
    return () => {
      current = false;
    };
  }, [status, session?.user?.id, offline, dispatch]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === "cm-offline") window.location.reload();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  if (error)
    return (
      <main className="p-6 text-ink bg-paper">
        <p role="alert">{error}</p>
        <button
          className="mt-4 underline"
          onClick={async () => {
            const meta = getOfflineMeta();
            if (meta) await setOfflineMeta({ ...meta, enabled: false });
            window.location.reload();
          }}
        >
          Return to online mode
        </button>
      </main>
    );
  return <>{children}</>;
}
