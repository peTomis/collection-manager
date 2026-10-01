import { assertEditable } from "./offline";
// Client-side demo collection for visitors who are not signed in.
// It starts from the static public/demo-collection.json (see scripts/generate-demo.mjs) and every edit is saved
// in this browser's localStorage: the demo never reads or writes the database.
import { BinderItemToCreate, BinderToSave, BinderWithItems, Card, HistoricPrice, Portfolio, Sealed, WishlistItemToCreate, WishlistToSave, WishlistWithItems } from "@/types/mongodb";
import { DEMO_USER } from "@/types/constants";
import { getPrice } from "@/utils/utils";
import { binderAccepts, isOwned } from "@/lib/items";

const STORAGE_KEY = "demo-collection";

interface DemoCollection {
  generatedAt: number;
  binders: BinderWithItems[];
  wishlists: WishlistWithItems[];
  historicValue: { timestamp: number; value: number }[];
}

// Joined documents of an item added from the database page
export interface DemoItemDetails {
  item: Card | Sealed;
  historicPrice: HistoricPrice;
}

// An item created together with its list, with the documents the demo shows it with
export interface NewListItem<T> {
  item: T;
  details: DemoItemDetails;
}

let cache: DemoCollection | null = null;

// Same format as MongoDB ObjectIds, so ids look like the real ones
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

const readStorage = (): DemoCollection | null => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as DemoCollection) : null;
  } catch {
    return null;
  }
};

const load = async (): Promise<DemoCollection> => {
  if (cache) return cache;
  cache = readStorage() ?? ((await (await fetch("/demo-collection.json")).json()) as DemoCollection);
  return cache;
};

const save = (collection: DemoCollection) => {
  cache = collection;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  } catch {
    // Storage full or blocked (e.g. private mode): edits still live until the page is reloaded
  }
};

const update = async (change: (collection: DemoCollection) => void) => {
  const collection = await load();
  assertEditable();
  change(collection);
  save(collection);
};

