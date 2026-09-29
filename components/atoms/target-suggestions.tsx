// Types
import { HistoricPrice } from "@/types/mongodb";
import { getPrice } from "@/utils/utils";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const round = (value: number) => Math.round(value * 100) / 100;
const lowest = (prices: number[] | undefined) => Math.min(...(prices ?? []).filter((p) => p > 0));

// Target prices worth one tap: below the current price, the recent average, and the lows the item has reached
export const targetSuggestions = (historicPrice: HistoricPrice | undefined) => {
  if (!historicPrice) return [];
  const price = getPrice(historicPrice);
  const candidates = [
    { label: "Current", value: price },
    { label: "−10%", value: price * 0.9 },
    { label: "−20%", value: price * 0.8 },
    { label: "30d average", value: historicPrice.average1m },
    { label: "30d low", value: lowest(historicPrice.prices1m) },
    // The history goes back a year, so this is the lowest price on record
    { label: "Lowest", value: lowest([...(historicPrice.prices1y ?? []), ...(historicPrice.prices1m ?? []), ...(historicPrice.prices1w ?? [])]) },
  ];
  const seen = new globalThis.Set<number>();
  return candidates.map((c) => ({ ...c, value: round(c.value) })).filter((c) => Number.isFinite(c.value) && c.value > 0 && !seen.has(c.value) && seen.add(c.value));
};

interface TargetSuggestionsProps {
  historicPrice: HistoricPrice | undefined;
  // The target typed so far, to mark the matching suggestion
  value: string;
  onPick: (value: number) => void;
  className?: string;
}

const TargetSuggestions = ({ historicPrice, value, onPick, className }: TargetSuggestionsProps) => {
  const suggestions = targetSuggestions(historicPrice);
  if (!suggestions.length) return null;
  const current = Number(value.replace(",", "."));
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {suggestions.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onPick(s.value)}
          className={cn(
            "flex items-center gap-1.5 h-9 lg:h-8 px-2.5 rounded-full border text-xs font-medium cursor-pointer",
            value.trim() !== "" && current === s.value ? "bg-ink text-paper border-ink" : "bg-paper border-line hover:bg-chip",
          )}
        >
          {s.label}
          <span className="font-geist-mono opacity-70">{eur(s.value)}</span>
        </button>
      ))}
    </div>
  );
};

export default TargetSuggestions;
