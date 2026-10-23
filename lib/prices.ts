import { HistoricPrice } from "@/types/mongodb";

// Current price of an item version: today's, or the latest known day when today is missing (-1)
export const getPrice = (historicPrice: HistoricPrice) => {
  if (!historicPrice || !historicPrice.price) return 0;
  if (historicPrice.price !== -1) return historicPrice.price;
  const lastPrice = historicPrice.prices1y
    .slice()
    .reverse()
    .find((price) => price !== -1);
  return lastPrice ?? 0;
};

export type PricePeriod = "1d" | "1w" | "1m" | "1y";

// Oldest known price in the period's history (arrays run oldest first, -1 marks a missing day)
export const getPastPrice = (historicPrice: HistoricPrice, period: PricePeriod) => {
  const prices = historicPrice?.[`prices${period}`] ?? [];
  return prices.find((price) => price > 0) ?? getPrice(historicPrice);
};
