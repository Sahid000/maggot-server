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
exports.trackVisit = trackVisit;
exports.getDashboardCards = getDashboardCards;
exports.getVisitsAndOrdersByMonth = getVisitsAndOrdersByMonth;
exports.getOrdersByMonth = getOrdersByMonth;
exports.getOrderStatusDistribution = getOrderStatusDistribution;
exports.getOrdersByDistrict = getOrdersByDistrict;
exports.getRevenueByMonth = getRevenueByMonth;
exports.getRevenueStats = getRevenueStats;
const AnalyticsService = __importStar(require("./analytics.service"));
async function trackVisit(req, res) {
    try {
        const ip = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;
        const userAgent = req.headers["user-agent"];
        const { page } = req.body;
        const result = await AnalyticsService.trackVisit(ip, userAgent, page);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to track visit", error: error.message });
    }
}
async function getDashboardCards(req, res) {
    try {
        const result = await AnalyticsService.getDashboardCards();
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch dashboard cards", error: error.message });
    }
}
async function getVisitsAndOrdersByMonth(req, res) {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const result = await AnalyticsService.getVisitsAndOrdersByMonth(year);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch chart data", error: error.message });
    }
}
async function getOrdersByMonth(req, res) {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const result = await AnalyticsService.getOrdersByMonth(year);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch orders monthly data", error: error.message });
    }
}
async function getOrderStatusDistribution(req, res) {
    try {
        const result = await AnalyticsService.getOrderStatusDistribution();
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch status distribution", error: error.message });
    }
}
async function getOrdersByDistrict(req, res) {
    try {
        const year = req.query.year ? parseInt(req.query.year) : undefined;
        const result = await AnalyticsService.getOrdersByDistrict(year);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch district data", error: error.message });
    }
}
async function getRevenueByMonth(req, res) {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const result = await AnalyticsService.getRevenueByMonth(year);
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch revenue data", error: error.message });
    }
}
async function getRevenueStats(req, res) {
    try {
        const result = await AnalyticsService.getRevenueStats();
        res.status(result.status).json(result);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch revenue stats", error: error.message });
    }
}
