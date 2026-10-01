import EditButton from "@/components/atoms/edit-button";
// Libraries
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Components
import Modal, { modalButton } from "@/components/atoms/modal";
import CardArt from "@/components/atoms/card-art";
import SealedArt from "@/components/atoms/sealed-art";
import ItemDetail from "@/components/organisms/item-detail";
import TargetSuggestions from "@/components/atoms/target-suggestions";
import { useSetUnlink } from "@/components/organisms/set-unlink";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { acquireWishlistItem, deleteWishlistItem, setWishlistItemTarget } from "@/redux/slices/wishlists";
import { WishlistItem, WishlistWithItems } from "@/types/mongodb";
import { cardNumber, isSealed, itemPrice, languageLabel, sealedPath, summarizeWishlist, targetHit, variantLabel, binderAccepts } from "@/lib/items";
import { useSetsImages } from "@/lib/tcgdex";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Row {
  item: WishlistItem;
  set: string;
  details: string;
  price: number;
  hit: boolean;
  // TCGdex image base URL, cards only
  image?: string;
}

const stripes = "bg-[repeating-linear-gradient(135deg,var(--cm-stripe-a)_0_6px,var(--cm-stripe-b)_6px_12px)]";
const gainSoft = "bg-[color-mix(in_oklch,var(--cm-gain)_12%,transparent)]";

interface WishlistItemsProps {
  wishlist: WishlistWithItems;
  // An item to show right away, e.g. picked in the top bar alerts
  openItem?: string;
  onOpened?: () => void;
}

const WishlistItems = ({ wishlist, openItem, onOpened }: WishlistItemsProps) => {
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [acquiring, setAcquiring] = useState<WishlistItem | null>(null);
  const [viewing, setViewing] = useState<WishlistItem | null>(null);

  useEffect(() => {
    if (!openItem) return;
    const item = wishlist.items.find((i) => i._id === openItem);
    if (!item) return;
    setViewing(item);
    onOpened?.();
  }, [openItem, wishlist]);

  const { sets } = useSelector((state) => state.sets);
  const { binders } = useSelector((state) => state.binders);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();
  const summary = summarizeWishlist(wishlist);

  // Got it: straight into the linked binder when it can take the item, otherwise ask which binder
  const linkedBinder = binders.find((b) => b._id === wishlist.binder);
  const acquire = (item: WishlistItem) => {
    if (user && linkedBinder && binderAccepts(linkedBinder, item.type, item.item)) dispatch(acquireWishlistItem(user, item, linkedBinder));
    else setAcquiring(item);
  };
  const images = useSetsImages(wishlist.items.filter((i) => !isSealed(i)).map((i) => sets.find((s) => s._id === i.item?.set)?.tcgdex ?? ""));

  const rows = useMemo(() => {
    // Sets come sorted by release date, so their index orders items chronologically
    const setIndex = new Map(sets.map((s, i) => [s._id, i]));
    const setById = new Map(sets.map((s) => [s._id, s]));

    const all: Row[] = wishlist.items.map((item) => {
      const set = setById.get(item.item?.set);
      const number = cardNumber(item);
      return {
        item,
        set: [set?.name, isSealed(item) ? "Sealed" : number !== undefined && (set?.cards ? `${number}/${set.cards}` : `#${number}`)].filter(Boolean).join(" · "),
        details: [variantLabel(item), languageLabel(item)].filter(Boolean).join(" · "),
        price: itemPrice(item),
        hit: targetHit(item),
        image: number !== undefined && set?.tcgdex ? images.get(set.tcgdex)?.get(number) : undefined,
      };
    });

    // Target hits first, then in set order
    return all.sort(
      (a, b) =>
        Number(b.hit) - Number(a.hit) ||
        Number(isSealed(a.item)) - Number(isSealed(b.item)) ||
        (setIndex.get(a.item.item?.set) ?? 0) - (setIndex.get(b.item.item?.set) ?? 0) ||
        (cardNumber(a.item) ?? 0) - (cardNumber(b.item) ?? 0)
    );
  }, [wishlist, sets, images]);

  return (
    <div className="flex flex-col lg:flex-1 lg:min-h-0">
      {summary.hits.length > 0 && (
        <div className={cn("flex flex-none items-center gap-2.5 lg:gap-3 mt-2.5 lg:mt-6 px-3.5 lg:px-4 py-3 lg:py-3.5 rounded-[10px] text-gain text-[13px] lg:text-sm font-medium", gainSoft)}>
          <span className="flex-none w-2 h-2 rotate-45 lg:w-[9px] lg:h-[9px] bg-gain" />
          <span>
            {summary.hits.length === 1 ? "1 item is" : `${summary.hits.length} items are`} at or below your target price: {summary.hits.map((i) => i.item?.name).join(", ")}
          </span>
        </div>
      )}

      <div className={cn("pt-3 pb-5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pb-10", summary.hits.length ? "lg:pt-5" : "lg:mt-6 lg:pt-6 lg:border-t border-line")}>
        {wishlist.items.length === 0 ? (
          <div className="py-16 text-sm text-center border border-dashed rounded-xl border-line text-ink-muted">
            This wishlist is empty.{" "}
            <Link href="/database" className="font-medium underline text-ink">
              Add cards from the database
            </Link>
          </div>
        ) : (
          <div className="grid gap-2.5 lg:gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <WishlistCard key={r.item._id} row={r} onView={() => setViewing(r.item)} onEdit={() => setEditing(r.item)} onAcquire={() => acquire(r.item)} />
            ))}
          </div>
        )}
      </div>

      <ItemDetail target={viewing ? { context: "wishlist", item: viewing } : null} onClose={() => setViewing(null)} />
      <EditTargetModal item={editing} onClose={() => setEditing(null)} />
      <GotItModal item={acquiring} onClose={() => setAcquiring(null)} />
    </div>
  );
};

