// Server only: recomputes a user's portfolio totals from their binders
import { Db, ObjectId } from "mongodb";
import { HistoricPrice, ItemType } from "@/types/mongodb";
import { getPrice } from "@/utils/utils";

const round = (value: number) => Number(value.toFixed(2));

// Current value and quantities of the user's cards and sealed products, after any binder change.
// Same totals as the scraper's daily makeAverage, which also appends the day's point to the histories:
// here the histories are left alone (the home chart ends on the current value anyway), and created empty for new users.
export const refreshPortfolio = async (db: Db, user: ObjectId) => {
  const items = await db
    .collection("binder-items")
    // Missing slots are not owned: they add nothing
    .find({ user, owned: { $ne: false } }, { projection: { type: 1, quantity: 1, historicPrice: 1 } })
    .toArray();

  // One query per price collection for every item of the user
  const priceIds = (type: ItemType) => items.filter((i) => (type === ItemType.CARD ? i.type === ItemType.CARD : i.type !== ItemType.CARD)).map((i) => new ObjectId(i.historicPrice as string));
  const [cardPrices, sealedPrices] = await Promise.all([
    db.collection<HistoricPrice>("card-historic-prices").find({ _id: { $in: priceIds(ItemType.CARD) } } as object).toArray(),
    db.collection<HistoricPrice>("sealed-historic-prices").find({ _id: { $in: priceIds(ItemType.SEALED) } } as object).toArray(),
  ]);
  const prices = new Map([...cardPrices, ...sealedPrices].map((p) => [String(p._id), getPrice(p as HistoricPrice)]));

  let cardsValue = 0;
  let sealedValue = 0;
  let cardsQuantity = 0;
  let sealedQuantity = 0;
  for (const item of items) {
    const value = (prices.get(String(item.historicPrice)) ?? 0) * item.quantity;
    if (item.type === ItemType.CARD) {
      cardsValue += value;
      cardsQuantity += item.quantity;
    } else {
      sealedValue += value;
      sealedQuantity += item.quantity;
    }
  }

  await db.collection("portfolios").updateOne(
    { user },
    {
      $set: { value: round(cardsValue + sealedValue), cardsValue: round(cardsValue), sealedValue: round(sealedValue), cardsQuantity, sealedQuantity },
      $setOnInsert: { historicValue: [], historicCardsValue: [], historicSealedValue: [] },
    },
    { upsert: true }
  );
};
