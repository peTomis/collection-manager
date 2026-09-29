// Libraries
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Components
import Segmented from "@/components/atoms/segmented";
import { ConfirmModal } from "@/components/atoms/modal";
import CardArt from "@/components/atoms/card-art";
import SealedArt from "@/components/atoms/sealed-art";
import ItemDetail from "@/components/organisms/item-detail";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { changeBinderItemQuantity, deleteBinderItems } from "@/redux/slices/binders";
import { BinderItem, BinderWithItems } from "@/types/mongodb";
import { getPastPrice } from "@/utils/utils";
import { binderSetId, cardNumber, isOwned, isSealed, itemPrice, languageLabel, sealedPath, variantLabel } from "@/lib/items";
import { useSetsImages } from "@/lib/tcgdex";
import { LIMITS } from "@/lib/limits";
import { change, deltaColor, eur, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type View = "grid" | "list";
type Sort = "number" | "value" | "name" | "change";

const SORTS: { value: Sort; label: string }[] = [
  { value: "number", label: "Set number" },
  { value: "value", label: "Value" },
  { value: "name", label: "Name" },
  { value: "change", label: "30d change" },
];

const PAGE_SIZE = 9;

export interface Row {
  item: BinderItem;
  // Set number, only shown in set binders
  number?: number;
  set: string;
  price: number;
  total: number;
  change1m: number;
  // TCGdex image base URL, cards only
  image?: string;
}

// Missing slots show a faded image, their badges and labels stay readable
const artClass = (item: BinderItem) => (isOwned(item) ? undefined : "opacity-25 grayscale");

const stripes = "bg-[repeating-linear-gradient(135deg,var(--cm-pocket-a)_0_6px,var(--cm-pocket-b)_6px_12px)]";

const BinderItems = ({ binder }: { binder: BinderWithItems }) => {
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<Sort>("number");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  // Items picked in the list, by id
  const [selected, setSelected] = useState<globalThis.Set<string>>(new globalThis.Set());
  const [removing, setRemoving] = useState(false);
  const [viewing, setViewing] = useState<BinderItem | null>(null);

  const { sets } = useSelector((state) => state.sets);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  const tcgdexIds = new Map(sets.map((s) => [s._id, s.tcgdex]));
  const images = useSetsImages(binder.items.filter((i) => !isSealed(i)).map((i) => tcgdexIds.get(i.item?.set) ?? ""));

  const numbered = !!binderSetId(binder);

  const rows = useMemo(() => {
    // Sets come sorted by release date, so their index orders items chronologically
    const setIndex = new Map(sets.map((s, i) => [s._id, i]));
    const setName = new Map(sets.map((s) => [s._id, s.name]));
    const query = filter.trim().toLowerCase();

    const all: Row[] = binder.items.map((item) => {
      const price = itemPrice(item);
      const number = cardNumber(item);
      const tcgdex = tcgdexIds.get(item.item?.set);
      return {
        item,
        number: numbered ? number : undefined,
        set: setName.get(item.item?.set) ?? "",
        price,
        total: isOwned(item) ? price * item.quantity : 0,
        change1m: item.historicPrice ? change(price, getPastPrice(item.historicPrice, "1m")) : 0,
        image: number !== undefined && tcgdex ? images.get(tcgdex)?.get(number) : undefined,
      };
    });

    const byNumber = (a: Row, b: Row) =>
      Number(isSealed(a.item)) - Number(isSealed(b.item)) ||
      (setIndex.get(a.item.item?.set) ?? 0) - (setIndex.get(b.item.item?.set) ?? 0) ||
      (cardNumber(a.item) ?? 0) - (cardNumber(b.item) ?? 0);
    const compare: Record<Sort, (a: Row, b: Row) => number> = {
      number: byNumber,
      value: (a, b) => b.total - a.total,
      name: (a, b) => (a.item.item?.name ?? "").localeCompare(b.item.item?.name ?? ""),
      change: (a, b) => b.change1m - a.change1m,
    };

    return all.filter((r) => !query || `${r.item.item?.name} ${r.set}`.toLowerCase().includes(query)).sort(compare[sort]);
  }, [binder, sets, filter, sort, images]);

  useEffect(() => setPage(0), [binder._id, filter, sort]);
  useEffect(() => setSelected(new globalThis.Set()), [binder._id]);

  // Only ids still in the binder count, e.g. after a refresh
  const selectedIds = binder.items.filter((i) => selected.has(i._id)).map((i) => i._id);
  const toggleSelected = (id: string) =>
    setSelected((s) => {
      const next = new globalThis.Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  // Select every row shown (the filter applies), or clear them if they all are
  const toggleAll = () => {
    const shown = rows.map((r) => r.item._id);
    const all = shown.every((id) => selected.has(id));
    setSelected((s) => {
      const next = new globalThis.Set(s);
      shown.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  // Down to 0 keeps the item as a missing slot, removing it is a separate action
  const setQuantity = (item: BinderItem, quantity: number) => {
    if (!user || quantity < 0 || quantity > LIMITS.QUANTITY) return;
    const change = quantity === 0 ? { owned: false } : { quantity };
    dispatch(changeBinderItemQuantity(user, { ...item, ...change, item: item.item._id, historicPrice: item.historicPrice?._id }));
  };

  // A missing slot the user just got
  const markOwned = (item: BinderItem) => {
    if (!user) return;
    dispatch(changeBinderItemQuantity(user, { ...item, owned: true, item: item.item._id, historicPrice: item.historicPrice?._id }));
  };

  return (
    <div className="flex flex-col lg:flex-1 lg:min-h-0">
      <div className="flex flex-none flex-wrap items-center gap-2 lg:gap-2.5 mt-4 mb-3.5 lg:mt-6 lg:mb-5 lg:pt-5 lg:border-t border-line">
        <Segmented
          className="grid flex-1 grid-cols-2 bg-paper lg:flex-none lg:w-44"
          options={[
            { value: "grid", label: "Binder" },
            { value: "list", label: "List" },
          ]}
          value={view}
          onChange={setView}
        />
        <label className="flex items-center gap-2 h-[38px] px-3 border border-line rounded-[9px] bg-paper text-[13px] text-ink-muted order-last w-full lg:order-none lg:w-60">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="14.5" y2="14.5" />
          </svg>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter this binder"
            className="flex-1 min-w-0 bg-transparent outline-none text-ink placeholder:text-ink-muted"
          />
        </label>
        <label className="hidden lg:flex items-center gap-1.5 h-[38px] pl-3 pr-2 border border-line rounded-[9px] bg-paper text-[13px]">
          <span className="text-ink-muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent outline-none cursor-pointer text-ink">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Link href="/database" className="hidden lg:flex items-center ml-auto h-[38px] px-4 rounded-[9px] bg-ink text-paper text-sm font-medium">
          + Add cards
        </Link>
        <Link href="/database" aria-label="Add cards" className="grid w-[46px] h-[46px] rounded-[10px] bg-ink text-paper text-[22px] place-items-center lg:hidden">
          +
        </Link>
      </div>

      {binder.items.length === 0 ? (
        <div className="py-16 text-sm text-center border border-dashed rounded-xl border-line text-ink-muted">
          This binder is empty.{" "}
          <Link href="/database" className="font-medium underline text-ink">
            Add cards from the database
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-sm text-center text-ink-muted">Nothing matches “{filter}”</div>
      ) : view === "grid" ? (
        <BinderGrid rows={rows} page={page} setPage={setPage} onView={setViewing} />
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div className="flex flex-none items-center gap-1 lg:gap-2 h-11 lg:h-[42px] mb-2.5 lg:mb-3 pl-3.5 pr-1.5 rounded-[10px] bg-ink text-paper text-[13px] font-medium">
              <span className="mr-auto">{selectedIds.length} selected</span>
              <button type="button" onClick={toggleAll} className="h-8 px-2.5 rounded-lg cursor-pointer hover:bg-paper/10">
                {rows.every((r) => selected.has(r.item._id)) ? "Unselect all" : `Select all (${rows.length})`}
              </button>
              <button type="button" onClick={() => setSelected(new globalThis.Set())} className="h-8 px-2.5 rounded-lg cursor-pointer hover:bg-paper/10">
                Clear
              </button>
              <button type="button" onClick={() => setRemoving(true)} className="h-8 px-3 text-white rounded-lg cursor-pointer bg-loss">
                Delete
              </button>
            </div>
          )}
          <BinderList
            rows={rows}
            numbered={numbered}
            setQuantity={setQuantity}
            markOwned={markOwned}
            onView={setViewing}
            selected={selected}
            onSelect={toggleSelected}
            onSelectAll={toggleAll}
          />
        </>
      )}

      <ItemDetail target={viewing ? { context: "binder", item: viewing } : null} onClose={() => setViewing(null)} />
      <ConfirmModal
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          if (!user || !selectedIds.length) return;
          dispatch(deleteBinderItems(user, binder._id, selectedIds));
          setSelected(new globalThis.Set());
        }}
        title={selectedIds.length === 1 ? "Delete item" : `Delete ${selectedIds.length} items`}
        description={`Delete ${selectedIds.length === 1 ? (binder.items.find((i) => i._id === selectedIds[0])?.item?.name ?? "this item") : `${selectedIds.length} items`} from ${binder.name}? This can't be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
};

// Binder pages of 9 pockets: a two-page spread on desktop, one page on mobile.
// The pockets are sized to fit the available space (see .binder-fit in styles/tailwind.css).
const BinderGrid = ({ rows, page, setPage, onView }: { rows: Row[]; page: number; setPage: (p: number) => void; onView: (item: BinderItem) => void }) => {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = (p: number) => rows.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
  const spread = page - (page % 2);

  return (
    <>
      <div className="lg:flex-1 lg:min-h-0 binder-fit">
        <div className="w-fit mx-auto p-2.5 lg:p-[16px] rounded-[14px] lg:rounded-2xl bg-binder shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)] lg:grid lg:grid-cols-[auto_auto] lg:gap-[16px]">
          <Page rows={pageRows(page)} onView={onView} className="lg:hidden" />
          <Page rows={pageRows(spread)} onView={onView} className="hidden lg:grid" />
          <Page rows={pageRows(spread + 1)} onView={onView} className="hidden lg:grid" />
        </div>
      </div>

      <Pager
        className="lg:hidden"
        label={`Page ${page + 1} of ${pages}`}
        prev={page > 0 ? () => setPage(page - 1) : undefined}
        next={page < pages - 1 ? () => setPage(page + 1) : undefined}
      />
      <Pager
        className="hidden lg:flex"
        label={spread + 1 < pages ? `Pages ${spread + 1}–${spread + 2} of ${pages}` : `Page ${spread + 1} of ${pages}`}
        prev={spread > 0 ? () => setPage(spread - 2) : undefined}
        next={spread + 2 < pages ? () => setPage(spread + 2) : undefined}
      />
    </>
  );
};

// Label under each pocket: two 14px lines on mobile, one 16px line on desktop (keep in sync with .binder-fit)
const LABEL_HEIGHT = "h-7 lg:h-4";

const Page = ({ rows, onView, className }: { rows: Row[]; onView: (item: BinderItem) => void; className?: string }) => (
  <div className={cn("grid grid-cols-[repeat(3,var(--pocket))] gap-2 lg:gap-3 p-2.5 lg:p-3.5 rounded-[7px] lg:rounded-lg bg-binder-page content-start", className)}>
    {Array.from({ length: PAGE_SIZE }, (_, i) => rows[i]).map((r, i) =>
      r ? (
        <div key={r.item._id} className="flex flex-col gap-[5px] lg:gap-[7px] min-w-0">
          <button
            type="button"
            aria-label={`View ${r.item.item?.name ?? "item"}`}
            onClick={() => onView(r.item)}
            className={cn(
              "relative aspect-[63/88] rounded-[5px] lg:rounded-md grid place-items-center overflow-hidden cursor-pointer shadow-[0_1px_2px_rgba(29,27,24,.12),inset_0_0_0_1px_rgba(29,27,24,.06)]",
              stripes,
            )}
          >
            <span className="hidden px-1 text-center lg:block font-geist-mono text-[10px] text-ink-muted">{variantLabel(r.item)}</span>
            {/* Before the badges so they stay on top of the art */}
            {r.image && <CardArt image={r.image} alt={r.item.item?.name ?? ""} className={artClass(r.item)} />}
            {sealedPath(r.item) && <SealedArt path={sealedPath(r.item)!} alt={r.item.item?.name ?? ""} className={artClass(r.item)} />}
            {(r.number !== undefined || isSealed(r.item)) && (
              <span className="absolute top-1 left-1 lg:top-1.5 lg:left-1.5 font-geist-mono font-medium text-[9px] lg:text-[10px] bg-paper text-ink px-1 lg:px-[5px] py-px lg:py-0.5 rounded-[3px]">
                {r.number !== undefined ? `#${r.number}` : "Sealed"}
              </span>
            )}
            {!isOwned(r.item) ? (
              <span className="absolute top-1 right-1 lg:top-1.5 lg:right-1.5 font-geist-mono font-medium text-[9px] lg:text-[10px] bg-paper text-ink px-1 lg:px-[5px] py-px lg:py-0.5 rounded-[3px]">
                Missing
              </span>
            ) : r.item.quantity > 1 && (
              <span className="absolute top-1 right-1 lg:top-1.5 lg:right-1.5 font-geist-mono font-medium text-[9px] lg:text-[10px] bg-ink text-paper px-1 lg:px-[5px] py-px lg:py-0.5 rounded-[3px]">
                ×{r.item.quantity}
              </span>
            )}
          </button>
          <div className={cn("lg:flex lg:justify-between lg:gap-1.5 text-[11px] lg:text-xs leading-[14px] lg:leading-4 font-medium overflow-hidden", LABEL_HEIGHT)}>
            <span className="block truncate">{r.item.item?.name}</span>
            <span className="block font-normal lg:font-medium font-geist-mono text-ink-muted lg:text-ink">{eur(r.price)}</span>
          </div>
        </div>
      ) : (
        <div key={`empty-${i}`} className="flex flex-col gap-[5px] lg:gap-[7px]">
          <div className="aspect-[63/88] rounded-[5px] lg:rounded-md border-[1.5px] border-dashed border-ink-muted/30" />
          <div className={LABEL_HEIGHT} />
        </div>
      ),
    )}
  </div>
);

