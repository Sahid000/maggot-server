import { Router } from "express";
import * as OrdersController from "./orders.controller";

const router = Router();

// these static routes must be before /:id to avoid being matched as an ID
router.get("/stats/summary", OrdersController.getOrderStats);
router.get("/track", OrdersController.trackOrder);

router.post("/", OrdersController.createOrder);
router.get("/", OrdersController.getOrders);
router.get("/:id", OrdersController.getOrderById);
router.patch("/:id", OrdersController.updateOrderStatus);
router.delete("/:id", OrdersController.deleteOrder);

export default router;
