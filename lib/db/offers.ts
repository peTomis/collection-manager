// Server only: the Cardmarket listings of one version, written by the scraper in `offers`
import { getDb } from "@/lib/mongodb";
import { CardVariantType, ItemType, ListedOffer, VersionOffers } from "@/types/mongodb";

// Listings that left Cardmarket within this window before the last scrape: most likely sold
export const GONE_WINDOW = 30 * 24 * 60 * 60 * 1000;
// A Cardmarket product page lists far fewer, so these only bound the answer
export const MAX_LISTED = 100;
export const MAX_GONE = 50;

// The price history (`seen`) grows at every scrape: only its first price leaves the database.
// The comments only grow when the seller edits one, and they are what the listing claims: all of them do.
const PROJECTION = {
  _id: 0,
  article: 1,
  seller: 1,
  comment: 1,
  price: 1,
  firstSeenAt: 1,
  lastSeenAt: 1,
  comments: 1,
  firstPrice: { $arrayElemAt: ["$seen.price", 0] },
};

export const fetchOffers = async (itemType: ItemType, item: string, language: string, variant: CardVariantType | null): Promise<VersionOffers> => {
  const db = await getDb();
  const offers = db.collection("offers");
  // type: null also matches sealed products, which have none
  const version = { item, itemType, language, type: variant };

  // Every listing of one scrape shares its timestamp: the latest one seen is the version's last scrape
  const last = await offers.findOne(version, { sort: { lastSeenAt: -1 }, projection: { lastSeenAt: 1 } });
  if (!last) return { seenAt: null, listed: [], gone: [] };
  const seenAt = last.lastSeenAt as number;

  const read = (match: object, sort: Record<string, 1 | -1>, limit: number) =>
    offers.aggregate<ListedOffer>([{ $match: { ...version, ...match } }, { $sort: sort }, { $limit: limit }, { $project: PROJECTION }]).toArray();
  const [listed, gone] = await Promise.all([
    read({ lastSeenAt: seenAt }, { price: 1, article: 1 }, MAX_LISTED),
    read({ lastSeenAt: { $gte: seenAt - GONE_WINDOW, $lt: seenAt } }, { lastSeenAt: -1, article: 1 }, MAX_GONE),
  ]);
  return { seenAt, listed, gone };
};
