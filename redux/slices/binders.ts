import { Binder, BinderToSave, BinderWithItems } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { DEMO_USER } from "@/types/constants";
import { createDemoBinder, deleteDemoBinder, deleteDemoBinderItem, DemoItemDetails, getDemoBinders, saveDemoBinderItem } from "@/lib/demo-collection";

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

export function getBinders(user: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) {
        dispatch(getBindersSuccess(await getDemoBinders()));
        return;
      }
      const response = await fetch(`/api/binders?user=${user}&withcards=true`, { method: "GET" });
      const data = await response.json();
      dispatch(getBindersSuccess(data?.items ?? []));
    } catch (error) {
      console.error(error);
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

// set: id of the set for a set binder, which only takes cards of that set
export function createBinder(user: string, name: string, set?: string) {
  return async (dispatch: Dispatch) => {
    try {
      if (user === DEMO_USER) await createDemoBinder(name, set);
      else
        await fetch(`/api/binders?user=${user}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ binder: { name, ...(set && { set }) } }),
        });
      await getBinders(user)(dispatch);
    } catch (error) {
      console.error(error);
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
      getBinders(user)(dispatch);
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
          body: JSON.stringify({ item }),
        });
      getBinders(user)(dispatch);
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
          body: JSON.stringify({ item }),
        });
      getBinders(user)(dispatch);
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
      getBinders(user)(dispatch);
    } catch (error) {
      console.error(error);
    }
  };
}
