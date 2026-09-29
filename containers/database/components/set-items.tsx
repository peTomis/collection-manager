// Libraries
import { useEffect, useMemo, useState } from "react";

// Components
import CardArt from "@/components/atoms/card-art";
import SealedArt from "@/components/atoms/sealed-art";
import ItemDetail from "@/components/organisms/item-detail";
import AddItemModal, { Destination } from "./add-item-modal";

// State
import { ItemType, Set } from "@/types/mongodb";
import { ItemSpecificType } from "@/types/constants";
import { getPrice } from "@/utils/utils";
import { Catalog, Product, displayName, priceKey } from "../use-set-catalog";
import { useSetImages } from "@/lib/tcgdex";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "all" | "card" | "sealed" | ItemSpecificType;

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "card", label: "Cards" },
  { value: "sealed", label: "Sealed" },
  { value: ItemSpecificType.ETB, label: "Elite Trainer Box" },
  { value: ItemSpecificType.BOOSTER, label: "Booster" },
  { value: ItemSpecificType.BOOSTER_BOX, label: "Booster Box" },
  { value: ItemSpecificType.DECK, label: "Deck" },
  { value: ItemSpecificType.OTHER, label: "Other" },
];

interface Row {
  product: Product;
  name: string;
  sub: string;
  languages: string;
  price?: number;
  owned: number;
  // TCGdex image base URL, cards only
  image?: string;
}

const matches = (product: Product, tab: Tab) =>
  tab === "all" || (tab === "card" ? product.kind === ItemType.CARD : tab === "sealed" ? product.kind === ItemType.SEALED : product.kind === ItemType.SEALED && product.item.type === tab);

const stripes = "bg-[repeating-linear-gradient(135deg,var(--cm-stripe-a)_0_6px,var(--cm-stripe-b)_6px_12px)]";

interface SetItemsProps {
  set: Set;
  catalog: Catalog | null;
  owned: Map<string, number>;
  // A card or sealed product to show once the set has loaded, e.g. picked in the top bar search
  openItem?: string;
  onOpened?: () => void;
}

