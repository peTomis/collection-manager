import { Card, CardVariantType, HistoricPrice, ItemType as Foo, Language, Sealed, Item } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";
import { RootState } from "../store";

const initialState: {
  loaded: boolean;
  historicPrices: HistoricPrice[];
  historicPrice: HistoricPrice | undefined;
} = {
  loaded: false,
  historicPrices: [],
  historicPrice: undefined,
};

const slice = createSlice({
  name: "historicPrices",
  initialState,

  reducers: {
    getHistoricPricesSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      state.historicPrices = payload;
    },
    getHistoricPriceSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      state.historicPrice = payload;
    },
  },
});

export const { getHistoricPricesSuccess } = slice.actions;

export default slice.reducer;

export function getHistoricPrices(user: string) {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    try {
      const response = await fetch(`/api/historic-prices?user=${user}`, { method: "POST", body: JSON.stringify({ items: [] }) });
      const data = await response.json();

      dispatch(getHistoricPricesSuccess(data?.historicPrices ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getHistoricPricesBySealed(user: string, items: Item[]) {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    try {
      const response = await fetch(`/api/historic-prices?user=${user}`, {
        method: "POST",
        body: JSON.stringify({
          items,
        }),
      });
      const data = await response.json();

      dispatch(getHistoricPricesSuccess(data?.historicPrices ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getHistoricPricesByCards(user: string, cards: Card[], language: Language, type: CardVariantType) {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    try {
      const response = await fetch(`/api/historic-prices?user=${user}`, {
        method: "POST",
        body: JSON.stringify({
          items: cards.map((c) => ({
            ...c,
            item: c._id,
            type: Foo.CARD,
            language,
            variant: type,
          })),
        }),
      });
      const data = await response.json();

      dispatch(getHistoricPricesSuccess(data?.historicPrices ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getHistoricPrice(user: string, id: string, type: string, language: string, variant?: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/historic-prices?user=${user}&id=${id}&type=${type}&language=${language}${variant ? `&variant=${variant}` : ""}`);
      const data = await response.json();

      dispatch(slice.actions.getHistoricPriceSuccess(data?.historicPrice));
    } catch (error) {
      console.error(error);
    }
  };
}
