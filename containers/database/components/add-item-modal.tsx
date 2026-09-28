// Libraries
import { useState } from "react";
import Link from "next/link";

// Components
import Modal, { modalButton } from "@/components/atoms/modal";
import Segmented from "@/components/atoms/segmented";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { addBinderItem, changeBinderItemQuantity } from "@/redux/slices/binders";
import { addWishlistItem } from "@/redux/slices/wishlists";
import { CardVariant, ItemType, SealedVariant, Set } from "@/types/mongodb";
import { getPrice } from "@/utils/utils";
import { VARIANT_LABELS, binderAccepts } from "@/lib/items";
import { LIMITS } from "@/lib/limits";
import { Catalog, Product, displayName, priceKey } from "../use-set-catalog";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Destination = "binder" | "wishlist";

interface AddItemModalProps {
  set: Set;
  catalog: Catalog | null;
  product: Product | null;
  destination: Destination;
  // Version to start from, e.g. the one picked in the item detail
  initialVariant?: number;
  onClose: () => void;
}

const inputClass = "w-full h-[42px] px-3 rounded-[9px] border border-line bg-canvas text-sm text-ink placeholder:text-ink-muted outline-none focus:border-ink-muted";
const labelClass = "block mb-1.5 text-xs font-medium text-ink-muted";

const variantName = (variant: CardVariant | SealedVariant) =>
  [variant.language.toUpperCase(), "type" in variant ? VARIANT_LABELS[variant.type] : null].filter(Boolean).join(" · ");

