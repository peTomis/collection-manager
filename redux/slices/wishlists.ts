import { Wishlist, WishlistToSave, WishlistWithItems } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { DEMO_USER } from "@/types/constants";
import { addDemoWishlistItem, createDemoWishlist, deleteDemoWishlist, deleteDemoWishlistItem, DemoItemDetails, getDemoWishlists } from "@/lib/demo-collection";

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

export function getWishlists(user: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) {
        dispatch(getWishlistsSuccess(await getDemoWishlists()));
        return;
      }
      const response = await fetch(`/api/wishlists?user=${user}&withcards=true`, { method: "GET" });
      const data = await response.json();
      dispatch(getWishlistsSuccess(data?.items ?? []));
    } catch (error) {
      console.error(error);
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

export function createWishlist(user: string, name: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await createDemoWishlist(name);
      else
        await fetch(`/api/wishlists?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wishlist: { name } }),
        });
      await getWishlists(user)(dispatch);
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
