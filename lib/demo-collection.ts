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
  change(collection);
  save(collection);
};

export const resetDemoCollection = () => {
  cache = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

// Binders

// Copies: Redux freezes what it stores, while the cache is edited in place
export const getDemoBinders = async () => structuredClone((await load()).binders);

// Returns the id of the new binder
export const createDemoBinder = async (name: string, set?: string, items: NewListItem<BinderItemToCreate>[] = []) => {
  const _id = newId();
  await update((c) => {
    const binder: BinderWithItems = { _id, user: DEMO_USER as unknown as BinderWithItems["user"], name, items: [], ...(set && { set: set as unknown as BinderWithItems["set"] }) };
    binder.items = items
      .filter(({ item, details }) => binderAccepts(binder, item.type, details.item))
      .map(({ item, details }) => ({ _id: newId(), name: item.name, type: item.type, binder: _id, quantity: item.quantity, ...(item.owned === false && { owned: false }), ...details }));
    c.binders.push(binder);
  });
  return _id;
};

export const deleteDemoBinder = (id: string) =>
  update((c) => {
    c.binders = c.binders.filter((b) => b._id !== id);
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
      return;
    }
    if (!details || !binderAccepts(binder, item.type, details.item)) return;
    binder.items.push({ _id: newId(), name: item.name, type: item.type, binder: item.binder, quantity: item.quantity, ...(item.owned === false && { owned: false }), ...details });
  });

export const deleteDemoBinderItems = (binderId: string, itemIds: string[]) =>
  update((c) => {
    const binder = c.binders.find((b) => b._id === binderId);
    if (binder) binder.items = binder.items.filter((i) => !itemIds.includes(i._id));
  });

export const deleteDemoBinderItem = (binderId: string, itemId: string) =>
  update((c) => {
    const binder = c.binders.find((b) => b._id === binderId);
    if (binder) binder.items = binder.items.filter((i) => i._id !== itemId);
  });

// Wishlists

export const getDemoWishlists = async () => structuredClone((await load()).wishlists);

// Returns the id of the new wishlist
export const createDemoWishlist = async (name: string, items: NewListItem<WishlistItemToCreate>[] = []) => {
  const _id = newId();
  await update((c) => {
    c.wishlists.push({
      _id,
      user: DEMO_USER as unknown as WishlistWithItems["user"],
      name,
      items: items.map(({ item, details }) => ({ _id: newId(), name: item.name, type: item.type, wishlist: _id, target: item.target, ...details })),
    });
  });
  return _id;
};

export const deleteDemoWishlist = (id: string) =>
  update((c) => {
    c.wishlists = c.wishlists.filter((w) => w._id !== id);
  });

export const addDemoWishlistItem = (item: WishlistToSave, details?: DemoItemDetails) =>
  update((c) => {
    const wishlist = c.wishlists.find((w) => w._id === item.wishlist);
    if (!wishlist || !details) return;
    wishlist.items.push({ _id: newId(), name: item.name, type: item.type, wishlist: item.wishlist, target: item.target, ...details });
  });

export const setDemoWishlistItemTarget = (wishlistId: string, itemId: string, target?: number) =>
  update((c) => {
    const item = c.wishlists.find((w) => w._id === wishlistId)?.items.find((i) => i._id === itemId);
    if (item) item.target = target;
  });

export const deleteDemoWishlistItem = (wishlistId: string, itemId: string) =>
  update((c) => {
    const wishlist = c.wishlists.find((w) => w._id === wishlistId);
    if (wishlist) wishlist.items = wishlist.items.filter((i) => i._id !== itemId);
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
