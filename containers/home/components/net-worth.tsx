// Libraries
import { useState } from "react";

// Components
import Segmented from "@/components/atoms/segmented";

// State
import { useSelector } from "@/redux/store";
import { getPrice } from "@/utils/utils";
import { change, deltaColor, eur, pct, signedEur } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "24h" | "7d" | "30d" | "1y" | "all";

const PERIODS: { value: Period; label: string; days: number; text: string }[] = [
  { value: "24h", label: "24h", days: 1, text: "past 24 hours" },
  { value: "7d", label: "7d", days: 7, text: "past 7 days" },
  { value: "30d", label: "30d", days: 30, text: "past 30 days" },
  { value: "1y", label: "1y", days: 365, text: "past year" },
  { value: "all", label: "All", days: Infinity, text: "since first record" },
];

const DAY = 24 * 60 * 60 * 1000;

// Five evenly spaced dates under the chart, the last one is always today
const axisLabels = (timestamps: number[], period: Period) => {
  if (timestamps.length < 2) return [];
  const format = (t: number, first: boolean) => {
    const d = new Date(t);
    if (period === "7d" || period === "24h") return d.toLocaleDateString("en-GB", { weekday: "short" });
    if (period === "30d") return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return d.toLocaleDateString("en-GB", first ? { month: "short", year: "numeric" } : { month: "short" });
  };
  const count = Math.min(5, timestamps.length);
  const idx = Array.from({ length: count }, (_, i) => Math.round((i * (timestamps.length - 1)) / (count - 1)));
  return idx.map((i, n) => (n === count - 1 ? "Today" : format(timestamps[i], n === 0)));
};

const NetWorth = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const { portfolio } = useSelector((state) => state.portfolio);
  const { binders } = useSelector((state) => state.binders);
  const { wishlists } = useSelector((state) => state.wishlists);

  const value = portfolio?.value ?? 0;
  const current = PERIODS.find((p) => p.value === period)!;

  // Daily points in the selected window, ending on the current value
  const history = portfolio?.historicValue ?? [];
  const last = history[history.length - 1]?.timestamp ?? Date.now();
  const inWindow = history.filter((p) => current.days === Infinity || p.timestamp >= last - current.days * DAY - DAY / 2);
  const points = inWindow.length ? [...inWindow.slice(0, -1), { timestamp: last, value }] : [];

  const start = points[0]?.value ?? value;
  const delta = value - start;

  const binderItems = binders.flatMap((b) => b.items);
  const wishlistItems = wishlists.flatMap((w) => w.items ?? []);
  const stats = [
    { label: "Cards", value: eur(portfolio?.cardsValue ?? 0), sub: `${portfolio?.cardsQuantity ?? 0} cards` },
    { label: "Sealed", value: eur(portfolio?.sealedValue ?? 0), sub: `${portfolio?.sealedQuantity ?? 0} items` },
    { label: "Binders", value: String(binders.length), sub: `${binderItems.reduce((acc, i) => acc + i.quantity, 0)} items` },
    {
      label: "Wishlist",
      value: eur(wishlistItems.reduce((acc, i) => acc + (i.historicPrice ? getPrice(i.historicPrice) : 0), 0)),
      sub: `${wishlistItems.length} items to buy`,
    },
  ];

  return (
    // On mobile the hero sits on the page background and the stats get their own card, as in the design
    <section className="flex flex-col pt-1 lg:pt-7 lg:px-7 lg:bg-paper lg:border lg:border-line lg:rounded-[14px] lg:overflow-hidden">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase text-ink-muted">Net worth</div>
          <div className="font-display font-medium text-5xl lg:text-[76px] leading-none tracking-[-0.04em] mt-2.5 lg:mt-3 tabular-nums">
            {portfolio ? eur(value) : "—"}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:gap-2.5 mt-2.5 lg:mt-3.5">
            <span className={cn("font-geist-mono font-medium text-sm lg:text-[15px]", deltaColor(delta))}>
              {signedEur(delta)} · {pct(change(value, start))}
            </span>
            <span className="text-[13px] lg:text-sm text-ink-muted">{current.text}</span>
          </div>
        </div>
        <Segmented className="hidden lg:flex" mono options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <Chart points={points.map((p) => p.value)} />
      <div className="hidden lg:flex justify-between pt-2.5 pb-5 font-geist-mono text-xs text-ink-muted">
        {axisLabels(
          points.map((p) => p.timestamp),
          period
        ).map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <Segmented className="mt-3.5 lg:hidden bg-paper" mono options={PERIODS} value={period} onChange={setPeriod} />

      <div className="grid grid-cols-2 mt-4 overflow-hidden border border-line rounded-xl bg-paper lg:grid-cols-4 lg:mt-0 lg:-mx-7 lg:border-0 lg:border-t lg:rounded-none lg:bg-transparent">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn("px-4 pt-3.5 pb-4 lg:px-7 lg:pt-[18px] lg:pb-[22px] border-line", i % 2 === 1 && "border-l", i < 2 && "border-b lg:border-b-0", i === 2 && "lg:border-l")}
          >
            <div className="text-xs font-medium text-ink-muted">{s.label}</div>
            <div className="font-display font-medium text-[19px] lg:text-[22px] tracking-[-0.02em] mt-1 lg:mt-1.5">{s.value}</div>
            <div className="font-geist-mono text-[11px] lg:text-xs text-ink-muted mt-[3px] lg:mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Chart = ({ points }: { points: number[] }) => {
  if (points.length < 2) {
    return <div className="grid h-[170px] lg:h-[280px] mt-5 lg:mt-7 place-items-center text-sm text-ink-muted">Not enough history yet</div>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const y = (v: number) => 250 - ((v - min) / (max - min || 1)) * 225;
  const line = points.map((v, i) => (i ? "L" : "M") + ((i / (points.length - 1)) * 1000).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const endTop = (y(points[points.length - 1]) / 280) * 100;

  return (
    <div className="relative h-[170px] lg:h-[280px] mt-5 lg:mt-7">
      <svg width="100%" height="100%" viewBox="0 0 1000 280" preserveAspectRatio="none" className="block overflow-visible">
        {[70, 140, 210].map((gy) => (
          <line key={gy} x1="0" y1={gy} x2="1000" y2={gy} style={{ stroke: "rgb(var(--cm-line))" }} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={line + " L1000,280 L0,280 Z"} fill="oklch(0.52 0.13 155 / 0.10)" />
        <path d={line} fill="none" style={{ stroke: "rgb(var(--cm-ink))" }} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div
        className="absolute right-[-5px] w-2.5 h-2.5 -mt-[5px] rounded-full bg-ink shadow-[0_0_0_5px_oklch(0.52_0.13_155/0.18)]"
        style={{ top: `${endTop}%` }}
      />
      <div className="absolute top-0 left-0 hidden lg:flex flex-col gap-1 font-geist-mono text-xs text-ink-muted">
        <span>High {eur(max)}</span>
        <span>Low {eur(min)}</span>
      </div>
    </div>
  );
};

export default NetWorth;
