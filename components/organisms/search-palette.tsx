import { apiFetch } from "@/lib/api-fetch";
// Libraries
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Components
import SetIcon from "@/containers/database/components/set-icon";
import ItemDetail from "@/components/organisms/item-detail";
import AddItemModal, { Destination } from "@/containers/database/components/add-item-modal";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { getSets } from "@/redux/slices/sets";
import { getBinders, setBinder } from "@/redux/slices/binders";
import { getWishlists, setWishlist } from "@/redux/slices/wishlists";
import { BinderWithItems, Card, HistoricPrice, ItemType, Sealed, Set, WishlistWithItems } from "@/types/mongodb";
import { summarizeBinder, summarizeWishlist } from "@/lib/items";
import { Product, historicPriceKey } from "@/containers/database/use-set-catalog";
import { LIMITS } from "@/lib/limits";
import { setEra } from "@/lib/sets";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface Results {
  sets: Pick<Set, "_id" | "name" | "code" | "releasedAt">[];
  cards: { _id: string; name: string; number: number; set: string }[];
  sealed: { _id: string; name: string; set: string; type?: string }[];
}

interface Result {
  key: string;
  group: "Binders" | "Wishlists" | "Sets" | "Cards" | "Sealed";
  name: string;
  sub: string;
  set?: Set;
  // Binders and wishlists: the dot of the rails, gold for cards and violet for sealed
  dot?: string;
  // Where it leads: one of the user's lists, a set in the Database, or a card or sealed product to show
  target: { list?: BinderWithItems | WishlistWithItems; set?: string; item?: string; kind?: ItemType };
}

const EMPTY: Results = { sets: [], cards: [], sealed: [] };

const fetchJson = async (url: string, init?: RequestInit) => (await apiFetch(url, init)).json();

// A card or sealed product with the prices of all its versions, as the Database has them
const fetchProduct = async (user: string, kind: ItemType, id: string): Promise<{ product: Product; prices: Map<string, HistoricPrice> } | null> => {
  const data = await fetchJson(kind === ItemType.CARD ? `/api/cards?user=${user}&id=${id}` : `/api/sealed?user=${user}&id=${id}`);
  const item: Card | Sealed | undefined = kind === ItemType.CARD ? data?.card : data?.sealed;
  if (!item) return null;
  const items = (item.variants ?? []).slice(0, LIMITS.HISTORIC_PRICES_BATCH).map((v) => ({ type: kind, item: item._id, language: v.language, variant: "type" in v ? v.type : undefined }));
  const priced = items.length ? await fetchJson(`/api/historic-prices?user=${user}`, { method: "POST", body: JSON.stringify({ items }) }) : null;
  const prices = new Map(((priced?.historicPrices ?? []) as HistoricPrice[]).map((p) => [historicPriceKey(p), p]));
  return { product: (kind === ItemType.CARD ? { kind, item } : { kind, item }) as Product, prices };
};

// Card names carry cardmarket disambiguations like "Charizard (Base Set 4)"
const cleanName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, " ").trim();

