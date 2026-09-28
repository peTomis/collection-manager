import { HistoricPrice, ItemType, Language } from "./mongodb";

// Anonymous visitors browse the demo collection, which is read-only (hex of the demo user ObjectId).
export const DEMO_USER = "000000000000000000000000";

export const EMPTY_ITEM = {
  name: "",
  type: ItemType.CARD,
  item: "",
  user: "",
  language: "",
};

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
