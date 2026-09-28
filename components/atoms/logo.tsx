interface LogoProps {
  size?: number;
  variant?: "full" | "mark";
  tone?: "light" | "dark";
}

// A fanned hand of three cards: amber for Pokémon, violet for Magic, ink for the collection.
const Logo = ({ size = 32, variant = "full", tone }: LogoProps) => {
  // Without a tone the logo follows the current theme.
  const ink = tone ? (tone === "dark" ? "#FBFAF7" : "#1D1B18") : "rgb(var(--cm-ink))";
  const paper = tone ? (tone === "dark" ? "#1D1B18" : "#FBFAF7") : "rgb(var(--cm-paper))";
  const muted = tone ? (tone === "dark" ? "#A8A298" : "#6B665E") : "rgb(var(--cm-ink-muted))";

  return (
    <div className="inline-flex items-center" style={{ gap: Math.round(size * 0.34), color: ink }}>
      <svg width={size} height={size} viewBox="2 1.5 28 27" className="flex-none block overflow-visible" aria-hidden>
        <rect x="9.5" y="5" width="13" height="18" rx="2.4" fill="oklch(0.6 0.13 75)" style={{ stroke: paper }} strokeWidth="1.4" transform="rotate(-20 16 27)" />
        <rect x="9.5" y="5" width="13" height="18" rx="2.4" fill="oklch(0.55 0.13 295)" style={{ stroke: paper }} strokeWidth="1.4" transform="rotate(0 16 27)" />
        <rect x="9.5" y="5" width="13" height="18" rx="2.4" style={{ fill: ink, stroke: paper }} strokeWidth="1.4" transform="rotate(20 16 27)" />
        <rect x="13.6" y="10.6" width="4.8" height="4.8" style={{ fill: paper }} transform="rotate(20 16 27) rotate(45 16 13)" />
      </svg>
      {variant === "full" && (
        <span className="flex flex-col leading-none">
          <span className="font-display font-semibold tracking-[-0.02em]" style={{ fontSize: Math.round(size * 0.56) }}>
            Collection
          </span>
          <span className="font-geist-mono font-medium uppercase tracking-[.14em] mt-[3px]" style={{ fontSize: Math.max(10, Math.round(size * 0.3)), color: muted }}>
            Manager
          </span>
        </span>
      )}
    </div>
  );
};

export default Logo;