const WishlistCard = ({ row: r, onView, onEdit, onAcquire }: { row: Row; onView: () => void; onEdit: () => void; onAcquire: () => void }) => {
  const target = r.item.target;
  const gap = target !== undefined ? (r.hit ? `${eur(target - r.price)} below target` : `${eur(r.price - target)} above target`) : "No target set";
  const gapClass = cn("font-geist-mono font-medium text-xs", r.hit ? "text-gain" : "text-ink-muted");
  const acquireClass = cn("rounded-lg font-medium cursor-pointer", r.hit ? "bg-ink text-paper" : "bg-chip text-ink hover:bg-line");

  return (
    <div
      className={cn(
        "grid grid-cols-[64px_minmax(0,1fr)] lg:grid-cols-[96px_minmax(0,1fr)] gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl border",
        // Target hit: a faint green wash over the card
        r.hit
          ? "border-gain bg-[color-mix(in_oklch,var(--cm-gain)_10%,rgb(var(--cm-paper)))] dark:bg-[color-mix(in_oklch,var(--cm-gain)_3%,rgb(var(--cm-paper)))] shadow-[0_0_0_3px_color-mix(in_oklch,var(--cm-gain)_12%,transparent)]"
          : "border-line bg-paper"
      )}
    >
      <button
        type="button"
        aria-label={`View ${r.item.item?.name ?? "item"}`}
        onClick={onView}
        className={cn("relative aspect-[63/88] rounded-[5px] lg:rounded-md grid place-items-center self-start overflow-hidden cursor-pointer", stripes)}
      >
        <span className="hidden lg:block font-geist-mono text-[10px] text-ink-muted">{isSealed(r.item) ? "product shot" : "card art"}</span>
        {r.image && <CardArt image={r.image} alt={r.item.item?.name ?? ""} />}
        {sealedPath(r.item) && <SealedArt path={sealedPath(r.item)!} alt={r.item.item?.name ?? ""} />}
      </button>

      {/* Mobile */}
      <div className="min-w-0 lg:hidden">
        <div className="flex justify-between gap-2 text-[15px] font-medium">
          <span className="truncate">{r.item.item?.name}</span>
          <span className="flex-none font-geist-mono">{eur(r.price)}</span>
        </div>
        <div className="flex justify-between gap-2 mt-0.5 text-xs text-ink-muted">
          <span className="truncate">{r.set}</span>
          {target !== undefined && <span className="flex-none font-geist-mono">→ {eur(target)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <span className={gapClass}>{gap}</span>
          <div className="flex flex-none gap-1.5">
            <EditButton type="button" onClick={onEdit} className="h-9 px-2.5 border border-line rounded-lg text-xs font-medium cursor-pointer">
              Edit
            </EditButton>
            <EditButton type="button" onClick={onAcquire} className={cn(acquireClass, "h-9 px-3 text-xs")}>
              Got it
            </EditButton>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="flex-col hidden min-w-0 lg:flex">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={onView} className="text-base font-medium text-left cursor-pointer hover:underline">
            {r.item.item?.name}
          </button>
          {r.hit && <span className="flex-none font-geist-mono font-medium text-[11px] px-[7px] py-[3px] rounded bg-gain text-paper">TARGET HIT</span>}
        </div>
        <div className="text-[13px] text-ink-muted mt-[3px] truncate">{r.set}</div>
        <div className="text-xs text-ink-muted mt-0.5 truncate">{r.details}</div>
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <div>
            <div className="text-[11px] text-ink-muted">Price</div>
            <div className="font-geist-mono font-medium text-base mt-0.5">{eur(r.price)}</div>
          </div>
          <div>
            <div className="text-[11px] text-ink-muted">Target</div>
            <div className="font-geist-mono font-medium text-base mt-0.5 text-ink-muted">{target !== undefined ? eur(target) : "—"}</div>
          </div>
        </div>
        <div className={cn(gapClass, "mt-2")}>{gap}</div>
        <div className="flex justify-end gap-1.5 mt-auto pt-3.5">
          <EditButton type="button" onClick={onEdit} className="h-[34px] px-2.5 border border-line rounded-lg bg-transparent text-[13px] font-medium cursor-pointer hover:bg-chip">
            Edit
          </EditButton>
          <EditButton type="button" onClick={onAcquire} className={cn(acquireClass, "flex-1 max-w-[100px] h-[34px] text-[13px]")}>
            Got it
          </EditButton>
        </div>
      </div>
    </div>
  );
};

const inputClass = "w-full h-[42px] px-3 rounded-[9px] border border-line bg-canvas text-sm text-ink placeholder:text-ink-muted outline-none focus:border-ink-muted";

// Set or clear the target price, or remove the item from the wishlist
const EditTargetModal = ({ item, onClose }: { item: WishlistItem | null; onClose: () => void }) => {
  const [value, setValue] = useState("");
  const [shownFor, setShownFor] = useState<string | null>(null);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  // Prefill with the current target each time the modal opens for an item
  if (item && item._id !== shownFor) {
    setShownFor(item._id);
    setValue(item.target !== undefined ? String(item.target) : "");
  }

  const close = () => {
    setShownFor(null);
    onClose();
  };

  const parsed = value.trim() === "" ? undefined : Number(value.replace(",", "."));
  const valid = parsed === undefined || (Number.isFinite(parsed) && parsed >= 0);

  const save = () => {
    if (!item || !user || !valid) return;
    dispatch(setWishlistItemTarget(user, item, parsed === undefined ? undefined : Math.round(parsed * 100) / 100));
    close();
  };

  const remove = () => {
    if (!item || !user) return;
    dispatch(deleteWishlistItem(user, item.wishlist, item._id));
    close();
  };

  return (
    <Modal
      open={!!item}
      onClose={close}
      title={item?.item?.name ?? "Edit item"}
      description={item ? `Current price ${eur(itemPrice(item))}. You'll see an alert when it drops to your target.` : undefined}
      footer={
        <>
          <EditButton type="button" className={cn(modalButton.secondary, "mr-auto text-loss")} onClick={remove}>
            Remove
          </EditButton>
          <button type="button" className={modalButton.secondary} onClick={close}>
            Cancel
          </button>
          <EditButton type="button" className={modalButton.primary} disabled={!valid} onClick={save}>
            Save
          </EditButton>
        </>
      }
    >
      <label className="block mb-1.5 text-xs font-medium text-ink-muted" htmlFor="wishlist-target">
        Target price (€)
      </label>
      <input
        id="wishlist-target"
        autoFocus
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="No target"
        className={cn(inputClass, "font-geist-mono")}
      />
      <TargetSuggestions className="mt-3" historicPrice={item?.historicPrice} value={value} onPick={(v) => setValue(String(v))} />
    </Modal>
  );
};

// Move the item into a binder: add it there (or bump its quantity) and remove it from the wishlist
const GotItModal = ({ item, onClose }: { item: WishlistItem | null; onClose: () => void }) => {
  const [binderId, setBinderId] = useState("");
  const { binders } = useSelector((state) => state.binders);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();
  const setUnlink = useSetUnlink();

  // The linked binder comes first. A copy: the store's array is frozen, and sort works in place
  const choices = [...binders].sort((a, b) => Number(b.wishlist === item?.wishlist) - Number(a.wishlist === item?.wishlist));
  const selected = choices.find((b) => b._id === binderId) ?? choices[0];
  const outsideSet = !!item && !!selected && !binderAccepts(selected, item.type, item.item);

  const close = () => {
    setBinderId("");
    onClose();
  };

  const confirm = () => {
    if (!item || !user || !selected) return;
    // Set binders only take cards of their set: anything else asks to remove the set first
    setUnlink.guard(selected, item.type, item.item, () => {
      dispatch(acquireWishlistItem(user, item, selected));
      close();
    });
  };

  return (
    <Modal
      open={!!item}
      onClose={close}
      title="Got it"
      description={
        selected ? `Move ${item?.item?.name ?? "this item"} into a binder. It will be removed from this wishlist.` : "Create a binder first to move this item into your collection."
      }
      footer={
        selected ? (
          <>
            <button type="button" className={modalButton.secondary} onClick={close}>
              Cancel
            </button>
            <EditButton type="button" className={modalButton.primary} onClick={confirm}>
              Move to binder
            </EditButton>
          </>
        ) : (
          <Link href="/binders" className={cn(modalButton.primary, "inline-flex items-center")}>
            Go to binders
          </Link>
        )
      }
    >
      {selected && (
        <>
          <label className="block mb-1.5 text-xs font-medium text-ink-muted" htmlFor="wishlist-binder">
            Binder
          </label>
          <select id="wishlist-binder" value={selected._id} onChange={(e) => setBinderId(e.target.value)} className={cn(inputClass, "cursor-pointer")}>
            {choices.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
          {outsideSet && <p className="mt-1.5 text-xs text-ink-muted">{selected.name} is a set binder. Moving this removes its set link.</p>}
        </>
      )}
      {setUnlink.modal}
    </Modal>
  );
};

export default WishlistItems;
