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
exports.createOrder = createOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.getOrders = getOrders;
exports.getOrderById = getOrderById;
exports.deleteOrder = deleteOrder;
exports.getOrderStats = getOrderStats;
exports.trackOrder = trackOrder;
exports.adminTrackOrder = adminTrackOrder;
const OrdersService = __importStar(require("./orders.service"));
async function createOrder(req, res) {
    try {
        const result = await OrdersService.createOrder(req.body);
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[createOrder]", error);
        res.status(500).json({ success: false, message: "Failed to create order" });
    }
}
async function updateOrderStatus(req, res) {
    try {
        const result = await OrdersService.updateOrderStatus(req.params.id, req.body.status, req.body.reason);
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[updateOrderStatus]", error);
        res.status(500).json({ success: false, message: "Failed to update order" });
    }
}
async function getOrders(req, res) {
    try {
        const result = await OrdersService.getOrders(req.query);
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[getOrders]", error);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
}
async function getOrderById(req, res) {
    try {
        const result = await OrdersService.getOrderById(req.params.id);
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[getOrderById]", error);
        res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
}
async function deleteOrder(req, res) {
    try {
        const result = await OrdersService.deleteOrder(req.params.id);
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[deleteOrder]", error);
        res.status(500).json({ success: false, message: "Failed to delete order" });
    }
}
async function getOrderStats(_req, res) {
    try {
        const result = await OrdersService.getOrderStats();
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[getOrderStats]", error);
        res.status(500).json({ success: false, message: "Failed to fetch statistics" });
    }
}
async function trackOrder(req, res) {
    try {
        const { id, t } = req.query;
        const result = await OrdersService.trackOrder(id, t);
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[trackOrder]", error);
        res.status(500).json({ success: false, message: "Failed to track order" });
    }
}
async function adminTrackOrder(req, res) {
    try {
        const { id } = req.query;
        const result = await OrdersService.adminTrackOrder(id);
        res.status(result.status).json(result);
    }
    catch (error) {
        console.error("[adminTrackOrder]", error);
        res.status(500).json({ success: false, message: "Failed to track order" });
    }
}
