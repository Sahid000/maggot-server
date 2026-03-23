"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
// Validate required environment variables before starting
const REQUIRED_ENV = ["JWT_SECRET", "MONGODB_URI", "EMAIL_USER", "EMAIL_APP_PASSWORD", "WEBSITE_URL"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`[STARTUP ERROR] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}
const port = process.env.PORT || 5000;
async function main() {
    await (0, db_1.connectDB)();
    app_1.default.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
main().catch((err) => {
    console.error("[FATAL]", err);
    process.exit(1);
});
