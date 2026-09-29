import { WishlistItem, WishlistItemToCreate, WishlistToSave, WishlistWithItems } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { DEMO_USER } from "@/types/constants";
import { addDemoWishlistItem, createDemoWishlist, deleteDemoWishlist, deleteDemoWishlistItem, DemoItemDetails, getDemoWishlists, NewListItem, setDemoWishlistItemTarget } from "@/lib/demo-collection";

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

// items: the wishlist's first items. The new wishlist becomes the selected one. Returns whether it was created.
export function createWishlist(user: string, name: string, items: NewListItem<WishlistItemToCreate>[] = []) {
  return async (dispatch: Dispatch): Promise<boolean> => {
    try {
      let id: string | undefined;
      if (user === DEMO_USER) id = await createDemoWishlist(name, items);
      else {
        const response = await fetch(`/api/wishlists?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wishlist: { name }, items: items.map((i) => i.item) }),
        });
        if (!response.ok) return false;
        id = (await response.json())?.item?._id;
      }
      const wishlists = await getWishlists(user)(dispatch);
      const created = wishlists.find((w) => w._id === id);
      if (created) dispatch(setWishlistSuccess(created));
      return true;
    } catch (error) {
      console.error(error);
      return false;
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
      getWishlists(user)(dispatch);
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
      getWishlists(user)(dispatch);
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
      getWishlists(user)(dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}
