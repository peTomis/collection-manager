// Libraries
import { useState } from "react";
import { useRouter } from "next/router";

// Components
import Modal, { modalButton } from "@/components/atoms/modal";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { createBinder, deleteBinder, setBinder, unlinkBinder } from "@/redux/slices/binders";
import { createWishlist, deleteWishlist, setWishlist } from "@/redux/slices/wishlists";
import { BinderItemToCreate, BinderWithItems, ItemType, WishlistItemToCreate, WishlistWithItems } from "@/types/mongodb";
import { NewListItem } from "@/lib/demo-collection";
import { isOwned, itemPrice } from "@/lib/items";
import { LIMITS } from "@/lib/limits";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

type Source = { kind: "binder"; list: BinderWithItems } | { kind: "wishlist"; list: WishlistWithItems };

const chipClass = "inline-flex items-center max-w-full mt-2.5 h-7 rounded-full border border-line bg-paper text-xs font-medium";
const inputClass = "w-full h-[42px] px-3 rounded-[9px] border border-line bg-canvas text-sm text-ink placeholder:text-ink-muted outline-none focus:border-ink-muted";

// Two opposite arrows (the lists sync both ways), struck through by a slash while there is no linked list
const SyncIcon = ({ unlinked }: { unlinked?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-none">
    <path d="M2.5 5.5h10M10 3l2.5 2.5L10 8" />
    <path d="M13.5 10.5h-10M6 8l-2.5 2.5L6 13" />
    {unlinked && <path d="M3 14.5 13 1.5" />}
  </svg>
);

// The list linked to a binder or wishlist (they keep their missing items in step): opens, unlinks or deletes it.
// Without one, creates it: a wishlist of the binder's missing items, or a binder tracking the wishlist's items as missing.
const LinkedList = (source: Source) => {
  const { binders } = useSelector((state) => state.binders);
  const { wishlists } = useSelector((state) => state.wishlists);
  const other = source.kind === "binder" ? "wishlist" : "binder";
  const linked = source.kind === "binder" ? wishlists.find((w) => w._id === source.list.wishlist) : binders.find((b) => b._id === source.list.binder);

  return linked ? <Linked source={source} other={other} name={linked.name} id={linked._id} /> : <CreateLinked source={source} other={other} />;
};

const Linked = ({ source, other, name, id }: { source: Source; other: "binder" | "wishlist"; name: string; id: string }) => {
  const [managing, setManaging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { binders } = useSelector((state) => state.binders);
  const { wishlists } = useSelector((state) => state.wishlists);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();
  const router = useRouter();

  const binderId = source.kind === "binder" ? source.list._id : id;

  const open = () => {
    if (other === "wishlist") {
      const wishlist = wishlists.find((w) => w._id === id);
      if (wishlist) dispatch(setWishlist(wishlist));
      router.push("/wishlists");
    } else {
      const binder = binders.find((b) => b._id === id);
      if (binder) dispatch(setBinder(binder));
      router.push("/binders");
    }
  };

  const close = () => {
    setManaging(false);
    setDeleting(false);
  };

  return (
    <>
      <div className={chipClass}>
        <button type="button" onClick={open} title={`Missing items stay in sync with ${name}`} className="flex items-center min-w-0 gap-1.5 h-full pl-2.5 pr-2 rounded-l-full cursor-pointer hover:bg-chip">
          <span className="text-ink-muted">
            <SyncIcon />
          </span>
          <span className="text-ink-muted">{other === "wishlist" ? "Wishlist" : "Binder"}</span>
          <span className="truncate">{name}</span>
        </button>
        <button
          type="button"
          aria-label={`Manage the linked ${other}`}
          onClick={() => setManaging(true)}
          className="grid h-full pl-1.5 pr-2.5 border-l rounded-r-full cursor-pointer place-items-center border-line text-ink-muted hover:text-ink hover:bg-chip"
        >
          ⋯
        </button>
      </div>

      <Modal
        open={managing}
        onClose={close}
        title={deleting ? `Delete ${name}?` : `Linked ${other}`}
        description={
          deleting
            ? `${name} and this ${source.kind} are deleted, with everything in them. This can't be undone.`
            : `${name} holds the missing items of this ${source.kind} and stays in sync with it. Unlink it to keep both lists as they are, without syncing.`
        }
        footer={
          deleting ? (
            <>
              <button type="button" className={modalButton.secondary} onClick={() => setDeleting(false)}>
                Back
              </button>
              <button
                type="button"
                className={modalButton.danger}
                onClick={() => {
                  if (user) dispatch(other === "wishlist" ? deleteWishlist(user, id) : deleteBinder(user, id));
                  close();
                }}
              >
                Delete both
              </button>
            </>
          ) : (
            <>
              <button type="button" className={cn(modalButton.secondary, "mr-auto text-loss")} onClick={() => setDeleting(true)}>
                Delete {other}
              </button>
              <button type="button" className={modalButton.secondary} onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className={modalButton.primary}
                onClick={() => {
                  if (user) dispatch(unlinkBinder(user, binderId));
                  close();
                }}
              >
                Unlink
              </button>
            </>
          )
        }
      />
    </>
  );
};

const CreateLinked = ({ source, other }: { source: Source; other: "binder" | "wishlist" }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(source.list.name);
  const [targetPercent, setTargetPercent] = useState("10");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  // What the new list gets: the binder's missing items, or every item of the wishlist
  const items = source.kind === "binder" ? source.list.items.filter((i) => !isOwned(i) && i.historicPrice) : source.list.items.filter((i) => i.historicPrice);
  const total = items.reduce((acc, i) => acc + itemPrice(i), 0);
  const percent = Number(targetPercent.replace(",", "."));
  const validPercent = targetPercent.trim() === "" || (Number.isFinite(percent) && percent >= 0 && percent < 100);
  const valid = !!name.trim() && validPercent && items.length <= LIMITS.ITEMS_PER_LIST;

  // A binder of cards from a single set is a set binder, so it tracks that set's completion
  const cardSets = new globalThis.Set(items.map((i) => (i.type === ItemType.CARD ? i.item?.set : "")));
  const setBinder = items.length > 0 && cardSets.size === 1 && !cardSets.has("") ? [...cardSets][0] : undefined;

  const start = () => {
    setName(source.list.name);
    setTargetPercent("10");
    setFailed(false);
    setOpen(true);
  };

  const create = async () => {
    if (!valid || !user || saving) return;
    setSaving(true);
    setFailed(false);
    const base = (i: (typeof items)[number]) => ({ name: i.name, type: i.type, item: i.item._id, historicPrice: i.historicPrice._id });
    const details = (i: (typeof items)[number]) => ({ item: i.item, historicPrice: i.historicPrice });
    let id: string | null;
    if (source.kind === "binder") {
      const off = targetPercent.trim() === "" ? 0 : percent;
      const target = (i: (typeof items)[number]) => (off ? Math.round(itemPrice(i) * (100 - off)) / 100 : undefined);
      const wishlistItems: NewListItem<WishlistItemToCreate>[] = items.map((i) => ({ item: { ...base(i), target: target(i) }, details: details(i) }));
      id = await dispatch(createWishlist(user, name.trim(), wishlistItems, source.list._id));
    } else {
      const binderItems: NewListItem<BinderItemToCreate>[] = items.map((i) => ({ item: { ...base(i), quantity: 1, owned: false }, details: details(i) }));
      id = await dispatch(createBinder(user, name.trim(), setBinder, binderItems, source.list._id));
    }
    setSaving(false);
    if (!id) return setFailed(true);
    setOpen(false);
  };

  const count = items.length === 1 ? "1 item" : `${items.length} items`;
  const description =
    source.kind === "binder"
      ? items.length
        ? `It starts with this binder's ${count} missing, about ${eur(total)}, and stays in sync: mark one owned and it leaves the wishlist.`
        : "Nothing is missing yet: it fills up as items are marked missing here, and stays in sync."
      : items.length
        ? `It tracks this wishlist's ${count} as missing and stays in sync: mark one owned there and it leaves this wishlist.`
        : "It starts empty and stays in sync: items added here become missing slots there.";

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={cn(chipClass, "gap-1.5 px-2.5 border-dashed text-ink-muted cursor-pointer hover:text-ink hover:border-ink-muted")}
      >
        <SyncIcon unlinked />
        Create linked {other}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`New linked ${other}`}
        description={description}
        footer={
          <>
            <button type="button" className={modalButton.secondary} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className={modalButton.primary} disabled={!valid || saving} onClick={create}>
              {saving ? "Creating…" : `Create ${other}`}
            </button>
          </>
        }
      >
        <label className="block mb-1.5 text-xs font-medium text-ink-muted" htmlFor="linked-name">
          Name
        </label>
        <input id="linked-name" autoFocus value={name} maxLength={LIMITS.NAME_LENGTH} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} className={inputClass} />
        {source.kind === "binder" && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4 text-[13px] text-ink-muted">
            <span className="text-xs font-medium">Targets</span>
            <span className="flex items-center h-[34px] px-3 border rounded-lg border-line bg-canvas font-geist-mono font-medium text-ink focus-within:border-ink-muted">
              −
              <input aria-label="Target discount" inputMode="decimal" value={targetPercent} onChange={(e) => setTargetPercent(e.target.value)} className="w-6 text-right bg-transparent outline-none" />%
            </span>
            below current price
          </div>
        )}
        {failed && <p className="mt-3 text-xs text-loss">Couldn&apos;t create the {other}. Try again in a moment.</p>}
      </Modal>
    </>
  );
};

export default LinkedList;
