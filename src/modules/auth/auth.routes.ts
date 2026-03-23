import { Router } from "express";
import * as AuthController from "./auth.controller";
import { requireAdmin } from "../../middleware/authMiddleware";

const router = Router();

// Admin login flow (public — no token yet)
router.post("/admin-login", AuthController.adminLogin);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/resend-otp", AuthController.resendOTP);

// Admin only — requires valid admin token
router.patch("/change-password", requireAdmin, AuthController.changePassword);

// Seed route — protected by SEED_SECRET env variable
router.get("/seed-admin", AuthController.seedAdmin);

// Forgot password flow (public — user is not logged in)
router.post("/forgot-password", AuthController.forgotPassword);
router.patch("/verify-reset-otp", AuthController.verifyResetOTP);
router.patch("/resend-reset-otp", AuthController.resendResetOTP);
router.patch("/reset-password", AuthController.resetPassword);

// Admin management — requires valid admin token
router.get("/admins", requireAdmin, AuthController.listAdmins);
router.post("/admins", requireAdmin, AuthController.addAdmin);
router.delete("/admins/:id", requireAdmin, AuthController.removeAdmin);

export default router;
