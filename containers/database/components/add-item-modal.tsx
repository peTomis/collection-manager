import EditButton from "@/components/atoms/edit-button";
// Libraries
import { useState } from "react";
import Link from "next/link";

// Components
import Modal from "@/components/atoms/modal";
import { buttonClass } from "@/components/atoms/button";
import Segmented from "@/components/atoms/segmented";
import { useSetUnlink } from "@/components/organisms/set-unlink";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { addBinderItem, changeBinderItemQuantity } from "@/redux/slices/binders";
import { addWishlistItem } from "@/redux/slices/wishlists";
import { CardVariant, ItemType, SealedVariant, Set } from "@/types/mongodb";
import { getPrice } from "@/lib/prices";
import { binderAccepts, cardNumberLabel, isOwned, sealedTypeName, variantName as versionName } from "@/lib/items";
import { LIMITS } from "@/lib/limits";
import { Catalog, Product, displayName, priceKey } from "../use-set-catalog";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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
  [variant.language.toUpperCase(), "type" in variant ? versionName(variant.type) : null].filter(Boolean).join(" · ");

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
  const setUnlink = useSetUnlink();
  const t = useT();

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

  const lists = mode === "binder" ? binders : wishlists;
  const list = lists.find((l) => l._id === listId) ?? lists[0];
  const binder = mode === "binder" ? binders.find((b) => b._id === list?._id) : undefined;
  const existingBinderItem = binder?.items.find((i) => i.historicPrice?._id === historicPrice?._id);
  // Set binders only take cards of their set: adding anything else asks to remove the set first
  const outsideSet = !!binder && !!product && !existingBinderItem && !binderAccepts(binder, product.kind, product.item);
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
        // Fills a missing slot, or adds to what the user has
        const newQuantity = isOwned(existingBinderItem) ? Math.min(existingBinderItem.quantity + qty, LIMITS.QUANTITY) : qty;
        dispatch(changeBinderItemQuantity(user, { ...existingBinderItem, quantity: newQuantity, owned: true, item: existingBinderItem.item._id, historicPrice: existingBinderItem.historicPrice._id }));
      } else {
        if (!binder) return;
        // Closes once added, so a set binder's prompt stays in this modal until then
        setUnlink.guard(binder, product.kind, product.item, () => {
          dispatch(addBinderItem(user, { ...item, quantity: qty, binder: binder._id }, details));
          close();
        });
        return;
      }
    } else {
      dispatch(addWishlistItem(user, { ...item, wishlist: list._id, target: parsedTarget === undefined ? undefined : Math.round(parsedTarget * 100) / 100 }, details));
    }
    close();
  };

  const sub = product ? (product.kind === ItemType.CARD ? `${set.name} · ${cardNumberLabel(product.item.number)}` : `${set.name} · ${sealedTypeName(product.item.type ?? t.common.sealed)}`) : undefined;

  return (
    <Modal
      open={!!product}
      onClose={close}
      title={product ? displayName(product) : t.database.addItem}
      description={sub}
      footer={
        list ? (
          <>
            <button type="button" className={buttonClass("secondary")} onClick={close}>
              {t.common.cancel}
            </button>
            <EditButton type="button" className={buttonClass("primary")} disabled={!valid} onClick={confirm}>
              {mode === "binder" ? (existingBinderItem && isOwned(existingBinderItem) ? t.database.addAnother : t.database.addToBinder) : t.database.addToWishlist}
            </EditButton>
          </>
        ) : (
          <Link href={mode === "binder" ? "/binders" : "/wishlists"} className={cn(buttonClass("primary"), "inline-flex items-center")}>
            {t.database.createList(mode)}
          </Link>
        )
      }
    >
      <Segmented
        className="bg-canvas"
        options={[
          { value: "binder", label: t.common.kind.binder },
          { value: "wishlist", label: t.common.kind.wishlist },
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
            {t.common.version}
          </label>
          <select id="add-variant" value={variantIndex} onChange={(e) => setVariantIndex(Number(e.target.value))} className={cn(inputClass, "cursor-pointer")}>
            {variants.map((v, i) => {
              const price = priceOf(v);
              return (
                <option key={i} value={i}>
                  {variantName(v)} — {price ? eur(getPrice(price)) : t.database.noPriceData}
                </option>
              );
            })}
          </select>
          {variant && !historicPrice && <p className="mt-1.5 text-xs text-loss">{t.database.versionNoPrice}</p>}
        </div>

        {list ? (
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
            <div>
              <label className={labelClass} htmlFor="add-list">
                {t.common.kind[mode]}
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
                  {t.common.quantity}
                </label>
                <input id="add-quantity" type="number" min={1} max={LIMITS.QUANTITY} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={cn(inputClass, "font-geist-mono")} />
              </div>
            ) : (
              <div>
                <label className={labelClass} htmlFor="add-target">
                  {t.common.targetEur}
                </label>
                <input id="add-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={t.database.optional} className={cn(inputClass, "font-geist-mono")} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t.database.noListYet(mode)}</p>
        )}

        {existingBinderItem && (
          <p className="-mt-1 text-xs text-ink-muted">
            {isOwned(existingBinderItem)
              ? t.database.alreadyHave(existingBinderItem.quantity, list?.name)
              : t.database.missingIn(list?.name)}
          </p>
        )}
        {outsideSet && <p className="-mt-1 text-xs text-ink-muted">{t.database.setBinderOnAdd(list?.name)}</p>}
        {onWishlist && <p className="-mt-1 text-xs text-ink-muted">{t.database.alreadyOn(list?.name)}</p>}
      </div>
      {setUnlink.modal}
    </Modal>
  );
};

export default AddItemModal;
