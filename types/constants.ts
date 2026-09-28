import { HistoricPrice, ItemType, Language } from "./mongodb";

// Visitors who are not signed in use the demo collection, kept in their browser (lib/demo-collection.ts).
export const DEMO_USER = "demo";

export const EMPTY_HISTORIC_PRICE: HistoricPrice = {
  _id: "",
  language: Language.ENGLISH,
  url: "",
  updating: false,
  updateBy: undefined,
  timestamp: 0,
  price: 0,
  average1d: 0,
  prices1d: [],
  average1w: 0,
  prices1w: [],
  average1m: 0,
  prices1m: [],
  average1y: 0,
  prices1y: [],
  sealed: "",
};

export enum ItemSpecificType {
  CARD_LIST = "Card List",
  CARD = "Card",
  ETB = "Elite Trainer Box",
  BOOSTER = "Booster",
  BOOSTER_BOX = "Booster Box",
  DECK = "Deck",
  OTHER = "Other",
}
