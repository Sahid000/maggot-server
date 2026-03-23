import { Router } from "express";
import * as ProductController from "./product.controller";
import { requireAdmin } from "../../middleware/authMiddleware";

const router = Router();

// Public — website fetches pricing to display on order form
router.get("/", ProductController.getProduct);

// Admin only
router.patch("/", requireAdmin, ProductController.updateProduct);

export default router;
