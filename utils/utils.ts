import { Card, HistoricPrice, Language, Set } from "@/types/mongodb";

export const parseDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const parseRatio = (now: number, average: number) => {
  const ratio = (now * 100) / average;
  return (ratio - 100).toFixed(2);
};

export const titleCaseWord = (word: string) => {
  if (!word) return word;
  return word[0].toUpperCase() + word.substr(1).toLowerCase();
};

export const getPrice = (historicPrice: HistoricPrice) => {
  if (!historicPrice || !historicPrice.price) return 0;
  if (historicPrice.price !== -1) return historicPrice.price;
  const lastPrice = historicPrice.prices1y
    .slice()
    .reverse()
    .find((price) => price !== -1);
  return lastPrice ?? 0;
};

export const DUMMY_HISTORIC_PRICE: HistoricPrice = {
  _id: "",
  sealed: "",
  language: Language.ITALIAN,
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
};

export const getSet = (item: HistoricPrice) => {
  if (item.url.includes("BS") || item.url.includes("Base Set") || item.url.includes("Base-Set"))
    return {
      set: "Base Set",
      color: "#4a90e2",
      textColor: "#ffffff",
    };
  if (item.url.includes("MEW") || item.url.includes("151"))
    return {
      set: "151",
      color: "#ffcc01",
      textColor: "#000000",
    };
  if (item.url.includes("JUNGLE") || item.url.includes("JU"))
    return {
      set: "Jungle",
      color: "#526534",
      textColor: "#ffffff",
    };
  return {
    set: "Other",
    color: "#000000",
    textColor: "#ffffff",
  };
};