const SetItems = ({ set, catalog, owned, openItem, onOpened }: SetItemsProps) => {
  const [tab, setTab] = useState<Tab>("all");
  const [adding, setAdding] = useState<{ product: Product; destination: Destination; variant?: number } | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const images = useSetImages(set.tcgdex || undefined);

  const rows = useMemo(() => {
    if (!catalog) return [];
    const products: Product[] = [...catalog.cards.map((item) => ({ kind: ItemType.CARD as const, item })), ...catalog.sealed.map((item) => ({ kind: ItemType.SEALED as const, item }))];
    return products.map((product): Row => {
      // The grid shows the price of the first variant, the add dialog lists them all
      const first = product.item.variants[0];
      const price = first && catalog.prices.get(priceKey(product.item._id, first.language, "type" in first ? first.type : undefined));
      return {
        product,
        name: displayName(product),
        sub: product.kind === ItemType.CARD ? (set.cards ? `${product.item.number}/${set.cards}` : `#${product.item.number}`) : product.item.type,
        languages: Array.from(new globalThis.Set(product.item.variants.map((v) => v.language.toUpperCase()))).join(" "),
        price: price ? getPrice(price) : undefined,
        owned: owned.get(product.item._id) ?? 0,
        image: product.kind === ItemType.CARD ? images.get(product.item.number) : undefined,
      };
    });
  }, [catalog, owned, set, images]);

  useEffect(() => {
    if (!catalog || !openItem) return;
    const card = catalog.cards.find((c) => c._id === openItem);
    const sealed = catalog.sealed.find((s) => s._id === openItem);
    if (card) setViewing({ kind: ItemType.CARD, item: card });
    else if (sealed) setViewing({ kind: ItemType.SEALED, item: sealed });
    onOpened?.();
  }, [catalog, openItem]);

  const counts = new Map(TABS.map((t) => [t.value, rows.filter((r) => matches(r.product, t.value)).length]));
  const visible = rows.filter((r) => matches(r.product, tab));
  const tabLabel = TABS.find((t) => t.value === tab)?.label.toLowerCase();

  return (
    <div className="flex flex-col lg:flex-1 lg:min-h-0">
      <div className="flex flex-none gap-1.5 py-3.5 lg:flex-wrap lg:mt-6 lg:mb-5 lg:py-0 lg:pt-5 lg:border-t border-line overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
        {TABS.map((t) => {
          const count = counts.get(t.value) ?? 0;
          return (
            <button
              key={t.value}
              type="button"
              disabled={!count && t.value !== "all"}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex flex-none items-center gap-1.5 lg:gap-2 h-[38px] lg:h-9 px-3 lg:px-3.5 rounded-full border text-[13px] font-medium cursor-pointer disabled:opacity-45 disabled:cursor-default",
                t.value === tab ? "bg-ink text-paper border-ink" : "bg-paper text-ink border-line"
              )}
            >
              {t.label}
              <span className="font-geist-mono font-normal text-[11px] lg:text-xs opacity-70">{catalog ? count : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="pb-5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pb-10">
        {!catalog ? (
          <div className="py-16 text-sm text-center text-ink-muted">Loading {set.name}…</div>
        ) : visible.length === 0 ? (
          <div className="p-[60px] text-[15px] text-center border-[1.5px] border-dashed border-line rounded-xl text-ink-muted">
            No {tab === "all" ? "products" : tabLabel} in {set.name}.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:gap-4 xl:grid-cols-4 min-[1400px]:grid-cols-5">
            {visible.map((r) => (
              <ProductCard key={r.product.item._id} row={r} onView={() => setViewing(r.product)} onAdd={(destination) => setAdding({ product: r.product, destination })} />
            ))}
          </div>
        )}
      </div>

      <ItemDetail
        target={viewing && catalog ? { context: "database", product: viewing, prices: catalog.prices } : null}
        onClose={() => setViewing(null)}
        onAdd={(destination, variant) => {
          if (viewing) setAdding({ product: viewing, destination, variant });
          setViewing(null);
        }}
      />
      <AddItemModal
        set={set}
        catalog={catalog}
        product={adding?.product ?? null}
        destination={adding?.destination ?? "binder"}
        initialVariant={adding?.variant}
        onClose={() => setAdding(null)}
      />
    </div>
  );
};

const ProductCard = ({ row: r, onView, onAdd }: { row: Row; onView: () => void; onAdd: (destination: Destination) => void }) => (
  <div className="flex flex-col min-w-0 p-2 border lg:p-2.5 bg-paper border-line rounded-xl">
    <button type="button" aria-label={`View ${r.name}`} onClick={onView} className={cn("relative aspect-[63/88] rounded-md lg:rounded-[7px] grid place-items-center overflow-hidden cursor-pointer", stripes)}>
      <span className="font-geist-mono text-[10px] text-ink-muted">{r.product.kind === ItemType.CARD ? "card art" : "product shot"}</span>
      {r.image && <CardArt image={r.image} alt={r.name} />}
      {r.product.kind === ItemType.SEALED && r.product.item.path && <SealedArt path={r.product.item.path} alt={r.name} />}
      {r.owned > 0 && <span className="absolute top-1.5 left-1.5 lg:top-2 lg:left-2 text-[10px] lg:text-[11px] font-medium px-[7px] lg:px-2 py-0.5 lg:py-[3px] rounded-[10px] bg-ink text-paper">Owned ×{r.owned}</span>}
    </button>

    {/* Mobile */}
    <div className="lg:hidden">
      <div className="mt-2 text-[13px] font-medium truncate" title={r.name}>
        {r.name}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-geist-mono font-medium text-[13px]">{r.price !== undefined ? eur(r.price) : "—"}</span>
        <button type="button" aria-label={`Add ${r.name}`} onClick={() => onAdd("binder")} className="w-9 h-9 rounded-lg bg-ink text-paper text-lg cursor-pointer">
          +
        </button>
      </div>
    </div>

    {/* Desktop */}
    <div className="flex-col flex-1 hidden lg:flex">
      <div className="px-1 pt-2.5 pb-0.5">
        <div className="text-sm font-medium truncate" title={r.name}>
          {r.name}
        </div>
        <div className="text-xs truncate text-ink-muted mt-0.5">{r.sub}</div>
        <div className="flex items-baseline justify-between gap-2 mt-2">
          <span className="font-geist-mono font-medium text-[15px]">{r.price !== undefined ? eur(r.price) : "—"}</span>
          <span className="font-geist-mono font-medium text-[11px] text-ink-muted truncate">{r.languages}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2.5">
        <button type="button" onClick={() => onAdd("binder")} className="h-8 rounded-[7px] bg-ink text-paper text-xs font-medium cursor-pointer whitespace-nowrap">
          + Binder
        </button>
        <button type="button" onClick={() => onAdd("wishlist")} className="h-8 rounded-[7px] border border-line text-xs font-medium cursor-pointer whitespace-nowrap hover:bg-chip">
          + Wishlist
        </button>
      </div>
    </div>
  </div>
);

export default SetItems;
