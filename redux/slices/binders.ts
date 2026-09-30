import { assertEditable, isOffline } from "@/lib/offline";
import { apiFetch } from "@/lib/api-fetch";
import { BinderItemToCreate, BinderToSave, BinderWithItems } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { DEMO_USER } from "@/types/constants";
import { getPortfolio } from "./portfolio";
import { getWishlists } from "./wishlists";
import { createDemoBinder, deleteDemoBinder, deleteDemoBinderItem, deleteDemoBinderItems, DemoItemDetails, renameDemoList, unlinkDemoBinder, getDemoBinders, NewListItem, saveDemoBinderItem } from "@/lib/demo-collection";

const initialState: {
  binder: null | BinderWithItems;
  binders: BinderWithItems[];
  loaded: boolean;
  loading: boolean;
} = {
  loaded: false,
  binders: [],
  binder: null,
  loading: false,
};

const slice = createSlice({
  name: "binders",
  initialState,

  reducers: {
    getBindersSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      state.binders = payload;
      state.loading = false;
    },
    setBinderSuccess(state, action) {
      state.binder = action.payload;
    },
    startLoading(state) {
      state.loaded = false;
      state.loading = true;
    },
  },
});

export const { startLoading, getBindersSuccess, setBinderSuccess } = slice.actions;

export default slice.reducer;

// Only the fields the API takes: callers often spread a joined BinderItem, whose extra fields (user, …) it rejects
const toSave = (item: BinderToSave): BinderToSave => ({
  ...(item._id && { _id: item._id }),
  name: item.name,
  type: item.type,
  item: item.item,
  historicPrice: item.historicPrice,
  quantity: item.quantity,
  binder: item.binder,
  ...(item.owned === false && { owned: false }),
});

// After a change to what the user owns: the binders, the portfolio totals computed from them, and the wishlists linked binders mirror
const refresh = (user: string, dispatch: Dispatch) => Promise.all([getBinders(user)(dispatch), getPortfolio(user)(dispatch), getWishlists(user)(dispatch)]);

// Returns the binders it fetched
export function getBinders(user: string) {
  return async (dispatch: Dispatch): Promise<BinderWithItems[]> => {
    try {
      const binders: BinderWithItems[] = user === DEMO_USER && !isOffline() ? await getDemoBinders() : ((await (await apiFetch(`/api/binders?user=${user}&withcards=true`, { method: "GET" })).json())?.items ?? []);
      dispatch(getBindersSuccess(binders));
      return binders;
    } catch (error) {
      console.error(error);
      return [];
    }
  };
}

export function setBinder(binder: BinderWithItems | null) {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setBinderSuccess(binder));
    } catch (error) {
      console.error(error);
    }
  };
}

// set: id of the set for a set binder, which only takes cards of that set. items: the binder's first items.
// wishlist: a wishlist to link it to, whose items already match the binder's missing ones.
// The new binder becomes the selected one. Returns its id, or null if it wasn't created.
export function createBinder(user: string, name: string, set?: string, items: NewListItem<BinderItemToCreate>[] = [], wishlist?: string) {
  return async (dispatch: Dispatch): Promise<string | null> => {
    try {
      assertEditable();
      let id: string | undefined;
      if (user === DEMO_USER) id = await createDemoBinder(name, set, items, wishlist);
      else {
        const response = await apiFetch(`/api/binders?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ binder: { name, ...(set && { set }), ...(wishlist && { wishlist }) }, items: items.map((i) => i.item) }),
        });
        if (!response.ok) return null;
        id = (await response.json())?.item?._id;
      }
      const [binders] = await refresh(user, dispatch);
      const created = binders.find((b) => b._id === id);
      if (created) dispatch(setBinderSuccess(created));
      return id ?? null;
    } catch (error) {
      console.error(error);
      return null;
    }
  };
}

export function renameBinder(user: string, id: string, name: string) {
  return async (dispatch: Dispatch) => {
    try {
      assertEditable();
      if (user === DEMO_USER) await renameDemoList("binder", id, name);
      else
        await apiFetch(`/api/binders?user=${user}`, {
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

// The binder and its wishlist both stay, and stop mirroring each other
export function unlinkBinder(user: string, id: string) {
  return async (dispatch: Dispatch) => {
    try {
      assertEditable();
      if (user === DEMO_USER) await unlinkDemoBinder(id);
      else
        await apiFetch(`/api/binders?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ unlink: id }),
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

export function deleteBinder(user: string, id: string) {
  return async (dispatch: Dispatch) => {
    try {
      assertEditable();
      if (user === DEMO_USER) await deleteDemoBinder(id);
      else
        await apiFetch(`/api/binders?user=${user}&id=${id}`, {
          method: "DELETE",
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

// details: joined item and price, needed to show the item in the demo collection
export function addBinderItem(user: string, item: BinderToSave, details?: DemoItemDetails) {
  return async (dispatch: Dispatch) => {
    try {
      assertEditable();
      if (user === DEMO_USER) await saveDemoBinderItem(item, details);
      else
        await apiFetch(`/api/binders?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ item: toSave(item) }),
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

export function changeBinderItemQuantity(user: string, item: BinderToSave, details?: DemoItemDetails) {
  return async (dispatch: Dispatch) => {
    try {
      assertEditable();
      if (user === DEMO_USER) await saveDemoBinderItem(item, details);
      else
        await apiFetch(`/api/binders?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ item: toSave(item) }),
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

export function deleteBinderItems(user: string, binderId: string, itemIds: string[]) {
  return async (dispatch: Dispatch) => {
    try {
      assertEditable();
      if (user === DEMO_USER) await deleteDemoBinderItems(binderId, itemIds);
      else
        await apiFetch(`/api/binders?user=${user}&id=${binderId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ itemIds }),
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}

export function deleteBinderItem(user: string, binderId: string, itemId: string) {
  return async (dispatch: Dispatch) => {
    try {
      assertEditable();
      if (user === DEMO_USER) await deleteDemoBinderItem(binderId, itemId);
      else
        await apiFetch(`/api/binders?user=${user}&id=${binderId}&itemId=${itemId}`, {
          method: "DELETE",
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}