export const resetDemoCollection = () => {
  assertEditable();
  cache = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

// Linked binder and wishlist: the wishlist holds the binder's missing items, one per version (same rules as lib/mirror.ts)

const priceId = (item: { historicPrice: HistoricPrice }) => item.historicPrice?._id;

// A binder item became (or was created as) missing: the linked wishlist wants it. Owned: it no longer does.
const mirrorToWishlist = (c: DemoCollection, binder: BinderWithItems, item: BinderWithItems["items"][number]) => {
  const wishlist = c.wishlists.find((w) => w._id === binder.wishlist);
  if (!wishlist) return;
  const id = priceId(item);
  wishlist.items = wishlist.items.filter((i) => priceId(i) !== id);
  if (!isOwned(item)) wishlist.items.push({ _id: newId(), name: item.name, type: item.type, wishlist: wishlist._id, item: item.item, historicPrice: item.historicPrice });
};

// Missing binder items gone from the binder leave the linked wishlist too
const unmirrorFromWishlist = (c: DemoCollection, binder: BinderWithItems, removed: BinderWithItems["items"]) => {
  const wishlist = c.wishlists.find((w) => w._id === binder.wishlist);
  const ids = removed.filter((i) => !isOwned(i)).map(priceId);
  if (wishlist && ids.length) wishlist.items = wishlist.items.filter((i) => !ids.includes(priceId(i)));
};

// Point the other list at the new one (or at nothing)
const setLink = (c: DemoCollection, type: "binder" | "wishlist", id: string | undefined, to: string | undefined) => {
  const list = type === "binder" ? c.binders.find((b) => b._id === id) : c.wishlists.find((w) => w._id === id);
  if (!list) return;
  const field = type === "binder" ? "wishlist" : "binder";
  if (to) (list as unknown as Record<string, string>)[field] = to;
  else delete (list as unknown as Record<string, string>)[field];
};

// Binders

// Copies: Redux freezes what it stores, while the cache is edited in place
export const getDemoBinders = async () => structuredClone((await load()).binders);

// Returns the id of the new binder. wishlist: the wishlist to link it to (items already matching)
export const createDemoBinder = async (name: string, set?: string, items: NewListItem<BinderItemToCreate>[] = [], wishlist?: string) => {
  const _id = newId();
  await update((c) => {
    const binder: BinderWithItems = {
      _id,
      user: DEMO_USER as unknown as BinderWithItems["user"],
      name,
      items: [],
      ...(set && { set: set as unknown as BinderWithItems["set"] }),
      ...(wishlist && { wishlist }),
    };
    binder.items = items
      .filter(({ item, details }) => binderAccepts(binder, item.type, details.item))
      .map(({ item, details }) => ({ _id: newId(), name: item.name, type: item.type, binder: _id, quantity: item.quantity, ...(item.owned === false && { owned: false }), ...details }));
    c.binders.push(binder);
    setLink(c, "wishlist", wishlist, _id);
  });
  return _id;
};

export const renameDemoList = (type: "binder" | "wishlist", id: string, name: string) =>
  update((c) => {
    const list = type === "binder" ? c.binders.find((b) => b._id === id) : c.wishlists.find((w) => w._id === id);
    if (list) list.name = name;
  });

export const unlinkDemoBinder = (id: string) =>
  update((c) => {
    const binder = c.binders.find((b) => b._id === id);
    setLink(c, "wishlist", binder?.wishlist, undefined);
    setLink(c, "binder", id, undefined);
  });

export const removeDemoBinderSet = (id: string) =>
  update((c) => {
    const binder = c.binders.find((b) => b._id === id);
    if (binder) delete binder.set;
  });

export const deleteDemoBinder = (id: string) =>
  update((c) => {
    // The linked wishlist goes too
    const binder = c.binders.find((b) => b._id === id);
    c.binders = c.binders.filter((b) => b._id !== id);
    if (binder?.wishlist) c.wishlists = c.wishlists.filter((w) => w._id !== binder.wishlist);
  });

export const saveDemoBinderItem = (item: BinderToSave, details?: DemoItemDetails) =>
  update((c) => {
    const binder = c.binders.find((b) => b._id === item.binder);
    if (!binder) return;
    const existing = item._id ? binder.items.find((i) => i._id === item._id) : undefined;
    if (existing) {
      existing.quantity = item.quantity;
      if (item.owned === false) existing.owned = false;
      else delete existing.owned;
      mirrorToWishlist(c, binder, existing);
      return;
    }
    if (!details || !binderAccepts(binder, item.type, details.item)) return;
    const added = { _id: newId(), name: item.name, type: item.type, binder: item.binder, quantity: item.quantity, ...(item.owned === false && { owned: false }), ...details };
    binder.items.push(added);
    mirrorToWishlist(c, binder, added);
  });

export const deleteDemoBinderItems = (binderId: string, itemIds: string[]) =>
  update((c) => {
    const binder = c.binders.find((b) => b._id === binderId);
    if (!binder) return;
    unmirrorFromWishlist(c, binder, binder.items.filter((i) => itemIds.includes(i._id)));
    binder.items = binder.items.filter((i) => !itemIds.includes(i._id));
  });

export const deleteDemoBinderItem = (binderId: string, itemId: string) => deleteDemoBinderItems(binderId, [itemId]);

// Wishlists

export const getDemoWishlists = async () => structuredClone((await load()).wishlists);

// Returns the id of the new wishlist. binder: the binder to link it to (items already matching)
export const createDemoWishlist = async (name: string, items: NewListItem<WishlistItemToCreate>[] = [], binder?: string) => {
  const _id = newId();
  await update((c) => {
    c.wishlists.push({
      _id,
      user: DEMO_USER as unknown as WishlistWithItems["user"],
      name,
      items: items.map(({ item, details }) => ({ _id: newId(), name: item.name, type: item.type, wishlist: _id, target: item.target, ...details })),
      ...(binder && { binder }),
    });
    setLink(c, "binder", binder, _id);
  });
  return _id;
};

export const deleteDemoWishlist = (id: string) =>
  update((c) => {
    // The linked binder goes too
    const wishlist = c.wishlists.find((w) => w._id === id);
    c.wishlists = c.wishlists.filter((w) => w._id !== id);
    if (wishlist?.binder) c.binders = c.binders.filter((b) => b._id !== wishlist.binder);
  });

export const addDemoWishlistItem = (item: WishlistToSave, details?: DemoItemDetails) =>
  update((c) => {
    const wishlist = c.wishlists.find((w) => w._id === item.wishlist);
    if (!wishlist || !details) return;
    wishlist.items.push({ _id: newId(), name: item.name, type: item.type, wishlist: item.wishlist, target: item.target, ...details });
    // The linked binder tracks it as missing, unless it has it already or can't take it
    const binder = c.binders.find((b) => b._id === wishlist.binder);
    if (binder && binderAccepts(binder, item.type, details.item) && !binder.items.some((i) => priceId(i) === details.historicPrice._id)) {
      binder.items.push({ _id: newId(), name: item.name, type: item.type, binder: binder._id, quantity: 1, owned: false, ...details });
    }
  });

export const setDemoWishlistItemTarget = (wishlistId: string, itemId: string, target?: number) =>
  update((c) => {
    const item = c.wishlists.find((w) => w._id === wishlistId)?.items.find((i) => i._id === itemId);
    if (item) item.target = target;
  });

export const deleteDemoWishlistItem = (wishlistId: string, itemId: string) =>
  update((c) => {
    const wishlist = c.wishlists.find((w) => w._id === wishlistId);
    if (!wishlist) return;
    const removed = wishlist.items.find((i) => i._id === itemId);
    wishlist.items = wishlist.items.filter((i) => i._id !== itemId);
    // No longer tracked as missing in the linked binder (owned copies stay)
    const binder = c.binders.find((b) => b._id === wishlist.binder);
    if (binder && removed) binder.items = binder.items.filter((i) => isOwned(i) || priceId(i) !== priceId(removed));
  });

// Portfolio: current value from the demo binders, history rescaled so it ends at that value

export const getDemoPortfolio = async (): Promise<Portfolio> => {
  const { binders, historicValue } = await load();
  const items = binders.flatMap((b) => b.items).filter(isOwned);
  const valueOf = (type: string) => items.filter((i) => i.type === type).reduce((acc, i) => acc + getPrice(i.historicPrice) * i.quantity, 0);
  const quantityOf = (type: string) => items.filter((i) => i.type === type).reduce((acc, i) => acc + i.quantity, 0);

  const cardsValue = valueOf("card");
  const sealedValue = valueOf("sealed");
  const value = cardsValue + sealedValue;
  const last = historicValue[historicValue.length - 1]?.value ?? 0;
  const scale = (ratio: number) => historicValue.map((point) => ({ ...point, value: last ? (point.value * ratio) / last : 0 }));

  return {
    _id: DEMO_USER,
    user: DEMO_USER as unknown as Portfolio["user"],
    value,
    historicValue: scale(value),
    cardsQuantity: quantityOf("card"),
    cardsValue,
    historicCardsValue: scale(cardsValue),
    sealedQuantity: quantityOf("sealed"),
    sealedValue,
    historicSealedValue: scale(sealedValue),
  };
};
