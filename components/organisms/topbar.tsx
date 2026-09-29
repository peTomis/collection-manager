// Libraries
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// Components
import Logo from "@/components/atoms/logo";
import SettingsPanel, { useProfile } from "@/components/organisms/settings-panel";
import SearchPalette from "@/components/organisms/search-palette";
import AlertsMenu from "@/components/organisms/alerts-menu";
import { useTheme } from "@/lib/theme";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { getWishlists } from "@/redux/slices/wishlists";
import { getSets } from "@/redux/slices/sets";
import { targetHit } from "@/lib/items";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// Tab bar icons: 20px line drawings in the search icon's stroke, filled on the active tab (details that must stay lines say fill="none")
const TAB_ICONS: Record<string, React.ReactNode> = {
  // A house
  "/": <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1Z" />,
  // A binder with its rings
  "/binders": (
    <>
      <rect x="5" y="3" width="11" height="14" rx="1.5" />
      <path d="M3.5 6.5h3M3.5 10h3M3.5 13.5h3" fill="none" />
    </>
  ),
  // A heart
  "/wishlists": <path d="M10 16.5s-6-3.6-6-8A3.3 3.3 0 0 1 10 6.3a3.3 3.3 0 0 1 6 2.2c0 4.4-6 8-6 8Z" />,
  // A stack of cards
  "/database": (
    <>
      <rect x="6.5" y="3" width="9" height="12" rx="1.5" />
      <path d="M4.5 6v9.5A1.5 1.5 0 0 0 6 17h7" fill="none" />
    </>
  ),
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/binders", label: "Binders" },
  { href: "/wishlists", label: "Wishlist" },
  { href: "/database", label: "Database" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

const Topbar = () => {
  const [open, setOpen] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const { pathname } = useRouter();
  const profile = useProfile();
  const [theme, setTheme] = useTheme();

  // ⌘K / Ctrl+K opens the search from anywhere
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Alerts: wishlist items whose price is at or below the user's target
  const user = useSelector((state) => state.user.user);
  const { wishlists, loaded: wishlistsLoaded } = useSelector((state) => state.wishlists);
  const setsLoaded = useSelector((state) => state.sets.loaded);
  const dispatch = useDispatch();
  React.useEffect(() => {
    if (user && !wishlistsLoaded) dispatch(getWishlists(user));
  }, [user]);
  const hits = wishlists.flatMap((w) => w.items.filter(targetHit).map((item) => ({ item, wishlist: w })));
  const alerts = hits.length;
  const [alertsOpen, setAlertsOpen] = React.useState(false);
  const alertsButton = React.useRef<HTMLButtonElement>(null);
  // Set logos for the list
  React.useEffect(() => {
    if (alertsOpen && user && !setsLoaded) dispatch(getSets(user));
  }, [alertsOpen]);

  const title = NAV.find((n) => isActive(pathname, n.href))?.label ?? "";

  const account = (
    <button
      type="button"
      title="Settings"
      onClick={() => setOpen(true)}
      className="grid w-[38px] h-[38px] rounded-full bg-gold place-items-center text-[#1D1B18] text-[13px] font-semibold cursor-pointer shadow-[0_0_0_2px_rgb(var(--cm-paper)),0_0_0_3px_rgb(var(--cm-line))]"
    >
      {profile.initials}
    </button>
  );

  return (
    <header className={cn(fontVariables, "sticky top-0 z-40 flex-none font-geist bg-paper border-b border-line text-ink")}>
      {/* Desktop */}
      <div className="items-center hidden h-16 px-8 md:flex gap-7">
        <Link href="/" className="flex items-center">
          <Logo size={32} />
        </Link>
        <nav className="flex gap-0.5">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link key={n.href} href={n.href} className={cn("px-3.5 py-2 rounded-lg text-sm font-medium", active ? "bg-chip text-ink" : "text-ink-muted hover:text-ink")}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setSearching(true)}
          className="flex-1 max-w-[420px] flex items-center gap-2.5 h-[38px] px-3 border border-line rounded-[9px] bg-canvas text-ink-muted text-sm text-left cursor-pointer hover:border-ink-muted"
        >
          <SearchIcon size={15} />
          <span className="flex-1">Search cards, sets, sealed…</span>
          <span className="font-geist-mono font-medium text-[11px] px-1.5 py-0.5 border border-line rounded-[5px] bg-paper">⌘K</span>
        </button>
        <div className="flex items-center gap-2.5 ml-auto">
          {alerts > 0 && (
            <button
              ref={alertsButton}
              type="button"
              onClick={() => setAlertsOpen(true)}
              title="Wishlist items at or below your target price"
              className="flex items-center gap-2 h-[38px] px-3 border border-line rounded-[9px] text-[13px] font-medium cursor-pointer hover:bg-chip"
            >
              <span className="w-2 h-2 rounded-full bg-gain" />
              {alerts === 1 ? "1 alert" : `${alerts} alerts`}
            </button>
          )}
          {account}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 h-[60px] pl-4 pr-3">
          <Link href="/">
            <Logo size={28} variant="mark" />
          </Link>
          <span className="flex-1 font-display font-semibold text-[19px] tracking-[-0.01em]">{title}</span>
          <button
            type="button"
            onClick={() => setSearching(true)}
            className="grid bg-transparent border-0 cursor-pointer w-11 h-11 place-items-center text-ink"
            aria-label="Search"
          >
            <SearchIcon size={18} />
          </button>
          {account}
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 px-2 pt-1 pb-[max(12px,env(safe-area-inset-bottom))] border-t md:hidden border-line bg-paper">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center justify-center gap-1 min-h-[48px] text-[11px] font-medium", active ? "text-ink" : "text-ink-muted")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill={active ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={active ? 1.8 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {TAB_ICONS[n.href]}
              </svg>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <SearchPalette open={searching} onOpenChange={setSearching} />
      <AlertsMenu open={alertsOpen && alerts > 0} onClose={() => setAlertsOpen(false)} anchor={alertsButton} hits={hits} />
      <SettingsPanel open={open} onOpenChange={setOpen} theme={theme} onThemeChange={setTheme} />
    </header>
  );
};

const SearchIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <circle cx="7" cy="7" r="5" />
    <line x1="11" y1="11" x2="14.5" y2="14.5" />
  </svg>
);

export default Topbar;
