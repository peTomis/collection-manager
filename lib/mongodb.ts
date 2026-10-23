import { ClientSession, Db, MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
export default client;

// The app's database, connecting on first use (later calls reuse the connection)
export const getDb = async (): Promise<Db> => {
  await client.connect();
  return client.db("collection-manager");
};

// Runs fn as one transaction: all its writes happen or none do. fn passes the session to each operation,
// and can call session.abortTransaction() to leave everything as it was. The driver may run fn again on transient errors.
export const inTransaction = async <T>(fn: (db: Db, session: ClientSession) => Promise<T>): Promise<T> => {
  const db = await getDb();
  let result!: T;
  await client.withSession((session) =>
    session.withTransaction(async () => {
      result = await fn(db, session);
    })
  );
  return result;
};
