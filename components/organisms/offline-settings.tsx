import { useEffect, useRef, useState } from "react";
import { useSelector } from "@/redux/store";
import { getOfflineMeta, useOffline, useReadOnly } from "@/lib/offline";
import { disableOffline, downloadOffline } from "@/lib/offline-download";
import { cn } from "@/lib/utils";
import { DEMO_USER } from "@/types/constants";
import { intlLocale, useT } from "@/lib/i18n";

export default function OfflineSettings() {
  const user = useSelector((s) => s.user.user);
  const t = useT();
  // Only a signed-in account can download; a demo snapshot saved earlier can still be turned off
  const signedIn = !!user && user !== DEMO_USER;
  const offline = useOffline();
  const locked = useReadOnly();
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const toggle = async () => {
    if (!user || controller.current || (!offline && !signedIn)) return;
    setError("");
    try {
      if (offline) {
        await disableOffline();
        window.location.reload();
        return;
      }
      controller.current = new AbortController();
      await downloadOffline(user, setProgress, controller.current.signal);
      window.location.reload();
    } catch (error) {
      if (!controller.current?.signal.aborted) setError(error instanceof Error ? t.error(error.message) : t.offline.downloadFailed);
    } finally {
      controller.current = null;
      setProgress("");
    }
  };
  const meta = offline ? getOfflineMeta() : null;
  return (
    <section className="py-5 border-b border-line" aria-labelledby="offline-heading">
      {/* The settings switch from the design: the whole row toggles it, the description goes under it */}
      <button
        type="button"
        role="switch"
        aria-checked={offline}
        aria-labelledby="offline-heading"
        aria-describedby="offline-description"
        disabled={!user || !!progress || (!offline && (locked || !signedIn))}
        onClick={toggle}
        className="flex items-center justify-between w-full gap-4 text-left cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      >
        <span id="offline-heading" className="text-sm font-medium">
          {t.offline.title}
        </span>
        <span className={cn("relative flex-none w-10 h-6 rounded-full transition-colors", offline ? "bg-gain" : "bg-[#D8D3C8] dark:bg-line")}>
          <span className={cn("absolute top-[3px] w-[18px] h-[18px] rounded-full bg-[#FBFAF7] transition-[left]", offline ? "left-[19px]" : "left-[3px]")} />
        </span>
      </button>
      <p id="offline-description" className="mt-1.5 text-xs text-ink-muted">
        {t.offline.description}
      </p>
      {!offline && <p className="mt-1 text-xs text-ink-muted">{signedIn ? t.offline.keepOpen : t.offline.signIn}</p>}
      {meta && (
        <p className="mt-1 text-xs text-ink-muted">
          {t.offline.saved(new Date(meta.savedAt).toLocaleString(intlLocale()))}
        </p>
      )}
      {progress && (
        <div className="mt-3 text-xs text-ink-muted">
          <p role="status" aria-live="polite">
            {progress}
          </p>
          <button type="button" className="mt-2 underline" onClick={() => controller.current?.abort()}>
            {t.offline.cancel}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-loss">
          {error}
        </p>
      )}
    </section>
  );
}