const Pager = ({ label, prev, next, className }: { label: string; prev?: () => void; next?: () => void; className?: string }) => {
  const button =
    "w-11 h-11 lg:w-9 lg:h-9 rounded-[10px] lg:rounded-lg border border-line bg-paper disabled:text-ink-muted disabled:opacity-60 cursor-pointer disabled:cursor-default";
  return (
    <div className={cn("flex flex-none items-center justify-center gap-3.5 lg:gap-4 mt-3 mb-4 lg:mt-4 lg:mb-6 font-geist-mono font-medium text-[13px]", className)}>
      <button type="button" aria-label="Previous page" className={button} disabled={!prev} onClick={prev}>
        ‹
      </button>
      <span>{label}</span>
      <button type="button" aria-label="Next page" className={button} disabled={!next} onClick={next}>
        ›
      </button>
    </div>
  );
};

// With and without the set number column (set binders only)
const LIST_COLUMNS = {
  numbered: "lg:grid-cols-[18px_48px_34px_minmax(0,1.6fr)_1.1fr_0.5fr_104px_0.9fr_0.9fr_0.8fr]",
  plain: "lg:grid-cols-[18px_34px_minmax(0,1.6fr)_1.1fr_0.5fr_104px_0.9fr_0.9fr_0.8fr]",
};

