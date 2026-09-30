import { apiFetch } from "@/lib/api-fetch";
import { CardVariantType, ItemType, Price } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";

const initialState: {
  loaded: boolean;
  prices: Price[];
} = {
  loaded: false,
  prices: [],
};

const slice = createSlice({
  name: "prices",
  initialState,

  reducers: {
    getPricesSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      state.prices = payload;
    },
  },
});

export const { getPricesSuccess } = slice.actions;

export default slice.reducer;

export function getPrices(user: string, id: string, type: ItemType, language: string, variant?: CardVariantType) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiFetch(`/api/prices?user=${user}&id=${id}&type=${type}&language=${language}${variant ? `&variant=${variant}` : ""}`, { method: "GET" });
      const data = await response.json();
      dispatch(getPricesSuccess(data?.prices ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}
