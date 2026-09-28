import { ItemType, Portfolio } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";

const initialState: {
  portfolio: Portfolio | undefined;
} = {
  portfolio: undefined,
};

const slice = createSlice({
  name: "portfolio",
  initialState,

  reducers: {
    getPortfolioSuccess(state, action) {
      const payload = action.payload;
      state.portfolio = payload;
    },
  },
});

export const { getPortfolioSuccess } = slice.actions;

export default slice.reducer;

export function getPortfolio(user: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/portfolios?user=${user}`, { method: "GET" });
      const data = await response.json();
      if (data.portfolio) dispatch(getPortfolioSuccess(data?.portfolio));
    } catch (error) {
      console.error(error);
    }
  };
}
