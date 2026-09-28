import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Db, ObjectId } from "mongodb";
import client from "@/lib/mongodb";

const upsertUser = async (providerId: string, email?: string | null, name?: string | null, image?: string | null): Promise<string> => {
  await client.connect();
  const db: Db = client.db("collection-manager");
  const now = Date.now();
  const user = await db.collection("users").findOneAndUpdate(
    { provider: "google", providerId },
    {
      $set: { email, name, image, lastLoginAt: now },
      $setOnInsert: { provider: "google", providerId, createdAt: now },
    },
    { upsert: true, returnDocument: "after" }
  );
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
export const getUserId = async (req: NextApiRequest, res: NextApiResponse): Promise<ObjectId | null> => {
  const session = await getServerSession(req, res, authOptions);
  const id = session?.user?.id;
  return id && ObjectId.isValid(id) ? new ObjectId(id) : null;
};
