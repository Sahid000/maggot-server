import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import ordersRoutes from "./modules/orders/orders.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://maggot-donation.netlify.app"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "maggot server is running smoothly", timestamp: new Date() });
});

app.use("/api/v1", authRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

export default app;
