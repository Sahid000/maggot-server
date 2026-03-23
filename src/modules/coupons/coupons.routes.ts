import { Router } from "express";
import * as CouponsController from "./coupons.controller";
import { requireAdmin } from "../../middleware/authMiddleware";

const router = Router();

// Public — validate coupon during order placement
router.post("/validate", CouponsController.validateCoupon);

// Admin only
router.post("/", requireAdmin, CouponsController.createCoupon);
router.get("/", requireAdmin, CouponsController.getCoupons);
router.patch("/:id/toggle", requireAdmin, CouponsController.toggleCoupon);
router.delete("/:id", requireAdmin, CouponsController.deleteCoupon);

export default router;
