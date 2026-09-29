// Libraries
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { signIn, signOut, useSession } from "next-auth/react";

// State
import { useSelector } from "@/redux/store";
import { DEMO_USER } from "@/types/constants";
import { resetDemoCollection } from "@/lib/demo-collection";
import { fontVariables } from "@/lib/fonts";
import { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const initials = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

// Avatar initials, "DE" for the demo collection, and the account picture when signed in (the users.image saved at sign in).
export const useProfile = () => {
  const { user } = useSelector((state) => state.user);
  const { data: session } = useSession();
  const isDemo = user === DEMO_USER;

  return {
    isDemo,
    initials: !user ? "" : isDemo ? "DE" : initials(session?.user?.name),
    image: !user || isDemo ? undefined : session?.user?.image ?? undefined,
    name: isDemo ? "Demo collection" : session?.user?.name ?? "",
    sub: isDemo ? "Saved in this browser only" : session?.user?.email ?? "",
  };
};

// The account picture, or the initials when there is none or it fails to load
export const Avatar = ({ className }: { className?: string }) => {
  const profile = useProfile();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [profile.image]);

  return (
    <span className={cn("grid overflow-hidden rounded-full bg-gold place-items-center text-[#1D1B18] font-semibold", className)}>
      {profile.image && !failed ? (
        // Google avatars can refuse requests that carry a referrer
        <img src={profile.image} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="object-cover w-full h-full" />
      ) : (
        profile.initials
      )}
    </span>
  );
};

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

// Opened from the avatar in the top bar: a side panel on desktop, full screen on mobile.
const SettingsPanel = ({ open, onOpenChange, theme, onThemeChange }: SettingsPanelProps) => {
  const profile = useProfile();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(29,27,24,.32)] dark:bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            fontVariables,
            "fixed inset-0 z-50 flex flex-col font-geist bg-paper text-ink md:left-auto md:w-[460px] md:shadow-[-30px_0_60px_-20px_rgba(29,27,24,.35)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200"
          )}
        >
          <div className="flex items-center justify-between h-[60px] md:h-auto pl-4 pr-2 md:px-6 md:py-5 border-b border-line">
            <DialogPrimitive.Title className="font-display font-semibold text-xl tracking-[-0.02em]">Settings</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid w-11 h-11 md:w-9 md:h-9 place-items-center text-[22px] md:text-lg md:border md:border-line rounded-lg cursor-pointer hover:bg-chip"
            >
              ×
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Profile and account</DialogPrimitive.Description>

          <div className="flex-1 px-4 overflow-y-auto md:px-6">
            <div className="flex items-center gap-3 md:gap-3.5 py-[18px] md:py-[22px] border-b border-line">
              <Avatar className="flex-none w-12 h-12 md:w-14 md:h-14 text-base md:text-lg" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] md:text-base truncate">{profile.name}</div>
                <div className="text-xs md:text-[13px] text-ink-muted mt-0.5 truncate">{profile.sub}</div>
              </div>
              {profile.isDemo && (
                <button
                  type="button"
                  onClick={() => signIn("google")}
                  className="flex-none h-[34px] px-3 border border-line rounded-lg bg-transparent text-[13px] font-medium cursor-pointer hover:bg-chip"
                >
                  Sign in
                </button>
              )}
            </div>

            <div className="py-5">
              <div className="font-geist-mono font-medium text-[11px] md:text-xs tracking-[.08em] uppercase text-ink-muted mb-2.5 md:mb-3">Theme</div>
              <div className="grid grid-cols-3 gap-0.5 p-[3px] border border-line rounded-[10px] bg-canvas">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => onThemeChange(t.value)}
                    className={cn(
                      "h-10 md:h-[34px] rounded-[7px] text-sm md:text-[13px] font-medium cursor-pointer",
                      theme === t.value ? "bg-ink text-paper" : "bg-transparent text-ink-muted hover:text-ink"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 pb-6 md:px-6 md:py-4 md:border-t border-line">
            {profile.isDemo ? (
              <button
                type="button"
                onClick={() => {
                  resetDemoCollection();
                  window.location.reload();
                }}
                className="w-full md:w-auto h-12 md:h-[38px] px-3.5 border border-line md:border-0 rounded-[10px] bg-transparent text-ink-muted hover:text-ink font-medium text-[15px] md:text-sm cursor-pointer"
              >
                Reset demo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full md:w-auto h-12 md:h-[38px] px-3.5 border border-line md:border-0 rounded-[10px] bg-transparent text-[oklch(0.5_0.16_27)] dark:text-[oklch(0.7_0.15_27)] font-medium text-[15px] md:text-sm cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default SettingsPanel;
