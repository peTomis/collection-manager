import { MongoClient, ObjectId } from "mongodb";
import { ItemSpecificType } from "./constants";

export enum Language {
  ENGLISH = "en",
  ITALIAN = "it",
  JAPANESE = "jp",
}

export enum CardVariantType {
  FIRST_EDITION = "1e",
  ONE_STAR = "one-star",
  REGULAR = "regular",
  REVERSE_HOLO = "reverse",
  SHADOWLESS = "shadowless",
  TWO_STAR = "two-star",
}

export interface ItemWithJoin {
  _id: string;
  name: string;
  type: ItemType;
  item: Card | Sealed;
  historicPrice: HistoricPrice;
}

export type CardHistoricPrice = BaseHistoricPrice & {
  card: string;
  type: CardVariantType;
};

export type SealedHistoricPrice = BaseHistoricPrice & {
  sealed: string;
};

export type BaseHistoricPrice = {
  _id: string;
  language: Language;
  url: string;
  updating: boolean;
  updateBy: string | undefined;
  timestamp: number;
  price: number;
  average1d: number;
  prices1d: number[];
  average1w: number;
  prices1w: number[];
  average1m: number;
  prices1m: number[];
  average1y: number;
  prices1y: number[];
};

export type HistoricPrice = CardHistoricPrice | SealedHistoricPrice;

export interface CardVariant {
  type: CardVariantType;
  language: Language;
  url: string;
}

export interface Portfolio {
  _id: string;
  user: ObjectId;
  value: number;
  historicValue: {
    timestamp: number;
    value: number;
  }[];
  cardsQuantity: number;
  cardsValue: number;
  historicCardsValue: {
    timestamp: number;
    value: number;
  }[];
  sealedQuantity: number;
  sealedValue: number;
  historicSealedValue: {
    timestamp: number;
    value: number;
  }[];
}

export enum ItemType {
  CARD = "card",
  SEALED = "sealed",
  BULK = "bulk",
}

export interface Card {
  _id: string;
  name: string;
  number: number;
  set: string;
  variants: CardVariant[];
}

export interface SealedVariant {
  language: Language;
  url: string;
}

export interface Sealed {
  _id: string;
  name: string;
  set: string;
  variants: SealedVariant[];
  type: ItemSpecificType;
  // Product image under public/, e.g. /sets/base_set/booster.webp
  path?: string;
}

export interface Set {
  _id: string; // MongoDB identifier
  name: string; // Set name
  url: string; // The set name on cardmarket URLs
  code: string; // The set code on cardmarket URLs
  cards: number; // Number of cards in the set
  sealed: number; // Number of sealed items in the set
  tcgdex: string; // The set identifier on tcgdex
  releasedAt: number; // Timestamp of the release date
  counts?: { cards: number; sealed: number }; // Cards and sealed products actually in the database (added by /api/sets)
}

export interface CardPrice {
  _id: string;
  card: string;
  type: CardVariantType;
  items: number;
  language: Language;
  price: number;
  timestamp: number;
}

export interface SealedPrice {
  _id: string;
  sealed: string;
  language: string;
  items: number;
  price: number;
  timestamp: number;
}

export type Price = CardPrice | SealedPrice;

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

export interface Binder {
  _id: string;
  user: ObjectId;
  name: string;
  // Set binder: only cards of this set can be added, and they are shown with their number
  set?: ObjectId;
}

export interface BinderWithItems extends Binder {
  items: BinderItem[];
}

export interface BinderToSave {
  _id?: string;
  name: string;
  type: ItemType;
  item: string;
  historicPrice: string;
  quantity: number;
  binder: string;
}

export interface BinderItem extends ItemWithJoin {
  binder: string;
  quantity: number;
}

export interface Wishlist {
  _id: string;
  user: ObjectId;
  name: string;
}

export interface WishlistToSave {
  _id?: string;
  name: string;
  type: ItemType;
  item: string;
  historicPrice: string;
  wishlist: string;
  // Price the user is willing to pay
  target?: number;
}

export interface WishlistItem extends ItemWithJoin {
  wishlist: string;
  target?: number;
}

export interface WishlistWithItems extends Wishlist {
  items: WishlistItem[];
}
