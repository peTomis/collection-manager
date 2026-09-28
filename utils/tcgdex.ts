import TCGdex, { Card } from "@tcgdex/sdk";

const tcgdex = new TCGdex("en");

export const fetchCardDataFromTCGdex = async (set: string, card: string): Promise<Card | null> => {
  const cardData = await tcgdex.card.get(`${set}-${card}`);
  return cardData;
};
