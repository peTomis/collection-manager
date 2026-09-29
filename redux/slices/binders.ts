import { BinderItemToCreate, BinderToSave, BinderWithItems } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { DEMO_USER } from "@/types/constants";
import { getPortfolio } from "./portfolio";
import { createDemoBinder, deleteDemoBinder, deleteDemoBinderItem, deleteDemoBinderItems, DemoItemDetails, getDemoBinders, NewListItem, saveDemoBinderItem } from "@/lib/demo-collection";

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

// After a change to what the user owns: the binders and the portfolio totals computed from them
const refresh = (user: string, dispatch: Dispatch) => Promise.all([getBinders(user)(dispatch), getPortfolio(user)(dispatch)]);

// Returns the binders it fetched
export function getBinders(user: string) {
  return async (dispatch: Dispatch): Promise<BinderWithItems[]> => {
    try {
      const binders: BinderWithItems[] = user === DEMO_USER ? await getDemoBinders() : ((await (await fetch(`/api/binders?user=${user}&withcards=true`, { method: "GET" })).json())?.items ?? []);
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
// The new binder becomes the selected one. Returns whether it was created.
export function createBinder(user: string, name: string, set?: string, items: NewListItem<BinderItemToCreate>[] = []) {
  return async (dispatch: Dispatch): Promise<boolean> => {
    try {
      let id: string | undefined;
      if (user === DEMO_USER) id = await createDemoBinder(name, set, items);
      else {
        const response = await fetch(`/api/binders?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ binder: { name, ...(set && { set }) }, items: items.map((i) => i.item) }),
        });
        if (!response.ok) return false;
        id = (await response.json())?.item?._id;
      }
      const [binders] = await refresh(user, dispatch);
      const created = binders.find((b) => b._id === id);
      if (created) dispatch(setBinderSuccess(created));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
}

export function deleteBinder(user: string, id: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await deleteDemoBinder(id);
      else
        await fetch(`/api/binders?user=${user}&id=${id}`, {
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
      if (user === DEMO_USER) await saveDemoBinderItem(item, details);
      else
        await fetch(`/api/binders?user=${user}`, {
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
      if (user === DEMO_USER) await saveDemoBinderItem(item, details);
      else
        await fetch(`/api/binders?user=${user}`, {
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
      if (user === DEMO_USER) await deleteDemoBinderItems(binderId, itemIds);
      else
        await fetch(`/api/binders?user=${user}&id=${binderId}`, {
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
      if (user === DEMO_USER) await deleteDemoBinderItem(binderId, itemId);
      else
        await fetch(`/api/binders?user=${user}&id=${binderId}&itemId=${itemId}`, {
          method: "DELETE",
        });
      refresh(user, dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}
