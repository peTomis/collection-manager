// Libraries
import { useState } from "react";

// Components
import Modal, { modalButton } from "@/components/atoms/modal";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { createWishlist, setWishlist } from "@/redux/slices/wishlists";
import { WishlistWithItems } from "@/types/mongodb";
import { summarizeWishlist } from "@/lib/items";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const dotColor = (summary: ReturnType<typeof summarizeWishlist>) => (summary.sealed > summary.cards ? "bg-iris" : "bg-gold");

// Desktop: a list in the left rail. Mobile: a row of chips above the wishlist.
const WishlistRail = () => {
  const [creating, setCreating] = useState(false);
  const { wishlist, wishlists } = useSelector((state) => state.wishlists);
  const dispatch = useDispatch();

  const rows = wishlists.map((w) => ({ wishlist: w, summary: summarizeWishlist(w) }));
  const select = (w: WishlistWithItems) => dispatch(setWishlist(w));

  return (
    <>
      <aside className="hidden px-4 border-r lg:block border-line py-7 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-2 pb-3">
          <span className="font-geist-mono font-medium text-xs tracking-[.08em] uppercase text-ink-muted">Wishlists</span>
          <button type="button" onClick={() => setCreating(true)} className="h-[30px] px-2.5 border border-line rounded-[7px] bg-paper text-[13px] font-medium cursor-pointer hover:bg-chip">
            + New
          </button>
        </div>
        {rows.map(({ wishlist: w, summary }) => (
          <button
            key={w._id}
            type="button"
            onClick={() => select(w)}
            className={cn(
              "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 p-3 mb-0.5 text-left rounded-[9px] border cursor-pointer",
              w._id === wishlist?._id ? "bg-paper border-line" : "border-transparent hover:bg-paper/60"
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("flex-none w-[7px] h-[7px] rounded-full", dotColor(summary))} />
                <span className="text-sm font-medium truncate">{w.name}</span>
              </div>
              <div className="text-xs text-ink-muted mt-[3px] ml-[15px]">{summary.label}</div>
            </div>
            <span className="font-geist-mono font-medium text-[13px]">{eur(summary.value)}</span>
          </button>
        ))}
      </aside>

      <div className="flex flex-none gap-2 px-4 pt-3.5 pb-1 overflow-x-auto no-scrollbar lg:hidden">
        {rows.map(({ wishlist: w, summary }) => {
          const active = w._id === wishlist?._id;
          return (
            <button
              key={w._id}
              type="button"
              onClick={() => select(w)}
              className={cn(
                "flex flex-none items-center gap-[7px] h-10 px-3.5 rounded-full border text-[13px] font-medium cursor-pointer",
                active ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-line"
              )}
            >
              <span className={cn("w-[7px] h-[7px] rounded-full", dotColor(summary))} />
              {w.name}
            </button>
          );
        })}
        <button type="button" onClick={() => setCreating(true)} className="flex-none h-10 px-3.5 border border-dashed rounded-full border-line text-[13px] font-medium text-ink-muted cursor-pointer">
          + New
        </button>
      </div>

      <NewWishlistModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
};

export const NewWishlistModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [name, setName] = useState("");
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  const close = () => {
    setName("");
    onClose();
  };

  const save = () => {
    if (!name.trim() || !user) return;
    dispatch(createWishlist(user, name.trim()));
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New wishlist"
      description="Choose a name for your wishlist."
      footer={
        <>
          <button type="button" className={modalButton.secondary} onClick={close}>
            Cancel
          </button>
          <button type="button" className={modalButton.primary} disabled={!name.trim()} onClick={save}>
            Create
          </button>
        </>
      }
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="e.g. Chase list"
        className="w-full h-[42px] px-3 rounded-[9px] border border-line bg-canvas text-sm text-ink placeholder:text-ink-muted outline-none focus:border-ink-muted"
      />
    </Modal>
  );
};

export default WishlistRail;
