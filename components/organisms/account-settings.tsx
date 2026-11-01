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

// Typed to confirm: deleting can't be undone, so a tap alone isn't enough
const CONFIRMATION = "delete";

const errorOf = async (response: Response, fallback: string) => ((await response.json().catch(() => null)) as { message?: string } | null)?.message ?? fallback;

// The rights described on /privacy: download everything stored about the account, or delete it. Signed-in accounts only.
export default function AccountSettings({ signedIn }: { signedIn: boolean }) {
  const readOnly = useReadOnly();
  const [busy, setBusy] = useState<"" | "download" | "delete">("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const download = async () => {
    setBusy("download");
    setError("");
    try {
      const response = await apiFetch("/api/account");
      if (!response.ok) throw new Error(await errorOf(response, "Download failed. Please try again."));
      const url = URL.createObjectURL(await response.blob());
      const link = Object.assign(document.createElement("a"), { href: url, download: `binderly-${new Date().toISOString().slice(0, 10)}.json` });
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Download failed. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    setBusy("delete");
    setError("");
    try {
      const response = await apiFetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      if (!response.ok) throw new Error(await errorOf(response, "The account couldn't be deleted. Please try again."));
      await clearOfflineDownload();
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setConfirming(false);
      setError(error instanceof Error ? error.message : "The account couldn't be deleted. Please try again.");
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
        Your data
      </div>
      {signedIn ? (
        <>
          <p className="text-xs text-ink-muted">
            Download everything Binderly stores about you, or delete your account with its binders, wishlists and portfolio.{" "}
            <Link href="/privacy" className="underline hover:text-ink">
              Privacy policy
            </Link>
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" disabled={readOnly || !!busy} onClick={download} className={buttonClass("secondary")}>
              {busy === "download" ? "Preparing…" : "Download my data"}
            </button>
            <button type="button" disabled={readOnly || !!busy} onClick={() => setConfirming(true)} className={buttonClass("remove")}>
              Delete account
            </button>
          </div>
          {readOnly && <p className="mt-2 text-xs text-ink-muted">Turn off offline mode to manage your account.</p>}
          {error && (
            <p role="alert" className="mt-3 text-xs text-loss">
              {error}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-ink-muted">
          The demo collection is saved in this browser only: Binderly's servers never see it.{" "}
          <Link href="/privacy" className="underline hover:text-ink">
            Privacy policy
          </Link>
        </p>
      )}

      <Modal
        open={confirming}
        onClose={closeConfirm}
        title="Delete your account?"
        description="Your binders, wishlists, portfolio history and profile are deleted for good. This can't be undone."
        footer={
          <>
            <button type="button" className={buttonClass("secondary")} disabled={!!busy} onClick={closeConfirm}>
              Cancel
            </button>
            <button type="button" className={buttonClass("danger")} disabled={typed.trim().toLowerCase() !== CONFIRMATION || !!busy} onClick={remove}>
              {busy === "delete" ? "Deleting…" : "Delete account"}
            </button>
          </>
        }
      >
        <label className="block text-sm">
          Type <span className="font-geist-mono font-medium">{CONFIRMATION}</span> to confirm
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
