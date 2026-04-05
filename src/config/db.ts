import { MongoClient, Db } from "mongodb";

let db: Db | null = null;
let connectionPromise: Promise<void> | null = null;

export async function connectDB(): Promise<void> {
  // Already connected — return immediately
  if (db) return;

  // Connection in progress — wait for it instead of opening a second one
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    db = client.db("maggot");

    // TTL index: auto-delete expired OTP records from MongoDB
    await db.collection("otp_verifications").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, background: true }
    );

    console.log("Connected to MongoDB");
  })();

  return connectionPromise;
}

export function getDB(): Db {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
}
