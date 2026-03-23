import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";

const REQUIRED_ENV = ["JWT_SECRET", "MONGODB_URI", "EMAIL_USER", "EMAIL_APP_PASSWORD", "WEBSITE_URL"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[STARTUP ERROR] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// Connect DB once — works for both local server and Vercel serverless
connectDB().catch((err) => {
  console.error("[DB ERROR]", err);
  process.exit(1);
});

// Local development only — Vercel ignores app.listen()
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Export app as default for Vercel serverless handler
export default app;
