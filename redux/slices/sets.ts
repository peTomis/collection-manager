import { apiFetch } from "@/lib/api-fetch";
import { Set } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";

const initialState: {
  loaded: boolean;
  sets: Set[];
  set: Set | null;
} = {
  loaded: false,
  sets: [],
  set: null,
};

const slice = createSlice({
  name: "sets",
  initialState,

  reducers: {
    getSetsSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      payload.sort((a: Set, b: Set) => (a.releasedAt && b.releasedAt ? (a.releasedAt > b.releasedAt ? 1 : -1) : 0));
      state.sets = payload;
    },
    getSetSuccess(state, action) {
      const payload = action.payload;
      state.set = payload;
    },
  },
});

export const { getSetsSuccess, getSetSuccess } = slice.actions;

export default slice.reducer;

export function getSets() {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiFetch(`/api/sets`, { method: "GET" });
      const data = await response.json();
      dispatch(getSetsSuccess(data?.sets ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getSet(id: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiFetch(`/api/sets?id=${id}`, { method: "GET" });
      const data = await response.json();
      dispatch(getSetSuccess(data?.set));
    } catch (error) {
      console.error(error);
    }
  };
}

export function setSet(set: Set | null) {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(getSetSuccess(set));
    } catch (error) {
      console.error(error);
    }
  };
}