interface BinderListProps {
  rows: Row[];
  numbered: boolean;
  setQuantity: (item: BinderItem, quantity: number) => void;
  markOwned: (item: BinderItem) => void;
  onView: (item: BinderItem) => void;
  selected: globalThis.Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
}

const BinderList = ({ rows, numbered, setQuantity, markOwned, onView, selected, onSelect, onSelectAll }: BinderListProps) => {
  const columns = numbered ? LIST_COLUMNS.numbered : LIST_COLUMNS.plain;
  const allSelected = rows.every((r) => selected.has(r.item._id));
  const someSelected = !allSelected && rows.some((r) => selected.has(r.item._id));
  return (
    <div className="mb-4 border lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:mb-6 bg-paper border-line rounded-xl">
      <div className={cn("hidden lg:grid sticky top-0 z-10 bg-paper gap-3.5 px-[18px] py-3 text-xs font-medium text-ink-muted border-b border-line", columns)}>
        <Checkbox label="Select all" checked={allSelected} mixed={someSelected} onChange={onSelectAll} />
        {numbered && <span>#</span>}
        <span />
        <span>Card</span>
        <span>Variant</span>
        <span>Lang</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Value</span>
        <span className="text-right">Total</span>
        <span className="text-right">30d</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.item._id}
          className={cn(
            "grid grid-cols-[18px_34px_minmax(0,1fr)_auto] gap-3 lg:gap-3.5 items-center px-3.5 lg:px-[18px] py-2.5 lg:py-2 text-sm",
            i > 0 && "border-t border-chip",
            selected.has(r.item._id) && "bg-chip/60",
            columns,
          )}
        >
          <Checkbox label={`Select ${r.item.item?.name ?? "item"}`} checked={selected.has(r.item._id)} onChange={() => onSelect(r.item._id)} />
          {numbered && <span className="hidden font-geist-mono text-[13px] text-ink-muted lg:block">{r.number !== undefined ? String(r.number).padStart(3, "0") : "—"}</span>}
          <button
            type="button"
            aria-label={`View ${r.item.item?.name ?? "item"}`}
            onClick={() => onView(r.item)}
            className={cn("relative w-[34px] h-[47px] rounded-[3px] overflow-hidden cursor-pointer", stripes)}
          >
            {r.image && <CardArt image={r.image} alt={r.item.item?.name ?? ""} className={artClass(r.item)} />}
            {sealedPath(r.item) && <SealedArt path={sealedPath(r.item)!} alt={r.item.item?.name ?? ""} className={artClass(r.item)} />}
          </button>
          <div className="min-w-0">
            <div className="font-medium truncate cursor-pointer hover:underline" onClick={() => onView(r.item)}>
              <span className="text-xs font-normal lg:hidden font-geist-mono text-ink-muted">{r.number !== undefined ? String(r.number).padStart(3, "0") + " " : ""}</span>
              {r.item.item?.name}
            </div>
            <div className="text-xs truncate text-ink-muted mt-0.5">
              {r.set}
              <span className="lg:hidden">
                {" "}
                · {variantLabel(r.item)} · {languageLabel(r.item)}
              </span>
            </div>
            {isOwned(r.item) ? (
              <Stepper className="mt-1.5 lg:hidden" quantity={r.item.quantity} onChange={(q) => setQuantity(r.item, q)} />
            ) : (
              <MarkOwned className="flex mt-1.5 lg:hidden" onClick={() => markOwned(r.item)} />
            )}
          </div>
          <span className="hidden truncate lg:block text-ink-muted">{variantLabel(r.item)}</span>
          <span className="hidden text-xs font-medium lg:block font-geist-mono">{languageLabel(r.item)}</span>
          {isOwned(r.item) ? (
            <Stepper className="hidden lg:flex justify-self-center" quantity={r.item.quantity} onChange={(q) => setQuantity(r.item, q)} />
          ) : (
            <MarkOwned className="hidden lg:flex justify-self-center" onClick={() => markOwned(r.item)} />
          )}
          <span className="hidden text-right lg:block font-geist-mono text-ink-muted">{eur(r.price)}</span>
          <div className="text-right">
            <div className={cn("font-medium font-geist-mono", !isOwned(r.item) && "text-ink-muted")}>{isOwned(r.item) ? eur(r.total) : "Missing"}</div>
            <div className={cn("lg:hidden font-geist-mono text-[11px]", deltaColor(r.change1m))}>{pct(r.change1m)}</div>
          </div>
          <span className={cn("hidden lg:block text-right font-geist-mono font-medium text-[13px]", deltaColor(r.change1m))}>{pct(r.change1m)}</span>
        </div>
      ))}
    </div>
  );
};

