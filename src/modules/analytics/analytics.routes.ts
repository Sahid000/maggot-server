import { Router } from "express";
import * as AnalyticsController from "./analytics.controller";

const router = Router();

// Track a site visit — call this from your frontend on page load
router.post("/track-visit", AnalyticsController.trackVisit);

// Dashboard cards: Total Orders, Pending, Accepted, Cancelled, Completed
router.get("/dashboard-cards", AnalyticsController.getDashboardCards);

// Graph 1 — double line area chart: site visits vs orders by month
router.get("/visits-orders-monthly", AnalyticsController.getVisitsAndOrdersByMonth);

// Graph 2 — line chart: orders per month
router.get("/orders-monthly", AnalyticsController.getOrdersByMonth);

// Graph 3 — pie chart: order status distribution
router.get("/order-status-distribution", AnalyticsController.getOrderStatusDistribution);

// Graph 4 (bonus) — bar chart: top 10 districts by order count
router.get("/orders-by-district", AnalyticsController.getOrdersByDistrict);

export default router;
