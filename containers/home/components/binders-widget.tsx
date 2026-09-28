// Libraries
import Link from "next/link";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { setBinder } from "@/redux/slices/binders";
import { BinderWithItems, ItemType } from "@/types/mongodb";
import { getPrice } from "@/utils/utils";
import { deltaColor, eur, pct } from "@/lib/format";
import { summarizeBinder } from "@/lib/items";
import { cn } from "@/lib/utils";

const summarize = (binder: BinderWithItems) => ({ binder, ...summarizeBinder(binder) });

const BindersWidget = () => {
  const { binders } = useSelector((state) => state.binders);
  const dispatch = useDispatch();

  const rows = binders.map(summarize).sort((a, b) => b.value - a.value);
  const total = rows.reduce((acc, r) => acc + r.value, 0);
  const items = rows.reduce((acc, r) => acc + r.cards + r.sealed, 0);

  // Cards vs sealed share of the total value
  const cardsValue = binders
    .flatMap((b) => b.items)
    .filter((i) => i.type !== ItemType.SEALED)
    .reduce((acc, i) => acc + getPrice(i.historicPrice) * i.quantity, 0);
  const cardsShare = total ? (cardsValue / total) * 100 : 50;

  return (
    <section className="flex flex-col bg-paper border border-line rounded-xl lg:rounded-[14px] px-4 pt-[18px] pb-1 lg:px-6 lg:pt-6 lg:pb-4 lg:absolute lg:inset-0">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display font-semibold text-xl lg:text-[22px] tracking-[-0.02em]">Binders</h3>
        <Link href="/binders" className="text-[13px] font-medium text-ink hover:text-gain">
          View all →
        </Link>
      </div>

      <div className="mt-[18px]">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded">
          <div className="bg-gold" style={{ width: `${cardsShare}%` }} />
          <div className="flex-1 bg-iris" />
        </div>
        <div className="flex justify-between mt-2 text-xs text-ink-muted">
          <span>
            Cards <span className="font-geist-mono text-ink">{eur(cardsValue)}</span>
          </span>
          <span>
            Sealed <span className="font-geist-mono text-ink">{eur(total - cardsValue)}</span>
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-2 mt-4 -mx-2 lg:overflow-y-auto">
        {rows.length === 0 && <div className="py-6 text-sm text-center border-t border-line text-ink-muted">No binders yet</div>}
        {rows.map((r) => (
          <Link
            key={r.binder._id}
            href="/binders"
            onClick={() => dispatch(setBinder(r.binder))}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center py-2 min-h-[52px] lg:py-3.5 border-t border-line text-ink hover:bg-canvas -mx-2 px-2 rounded-md"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("flex-none w-2 h-2 rounded-full", r.sealed > r.cards ? "bg-iris" : "bg-gold")} />
                <span className="font-medium text-sm lg:text-[15px] truncate">{r.binder.name}</span>
              </div>
              <div className="text-xs text-ink-muted mt-0.5 lg:mt-1 ml-4">{r.count}</div>
            </div>
            <div className="text-right">
              <div className="font-geist-mono font-medium text-sm lg:text-[15px]">{eur(r.value)}</div>
              <div className={cn("font-geist-mono text-[11px] lg:text-xs lg:mt-1", deltaColor(r.change1m))}>
                {pct(r.change1m)} <span className="text-ink-muted">30d</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden lg:flex justify-between pt-3.5 border-t border-line text-[13px] text-ink-muted">
        <span>
          {rows.length} binders · {items} items
        </span>
        <span className="font-geist-mono text-ink">{eur(total)}</span>
      </div>
    </section>
  );
};

export default BindersWidget;
