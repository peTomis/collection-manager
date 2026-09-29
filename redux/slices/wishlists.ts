import { BinderWithItems, WishlistItem, WishlistItemToCreate, WishlistToSave, WishlistWithItems } from "@/types/mongodb";
import { addBinderItem, changeBinderItemQuantity, getBinders } from "./binders";
import { isOwned } from "@/lib/items";
import { LIMITS } from "@/lib/limits";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { DEMO_USER } from "@/types/constants";
import { addDemoWishlistItem, createDemoWishlist, deleteDemoWishlist, deleteDemoWishlistItem, DemoItemDetails, getDemoWishlists, NewListItem, renameDemoList, setDemoWishlistItemTarget } from "@/lib/demo-collection";

const initialState: {
  wishlist: null | WishlistWithItems;
  wishlists: WishlistWithItems[];
  loaded: boolean;
  loading: boolean;
} = {
  loaded: false,
  wishlists: [],
  wishlist: null,
  loading: false,
};

const slice = createSlice({
  name: "wishlists",
  initialState,

  reducers: {
    getWishlistsSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      state.wishlists = payload;
      state.loading = false;
    },
    setWishlistSuccess(state, action) {
      state.wishlist = action.payload;
    },
    startLoading(state) {
      state.loaded = false;
      state.loading = true;
    },
  },
});

export const { startLoading, getWishlistsSuccess, setWishlistSuccess } = slice.actions;

export default slice.reducer;

// After a change that a linked binder mirrors: the wishlists and the binders
const refresh = (user: string, dispatch: Dispatch) => Promise.all([getWishlists(user)(dispatch), getBinders(user)(dispatch)]);

// Returns the wishlists it fetched
export function getWishlists(user: string) {
  return async (dispatch: Dispatch): Promise<WishlistWithItems[]> => {
    try {
      const wishlists: WishlistWithItems[] =
        user === DEMO_USER ? await getDemoWishlists() : ((await (await fetch(`/api/wishlists?user=${user}&withcards=true`, { method: "GET" })).json())?.items ?? []);
      dispatch(getWishlistsSuccess(wishlists));
      return wishlists;
    } catch (error) {
      console.error(error);
      return [];
    }
  };
}

export function setWishlist(wishlist: WishlistWithItems | null) {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setWishlistSuccess(wishlist));
    } catch (error) {
      console.error(error);
    }
  };
}

// items: the wishlist's first items. binder: a binder to link it to, whose missing items already match these.
// The new wishlist becomes the selected one. Returns its id, or null if it wasn't created.
export function createWishlist(user: string, name: string, items: NewListItem<WishlistItemToCreate>[] = [], binder?: string) {
  return async (dispatch: Dispatch): Promise<string | null> => {
    try {
      let id: string | undefined;
      if (user === DEMO_USER) id = await createDemoWishlist(name, items, binder);
      else {
        const response = await fetch(`/api/wishlists?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wishlist: { name, ...(binder && { binder }) }, items: items.map((i) => i.item) }),
        });
        if (!response.ok) return null;
        id = (await response.json())?.item?._id;
      }
      const [wishlists] = await refresh(user, dispatch);
      const created = wishlists.find((w) => w._id === id);
      if (created) dispatch(setWishlistSuccess(created));
      return id ?? null;
    } catch (error) {
      console.error(error);
      return null;
    }
  };
}

export function renameWishlist(user: string, id: string, name: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await renameDemoList("wishlist", id, name);
      else
        await fetch(`/api/wishlists?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rename: { id, name } }),
        });
      await refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

export function deleteWishlist(user: string, id: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await deleteDemoWishlist(id);
      else
        await fetch(`/api/wishlists?user=${user}&id=${id}`, {
          method: "DELETE",
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

// details: joined item and price, needed to show the item in the demo collection
export function addWishlistItem(user: string, item: WishlistToSave, details?: DemoItemDetails) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await addDemoWishlistItem(item, details);
      else
        await fetch(`/api/wishlists?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ item }),
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

// target: the price the user wants to pay, undefined to clear it
export function setWishlistItemTarget(user: string, item: WishlistItem, target?: number) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await setDemoWishlistItemTarget(item.wishlist, item._id, target);
      else {
        const toSave: WishlistToSave = { _id: item._id, name: item.name, type: item.type, item: item.item._id, historicPrice: item.historicPrice._id, wishlist: item.wishlist, target };
        await fetch(`/api/wishlists?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ item: toSave }),
        });
      }
      getWishlists(user)(dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

export function deleteWishlistItem(user: string, wishlistId: string, itemId: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await deleteDemoWishlistItem(wishlistId, itemId);
      else
        await fetch(`/api/wishlists?user=${user}&id=${wishlistId}&itemId=${itemId}`, {
          method: "DELETE",
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

// Bought: into the binder (filling its missing slot, or one more copy), then off the wishlist.
// In order, so a linked wishlist doesn't drop the binder's slot before it is marked owned (which already takes it off the wishlist).
export function acquireWishlistItem(user: string, item: WishlistItem, binder: BinderWithItems) {
  return async (dispatch: Dispatch) => {
    try {
      const existing = binder.items.find((i) => i.historicPrice?._id === item.historicPrice?._id);
      if (existing) {
        const quantity = isOwned(existing) ? Math.min(existing.quantity + 1, LIMITS.QUANTITY) : 1;
        await changeBinderItemQuantity(user, { ...existing, quantity, owned: true, item: existing.item._id, historicPrice: existing.historicPrice._id })(dispatch);
      } else {
        await addBinderItem(
          user,
          { name: item.name, type: item.type, item: item.item._id, historicPrice: item.historicPrice._id, quantity: 1, binder: binder._id },
          { item: item.item, historicPrice: item.historicPrice }
        )(dispatch);
      }
      if (binder.wishlist !== item.wishlist) await deleteWishlistItem(user, item.wishlist, item._id)(dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}
