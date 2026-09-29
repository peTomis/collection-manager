// Libraries
import { useRef, useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Components
import Segmented from "@/components/atoms/segmented";
import CardArt from "@/components/atoms/card-art";
import SealedArt from "@/components/atoms/sealed-art";
import { ConfirmModal } from "@/components/atoms/modal";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { addBinderItem, changeBinderItemQuantity, deleteBinderItem } from "@/redux/slices/binders";
import { deleteWishlistItem, setWishlistItemTarget } from "@/redux/slices/wishlists";
import { BinderItem, Card, CardVariant, HistoricPrice, ItemType, Language, Sealed, SealedVariant, WishlistItem } from "@/types/mongodb";
import { Product, displayName, historicPriceKey, priceKey } from "@/containers/database/use-set-catalog";
import type { Destination } from "@/containers/database/components/add-item-modal";
import { getPastPrice, getPrice, PricePeriod } from "@/utils/utils";
import { VARIANT_LABELS, binderAccepts, isOwned } from "@/lib/items";
import { useCardInfo, useSetImages } from "@/lib/tcgdex";
import { LIMITS } from "@/lib/limits";
import { fontVariables } from "@/lib/fonts";
import { change, deltaColor, eur, pct, signedEur } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useListings, useVersionPrices } from "./use-item-detail";

// Where the detail was opened from decides its actions
export type ItemDetailTarget =
  | { context: "binder"; item: BinderItem }
  | { context: "wishlist"; item: WishlistItem }
  | { context: "database"; product: Product; prices: Map<string, HistoricPrice> };

interface ItemDetailProps {
  target: ItemDetailTarget | null;
  onClose: () => void;
  // Database only: continue in the add dialog with the version picked here
  onAdd?: (destination: Destination, variantIndex: number) => void;
}

const PERIODS: { value: PricePeriod; label: string; text: string }[] = [
  { value: "1d", label: "24h", text: "24h" },
  { value: "1w", label: "7d", text: "7d" },
  { value: "1m", label: "30d", text: "30d" },
  { value: "1y", label: "1y", text: "1y" },
];

const LANGUAGE_NAMES: Record<Language, string> = {
  [Language.ENGLISH]: "English",
  [Language.ITALIAN]: "Italian",
  [Language.JAPANESE]: "Japanese",
};

type Variant = CardVariant | SealedVariant;

const targetKey = (t: ItemDetailTarget) => (t.context === "database" ? `database|${t.product.item._id}` : `${t.context}|${t.item._id}`);

// Card or sealed product with its price history, listings and other versions.
// Desktop: a centered modal. Mobile: a bottom sheet.
const ItemDetail = ({ target, onClose, onAdd }: ItemDetailProps) => {
  const { sheet, handlers } = useSwipeToClose(onClose);
  return (
    <DialogPrimitive.Root open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(29,27,24,.4)] dark:bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={sheet}
          aria-describedby={undefined}
          className={cn(
            fontVariables,
            "fixed z-50 flex flex-col font-geist text-ink bg-paper overflow-hidden outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[22px] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "lg:inset-x-auto lg:bottom-auto lg:top-16 lg:left-1/2 lg:-translate-x-1/2 lg:w-[1000px] lg:max-w-[calc(100vw-48px)] lg:max-h-[calc(100dvh-96px)] lg:rounded-[18px]",
            "lg:shadow-[0_40px_80px_-20px_rgba(29,27,24,.5)] lg:data-[state=open]:slide-in-from-bottom-0 lg:data-[state=open]:fade-in-0 lg:data-[state=open]:zoom-in-95",
          )}
        >
          {target && <Detail key={targetKey(target)} target={target} onClose={onClose} onAdd={onAdd} swipe={handlers} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

type SwipeHandlers = Pick<React.HTMLAttributes<HTMLDivElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;

// Mobile bottom sheet: dragging its top down moves it with the finger, and a long or quick enough drag closes it
const useSwipeToClose = (onClose: () => void) => {
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y: number; t: number; dy: number; captured: boolean } | null>(null);

  const move = (dy: number, animate: boolean) => {
    const el = sheet.current;
    if (!el) return;
    el.style.transition = animate ? "transform .22s cubic-bezier(.2,.8,.2,1)" : "none";
    el.style.transform = dy ? `translateY(${dy}px)` : "";
  };

  const release = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const velocity = d.dy / Math.max(1, e.timeStamp - d.t);
    if (!cancelled && (d.dy > 120 || (d.dy > 30 && velocity > 0.5))) {
      move(sheet.current?.offsetHeight ?? window.innerHeight, true);
      setTimeout(onClose, 200);
    } else move(0, true);
  };

  const handlers: SwipeHandlers = {
    onPointerDown: (e) => {
      // The desktop modal doesn't move
      if (e.button !== 0 || window.matchMedia("(min-width: 1024px)").matches) return;
      drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, captured: false };
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      d.dy = Math.max(0, e.clientY - d.y);
      // Capture only once it is a drag, so a tap still reaches the close button
      if (!d.captured && d.dy > 4) {
        d.captured = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (d.captured) move(d.dy, false);
    },
    onPointerUp: (e) => release(e, false),
    onPointerCancel: (e) => release(e, true),
  };

  return { sheet, handlers };
};

