import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";

const port = process.env.PORT || 5000;

async function main() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

main().catch(console.error);
