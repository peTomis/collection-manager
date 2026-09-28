// Libraries
import { useState } from "react";

// Components
import SetIcon from "./set-icon";

// State
import { Set } from "@/types/mongodb";
import { cn } from "@/lib/utils";

interface SetRailProps {
  sets: Set[];
  selected: Set | null;
  onSelect: (set: Set) => void;
}

// Cards in the database (not the set's printed size in `cards`); sealed from the set's own `sealed` when it has one
export const setCardCount = (set: Set) => set.counts?.cards ?? 0;
export const setSealedCount = (set: Set) => set.sealed ?? set.counts?.sealed ?? 0;
export const setSize = (set: Set) => setCardCount(set) + setSealedCount(set);

const year = (set: Set) => (set.releasedAt ? new Date(set.releasedAt).getFullYear() : null);

// Desktop: a searchable list of sets in the left rail. Mobile: a row of set chips.
const SetRail = ({ sets, selected, onSelect }: SetRailProps) => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? sets.filter((s) => s.name.toLowerCase().includes(q)) : sets;

  return (
    <>
      <aside className="hidden px-4 border-r lg:block border-line py-7 lg:overflow-y-auto">
        <label className="flex items-center gap-2 h-[38px] px-3 border border-line rounded-[9px] bg-paper text-[13px] text-ink-muted">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="14.5" y2="14.5" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a set" className="flex-1 min-w-0 bg-transparent outline-none text-ink placeholder:text-ink-muted" />
        </label>
        <div className="px-2 pt-[22px] pb-2 font-geist-mono font-medium text-xs tracking-[.08em] uppercase text-ink-muted">Sets · newest first</div>
        {filtered.map((s) => (
          <button
            key={s._id}
            type="button"
            onClick={() => onSelect(s)}
            className={cn(
              "grid w-full grid-cols-[52px_minmax(0,1fr)_auto] gap-3 items-center p-2.5 mb-0.5 text-left rounded-[9px] border cursor-pointer",
              s._id === selected?._id ? "bg-paper border-line" : "border-transparent hover:bg-paper/60"
            )}
          >
            <SetIcon set={s} className="w-[52px] h-[30px]" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{s.name}</div>
              <div className="text-xs text-ink-muted mt-0.5">{[year(s), setCardCount(s) && `${setCardCount(s)} cards`].filter(Boolean).join(" · ")}</div>
            </div>
            <span className="font-geist-mono text-xs text-ink-muted" title="Cards and sealed products in this set">
              {setSize(s) || ""}
            </span>
          </button>
        ))}
        {filtered.length === 0 && <div className="px-2 py-6 text-[13px] text-ink-muted">No set matches “{query}”</div>}
      </aside>

      <div className="flex flex-none gap-2 px-4 pt-3.5 overflow-x-auto no-scrollbar lg:hidden">
        {sets.map((s) => (
          <button
            key={s._id}
            type="button"
            onClick={() => onSelect(s)}
            className={cn(
              "flex flex-none items-center gap-2 h-11 pl-2 pr-3 rounded-[10px] border bg-paper text-[13px] font-medium cursor-pointer",
              s._id === selected?._id ? "border-ink" : "border-line"
            )}
          >
            <SetIcon set={s} className="w-10 h-[22px]" />
            {s.name}
          </button>
        ))}
      </div>
    </>
  );
};

export default SetRail;
