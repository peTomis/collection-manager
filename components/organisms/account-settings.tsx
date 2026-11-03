// Libraries
import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

// Components
import Modal from "@/components/atoms/modal";
import { buttonClass } from "@/components/atoms/button";

// Utils
import { apiFetch } from "@/lib/api-fetch";
import { clearOfflineDownload } from "@/lib/offline-download";
import { useReadOnly } from "@/lib/offline";
import { useT } from "@/lib/i18n";

const errorOf = async (response: Response, fallback: string) => ((await response.json().catch(() => null)) as { message?: string } | null)?.message ?? fallback;

// The rights described on /privacy: download everything stored about the account, or delete it. Signed-in accounts only.
export default function AccountSettings({ signedIn }: { signedIn: boolean }) {
  const readOnly = useReadOnly();
  const t = useT();
  // Typed to confirm: deleting can't be undone, so a tap alone isn't enough
  const confirmation = t.account.confirmWord;
  const [busy, setBusy] = useState<"" | "download" | "delete">("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const download = async () => {
    setBusy("download");
    setError("");
    try {
      const response = await apiFetch("/api/account");
      if (!response.ok) throw new Error(await errorOf(response, t.account.downloadFailed));
      const url = URL.createObjectURL(await response.blob());
      const link = Object.assign(document.createElement("a"), { href: url, download: `binderly-${new Date().toISOString().slice(0, 10)}.json` });
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(error instanceof Error ? t.error(error.message) : t.account.downloadFailed);
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    setBusy("delete");
    setError("");
    try {
      const response = await apiFetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      if (!response.ok) throw new Error(await errorOf(response, t.account.deleteFailed));
      await clearOfflineDownload();
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setConfirming(false);
      setError(error instanceof Error ? t.error(error.message) : t.account.deleteFailed);
      setBusy("");
    }
  };

  const closeConfirm = () => {
    if (busy) return;
    setConfirming(false);
    setTyped("");
  };

  return (
    <section className="py-5 border-b border-line" aria-labelledby="account-heading">
      <div id="account-heading" className="font-geist-mono font-medium text-[11px] md:text-xs tracking-[.08em] uppercase text-ink-muted mb-2.5 md:mb-3">
        {t.account.heading}
      </div>
      {signedIn ? (
        <>
          <p className="text-xs text-ink-muted">
            {t.account.intro}{" "}
            <Link href="/privacy" className="underline hover:text-ink">
              {t.footer.privacy}
            </Link>
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" disabled={readOnly || !!busy} onClick={download} className={buttonClass("secondary")}>
              {busy === "download" ? t.account.preparing : t.account.download}
            </button>
            <button type="button" disabled={readOnly || !!busy} onClick={() => setConfirming(true)} className={buttonClass("remove")}>
              {t.account.delete}
            </button>
          </div>
          {readOnly && <p className="mt-2 text-xs text-ink-muted">{t.account.readOnly}</p>}
          {error && (
            <p role="alert" className="mt-3 text-xs text-loss">
              {error}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-ink-muted">
          {t.account.demo}{" "}
          <Link href="/privacy" className="underline hover:text-ink">
            {t.footer.privacy}
          </Link>
        </p>
      )}

      <Modal
        open={confirming}
        onClose={closeConfirm}
        title={t.account.confirmTitle}
        description={t.account.confirmDescription}
        footer={
          <>
            <button type="button" className={buttonClass("secondary")} disabled={!!busy} onClick={closeConfirm}>
              {t.common.cancel}
            </button>
            <button type="button" className={buttonClass("danger")} disabled={typed.trim().toLowerCase() !== confirmation || !!busy} onClick={remove}>
              {busy === "delete" ? t.account.deleting : t.account.delete}
            </button>
          </>
        }
      >
        <label className="block text-sm">
          {t.account.typeBefore} <span className="font-geist-mono font-medium">{confirmation}</span> {t.account.typeAfter}
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            className="mt-2 w-full h-[38px] px-3 border border-line rounded-[9px] bg-paper text-ink text-sm outline-none focus:border-ink"
          />
        </label>
      </Modal>
    </section>
  );
}
