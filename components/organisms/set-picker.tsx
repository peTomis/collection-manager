// Libraries
import { RefObject, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Components
import SetIcon from "@/containers/database/components/set-icon";

// State
import { Set } from "@/types/mongodb";
import { setCardCount, setSealedCount } from "@/containers/database/components/set-rail";
import { groupByEra } from "@/lib/sets";
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

interface SetPickerProps {
  open: boolean;
  onClose: () => void;
  // The button it drops down from on desktop
  anchor: RefObject<HTMLElement | null>;
  // Newest first
  sets: Set[];
  selected?: string;
  // Items the user owns per set id
  owned: Map<string, number>;
  onSelect: (set: Set) => void;
}

const WIDTH = 440;
const year = (set: Set) => (set.releasedAt ? new Date(set.releasedAt).getFullYear() : null);

// Pick a set, on top of the modal that asked for it: a dropdown under its button on desktop, a bottom sheet on mobile
const SetPicker = ({ open, onClose, anchor, sets, selected, owned, onSelect }: SetPickerProps) => {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const { sheet, handlers } = useSwipeToClose(onClose);

  // Follow the button on desktop (the modal can scroll or the window resize while open)
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 8, left: Math.max(16, rect.right - WIDTH) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const close = () => {
    setQuery("");
    onClose();
  };

  const q = query.trim().toLowerCase();
  const matches = q ? sets.filter((s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || String(year(s) ?? "").includes(q)) : sets;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(29,27,24,.4)] lg:bg-transparent dark:bg-black/50 lg:dark:bg-transparent data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={sheet}
          aria-describedby={undefined}
          style={position ? ({ "--picker-top": `${position.top}px`, "--picker-left": `${position.left}px` } as React.CSSProperties) : undefined}
          className={cn(
            fontVariables,
            "fixed z-50 flex flex-col overflow-hidden bg-paper font-geist text-ink outline-none",
            "inset-x-0 bottom-0 h-[78dvh] rounded-t-[22px] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "lg:inset-auto lg:top-[var(--picker-top)] lg:left-[var(--picker-left)] lg:w-[440px] lg:h-auto lg:rounded-[14px] lg:border lg:border-line lg:shadow-[0_24px_50px_-16px_rgba(29,27,24,.4)]",
            "lg:data-[state=open]:slide-in-from-bottom-0 lg:data-[state=open]:fade-in-0 lg:data-[state=open]:zoom-in-95"
          )}
        >
          {/* Mobile: grab handle and title, dragged down to close */}
          <div {...handlers} className="flex-none touch-none lg:hidden">
            <div className="flex justify-center pt-2.5 pb-0.5">
              <span className="w-10 h-[5px] rounded-full bg-line" />
            </div>
            <div className="flex items-center justify-between pl-4 pr-2">
              <DialogPrimitive.Title className="font-display font-semibold text-xl tracking-[-0.02em]">Choose a set</DialogPrimitive.Title>
              <DialogPrimitive.Close aria-label="Close" className="grid w-11 h-11 place-items-center text-[22px] cursor-pointer">
                ×
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="flex-none px-4 pt-1.5 pb-2.5 border-b lg:p-3 border-line">
            <label className="flex items-center gap-2 h-12 lg:h-10 px-3.5 lg:px-3 border-[1.5px] border-ink rounded-[10px] lg:rounded-[9px] text-ink-muted">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className="lg:w-3.5 lg:h-3.5">
                <circle cx="7" cy="7" r="5" />
                <line x1="11" y1="11" x2="14.5" y2="14.5" />
              </svg>
              <input
                autoFocus
                aria-label="Search sets"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sets or codes"
                className="flex-1 min-w-0 text-base bg-transparent outline-none lg:text-sm text-ink placeholder:text-ink-muted"
              />
            </label>
          </div>

          <div className="flex-1 min-h-0 px-2 pb-4 overflow-y-auto lg:flex-none lg:max-h-[340px] lg:px-1.5 lg:pt-1 lg:pb-2">
            {groupByEra(matches).map((group, i) => (
              <div key={`${group.era}-${i}`}>
                <div className="px-2 pt-3.5 pb-1.5 lg:px-2.5 lg:pt-3 font-geist-mono font-medium text-[11px] tracking-[.08em] uppercase text-ink-muted">{group.era}</div>
                {group.sets.map((s) => {
                  const active = s._id === selected;
                  const count = owned.get(s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        onSelect(s);
                        close();
                      }}
                      className={cn(
                        "grid w-full grid-cols-[48px_minmax(0,1fr)_auto] lg:grid-cols-[52px_minmax(0,1fr)_auto] gap-3 items-center min-h-14 lg:min-h-0 px-2 py-1 lg:px-2.5 lg:py-2 text-left rounded-[10px] lg:rounded-[9px] cursor-pointer",
                        active ? "bg-chip" : "hover:bg-canvas"
                      )}
                    >
                      <SetIcon set={s} className="w-12 h-7 lg:w-[52px] lg:h-[30px]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] lg:text-sm font-medium">{s.name}</span>
                        <span className="block text-xs text-ink-muted lg:mt-px">
                          {[year(s), `${setCardCount(s)} cards`, `${setSealedCount(s)} sealed`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="flex items-center gap-2.5">
                        {count ? <span className="hidden lg:inline font-geist-mono text-xs text-ink-muted">{count} owned</span> : null}
                        <span className="w-5 lg:w-4 text-center font-semibold text-base lg:text-sm">{active ? "✓" : ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {matches.length === 0 && <div className="px-3 py-8 lg:py-7 text-sm lg:text-[13px] text-center text-ink-muted">No sets match “{query}”</div>}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default SetPicker;