// Quick search of the Database from the top bar: a dialog on desktop (also on ⌘K), full screen on mobile
const SearchPalette = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  // A card or sealed product picked in the results: its detail opens right here, as in the Database
  const [found, setFound] = useState<{ product: Product; prices: Map<string, HistoricPrice> } | null>(null);
  const [viewing, setViewing] = useState(false);
  const [adding, setAdding] = useState<{ destination: Destination; variant: number } | null>(null);

  const user = useSelector((state) => state.user.user);
  const { sets, loaded } = useSelector((state) => state.sets);
  const { binders, loaded: bindersLoaded } = useSelector((state) => state.binders);
  const { wishlists, loaded: wishlistsLoaded } = useSelector((state) => state.wishlists);
  const dispatch = useDispatch();
  const router = useRouter();

  // Set names and logos for the results, the user's lists to search, and where "+ Binder" and "+ Wishlist" can add
  useEffect(() => {
    if (!open || !user) return;
    if (!loaded) dispatch(getSets(user));
    if (!bindersLoaded) dispatch(getBinders(user));
    if (!wishlistsLoaded) dispatch(getWishlists(user));
  }, [open, user]);

  // Search as the user types, once they pause
  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    let current = true;
    const timer = setTimeout(() => {
      apiFetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: Results) => current && setResults({ ...EMPTY, ...data }))
        .catch(() => current && setResults(EMPTY))
        .finally(() => current && setLoading(false));
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [q]);

  const items = useMemo(() => {
    const byId = new Map(sets.map((s) => [s._id, s]));
    // Newest sets first, as in the Database
    const release = (id: string) => byId.get(id)?.releasedAt ?? 0;
    const setName = (id: string) => byId.get(id)?.name ?? "";
    // The user's own lists come first, matched by name here
    const needle = q.toLowerCase();
    const named = <T extends { name: string }>(lists: T[]) => (q.length < 2 ? [] : lists.filter((l) => l.name.toLowerCase().includes(needle)));
    const list: Result[] = [
      ...named(binders).map((b) => {
        const summary = summarizeBinder(b);
        return {
          key: `binder-${b._id}`,
          group: "Binders" as const,
          name: b.name,
          sub: summary.count,
          dot: summary.sealed > summary.cards ? "bg-iris" : "bg-gold",
          target: { list: b },
        };
      }),
      ...named(wishlists).map((w) => {
        const summary = summarizeWishlist(w);
        return {
          key: `wishlist-${w._id}`,
          group: "Wishlists" as const,
          name: w.name,
          sub: summary.label,
          dot: summary.sealed > summary.cards ? "bg-iris" : "bg-gold",
          target: { list: w },
        };
      }),
      ...results.sets.map((s) => ({
        key: `set-${s._id}`,
        group: "Sets" as const,
        name: s.name,
        sub: [byId.get(s._id) ? setEra(byId.get(s._id)!) : "", s.releasedAt ? new Date(s.releasedAt).getFullYear() : ""].filter(Boolean).join(" · "),
        set: byId.get(s._id),
        target: { set: s._id },
      })),
      ...[...results.cards]
        .sort((a, b) => release(b.set) - release(a.set) || a.number - b.number)
        .map((c) => ({
          key: `card-${c._id}`,
          group: "Cards" as const,
          name: cleanName(c.name),
          sub: [setName(c.set), `#${c.number}`].filter(Boolean).join(" · "),
          set: byId.get(c.set),
          target: { set: c.set, item: c._id, kind: ItemType.CARD },
        })),
      ...[...results.sealed]
        .sort((a, b) => release(b.set) - release(a.set))
        .map((s) => ({
          key: `sealed-${s._id}`,
          group: "Sealed" as const,
          name: s.name,
          sub: [setName(s.set), s.type].filter(Boolean).join(" · "),
          set: byId.get(s.set),
          target: { set: s.set, item: s._id, kind: ItemType.SEALED },
        })),
    ];
    return list;
  }, [results, sets, binders, wishlists, q]);

  useEffect(() => setActive(0), [items]);

  const close = () => {
    setQuery("");
    onOpenChange(false);
  };

  const go = async (result: Result) => {
    close();
    const { list, set, item, kind } = result.target;
    if (list) {
      if (result.group === "Binders") {
        dispatch(setBinder(list as BinderWithItems));
        router.push("/binders");
      } else {
        dispatch(setWishlist(list as WishlistWithItems));
        router.push("/wishlists");
      }
      return;
    }
    if (!item || !kind || !user) {
      router.push({ pathname: "/database", query: { set } });
      return;
    }
    try {
      const picked = await fetchProduct(user, kind, item);
      if (!picked) return;
      setFound(picked);
      setViewing(true);
    } catch (error) {
      console.error(error);
    }
  };

  const foundSet = found && sets.find((s) => s._id === found.product.item.set);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      setActive(next);
      document.getElementById(`search-${items[next].key}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  };

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(29,27,24,.32)] dark:bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onKeyDown={onKeyDown}
            className={cn(
              fontVariables,
              "fixed z-50 flex flex-col overflow-hidden bg-paper font-geist text-ink outline-none inset-0 pt-[env(safe-area-inset-top)]",
              "md:inset-auto md:top-[12vh] md:left-1/2 md:-translate-x-1/2 md:w-[600px] md:max-w-[calc(100vw-48px)] md:max-h-[70vh] md:pt-0 md:rounded-[14px] md:border md:border-line md:shadow-[0_30px_70px_-30px_rgba(29,27,24,.45)]",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95",
            )}
          >
            <DialogPrimitive.Title className="sr-only">Search the Database</DialogPrimitive.Title>
            <div className="flex items-center flex-none gap-2.5 h-[60px] md:h-14 pl-4 pr-2 md:px-4 border-b border-line">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className="flex-none text-ink-muted">
                <circle cx="7" cy="7" r="5" />
                <line x1="11" y1="11" x2="14.5" y2="14.5" />
              </svg>
              <input
                autoFocus
                aria-label="Search cards, sets, sealed"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cards, sets, sealed…"
                className="flex-1 min-w-0 text-base bg-transparent outline-none md:text-[15px] text-ink placeholder:text-ink-muted"
              />
              <span className="hidden md:inline font-geist-mono font-medium text-[11px] px-1.5 py-0.5 border border-line rounded-[5px] text-ink-muted">esc</span>
              <DialogPrimitive.Close className="h-11 px-2.5 text-sm font-medium cursor-pointer md:hidden">Cancel</DialogPrimitive.Close>
            </div>

            <div className="flex-1 min-h-0 p-2 overflow-y-auto">
              {q.length < 2 ? (
                <p className="px-3 py-8 text-sm text-center text-ink-muted">Type a card, set or product name.</p>
              ) : items.length === 0 ? (
                <p className="px-3 py-8 text-sm text-center text-ink-muted">{loading ? "Searching…" : `Nothing matches “${q}”`}</p>
              ) : (
                items.map((r, i) => (
                  <div key={r.key}>
                    {r.group !== items[i - 1]?.group && <div className="px-2.5 pt-3 pb-1.5 font-geist-mono font-medium text-[11px] tracking-[.08em] uppercase text-ink-muted">{r.group}</div>}
                    <button
                      id={`search-${r.key}`}
                      type="button"
                      onClick={() => go(r)}
                      onMouseMove={() => setActive(i)}
                      className={cn(
                        "grid w-full grid-cols-[36px_minmax(0,1fr)_auto] gap-3 items-center min-h-14 md:min-h-12 px-2.5 py-1.5 text-left rounded-[9px] cursor-pointer",
                        i === active && "bg-chip",
                      )}
                    >
                      {r.set ? (
                        <SetIcon set={r.set} className="w-9 h-5" />
                      ) : r.dot ? (
                        <span className="grid place-items-center">
                          <span className={cn("w-2 h-2 rounded-full", r.dot)} />
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] md:text-sm font-medium">{r.name}</span>
                        <span className="block text-xs truncate text-ink-muted">{r.sub}</span>
                      </span>
                      <span className={cn("hidden md:inline text-xs text-ink-muted", i !== active && "invisible")}>{r.group === "Sets" ? "Open set ↵" : r.target.list ? "Open ↵" : "View ↵"}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <ItemDetail
        target={found && viewing ? { context: "database", product: found.product, prices: found.prices } : null}
        onClose={() => setViewing(false)}
        onAdd={(destination, variant) => {
          setAdding({ destination, variant });
          setViewing(false);
        }}
      />
      {found && foundSet && (
        <AddItemModal
          set={foundSet}
          catalog={{ cards: [], sealed: [], prices: found.prices }}
          product={adding ? found.product : null}
          destination={adding?.destination ?? "binder"}
          initialVariant={adding?.variant}
          onClose={() => setAdding(null)}
        />
      )}
    </>
  );
};

export default SearchPalette;
