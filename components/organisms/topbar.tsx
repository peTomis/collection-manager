// Libraries
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// Components
import Logo from "@/components/atoms/logo";
import SettingsPanel, { useProfile } from "@/components/organisms/settings-panel";
import SearchPalette from "@/components/organisms/search-palette";
import { useTheme } from "@/lib/theme";

// State
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

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
              <Link
                key={n.href}
                href={n.href}
                className={cn("px-3.5 py-2 rounded-lg text-sm font-medium", active ? "bg-chip text-ink" : "text-ink-muted hover:text-ink")}
              >
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
        <div className="flex items-center gap-2.5 ml-auto">{account}</div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 h-[60px] pl-4 pr-3">
          <Link href="/">
            <Logo size={28} variant="mark" />
          </Link>
          <span className="flex-1 font-display font-semibold text-[19px] tracking-[-0.01em]">{title}</span>
          <button type="button" onClick={() => setSearching(true)} className="grid w-11 h-11 bg-transparent border-0 cursor-pointer place-items-center text-ink" aria-label="Search">
            <SearchIcon size={18} />
          </button>
          {account}
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 px-2 pt-1.5 pb-[22px] border-t md:hidden border-line bg-paper">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn("flex flex-col items-center justify-center gap-[5px] min-h-[48px] text-[11px] font-medium", active ? "text-ink" : "text-ink-muted")}
            >
              <span className={cn("w-5 h-1 rounded-sm", active ? "bg-ink" : "bg-transparent")} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <SearchPalette open={searching} onOpenChange={setSearching} />
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