const Detail = ({ target, onClose, onAdd, swipe }: { target: ItemDetailTarget; onClose: () => void; onAdd?: ItemDetailProps["onAdd"]; swipe: SwipeHandlers }) => {
  const kind = target.context === "database" ? target.product.kind : target.item.type;
  const item: Card | Sealed = target.context === "database" ? target.product.item : target.item.item;
  const variants: Variant[] = item.variants ?? [];
  const keyOf = (v: Variant) => priceKey(item._id, v.language, "type" in v ? v.type : undefined);

  const user = useSelector((state) => state.user.user);
  const { sets } = useSelector((state) => state.sets);
  const versions = useVersionPrices(user, kind, item, target.context === "database" ? target.prices : undefined);

  // The database lets the user pick a version (starting from the first one with a price), binders and wishlists hold one
  const [variantIndex, setVariantIndex] = useState(() =>
    target.context === "database" ? Math.max(0, variants.findIndex((v) => target.prices.has(keyOf(v)))) : 0
  );
  const [period, setPeriod] = useState<PricePeriod>("1m");

  const historicPrice: HistoricPrice | undefined =
    target.context === "database" ? (variants[variantIndex] ? versions.get(keyOf(variants[variantIndex])) : undefined) : target.item.historicPrice;
  const currentKey = historicPrice ? historicPriceKey(historicPrice) : variants[variantIndex] && keyOf(variants[variantIndex]);
  const currentVariant = variants.find((v) => keyOf(v) === currentKey);

  const set = sets.find((s) => s._id === item.set);
  const isCard = kind === ItemType.CARD;
  const number = isCard ? (item as Card).number : undefined;
  const images = useSetImages(isCard ? set?.tcgdex || undefined : undefined);
  const image = number !== undefined ? images.get(number) : undefined;
  const info = useCardInfo(isCard ? set?.tcgdex || undefined : undefined, number);
  const listings = useListings(user, kind, historicPrice);

  const name = displayName({ kind, item } as Product);
  const year = set?.releasedAt ? new Date(set.releasedAt).getFullYear() : undefined;
  const numberLabel = number !== undefined ? (set?.cards ? `${number}/${set.cards}` : `#${number}`) : undefined;
  const setLine = [set?.name, numberLabel, year].filter(Boolean).join(" · ");

  const variantName = (v: Variant) => ("type" in v ? VARIANT_LABELS[v.type] : (item as Sealed).type ?? "Sealed");
  const versionLabel = (v: Variant) => `${variantName(v)} · ${v.language.toUpperCase()}`;
  const chips = [currentVariant && variantName(currentVariant), currentVariant && LANGUAGE_NAMES[currentVariant.language], !isCard && "Sealed"].filter(Boolean) as string[];

  // Price and its move over the selected period
  const price = historicPrice ? getPrice(historicPrice) : 0;
  const past = historicPrice ? getPastPrice(historicPrice, period) : 0;
  const delta = price - past;
  const history = ((historicPrice?.[`prices${period}`] ?? []) as number[]).filter((p) => p > 0);
  const points = history.length ? [...history.slice(0, -1), price] : [];

  const facts: { k: string; v: string }[] = [
    { k: "Set", v: set?.name ?? "—" },
    ...(isCard
      ? [
          { k: "Number", v: numberLabel ?? "—" },
          ...(info.rarity ? [{ k: "Rarity", v: info.rarity }] : []),
          ...(info.illustrator ? [{ k: "Illustrator", v: info.illustrator }] : []),
        ]
      : [{ k: "Product", v: (item as Sealed).type ?? "Sealed" }]),
    ...(set?.releasedAt ? [{ k: "Released", v: new Date(set.releasedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) }] : []),
    ...(target.context === "binder" ? [{ k: "Value", v: isOwned(target.item) ? `${eur(price * target.item.quantity)} · ×${target.item.quantity}` : "Missing" }] : []),
  ];

  // Current version first, then the others in the item's order
  const versionRows = variants
    .map((v) => ({ key: keyOf(v), label: versionLabel(v), historicPrice: versions.get(keyOf(v)) }))
    .sort((a, b) => Number(b.key === currentKey) - Number(a.key === currentKey));

  const { binders } = useSelector((state) => state.binders);
  const { wishlists } = useSelector((state) => state.wishlists);
  const crumb =
    target.context === "binder"
      ? ["Binders", binders.find((b) => b._id === target.item.binder)?.name, number !== undefined && `#${number}`].filter(Boolean).join(" / ")
      : target.context === "wishlist"
        ? ["Wishlists", wishlists.find((w) => w._id === target.item.wishlist)?.name].filter(Boolean).join(" / ")
        : ["Database", set?.name].filter(Boolean).join(" / ");

  const art = (className: string) => (
    <div className={cn("relative aspect-[63/88] grid place-items-center overflow-hidden bg-[repeating-linear-gradient(135deg,var(--cm-pocket-a)_0_7px,var(--cm-pocket-b)_7px_14px)]", className)}>
      <span className="font-geist-mono text-[11px] text-ink-muted">{isCard ? "card art" : "product shot"}</span>
      {image && <CardArt image={image} alt={name} />}
      {!isCard && (item as Sealed).path && <SealedArt path={(item as Sealed).path!} alt={name} />}
    </div>
  );

  const chipList = (className: string) => (
    <div className={cn("flex flex-wrap gap-1 lg:gap-1.5", className)}>
      {chips.map((c) => (
        <span key={c} className="flex items-center h-[22px] lg:h-[26px] px-2 lg:px-2.5 rounded-full border border-line bg-paper text-[11px] lg:text-xs font-medium">
          {c}
        </span>
      ))}
    </div>
  );

  const factList = (className: string) => (
    <div className={cn("flex flex-col", className)}>
      {facts.map((f) => (
        <div key={f.k} className="flex justify-between gap-3 py-2.5 lg:py-[9px] border-t border-line text-[13px]">
          <span className="flex-none text-ink-muted">{f.k}</span>
          <span className="font-geist-mono text-right text-[13px] lg:text-xs">{f.v}</span>
        </div>
      ))}
    </div>
  );

  const priceChange = (
    <span className={cn("font-geist-mono font-medium whitespace-nowrap text-xs lg:text-sm", deltaColor(delta))}>
      {signedEur(delta)} · {pct(change(price, past))} {PERIODS.find((p) => p.value === period)!.text}
    </span>
  );

  return (
    <>
      <DialogPrimitive.Title className="sr-only">{name}</DialogPrimitive.Title>

      {/* Header: on mobile, the grab area of the sheet */}
      <div {...swipe} className="flex-none touch-none lg:touch-auto">
        <div className="flex justify-center pt-2.5 pb-1 lg:hidden">
          <span className="w-10 h-[5px] rounded-full bg-line" />
        </div>
        <div className="flex flex-none items-center gap-2 lg:gap-3 pl-4 pr-2 lg:py-4 lg:pl-7 lg:pr-5 lg:border-b border-line">
          <span className="flex-1 min-w-0 truncate text-xs lg:flex-none lg:text-[13px] text-ink-muted">{crumb}</span>
          {target.context === "binder" &&
            (isOwned(target.item) ? (
              <span className="hidden lg:flex items-center gap-1.5 h-[26px] px-2.5 rounded-full bg-[color-mix(in_oklch,var(--cm-gain)_12%,transparent)] text-gain text-xs font-medium">
                <span className="w-[7px] h-[7px] rotate-45 bg-current" />
                In binder ×{target.item.quantity}
              </span>
            ) : (
              <span className="hidden lg:flex items-center h-[26px] px-2.5 rounded-full border border-dashed border-line text-ink-muted text-xs font-medium">Missing</span>
            ))}
          <DialogPrimitive.Close
            aria-label="Close"
            className="w-11 h-11 lg:w-9 lg:h-9 lg:ml-auto grid place-items-center lg:border border-line rounded-lg text-[22px] lg:text-lg cursor-pointer hover:bg-chip"
          >
            ×
          </DialogPrimitive.Close>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden p-7 border-r lg:block border-line bg-canvas">
            {art("rounded-[10px] shadow-[0_12px_30px_-12px_rgba(29,27,24,.35)]")}
            {chipList("mt-[18px]")}
            {factList("mt-[22px]")}
          </aside>

          <div className="min-w-0 px-4 pt-1 lg:px-7 lg:pt-[26px]">
            {/* Mobile summary */}
            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3.5 lg:hidden">
              {art("rounded-[7px] shadow-[0_8px_20px_-10px_rgba(29,27,24,.35)]")}
              <div className="min-w-0">
                <div className="text-xs text-ink-muted">{setLine}</div>
                <div className="font-display font-semibold text-2xl leading-[1.1] tracking-[-0.02em] mt-1">{name}</div>
                {chipList("mt-2")}
                <div className="font-display font-medium text-[26px] leading-none tracking-[-0.02em] mt-3">{historicPrice ? eur(price) : "—"}</div>
                {historicPrice && <div className="mt-1">{priceChange}</div>}
              </div>
            </div>

            {/* Desktop summary */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                <span className={cn("w-2 h-2 rounded-full", isCard ? "bg-gold" : "bg-iris")} />
                {setLine}
              </div>
              <h3 className="mt-1.5 font-display font-semibold text-4xl leading-[1.05] tracking-[-0.03em]">{name}</h3>
              <div className="flex items-end justify-between gap-5 mt-[18px]">
                <div>
                  <div className="text-xs font-medium text-ink-muted">Current price</div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="font-display font-medium text-[40px] leading-none tracking-[-0.03em]">{historicPrice ? eur(price) : "—"}</span>
                    {historicPrice && priceChange}
                  </div>
                </div>
                <Segmented mono options={PERIODS} value={period} onChange={setPeriod} />
              </div>
            </div>

            <PriceChart points={points} gain={delta >= 0} />
            <Segmented className="grid grid-cols-4 mt-2.5 lg:hidden" mono options={PERIODS} value={period} onChange={setPeriod} />

            <div className="grid gap-4 lg:gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] mt-[18px] lg:mt-[22px] lg:pt-5 lg:border-t border-line">
              <Listings prices={listings} />
              <div>
                <span className="font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase text-ink-muted">Other versions</span>
                <div className="mt-2">
                  {versionRows.map((v) => {
                    const vp = v.historicPrice ? getPrice(v.historicPrice) : 0;
                    const v1m = v.historicPrice ? change(vp, getPastPrice(v.historicPrice, "1m")) : 0;
                    return (
                      <div key={v.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3.5 items-center py-[9px] border-t border-chip text-[13px]">
                        <span className={cn("leading-[1.3]", v.key === currentKey && "font-semibold")}>{v.label}</span>
                        <span className={cn("font-geist-mono text-xs", v.historicPrice ? deltaColor(v1m) : "text-ink-muted")}>{v.historicPrice ? `${pct(v1m)} 30d` : ""}</span>
                        <span className="font-geist-mono font-medium text-right whitespace-nowrap">{v.historicPrice ? eur(vp) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {factList("mt-3.5 lg:hidden")}
            <div className="h-4 lg:h-6" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-none px-4 pt-3.5 pb-7 lg:py-4 lg:pl-7 lg:pr-5 border-t border-line bg-paper lg:bg-canvas">
        {target.context === "binder" && <BinderActions item={target.item} onClose={onClose} />}
        {target.context === "wishlist" && <WishlistActions item={target.item} price={price} onClose={onClose} />}
        {target.context === "database" && (
          <DatabaseActions variants={variants} label={versionLabel} prices={versions} keyOf={keyOf} index={variantIndex} onIndex={setVariantIndex} onAdd={(d) => onAdd?.(d, variantIndex)} />
        )}
      </div>
    </>
  );
};

const PriceChart = ({ points, gain }: { points: number[]; gain: boolean }) => {
  if (points.length < 2) {
    return <div className="grid h-[130px] lg:h-[190px] mt-4 lg:mt-[18px] place-items-center text-sm text-ink-muted">Not enough history yet</div>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const y = (v: number) => 250 - ((v - min) / (max - min || 1)) * 215;
  const line = points.map((v, i) => (i ? "L" : "M") + ((i / (points.length - 1)) * 1000).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const endTop = (y(points[points.length - 1]) / 280) * 100;

  return (
    <div className="relative h-[130px] lg:h-[190px] mt-4 lg:mt-[18px]">
      <svg width="100%" height="100%" viewBox="0 0 1000 280" preserveAspectRatio="none" className="block overflow-visible">
        {[93, 186].map((gy) => (
          <line key={gy} x1="0" y1={gy} x2="1000" y2={gy} className="hidden lg:block" style={{ stroke: "rgb(var(--cm-line))" }} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={line + " L1000,280 L0,280 Z"} fill={gain ? "oklch(0.52 0.13 155 / 0.10)" : "oklch(0.55 0.16 27 / 0.10)"} />
        <path d={line} fill="none" style={{ stroke: "rgb(var(--cm-ink))" }} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute right-[-5px] w-2.5 h-2.5 -mt-[5px] rounded-full bg-ink hidden lg:block" style={{ top: `${endTop}%` }} />
      <div className="absolute top-0 left-0 hidden lg:block font-geist-mono text-[11px] text-ink-muted">
        High {eur(max)} · Low {eur(min)}
      </div>
    </div>
  );
};

// Listings available on the last 7 days with a price record
const Listings = ({ prices }: { prices: { items: number; timestamp: number }[] | null }) => {
  const days = (prices ?? []).slice(-7);
  const today = days[days.length - 1]?.items;
  const yesterday = days[days.length - 2]?.items;
  const diff = today !== undefined && yesterday !== undefined ? today - yesterday : undefined;
  const max = Math.max(1, ...days.map((d) => d.items));

  return (
    <div className="p-3.5 border lg:p-0 border-line rounded-xl lg:border-0 lg:rounded-none">
      <div className="flex items-baseline justify-between">
        <span className="font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase text-ink-muted">Listings available</span>
        <span className="text-xs text-ink-muted">last 7 days</span>
      </div>
      {prices === null ? (
        <div className="py-6 text-sm text-ink-muted">Loading…</div>
      ) : days.length === 0 ? (
        <div className="py-6 text-sm text-ink-muted">No listing data yet</div>
      ) : (
        <div className="flex items-end gap-5 lg:block">
          <div className="flex gap-5 lg:gap-7 mt-2.5 lg:mt-3">
            <div>
              <div className="text-[11px] lg:text-xs text-ink-muted">Today</div>
              <div className="font-display font-medium text-[26px] lg:text-[30px] leading-[1.1] tracking-[-0.02em]">{today}</div>
            </div>
            {yesterday !== undefined && (
              <div>
                <div className="text-[11px] lg:text-xs text-ink-muted">Yesterday</div>
                <div className="font-display font-medium text-[26px] lg:text-[30px] leading-[1.1] tracking-[-0.02em] text-ink-muted">{yesterday}</div>
              </div>
            )}
            {diff !== undefined && (
              <div className="self-end hidden lg:block pb-1 font-geist-mono font-medium text-[13px] text-ink-muted">
                {diff >= 0 ? "+" : "−"}
                {Math.abs(diff)} vs yesterday
              </div>
            )}
          </div>
          <div className="flex-1 lg:mt-3.5">
            <div className="grid grid-cols-7 gap-[3px] lg:gap-1.5 items-end h-10 lg:h-[72px]">
              {days.map((d, i) => (
                <div
                  key={d.timestamp}
                  title={`${d.items} listed`}
                  className={cn("rounded-t-[2px] lg:rounded-t-[3px]", i === days.length - 1 ? "bg-ink" : "bg-line")}
                  style={{ height: `${Math.max(4, Math.round((d.items / max) * 100))}%` }}
                />
              ))}
            </div>
            <div className="hidden lg:grid grid-cols-7 gap-1.5 mt-1.5">
              {days.map((d) => (
                <span key={d.timestamp} className="font-geist-mono text-[10px] text-ink-muted text-center">
                  {new Date(d.timestamp).toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const fieldClass = "flex items-center gap-2 h-12 lg:h-[38px] px-3 border border-line rounded-[10px] lg:rounded-[9px] bg-paper text-sm lg:text-[13px]";
const primaryClass = "h-12 lg:h-[38px] px-[18px] rounded-[10px] lg:rounded-[9px] bg-ink text-paper text-[15px] lg:text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-default";
const secondaryClass = "h-12 lg:h-[38px] px-3.5 rounded-[10px] lg:rounded-[9px] border border-line bg-paper text-sm font-medium cursor-pointer hover:bg-chip disabled:opacity-40 disabled:cursor-default";
const removeClass = "h-12 lg:h-[38px] px-3.5 bg-transparent text-loss text-sm font-medium cursor-pointer";

const Stepper = ({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) => {
  const button = "w-11 h-11 lg:w-9 lg:h-9 grid place-items-center text-lg lg:text-[18px] cursor-pointer disabled:opacity-30 disabled:cursor-default";
  return (
    <div className={cn("flex items-center border border-line rounded-[10px] lg:rounded-[9px] bg-paper", disabled && "opacity-40 pointer-events-none")}>
      <button type="button" aria-label="Decrease quantity" className={button} disabled={value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="min-w-7 text-center font-geist-mono font-medium text-[15px] lg:text-sm">{value}</span>
      <button type="button" aria-label="Increase quantity" className={button} disabled={value >= LIMITS.QUANTITY} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
};

// Mark it owned or missing, change the quantity, move the item to another binder or remove it
const BinderActions = ({ item, onClose }: { item: BinderItem; onClose: () => void }) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [owned, setOwned] = useState(isOwned(item));
  const [removing, setRemoving] = useState(false);
  const { binders } = useSelector((state) => state.binders);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  const binder = binders.find((b) => b._id === item.binder);
  // Set binders only take cards of their set
  const destinations = binders.filter((b) => b._id !== item.binder && binderAccepts(b, item.type, item.item));

  const changed = quantity !== item.quantity || owned !== isOwned(item);

  const save = () => {
    if (!user || !changed) return;
    dispatch(changeBinderItemQuantity(user, { ...item, quantity, owned, item: item.item._id, historicPrice: item.historicPrice?._id }));
    onClose();
  };

  // Add to the other binder (or bump its quantity there) and remove from this one
  const move = (binderId: string) => {
    const destination = destinations.find((b) => b._id === binderId);
    if (!user || !destination) return;
    const existing = destination.items.find((i) => i.historicPrice?._id === item.historicPrice?._id);
    if (existing) {
      // Owned wins: an owned item fills a missing slot there
      const total = isOwned(existing) && owned ? Math.min(existing.quantity + quantity, LIMITS.QUANTITY) : isOwned(existing) ? existing.quantity : quantity;
      dispatch(changeBinderItemQuantity(user, { ...existing, quantity: total, owned: owned || isOwned(existing), item: existing.item._id, historicPrice: existing.historicPrice._id }));
    } else {
      dispatch(
        addBinderItem(
          user,
          { name: item.name, type: item.type, item: item.item._id, historicPrice: item.historicPrice._id, quantity, owned, binder: destination._id },
          { item: item.item, historicPrice: item.historicPrice }
        )
      );
    }
    dispatch(deleteBinderItem(user, item.binder, item._id));
    onClose();
  };

  return (
    <>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3.5">
        <div className="flex items-center justify-between gap-3.5">
          <button type="button" role="switch" aria-checked={owned} onClick={() => setOwned(!owned)} className="flex items-center gap-2.5 text-sm lg:text-[13px] font-medium cursor-pointer">
            <span className={cn("relative w-10 h-6 rounded-full transition-colors", owned ? "bg-gain" : "bg-line")}>
              <span className={cn("absolute top-[3px] w-[18px] h-[18px] rounded-full bg-paper shadow-sm transition-[left]", owned ? "left-[19px]" : "left-[3px]")} />
            </span>
            Owned
          </button>
          <span className="flex items-center gap-2.5 lg:ml-2">
            <span className={cn("text-sm lg:text-[13px] text-ink-muted", !owned && "opacity-40")}>Quantity</span>
            <Stepper value={quantity} onChange={setQuantity} disabled={!owned} />
          </span>
        </div>
        <div className="grid grid-cols-[auto_1fr_2fr] gap-2 lg:flex lg:ml-auto">
          <button type="button" className={removeClass} onClick={() => setRemoving(true)}>
            Remove
          </button>
          {destinations.length > 0 && (
            <label className={cn(secondaryClass, "relative flex items-center justify-center")}>
              Move to…
              <select aria-label="Move to binder" value="" onChange={(e) => move(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                <option value="" disabled>
                  Move to…
                </option>
                {destinations.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className={cn(primaryClass, destinations.length === 0 && "col-span-2")} disabled={!changed} onClick={save}>
            Save
          </button>
        </div>
      </div>
      <ConfirmModal
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          if (!user) return;
          dispatch(deleteBinderItem(user, item.binder, item._id));
          onClose();
        }}
        title="Remove item"
        description={`Remove ${item.item?.name ?? "this item"} from ${binder?.name ?? "this binder"}?`}
        confirmLabel="Remove"
      />
    </>
  );
};

// Set the target price, remove the item, or move it into a binder once bought
const WishlistActions = ({ item, price, onClose }: { item: WishlistItem; price: number; onClose: () => void }) => {
  const [value, setValue] = useState(item.target !== undefined ? String(item.target) : "");
  const [binderId, setBinderId] = useState("");
  const { binders } = useSelector((state) => state.binders);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  const parsed = value.trim() === "" ? undefined : Number(value.replace(",", "."));
  const valid = parsed === undefined || (Number.isFinite(parsed) && parsed >= 0);
  const rounded = parsed === undefined ? undefined : Math.round(parsed * 100) / 100;
  const changed = valid && rounded !== item.target;
  const gap = rounded !== undefined && valid && price > 0 ? (price <= rounded ? `${eur(rounded - price)} below target` : `${eur(price - rounded)} above target`) : undefined;

  // Set binders only take cards of their set
  const accepting = binders.filter((b) => binderAccepts(b, item.type, item.item));
  const binder = accepting.find((b) => b._id === binderId) ?? accepting[0];

  const save = () => {
    if (!user || !changed) return;
    dispatch(setWishlistItemTarget(user, item, rounded));
    onClose();
  };

  const acquire = () => {
    if (!user || !binder) return;
    const existing = binder.items.find((i) => i.historicPrice?._id === item.historicPrice?._id);
    if (existing) {
      // Fills a missing slot, or adds one more
      const quantity = isOwned(existing) ? Math.min(existing.quantity + 1, LIMITS.QUANTITY) : 1;
      dispatch(changeBinderItemQuantity(user, { ...existing, quantity, owned: true, item: existing.item._id, historicPrice: existing.historicPrice._id }));
    } else {
      dispatch(
        addBinderItem(
          user,
          { name: item.name, type: item.type, item: item.item._id, historicPrice: item.historicPrice._id, quantity: 1, binder: binder._id },
          { item: item.item, historicPrice: item.historicPrice }
        )
      );
    }
    dispatch(deleteWishlistItem(user, item.wishlist, item._id));
    onClose();
  };

  const remove = () => {
    if (!user) return;
    dispatch(deleteWishlistItem(user, item.wishlist, item._id));
    onClose();
  };

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3.5">
      <div className="flex items-center gap-3">
        <label className={cn(fieldClass, "flex-1 lg:flex-none")}>
          <span className="text-ink-muted whitespace-nowrap">Target (€)</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="None"
            className="w-20 min-w-0 font-medium bg-transparent outline-none font-geist-mono text-ink placeholder:text-ink-muted"
          />
        </label>
        {gap && <span className="font-geist-mono font-medium text-xs lg:text-[13px] text-ink-muted whitespace-nowrap">{gap}</span>}
        {changed && (
          <button type="button" className={secondaryClass} onClick={save}>
            Save
          </button>
        )}
      </div>
      <div className="flex gap-2 lg:ml-auto">
        <button type="button" className={removeClass} onClick={remove}>
          Remove
        </button>
        {binder ? (
          <>
            {accepting.length > 1 && (
              <select aria-label="Binder" value={binder._id} onChange={(e) => setBinderId(e.target.value)} className={cn(fieldClass, "min-w-0 flex-1 lg:flex-none lg:max-w-[180px] cursor-pointer outline-none")}>
                {accepting.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className={cn(primaryClass, "flex-1 lg:flex-none whitespace-nowrap")} onClick={acquire}>
              Got it → Move to binder
            </button>
          </>
        ) : (
          <Link href="/binders" className={cn(primaryClass, "flex-1 lg:flex-none inline-flex items-center justify-center")}>
            Create a binder
          </Link>
        )}
      </div>
    </div>
  );
};

interface DatabaseActionsProps {
  variants: Variant[];
  label: (v: Variant) => string;
  prices: Map<string, HistoricPrice>;
  keyOf: (v: Variant) => string;
  index: number;
  onIndex: (i: number) => void;
  onAdd: (destination: Destination) => void;
}

// Pick a version, then continue in the add dialog (binder or wishlist, quantity, target)
const DatabaseActions = ({ variants, label, prices, keyOf, index, onIndex, onAdd }: DatabaseActionsProps) => {
  const priced = !!variants[index] && prices.has(keyOf(variants[index]));
  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3.5">
      <label className={cn(fieldClass, "lg:max-w-[360px]")}>
        <span className="text-ink-muted">Version</span>
        <select value={index} onChange={(e) => onIndex(Number(e.target.value))} className="flex-1 min-w-0 font-medium bg-transparent outline-none cursor-pointer text-ink">
          {variants.map((v, i) => {
            const hp = prices.get(keyOf(v));
            return (
              <option key={i} value={i}>
                {label(v)} — {hp ? eur(getPrice(hp)) : "no price data"}
              </option>
            );
          })}
        </select>
      </label>
      {!priced && <span className="text-xs text-loss">No price data yet for this version</span>}
      <div className="grid grid-cols-[1fr_2fr] gap-2 lg:flex lg:ml-auto">
        <button type="button" className={secondaryClass} disabled={!priced} onClick={() => onAdd("wishlist")}>
          + Wishlist
        </button>
        <button type="button" className={primaryClass} disabled={!priced} onClick={() => onAdd("binder")}>
          + Add to binder
        </button>
      </div>
    </div>
  );
};

export default ItemDetail;
