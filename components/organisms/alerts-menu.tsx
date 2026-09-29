// Libraries
import { RefObject, useLayoutEffect, useState } from "react";
import { useRouter } from "next/router";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Components
import SetIcon from "@/containers/database/components/set-icon";

// State
import { useSelector } from "@/redux/store";
import { WishlistItem, WishlistWithItems } from "@/types/mongodb";
import { itemPrice, languageLabel, variantLabel } from "@/lib/items";
import { fontVariables } from "@/lib/fonts";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AlertsMenuProps {
  open: boolean;
  onClose: () => void;
  // The alerts button it drops down from
  anchor: RefObject<HTMLElement | null>;
  hits: { item: WishlistItem; wishlist: WishlistWithItems }[];
}

// Every wishlist item at or below its target, best deal first: picking one opens it in its wishlist
const AlertsMenu = ({ open, onClose, anchor, hits }: AlertsMenuProps) => {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const { sets } = useSelector((state) => state.sets);
  const router = useRouter();

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const below = (item: WishlistItem) => (item.target ? (item.target - itemPrice(item)) / item.target : 0);
  const rows = [...hits].sort((a, b) => below(b.item) - below(a.item));

  const go = ({ item, wishlist }: (typeof hits)[number]) => {
    onClose();
    router.push({ pathname: "/wishlists", query: { wishlist: wishlist._id, item: item._id } });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={position ? { top: position.top, right: position.right } : undefined}
          className={cn(
            fontVariables,
            "fixed z-50 flex flex-col w-[380px] max-w-[calc(100vw-32px)] max-h-[70vh] overflow-hidden rounded-[14px] border border-line bg-paper font-geist text-ink outline-none",
            "shadow-[0_24px_50px_-16px_rgba(29,27,24,.4)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex-none px-4 pt-3.5 pb-3 border-b border-line">
            <DialogPrimitive.Title className="text-sm font-semibold">Alerts</DialogPrimitive.Title>
            <p className="mt-0.5 text-xs text-ink-muted">{hits.length === 1 ? "1 item is" : `${hits.length} items are`} at or below your target price</p>
          </div>
          {/* Seven rows (52px each, plus padding), then it scrolls */}
          <div className="flex-1 min-h-0 max-h-[376px] p-1.5 overflow-y-auto">
            {rows.map((row) => {
              const { item, wishlist } = row;
              const set = sets.find((s) => s._id === item.item?.set);
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => go(row)}
                  className="grid w-full h-[52px] grid-cols-[36px_minmax(0,1fr)_auto] gap-3 items-center px-2.5 text-left rounded-[9px] cursor-pointer hover:bg-chip"
                >
                  {set ? <SetIcon set={set} className="w-9 h-5" /> : <span />}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{item.item?.name ?? item.name}</span>
                    <span className="block text-xs truncate text-ink-muted">{[wishlist.name, variantLabel(item), languageLabel(item)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-medium font-geist-mono text-gain">{eur(itemPrice(item))}</span>
                    <span className="block font-geist-mono text-[11px] text-ink-muted">target {eur(item.target ?? 0)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AlertsMenu;
