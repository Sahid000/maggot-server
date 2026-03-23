"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_model_1 = require("../modules/auth/auth.model");
const mongodb_1 = require("mongodb");
function requireAuth(req, res, next) {
    const token = req.headers["token"];
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }
}
async function requireAdmin(req, res, next) {
    const token = req.headers["token"];
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }
    if (decoded.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
    }
    // Verify tokenVersion matches DB — invalidates tokens after password change
    try {
        const user = await (0, auth_model_1.getUsersCollection)().findOne({ _id: new mongodb_1.ObjectId(decoded.userId) });
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
        }
        const dbVersion = user.tokenVersion ?? 1;
        const tokenVersion = decoded.tokenVersion ?? 1;
        if (tokenVersion !== dbVersion) {
            return res.status(401).json({ success: false, message: "Unauthorized: Token is no longer valid. Please login again." });
        }
    }
    catch {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
    req.user = decoded;
    next();
}
