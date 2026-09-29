// Libraries
import { useState } from "react";

// Components
import Modal, { modalButton } from "@/components/atoms/modal";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { renameBinder } from "@/redux/slices/binders";
import { renameWishlist } from "@/redux/slices/wishlists";
import { BinderWithItems, WishlistWithItems } from "@/types/mongodb";
import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";

type ListNameProps = { kind: "binder"; list: BinderWithItems } | { kind: "wishlist"; list: WishlistWithItems };

const inputClass = "w-full h-12 lg:h-[42px] px-3 rounded-[10px] lg:rounded-[9px] border border-line bg-canvas text-base lg:text-sm text-ink placeholder:text-ink-muted outline-none focus:border-ink-muted";

// The title of a binder or wishlist: click it to rename the list (and its linked list too, if asked) in a modal, a bottom sheet on mobile
const ListName = ({ kind, list }: ListNameProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [both, setBoth] = useState(false);

  const { binders } = useSelector((state) => state.binders);
  const { wishlists } = useSelector((state) => state.wishlists);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  const linked = kind === "binder" ? wishlists.find((w) => w._id === list.wishlist) : binders.find((b) => b._id === list.binder);
  const other = kind === "binder" ? "wishlist" : "binder";
  const trimmed = name.trim();

  const start = () => {
    setName(list.name);
    // Lists that share a name usually should keep sharing it
    setBoth(!!linked && linked.name === list.name);
    setEditing(true);
  };

  const save = () => {
    if (!trimmed || !user) return;
    if (trimmed !== list.name) dispatch(kind === "binder" ? renameBinder(user, list._id, trimmed) : renameWishlist(user, list._id, trimmed));
    if (both && linked && trimmed !== linked.name) dispatch(kind === "binder" ? renameWishlist(user, linked._id, trimmed) : renameBinder(user, linked._id, trimmed));
    setEditing(false);
  };

  const label = kind === "binder" ? "Binder" : "Wishlist";

  return (
    <>
      <h1
        className="font-display font-semibold text-[30px] lg:text-[40px] leading-[1.05] tracking-[-0.03em] truncate cursor-pointer rounded-md hover:bg-chip/60"
        title={`${list.name} · click to rename`}
        onClick={start}
      >
        {list.name}
      </h1>

      <Modal
        sheet
        open={editing}
        onClose={() => setEditing(false)}
        title={`Rename ${kind}`}
        footer={
          <>
            <button type="button" className={modalButton.secondary} onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="button" className={modalButton.primary} disabled={!trimmed} onClick={save}>
              Save
            </button>
          </>
        }
      >
        <label className="block mb-1.5 text-xs font-medium text-ink-muted" htmlFor="list-name">
          {label} name
        </label>
        <input
          id="list-name"
          autoFocus
          value={name}
          maxLength={LIMITS.NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className={inputClass}
        />
        {linked && (
          <button type="button" onClick={() => setBoth((b) => !b)} className="flex items-center gap-2.5 mt-4 min-h-11 lg:min-h-0 text-left text-sm lg:text-[13px] cursor-pointer">
            <span className={cn("grid flex-none w-5 h-5 lg:w-[18px] lg:h-[18px] rounded-[5px] border-[1.5px] border-ink place-items-center text-paper text-xs font-semibold", both && "bg-ink")}>
              {both && "✓"}
            </span>
            <span>
              Also rename the linked {other} <span className="text-ink-muted">({linked.name})</span>
            </span>
          </button>
        )}
      </Modal>
    </>
  );
};

export default ListName;
