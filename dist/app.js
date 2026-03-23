"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const orders_routes_1 = __importDefault(require("./modules/orders/orders.routes"));
const analytics_routes_1 = __importDefault(require("./modules/analytics/analytics.routes"));
const product_routes_1 = __importDefault(require("./modules/product/product.routes"));
const contact_routes_1 = __importDefault(require("./modules/contact/contact.routes"));
const coupons_routes_1 = __importDefault(require("./modules/coupons/coupons.routes"));
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
const DEFAULT_DEV_ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
const allowedOrigins = [...new Set([...DEFAULT_DEV_ORIGINS, ...ALLOWED_ORIGINS])];
const app = (0, express_1.default)();
// Security headers
app.use((0, helmet_1.default)());
// CORS
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS policy: origin ${origin} is not allowed`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "token"],
}));
// Rate limit for public-facing endpoints
const publicLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: { success: false, message: "Too many requests. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Stricter rate limit for auth endpoints (login, OTP, password reset)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { success: false, message: "Too many attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(express_1.default.json({ limit: "10kb" }));
app.get("/", (_req, res) => {
    res.json({ message: "maggot server is running smoothly", timestamp: new Date() });
});
// Apply rate limiting to public endpoints (order creation, tracking, visit tracking)
app.use("/api/v1/orders", (req, res, next) => {
    if (req.method === "POST" || (req.method === "GET" && req.path === "/track")) {
        return publicLimiter(req, res, next);
    }
    next();
});
app.use("/api/v1/analytics/track-visit", publicLimiter);
app.use("/api/v1/coupons/validate", publicLimiter);
// Apply stricter rate limiting to auth endpoints
app.use("/api/v1/admin-login", authLimiter);
app.use("/api/v1/verify-otp", authLimiter);
app.use("/api/v1/resend-otp", authLimiter);
app.use("/api/v1/forgot-password", authLimiter);
app.use("/api/v1/verify-reset-otp", authLimiter);
app.use("/api/v1/resend-reset-otp", authLimiter);
app.use("/api/v1/reset-password", authLimiter);
app.use("/api/v1", auth_routes_1.default);
app.use("/api/v1/orders", orders_routes_1.default);
app.use("/api/v1/analytics", analytics_routes_1.default);
app.use("/api/v1/product", product_routes_1.default);
app.use("/api/v1/contact", contact_routes_1.default);
app.use("/api/v1/coupons", coupons_routes_1.default);
exports.default = app;
