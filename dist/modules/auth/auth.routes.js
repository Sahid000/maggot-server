"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController = __importStar(require("./auth.controller"));
const authMiddleware_1 = require("../../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Admin login flow (public — no token yet)
router.post("/admin-login", AuthController.adminLogin);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/resend-otp", AuthController.resendOTP);
// Admin only — requires valid admin token
router.patch("/change-password", authMiddleware_1.requireAdmin, AuthController.changePassword);
// Seed route — protected by SEED_SECRET env variable
router.get("/seed-admin", AuthController.seedAdmin);
// Forgot password flow (public — user is not logged in)
router.post("/forgot-password", AuthController.forgotPassword);
router.patch("/verify-reset-otp", AuthController.verifyResetOTP);
router.patch("/resend-reset-otp", AuthController.resendResetOTP);
router.patch("/reset-password", AuthController.resetPassword);
// Admin management — requires valid admin token
router.get("/admins", authMiddleware_1.requireAdmin, AuthController.listAdmins);
router.post("/admins", authMiddleware_1.requireAdmin, AuthController.addAdmin);
router.delete("/admins/:id", authMiddleware_1.requireAdmin, AuthController.removeAdmin);
exports.default = router;
