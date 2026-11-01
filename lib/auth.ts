import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { accountExists } from "@/lib/db/account";

const upsertUser = async (providerId: string, email?: string | null, name?: string | null, image?: string | null): Promise<string> => {
  const db = await getDb();
  const now = Date.now();
  const upsert = () =>
    db.collection("users").findOneAndUpdate(
      { provider: "google", providerId },
      {
        $set: { email, name, image, lastLoginAt: now },
        $setOnInsert: { provider: "google", providerId, createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
  // Two first sign-ins at once both try to insert: the unique index on { provider, providerId } refuses the second, which retries as an update
  const user = await upsert().catch((error) => (error?.code === 11000 ? upsert() : Promise.reject(error)));
  return user!._id.toString();
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  // Sessions are stateless, so a leaked cookie stays valid until it expires: keep it short.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account, user }) {
      // account is only present on sign in: resolve (or create) the user document once
      if (account) {
        token.userId = await upsertUser(account.providerAccountId, user.email, user.name, user.image);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.userId;
      return session;
    },
  },
};

// The user is always resolved from the session, never from the request.
// Visitors without a session get null: their demo collection lives in the browser (lib/demo-collection.ts).
// So does a session of a deleted account, which stays valid until it expires (on another device, say): it must not write a collection nobody owns.
export const getUserId = async (req: NextApiRequest, res: NextApiResponse): Promise<ObjectId | null> => {
  const session = await getServerSession(req, res, authOptions);
  const id = session?.user?.id;
  if (!id || !ObjectId.isValid(id)) return null;
  const user = new ObjectId(id);
  return (await accountExists(user)) ? user : null;
};
