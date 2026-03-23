"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.getDB = getDB;
const mongodb_1 = require("mongodb");
let db = null;
async function connectDB() {
    const client = new mongodb_1.MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db("maggot-assignment");
    // TTL index: auto-delete expired OTP records from MongoDB
    await db.collection("otp_verifications").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });
    console.log("Connected to MongoDB");
}
function getDB() {
    if (!db)
        throw new Error("Database not connected. Call connectDB() first.");
    return db;
}
