/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
import { HistoricPrice } from "@/types/mongodb";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getPrice = (historicPrice: HistoricPrice) => {
  if (!historicPrice || !historicPrice.price) return 0;
  if (historicPrice.price !== -1) return historicPrice.price;
  const lastPrice = historicPrice.prices1y
    .slice()
    .reverse()
    .find((price) => price !== -1);
  return lastPrice ?? 0;
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
