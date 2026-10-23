// What a new binder or wishlist made from a set holds: the set's items in the chosen languages and versions,
// and the items each list is created with. The form is components/organisms/new-list-modal.tsx.
import { BinderItemToCreate, BinderWithItems, Card, CardVariantType, HistoricPrice, ItemType, Language, Sealed, WishlistItemToCreate } from "@/types/mongodb";
import { Catalog, priceKey } from "@/lib/catalog";
import type { NewListItem } from "@/lib/demo-collection";
import { getPrice } from "@/lib/prices";
import { isOwned } from "@/lib/items";
import { eur } from "@/lib/format";
import { LIMITS } from "@/lib/limits";

export type ListType = "binder" | "wishlist";
export type Scope = "cards" | "sealed" | "both";

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: Language.ENGLISH, label: "English" },
  { value: Language.ITALIAN, label: "Italian" },
  { value: Language.JAPANESE, label: "Japanese" },
];

// Versions in the order they are offered
export const VERSIONS = [CardVariantType.REGULAR, CardVariantType.FIRST_EDITION, CardVariantType.SHADOWLESS, CardVariantType.REVERSE_HOLO, CardVariantType.ONE_STAR, CardVariantType.TWO_STAR];

export interface Candidate {
  name: string;
  type: ItemType;
  item: Card | Sealed;
  historicPrice?: HistoricPrice;
}

// One entry per card version and sealed product of the set in scope that exists in the chosen languages and versions
export const candidatesOf = (catalog: Catalog, scope: Scope, languages: Language[], versions: CardVariantType[]): Candidate[] => [
  ...(scope === "sealed" ? [] : catalog.cards).flatMap((c) =>
    c.variants
      .filter((v) => languages.includes(v.language) && versions.includes(v.type))
      .map((v) => ({ name: c.name, type: ItemType.CARD, item: c, historicPrice: catalog.prices.get(priceKey(c._id, v.language, v.type)) }))
  ),
  ...(scope === "cards" ? [] : catalog.sealed).flatMap((s) =>
    s.variants.filter((v) => languages.includes(v.language)).map((v) => ({ name: s.name, type: ItemType.SEALED, item: s, historicPrice: catalog.prices.get(priceKey(s._id, v.language)) }))
  ),
];

// What the set has to offer: languages with something in scope, and versions of its cards in those languages
export const availableLanguages = (catalog: Catalog, scope: Scope) => LANGUAGES.filter((l) => candidatesOf(catalog, scope, [l.value], VERSIONS).length > 0);
export const availableVersions = (catalog: Catalog, languages: Language[]) =>
  VERSIONS.filter((v) => catalog.cards.some((c) => c.variants.some((cv) => cv.type === v && languages.includes(cv.language))));

// The chosen options the set offers, or its first one when none of them is (e.g. after changing set)
export const pickAvailable = <T>(chosen: T[], available: T[]): T[] => {
  const picked = chosen.filter((c) => available.includes(c));
  return picked.length ? picked : available.slice(0, 1);
};

// Toggle a value of a multi-select, keeping at least one
export const toggle = <T>(values: T[], value: T) => (values.includes(value) ? (values.length > 1 ? values.filter((v) => v !== value) : values) : [...values, value]);

// Versions already owned in any binder, by price id (one per item, language and version)
export const ownedPriceIds = (binders: BinderWithItems[]) => new Set(binders.flatMap((b) => b.items.filter(isOwned).map((i) => i.historicPrice?._id)));

// Items owned per set, shown in the set picker
export const ownedCountBySet = (binders: BinderWithItems[]) => {
  const counts = new Map<string, number>();
  for (const i of binders.flatMap((b) => b.items).filter(isOwned)) if (i.item?.set) counts.set(i.item.set, (counts.get(i.item.set) ?? 0) + 1);
  return counts;
};

// The target discount as typed: a percentage below the current price, 0 when empty, null when it isn't one
export const parseDiscount = (text: string): number | null => {
  if (text.trim() === "") return 0;
  const percent = Number(text.replace(",", "."));
  return Number.isFinite(percent) && percent >= 0 && percent < 100 ? percent : null;
};

