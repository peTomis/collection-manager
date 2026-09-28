import { Card } from "@/types/mongodb";
import { createSlice, Dispatch } from "@reduxjs/toolkit";

const initialState: {
  loaded: boolean;
  cards: Card[];
  card: Card | null;
} = {
  loaded: false,
  cards: [],
  card: null,
};

const slice = createSlice({
  name: "cards",
  initialState,

  reducers: {
    getCardsSuccess(state, action) {
      const payload = action.payload;
      state.loaded = true;
      // sort by card.number
      state.cards = payload.sort((a: Card, b: Card) => {
        if (a.number > b.number) return 1;
        if (a.number < b.number) return -1;
        return 0;
      });
    },
    clearCardsSuccess(state) {
      state.loaded = false;
      state.cards = [];
    },
    getCardSuccess(state, action) {
      const payload = action.payload;
      state.card = payload;
    },
  },
});

export const { getCardsSuccess, getCardSuccess, clearCardsSuccess } = slice.actions;

export default slice.reducer;

export function getCards(user: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/cards?user=${user}`, { method: "GET" });
      const data = await response.json();
      dispatch(getCardsSuccess(data?.cards ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function setCard(card: Card | null) {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(getCardSuccess(card));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getCardsBySet(user: string, set: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/cards?user=${user}&set=${set}`, { method: "GET" });
      const data = await response.json();
      dispatch(getCardsSuccess(data?.cards ?? []));
    } catch (error) {
      console.error(error);
    }
  };
}

export function getCard(user: string, id: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await fetch(`/api/cards?id=${id}&user=${user}`, { method: "GET" });
      const data = await response.json();
      dispatch(getCardSuccess(data?.card));
    } catch (error) {
      console.error(error);
    }
  };
}

export function clearCards() {
  return async (dispatch: Dispatch) => {
    dispatch(clearCardsSuccess());
  };
}
