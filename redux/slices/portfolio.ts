import { isOffline } from "@/lib/offline";
import { apiFetch } from "@/lib/api-fetch";
import { ItemType, Portfolio } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { DEMO_USER } from "@/types/constants";
import { getDemoPortfolio } from "@/lib/demo-collection";

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
      if (user === DEMO_USER && !isOffline()) {
        dispatch(getPortfolioSuccess(await getDemoPortfolio()));
        return;
      }
      const response = await apiFetch(`/api/portfolios?user=${user}`, { method: "GET" });
      const data = await response.json();
      if (data.portfolio) dispatch(getPortfolioSuccess(data?.portfolio));
    } catch (error) {
      console.error(error);
    }
  };
}
