import { Router } from "express";
import * as AnalyticsController from "./analytics.controller";
import { requireAdmin } from "../../middleware/authMiddleware";

const router = Router();

// Public — call from frontend on page load to track visits
router.post("/track-visit", AnalyticsController.trackVisit);

// Admin only
router.get("/dashboard-cards", requireAdmin, AnalyticsController.getDashboardCards);
router.get("/visits-orders-monthly", requireAdmin, AnalyticsController.getVisitsAndOrdersByMonth);
router.get("/orders-monthly", requireAdmin, AnalyticsController.getOrdersByMonth);
router.get("/order-status-distribution", requireAdmin, AnalyticsController.getOrderStatusDistribution);
router.get("/orders-by-district", requireAdmin, AnalyticsController.getOrdersByDistrict);
router.get("/revenue-monthly", requireAdmin, AnalyticsController.getRevenueByMonth);
router.get("/revenue-stats", requireAdmin, AnalyticsController.getRevenueStats);

export default router;
