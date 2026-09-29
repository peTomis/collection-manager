// Libraries
import { useState } from "react";

// Components
import NewListModal from "@/components/organisms/new-list-modal";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { setBinder } from "@/redux/slices/binders";
import { BinderWithItems } from "@/types/mongodb";
import { summarizeBinder } from "@/lib/items";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const dotColor = (summary: ReturnType<typeof summarizeBinder>) => (summary.sealed > summary.cards ? "bg-iris" : "bg-gold");

// Desktop: a list in the left rail. Mobile: a row of chips above the binder.
const BinderRail = () => {
  const [creating, setCreating] = useState(false);
  const { binder, binders } = useSelector((state) => state.binders);
  const dispatch = useDispatch();

  const rows = binders.map((b) => ({ binder: b, summary: summarizeBinder(b) }));
  const select = (b: BinderWithItems) => dispatch(setBinder(b));

  return (
    <>
      <aside className="hidden px-4 border-r lg:block border-line py-7 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-2 pb-3">
          <span className="font-geist-mono font-medium text-xs tracking-[.08em] uppercase text-ink-muted">Your binders</span>
          <button type="button" onClick={() => setCreating(true)} className="h-[30px] px-2.5 border border-line rounded-[7px] bg-paper text-[13px] font-medium cursor-pointer hover:bg-chip">
            + New
          </button>
        </div>
        {rows.map(({ binder: b, summary }) => (
          <button
            key={b._id}
            type="button"
            onClick={() => select(b)}
            className={cn(
              "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 p-3 mb-0.5 text-left rounded-[9px] border cursor-pointer",
              b._id === binder?._id ? "bg-paper border-line" : "border-transparent hover:bg-paper/60"
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("flex-none w-[7px] h-[7px] rounded-full", dotColor(summary))} />
                <span className="text-sm font-medium truncate">{b.name}</span>
              </div>
              <div className="text-xs text-ink-muted mt-[3px] ml-[15px]">{summary.count}</div>
            </div>
            <span className="font-geist-mono font-medium text-[13px]">{eur(summary.value)}</span>
          </button>
        ))}
      </aside>

      <div className="flex flex-none gap-2 px-4 pt-3.5 pb-1 overflow-x-auto no-scrollbar lg:hidden">
        {rows.map(({ binder: b, summary }) => {
          const active = b._id === binder?._id;
          return (
            <button
              key={b._id}
              type="button"
              onClick={() => select(b)}
              className={cn(
                "flex flex-none items-center gap-[7px] h-10 px-3.5 rounded-full border text-[13px] font-medium cursor-pointer",
                active ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-line"
              )}
            >
              <span className={cn("w-[7px] h-[7px] rounded-full", dotColor(summary))} />
              {b.name}
            </button>
          );
        })}
        <button type="button" onClick={() => setCreating(true)} className="flex-none h-10 px-3.5 border border-dashed rounded-full border-line text-[13px] font-medium text-ink-muted cursor-pointer">
          + New
        </button>
      </div>

      <NewListModal type="binder" open={creating} onClose={() => setCreating(false)} />
    </>
  );
};

export default BinderRail;
