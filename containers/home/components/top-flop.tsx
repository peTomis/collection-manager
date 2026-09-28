// Libraries
import { useState } from "react";

// Components
import Segmented from "@/components/atoms/segmented";
import CardArt from "@/components/atoms/card-art";

// State
import { useSelector } from "@/redux/store";
import { BinderItem, Card, ItemType, Sealed } from "@/types/mongodb";
import { variantLabel } from "@/lib/items";
import { getPastPrice, getPrice, PricePeriod } from "@/utils/utils";
import { useSetsImages } from "@/lib/tcgdex";
import { change, deltaColor, eur, pct, signedEur } from "@/lib/format";
import { cn } from "@/lib/utils";

type Metric = "eur" | "pct";

const PERIODS: { value: PricePeriod; label: string; text: string }[] = [
  { value: "1d", label: "24h", text: "past 24 hours" },
  { value: "1w", label: "7d", text: "past 7 days" },
  { value: "1m", label: "30d", text: "past 30 days" },
  { value: "1y", label: "1y", text: "past year" },
];

interface Mover {
  id: string;
  name: string;
  sub: string;
  meta: string;
  isSealed: boolean;
  now: number;
  delta: number;
  change: number;
  // TCGdex set id and card number, to find the card image (cards only)
  tcgdex?: string;
  number?: number;
  image?: string;
}

const TopFlop = () => {
  const [metric, setMetric] = useState<Metric>("pct");
  const [period, setPeriod] = useState<PricePeriod>("1w");
  const { binders } = useSelector((state) => state.binders);
  const { sets } = useSelector((state) => state.sets);

  const setName = (id: string) => sets.find((s) => s._id === id)?.name ?? "";

  const describe = (item: BinderItem): Pick<Mover, "sub" | "meta" | "tcgdex" | "number"> => {
    const language = item.historicPrice.language.toUpperCase();
    if (item.type === ItemType.SEALED) {
      const sealed = item.item as Sealed;
      return { sub: [setName(sealed.set), "Sealed"].filter(Boolean).join(" · "), meta: [sealed.type, language].filter(Boolean).join(" · ") };
    }
    const card = item.item as Card;
    const variant = variantLabel(item);
    return {
      sub: [setName(card.set), card.number && `#${card.number}`].filter(Boolean).join(" · "),
      meta: [variant, language].filter(Boolean).join(" · "),
      tcgdex: sets.find((s) => s._id === card.set)?.tcgdex || undefined,
      number: card.number,
    };
  };

  // The same product can sit in several binders: rank it once
  const movers = new Map<string, Mover>();
  for (const item of binders.flatMap((b) => b.items)) {
    const hp = item.historicPrice;
    if (!hp || movers.has(hp._id)) continue;
    const now = getPrice(hp);
    const then = getPastPrice(hp, period);
    if (!now || !then) continue;
    movers.set(hp._id, { id: hp._id, name: item.item?.name ?? item.name, ...describe(item), isSealed: item.type === ItemType.SEALED, now, delta: now - then, change: change(now, then) });
  }

  const key = metric === "pct" ? "change" : "delta";
  const sorted = Array.from(movers.values()).sort((a, b) => b[key] - a[key]);
  const top = sorted.slice(0, 3);
  const flop = sorted.slice(Math.max(3, sorted.length - 3)).reverse();

  // Only the sets of the movers on screen
  const images = useSetsImages([...top, ...flop].map((m) => m.tcgdex ?? ""));
  const withImage = (m: Mover): Mover => ({ ...m, image: m.tcgdex && m.number !== undefined ? images.get(m.tcgdex)?.get(m.number) : undefined });

  const periodText = PERIODS.find((p) => p.value === period)!.text;

  return (
    <section className="bg-paper border border-line rounded-xl lg:rounded-[14px] px-4 pt-[18px] pb-1.5 lg:px-7 lg:pt-6 lg:pb-3">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h3 className="font-display font-semibold text-xl lg:text-[22px] tracking-[-0.02em]">Top &amp; flop</h3>
          <div className="hidden lg:block text-[13px] text-ink-muted mt-1">
            Ranked by {metric === "pct" ? "percentage change" : "value change in €"}, {periodText}
          </div>
        </div>
        <div className="flex gap-3">
          <Segmented
            options={[
              { value: "eur", label: "€ change" },
              { value: "pct", label: "% change" },
            ]}
            value={metric}
            onChange={setMetric}
          />
          <Segmented className="hidden lg:flex" mono options={PERIODS} value={period} onChange={setPeriod} />
        </div>
      </div>
      <Segmented className="mt-3 lg:hidden" mono options={PERIODS} value={period} onChange={setPeriod} />

      {sorted.length === 0 ? (
        <div className="py-8 text-sm text-center text-ink-muted">Add items to your binders to see how they move</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12 mt-[18px]">
          <MoverList title="Top 3" tone="gain" movers={top.map(withImage)} metric={metric} />
          <MoverList title="Flop 3" tone="loss" movers={flop.map(withImage)} metric={metric} />
        </div>
      )}
    </section>
  );
};

const MoverList = ({ title, tone, movers, metric }: { title: string; tone: "gain" | "loss"; movers: Mover[]; metric: Metric }) => (
  <div className="mb-3 lg:mb-0">
    <div
      className={cn(
        "flex items-center gap-2 pb-1 lg:pb-2.5 font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase",
        tone === "gain" ? "text-gain" : "text-loss"
      )}
    >
      <span className={cn("w-2 h-2 rotate-45", tone === "gain" ? "bg-gain" : "bg-loss")} />
      {title}
    </div>
    {movers.length === 0 && <div className="py-3 text-sm border-t border-line text-ink-muted">Nothing to show</div>}
    {movers.map((m, i) => (
      <div key={m.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] lg:grid-cols-[28px_46px_minmax(0,1fr)_auto] gap-3 lg:gap-4 items-center py-2.5 lg:py-3.5 border-t border-line">
        <span className="hidden lg:block font-geist-mono font-medium text-sm text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
        <div className="relative overflow-hidden w-9 h-[50px] lg:w-[46px] lg:h-16 rounded-[3px] lg:rounded bg-[repeating-linear-gradient(135deg,var(--cm-stripe-a)_0_5px,var(--cm-stripe-b)_5px_10px)]">
          {m.image && <CardArt image={m.image} alt={m.name} />}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm lg:text-base truncate">{m.name}</div>
          <div className="flex items-center gap-1.5 text-xs lg:text-[13px] text-ink-muted mt-0.5 lg:mt-[3px]">
            <span className={cn("flex-none w-1.5 h-1.5 lg:w-[7px] lg:h-[7px] rounded-full", m.isSealed ? "bg-iris" : "bg-gold")} />
            <span className="truncate">{m.sub}</span>
          </div>
          <div className="hidden lg:block text-xs text-ink-muted mt-0.5">{m.meta}</div>
        </div>
        <div className="text-right">
          <div className={cn("font-geist-mono font-medium text-sm lg:text-[17px]", deltaColor(m.delta))}>{metric === "pct" ? pct(m.change) : signedEur(m.delta)}</div>
          <div className="font-geist-mono text-[11px] lg:text-xs text-ink-muted mt-0.5 lg:mt-1">
            <span className="hidden lg:inline">{metric === "pct" ? signedEur(m.delta) : pct(m.change)} · now </span>
            {eur(m.now)}
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default TopFlop;
