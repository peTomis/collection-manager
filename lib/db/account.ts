// Server only: a user's account as a whole, to download it or delete it (the rights described on /privacy)
import { ObjectId } from "mongodb";
import { getDb, inTransaction } from "@/lib/mongodb";
import { fetchBindersWithCard } from "@/lib/db/binders";
import { fetchWishlistsWithCard } from "@/lib/db/wishlists";
import { fetchPortfolio } from "@/lib/db/portfolios";

// Everything stored about the user: the profile saved at sign in, the collection and the portfolio history
export const exportAccount = async (user: ObjectId) => {
  const db = await getDb();
  const [profile, binders, wishlists, portfolio] = await Promise.all([
    db.collection("users").findOne({ _id: user }, { projection: { _id: 0, provider: 1, email: 1, name: 1, image: 1, createdAt: 1, lastLoginAt: 1 } }),
    fetchBindersWithCard(user),
    fetchWishlistsWithCard(user),
    fetchPortfolio(user),
  ]);
  return { exportedAt: new Date().toISOString(), profile, binders, wishlists, portfolio };
};

// Every document of the user, in one transaction: a failure leaves the account whole, never half deleted.
// The scraper only updates existing portfolios, so it doesn't bring this one back.
export const deleteAccount = async (user: ObjectId): Promise<boolean> =>
  inTransaction(async (db, session) => {
    for (const name of ["binder-items", "wishlist-items", "binders", "wishlists", "portfolios"]) {
      await db.collection(name).deleteMany({ user }, { session });
    }
    const { deletedCount } = await db.collection("users").deleteOne({ _id: user }, { session });
    return deletedCount === 1;
  });

// Whether the account still exists: a session outlives its deleted account (JWTs are stateless) until it expires
export const accountExists = async (user: ObjectId): Promise<boolean> => !!(await (await getDb()).collection("users").findOne({ _id: user }, { projection: { _id: 1 } }));
