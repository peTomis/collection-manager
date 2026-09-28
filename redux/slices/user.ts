import { createSlice, Dispatch } from "@reduxjs/toolkit";

const initialState: {
  user: string | null;
} = {
  user: null,
};

const slice = createSlice({
  name: "user",
  initialState,

  reducers: {
    setUserSuccess(state, action) {
      state.user = action.payload;
    },
    deleteUserSuccess(state) {
      state.user = null;
    },
  },
});

export const { setUserSuccess, deleteUserSuccess } = slice.actions;

export default slice.reducer;

export function setUser(user: string) {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setUserSuccess(user));
    } catch (error) {
      console.error(error);
    }
  };
}

export function deleteUser() {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(deleteUserSuccess());
    } catch (error) {
      console.error(error);
    }
  };
}
