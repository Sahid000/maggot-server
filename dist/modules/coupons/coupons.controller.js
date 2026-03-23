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
exports.createCoupon = createCoupon;
exports.getCoupons = getCoupons;
exports.toggleCoupon = toggleCoupon;
exports.deleteCoupon = deleteCoupon;
exports.validateCoupon = validateCoupon;
const CouponsService = __importStar(require("./coupons.service"));
async function createCoupon(req, res) {
    try {
        const result = await CouponsService.createCoupon(req.body);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to create coupon", error: error.message });
    }
}
async function getCoupons(req, res) {
    try {
        const { page, limit } = req.query;
        const result = await CouponsService.getCoupons({ page, limit });
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to get coupons", error: error.message });
    }
}
async function toggleCoupon(req, res) {
    try {
        const result = await CouponsService.toggleCoupon(req.params.id);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to update coupon", error: error.message });
    }
}
async function deleteCoupon(req, res) {
    try {
        const result = await CouponsService.deleteCoupon(req.params.id);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete coupon", error: error.message });
    }
}
async function validateCoupon(req, res) {
    try {
        const { code, orderAmount } = req.body;
        if (!code || orderAmount === undefined) {
            return res.status(400).json({ success: false, message: "code and orderAmount are required" });
        }
        const result = await CouponsService.validateCoupon(code, Number(orderAmount));
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to validate coupon", error: error.message });
    }
}