const Stepper = ({ quantity, onChange, className }: { quantity: number; onChange: (q: number) => void; className?: string }) => {
  const button = "w-7 h-7 grid place-items-center rounded-md text-ink-muted hover:bg-chip hover:text-ink cursor-pointer";
  return (
    <div className={cn("flex items-center w-fit border border-line rounded-lg", className)}>
      <button type="button" aria-label="Decrease quantity" className={button} onClick={() => onChange(quantity - 1)}>
        −
      </button>
      <span className="w-6 text-center font-geist-mono text-[13px]">{quantity}</span>
      <button type="button" aria-label="Increase quantity" className={button} onClick={() => onChange(quantity + 1)}>
        +
      </button>
    </div>
  );
};

const Checkbox = ({ label, checked, mixed, onChange }: { label: string; checked: boolean; mixed?: boolean; onChange: () => void }) => (
  <button
    type="button"
    role="checkbox"
    aria-label={label}
    aria-checked={mixed ? "mixed" : checked}
    onClick={onChange}
    className={cn(
      "grid w-[18px] h-[18px] rounded-[5px] border-[1.5px] place-items-center text-paper text-[11px] font-semibold leading-none cursor-pointer before:absolute before:-inset-3 relative",
      checked || mixed ? "bg-ink border-ink" : "border-ink-muted/50 hover:border-ink"
    )}
  >
    {checked ? "✓" : mixed ? "−" : ""}
  </button>
);

// Missing slots have no quantity yet: one tap marks them owned
const MarkOwned = ({ onClick, className }: { onClick: () => void; className?: string }) => (
  <button type="button" onClick={onClick} className={cn("items-center h-[30px] px-2.5 w-fit border border-dashed border-line rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:border-ink-muted cursor-pointer", className)}>
    + Got it
  </button>
);

export default BinderItems;
