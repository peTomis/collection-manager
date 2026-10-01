// Server only: inserts that keep the per-user caps (LIMITS) even under concurrent requests
import { Db, Document, Filter, ObjectId } from "mongodb";

// Counting before inserting lets parallel requests all pass the count. Instead insert, then count what the cap covers,
// and take the new document back out if it went over: racing requests may all be refused, but the cap always holds.
// scope: the documents the cap counts, e.g. { user } for lists. The new document's id, or null when over the cap.
export const insertCapped = async (db: Db, collection: string, doc: Document, scope: Filter<Document>, cap: number): Promise<ObjectId | null> => {
  const { insertedId } = await db.collection(collection).insertOne(doc);
  if ((await db.collection(collection).countDocuments(scope)) <= cap) return insertedId;
  await db.collection(collection).deleteOne({ _id: insertedId });
  return null;
};
