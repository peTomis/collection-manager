import { Sealed } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";

const initialState: {
  loaded: boolean;
  sealed: Sealed[];
  singleSealed: Sealed | null;
} = {
  loaded: false,
  sealed: [],
  singleSealed: null,
};

const slice = createSlice({
  name: "sealed",
  initialState,

  reducers: {
    getSealedSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      state.sealed = payload;
    },
    clearSealedSuccess(state) {
      state.loaded = false;
      state.sealed = [];
    },
    getSingleSealedSuccess(state, action) {
      const payload = action.payload;
      state.singleSealed = payload;
    },
  },
});

export const { getSealedSuccess, getSingleSealedSuccess, clearSealedSuccess } = slice.actions;

export default slice.reducer;

export function getSealed(user: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/sealed?user=${user}`, { method: "GET" });
      const data = await response.json();
      dispatch(getSealedSuccess(data?.sealed ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getSealedBySet(user: string, set: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/sealed?user=${user}&set=${set}`, { method: "GET" });
      const data = await response.json();
      dispatch(getSealedSuccess(data?.sealed ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getSealedByType(user: string, type: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/sealed?user=${user}&type=${type}`, { method: "GET" });
      const data = await response.json();
      dispatch(getSealedSuccess(data?.sealed ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function setSingleSealed(sealed: Sealed | null) {
  return async (dispatch: Dispatch) => {
    dispatch(getSingleSealedSuccess(sealed));
  };
}

export function getSingleSealed(user: string, id: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/sealed?id=${id}&user=${user}`, { method: "GET" });
      const data = await response.json();
      dispatch(getSingleSealedSuccess(data?.sealed));
    } catch (error) {
      console.error(error);
    }
  };
}

export function clearSealed() {
  return async (dispatch: Dispatch) => {
    dispatch(clearSealedSuccess());
  };
}