// Add a card or sealed product to a binder (with a quantity) or to a wishlist (with an optional target price)
const AddItemModal = ({ set, catalog, product, destination, initialVariant = 0, onClose }: AddItemModalProps) => {
  const [shownFor, setShownFor] = useState<string | null>(null);
  const [mode, setMode] = useState<Destination>(destination);
  const [variantIndex, setVariantIndex] = useState(0);
  const [listId, setListId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [target, setTarget] = useState("");

  const { binders } = useSelector((state) => state.binders);
  const { wishlists } = useSelector((state) => state.wishlists);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  // Start from the button the user pressed each time the modal opens for a product
  if (product && product.item._id !== shownFor) {
    setShownFor(product.item._id);
    setMode(destination);
    setVariantIndex(initialVariant);
    setQuantity("1");
    setTarget("");
  }

  const close = () => {
    setShownFor(null);
    onClose();
  };

  const variants: (CardVariant | SealedVariant)[] = product?.item.variants ?? [];
  const variant = variants[variantIndex];
  const priceOf = (v: CardVariant | SealedVariant) => (product ? catalog?.prices.get(priceKey(product.item._id, v.language, "type" in v ? v.type : undefined)) : undefined);
  const historicPrice = variant && priceOf(variant);

  // Set binders only take cards of their set
  const accepting = product ? binders.filter((b) => binderAccepts(b, product.kind, product.item)) : binders;
  const lists = mode === "binder" ? accepting : wishlists;
  const list = lists.find((l) => l._id === listId) ?? lists[0];
  const existingBinderItem = mode === "binder" ? binders.find((b) => b._id === list?._id)?.items.find((i) => i.historicPrice?._id === historicPrice?._id) : undefined;
  const onWishlist = mode === "wishlist" && !!wishlists.find((w) => w._id === list?._id)?.items.some((i) => i.historicPrice?._id === historicPrice?._id);

  const qty = Math.floor(Number(quantity));
  const parsedTarget = target.trim() === "" ? undefined : Number(target.replace(",", "."));
  const valid =
    !!product && !!historicPrice && !!list && !onWishlist && (mode === "binder" ? qty >= 1 && qty <= LIMITS.QUANTITY : parsedTarget === undefined || (Number.isFinite(parsedTarget) && parsedTarget >= 0));

  const confirm = () => {
    if (!valid || !product || !historicPrice || !list || !user) return;
    const item = { name: product.item.name, type: product.kind, item: product.item._id, historicPrice: historicPrice._id };
    const details = { item: product.item, historicPrice };
    if (mode === "binder") {
      if (existingBinderItem) {
        const newQuantity = Math.min(existingBinderItem.quantity + qty, LIMITS.QUANTITY);
        dispatch(changeBinderItemQuantity(user, { ...existingBinderItem, quantity: newQuantity, item: existingBinderItem.item._id, historicPrice: existingBinderItem.historicPrice._id }));
      } else {
        dispatch(addBinderItem(user, { ...item, quantity: qty, binder: list._id }, details));
      }
    } else {
      dispatch(addWishlistItem(user, { ...item, wishlist: list._id, target: parsedTarget === undefined ? undefined : Math.round(parsedTarget * 100) / 100 }, details));
    }
    close();
  };

  const sub = product ? (product.kind === ItemType.CARD ? `${set.name} · #${product.item.number}` : `${set.name} · ${product.item.type}`) : undefined;

  return (
    <Modal
      open={!!product}
      onClose={close}
      title={product ? displayName(product) : "Add item"}
      description={sub}
      footer={
        list ? (
          <>
            <button type="button" className={modalButton.secondary} onClick={close}>
              Cancel
            </button>
            <button type="button" className={modalButton.primary} disabled={!valid} onClick={confirm}>
              {mode === "binder" ? (existingBinderItem ? "Add another" : "Add to binder") : "Add to wishlist"}
            </button>
          </>
        ) : (
          <Link href={mode === "binder" ? "/binders" : "/wishlists"} className={cn(modalButton.primary, "inline-flex items-center")}>
            Create a {mode}
          </Link>
        )
      }
    >
      <Segmented
        className="bg-canvas"
        options={[
          { value: "binder", label: "Binder" },
          { value: "wishlist", label: "Wishlist" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setListId("");
        }}
      />

      <div className="flex flex-col gap-4 mt-5">
        <div>
          <label className={labelClass} htmlFor="add-variant">
            Version
          </label>
          <select id="add-variant" value={variantIndex} onChange={(e) => setVariantIndex(Number(e.target.value))} className={cn(inputClass, "cursor-pointer")}>
            {variants.map((v, i) => {
              const price = priceOf(v);
              return (
                <option key={i} value={i}>
                  {variantName(v)} — {price ? eur(getPrice(price)) : "no price data"}
                </option>
              );
            })}
          </select>
          {variant && !historicPrice && <p className="mt-1.5 text-xs text-loss">This version has no price data yet, so it can't be added.</p>}
        </div>

        {list ? (
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
            <div>
              <label className={labelClass} htmlFor="add-list">
                {mode === "binder" ? "Binder" : "Wishlist"}
              </label>
              <select id="add-list" value={list._id} onChange={(e) => setListId(e.target.value)} className={cn(inputClass, "cursor-pointer")}>
                {lists.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            {mode === "binder" ? (
              <div>
                <label className={labelClass} htmlFor="add-quantity">
                  Quantity
                </label>
                <input id="add-quantity" type="number" min={1} max={LIMITS.QUANTITY} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={cn(inputClass, "font-geist-mono")} />
              </div>
            ) : (
              <div>
                <label className={labelClass} htmlFor="add-target">
                  Target (€)
                </label>
                <input id="add-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Optional" className={cn(inputClass, "font-geist-mono")} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {mode === "binder" && binders.length ? "None of your binders can take this: set binders only take cards of their own set." : `You don't have a ${mode} yet.`}
          </p>
        )}

        {existingBinderItem && (
          <p className="-mt-1 text-xs text-ink-muted">
            You already have {existingBinderItem.quantity} in {list?.name}. This adds to that quantity.
          </p>
        )}
        {onWishlist && <p className="-mt-1 text-xs text-ink-muted">This version is already on {list?.name}.</p>}
      </div>
    </Modal>
  );
};

export default AddItemModal;