// The candidates that go in: only those with a price (the lists need one), optionally without what's owned already
export const selectCandidates = (candidates: Candidate[], owned: Set<string | undefined>, skipOwned: boolean) => {
  const isOwnedAlready = (c: Candidate) => !!c.historicPrice && owned.has(c.historicPrice._id);
  const toAdd = candidates.filter((c) => c.historicPrice && !(skipOwned && isOwnedAlready(c)));
  return {
    toAdd,
    ownedCount: candidates.filter(isOwnedAlready).length,
    withoutPrice: candidates.filter((c) => !c.historicPrice).length,
    total: toAdd.reduce((acc, c) => acc + getPrice(c.historicPrice!), 0),
  };
};

export interface ListOptions {
  type: ListType;
  // Binders: the set's items go in as missing slots (completion tracked) rather than owned
  missing: boolean;
  // Also create the other kind of list, linked to this one
  linked: boolean;
  // Target price of wishlist items, as a percentage below the current price (0: no target)
  discount: number;
}

// What the wishlist gets: the set's items when it is the wishlist, the missing ones when it mirrors a binder
export const wishlistGetsItems = ({ type, linked, missing }: Pick<ListOptions, "type" | "linked" | "missing">) => type === "wishlist" || (linked && missing);

// The items each list is created with (both, for a linked pair). The binder's are missing when they mirror a wishlist.
export const listItems = (toAdd: Candidate[], options: ListOptions) => {
  const details = (c: Candidate) => ({ item: c.item, historicPrice: c.historicPrice! });
  const base = (c: Candidate) => ({ name: c.name, type: c.type, item: c.item._id, historicPrice: c.historicPrice!._id });
  const target = (c: Candidate) => (options.discount ? Math.round(getPrice(c.historicPrice!) * (100 - options.discount)) / 100 : undefined);
  const owned = options.type === "binder" && !options.missing;
  const binderItems: NewListItem<BinderItemToCreate>[] = toAdd.map((c) => ({ item: { ...base(c), quantity: 1, ...(!owned && { owned: false }) }, details: details(c) }));
  const wishlistItems: NewListItem<WishlistItemToCreate>[] = wishlistGetsItems(options) ? toAdd.map((c) => ({ item: { ...base(c), target: target(c) }, details: details(c) })) : [];
  return { binderItems, wishlistItems };
};

// A set binder only takes cards of its set, so a set with sealed products becomes an ordinary binder
export const setBinderOf = (setId: string, scope: Scope) => (scope === "cards" ? setId : undefined);

const itemsLabel = (n: number) => (n === 1 ? "1 item" : `${n} items`);

// The line under the form: what creating the list will do, or why it can't yet
export const newListSummary = (
  options: Omit<ListOptions, "discount"> & { set?: { name: string }; loading: boolean; toAdd: number; total: number; withoutPrice: number }
): string => {
  const { type, missing, linked, set, loading, toAdd, total, withoutPrice } = options;
  if (!set) return linked ? "Both start empty. Missing items stay in sync." : "Starts empty. Add items from the Database.";
  if (loading) return `Loading ${set.name}…`;
  if (toAdd > LIMITS.ITEMS_PER_LIST) return `${toAdd} items: a ${type} holds up to ${LIMITS.ITEMS_PER_LIST}`;
  if (toAdd === 0) return "Nothing to add with these options.";
  const isBinder = type === "binder";
  return [
    missing ? `${toAdd} slots added as missing, completion tracked` : isBinder ? `${itemsLabel(toAdd)} added as owned` : `${itemsLabel(toAdd)} · about ${eur(total)} to complete`,
    linked && (isBinder ? (missing ? "same in a linked wishlist" : "linked wishlist starts empty") : "tracked as missing in a linked binder"),
    withoutPrice && `${withoutPrice} without a price left out`,
  ]
    .filter(Boolean)
    .join(" · ");
};
