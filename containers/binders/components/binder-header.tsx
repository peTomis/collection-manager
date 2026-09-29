// Components
import LinkedList from "@/components/organisms/linked-list";
import ListName from "@/components/organisms/list-name";

// State
import { useSelector } from "@/redux/store";
import { BinderWithItems } from "@/types/mongodb";
import { setCompletion, summarizeBinder } from "@/lib/items";
import { deltaColor, eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BinderHeaderProps {
  binder: BinderWithItems;
  onDelete: () => void;
}

const BinderHeader = ({ binder, onDelete }: BinderHeaderProps) => {
  const { sets } = useSelector((state) => state.sets);
  const summary = summarizeBinder(binder);
  const completion = setCompletion(binder, sets);

  const stats = [
    { label: "Value", value: eur(summary.value) },
    { label: "Items", value: String(summary.cards + summary.sealed) },
    { label: "7 days", value: pct(summary.change1w), color: deltaColor(summary.change1w) },
    { label: "30 days", value: pct(summary.change1m), color: deltaColor(summary.change1m) },
  ];

  return (
    <div className="flex-none">
      <div className="items-center justify-between hidden lg:flex text-[13px] text-ink-muted">
        <span className="min-w-0 truncate">Binders / {binder.name}</span>
        <button type="button" onClick={onDelete} className="flex-none ml-4 font-medium cursor-pointer hover:text-loss">
          Delete binder
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:mt-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between min-w-0 gap-3">
            <ListName key={binder._id} kind="binder" list={binder} />
            <button type="button" onClick={onDelete} className="flex-none mt-2 text-[13px] font-medium text-ink-muted lg:hidden">
              Delete
            </button>
          </div>
          <div className="flex items-center gap-2.5 lg:gap-3 mt-2 lg:mt-2.5 text-[13px] lg:text-sm text-ink-muted">
            {completion ? (
              <>
                <span>
                  {completion.owned} of {completion.total} <span className="hidden lg:inline">{completion.set} cards</span>
                </span>
                <div className="flex-1 lg:flex-none lg:w-[140px] h-1 rounded-sm bg-line overflow-hidden">
                  <div className="h-full bg-ink" style={{ width: `${completion.percent}%` }} />
                </div>
                <span className="font-geist-mono text-ink">{completion.percent}%</span>
              </>
            ) : (
              <span>{summary.count}</span>
            )}
          </div>
          <LinkedList kind="binder" list={binder} />
        </div>

        {/* Stats: a 2×2 card on mobile, a row of right-aligned figures on desktop */}
        <div className="grid grid-cols-2 gap-px overflow-hidden border lg:flex lg:gap-8 bg-line lg:bg-transparent border-line lg:border-0 rounded-xl lg:rounded-none">
          {stats.map((s) => (
            <div key={s.label} className="px-3.5 py-3 bg-paper lg:bg-transparent lg:p-0 lg:text-right">
              <div className="text-xs font-medium text-ink-muted">{s.label}</div>
              <div className={cn("font-display font-medium text-lg lg:text-[22px] tracking-[-0.02em] mt-[3px] lg:mt-1 whitespace-nowrap", s.color)}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BinderHeader;
