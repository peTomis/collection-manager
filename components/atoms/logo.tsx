interface LogoProps {
  size?: number;
  variant?: "full" | "mark";
  tone?: "light" | "dark";
}

// A 9-pocket binder page filling up: ink cards, empty pockets, and the gold hit popping out of its slot.
const POCKETS = [
  { x: 6, y: 5, filled: true },
  { x: 19, y: 5, filled: true },
  { x: 32, y: 5, filled: false },
  { x: 6, y: 19.5, filled: true },
  { x: 19, y: 19.5, filled: true },
  { x: 32, y: 19.5, filled: false },
  { x: 6, y: 34, filled: true },
  { x: 19, y: 34, filled: false },
  { x: 32, y: 34, filled: false },
];

const Logo = ({ size = 32, variant = "full", tone }: LogoProps) => {
  // Without a tone the logo follows the current theme.
  const ink = tone ? (tone === "dark" ? "#FBFAF7" : "#1D1B18") : "rgb(var(--cm-ink))";
  const paper = tone ? (tone === "dark" ? "#1D1B18" : "#FBFAF7") : "rgb(var(--cm-paper))";

  return (
    <div className="inline-flex items-center" style={{ gap: Math.round(size * 0.3), color: ink }}>
      <svg width={size} height={size} viewBox="0.5 -2.5 49 49" className="flex-none block overflow-visible" aria-hidden>
        {POCKETS.map(({ x, y, filled }) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="10" height="12" rx="2" fill="currentColor" opacity={filled ? 1 : 0.2} />
        ))}
        <rect x="32.5" y="-1" width="11" height="13.2" rx="2.2" fill="oklch(0.6 0.13 75)" style={{ stroke: paper }} strokeWidth="1.6" transform="rotate(12 38 5.6)" />
      </svg>
      {variant === "full" && (
        <span className="font-display font-bold leading-none tracking-[-0.04em]" style={{ fontSize: Math.round(size * 0.8) }}>
          Binderly
        </span>
      )}
    </div>
  );
};

export default Logo;
