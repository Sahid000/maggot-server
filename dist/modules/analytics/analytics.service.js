"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackVisit = trackVisit;
exports.getDashboardCards = getDashboardCards;
exports.getVisitsAndOrdersByMonth = getVisitsAndOrdersByMonth;
exports.getOrdersByMonth = getOrdersByMonth;
exports.getOrderStatusDistribution = getOrderStatusDistribution;
exports.getOrdersByDistrict = getOrdersByDistrict;
exports.getRevenueByMonth = getRevenueByMonth;
exports.getRevenueStats = getRevenueStats;
const analytics_model_1 = require("./analytics.model");
const orders_model_1 = require("../orders/orders.model");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getYearRange(year) {
    const start = new Date(year, 0, 1); // Jan 1
    const end = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31
    return { start, end };
}
async function trackVisit(ip, userAgent, page) {
    await (0, analytics_model_1.getSiteVisitsCollection)().insertOne({
        ip: ip || null,
        userAgent: userAgent || null,
        page: page || "/",
        visitedAt: new Date(),
        createdAt: new Date(),
    });
    return { status: 200, success: true, message: "Visit tracked" };
}
async function getDashboardCards() {
    const collection = (0, orders_model_1.getOrdersCollection)();
    const [total, pending, approved, declined, cancelled, completed] = await Promise.all([
        collection.countDocuments(),
        collection.countDocuments({ status: "pending" }),
        collection.countDocuments({ status: "approved" }),
        collection.countDocuments({ status: "declined" }),
        collection.countDocuments({ status: "cancelled" }),
        collection.countDocuments({ status: "completed" }),
    ]);
    return {
        status: 200,
        success: true,
        data: {
            totalOrders: total,
            pending,
            accepted: approved,
            cancelled,
            completed,
            declined,
        },
    };
}
async function getVisitsAndOrdersByMonth(year) {
    const { start, end } = getYearRange(year);
    const [visitsRaw, ordersRaw] = await Promise.all([
        (0, analytics_model_1.getSiteVisitsCollection)()
            .aggregate([
            { $match: { visitedAt: { $gte: start, $lte: end } } },
            { $group: { _id: { $month: "$visitedAt" }, count: { $sum: 1 } } },
        ])
            .toArray(),
        (0, orders_model_1.getOrdersCollection)()
            .aggregate([
            { $match: { orderDate: { $gte: start, $lte: end } } },
            { $group: { _id: { $month: "$orderDate" }, count: { $sum: 1 } } },
        ])
            .toArray(),
    ]);
    const visitsMap = {};
    for (const v of visitsRaw)
        visitsMap[v._id] = v.count;
    const ordersMap = {};
    for (const o of ordersRaw)
        ordersMap[o._id] = o.count;
    const data = MONTHS.map((month, i) => ({
        month,
        visits: visitsMap[i + 1] || 0,
        orders: ordersMap[i + 1] || 0,
    }));
    return { status: 200, success: true, data };
}
async function getOrdersByMonth(year) {
    const { start, end } = getYearRange(year);
    const raw = await (0, orders_model_1.getOrdersCollection)()
        .aggregate([
        { $match: { orderDate: { $gte: start, $lte: end } } },
        { $group: { _id: { $month: "$orderDate" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ])
        .toArray();
    const ordersMap = {};
    for (const r of raw)
        ordersMap[r._id] = r.orders;
    const data = MONTHS.map((month, i) => ({
        month,
        orders: ordersMap[i + 1] || 0,
    }));
    return { status: 200, success: true, data };
}
async function getOrderStatusDistribution() {
    const collection = (0, orders_model_1.getOrdersCollection)();
    const [pending, approved, declined, cancelled, completed] = await Promise.all([
        collection.countDocuments({ status: "pending" }),
        collection.countDocuments({ status: "approved" }),
        collection.countDocuments({ status: "declined" }),
        collection.countDocuments({ status: "cancelled" }),
        collection.countDocuments({ status: "completed" }),
    ]);
    return {
        status: 200,
        success: true,
        data: [
            { label: "Pending", value: pending },
            { label: "Accepted", value: approved },
            { label: "Declined", value: declined },
            { label: "Cancelled", value: cancelled },
            { label: "Completed", value: completed },
        ],
    };
}
async function getOrdersByDistrict(year) {
    const filter = {};
    if (year) {
        const { start, end } = getYearRange(year);
        filter.orderDate = { $gte: start, $lte: end };
    }
    const raw = await (0, orders_model_1.getOrdersCollection)()
        .aggregate([
        { $match: filter },
        { $group: { _id: "$district", orders: { $sum: 1 } } },
        { $sort: { orders: -1 } },
        { $limit: 10 },
    ])
        .toArray();
    const data = raw.map((r) => ({ district: r._id, orders: r.orders }));
    return { status: 200, success: true, data };
}
async function getRevenueByMonth(year) {
    const { start, end } = getYearRange(year);
    const raw = await (0, orders_model_1.getOrdersCollection)()
        .aggregate([
        { $match: { orderDate: { $gte: start, $lte: end }, status: { $in: ["approved", "completed"] } } },
        {
            $group: {
                _id: { $month: "$orderDate" },
                revenue: { $sum: "$totalPrice" },
                orders: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ])
        .toArray();
    const revenueMap = {};
    for (const r of raw)
        revenueMap[r._id] = { revenue: r.revenue, orders: r.orders };
    const data = MONTHS.map((month, i) => ({
        month,
        revenue: revenueMap[i + 1]?.revenue || 0,
        orders: revenueMap[i + 1]?.orders || 0,
    }));
    return { status: 200, success: true, data };
}
async function getRevenueStats() {
    const collection = (0, orders_model_1.getOrdersCollection)();
    const [totalRevenueResult, avgOrderResult, completedCount] = await Promise.all([
        collection
            .aggregate([
            { $match: { status: { $in: ["approved", "completed"] } } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ])
            .toArray(),
        collection
            .aggregate([
            { $match: { status: { $in: ["approved", "completed"] } } },
            { $group: { _id: null, avg: { $avg: "$totalPrice" } } },
        ])
            .toArray(),
        collection.countDocuments({ status: { $in: ["approved", "completed"] } }),
    ]);
    return {
        status: 200,
        success: true,
        data: {
            totalRevenue: totalRevenueResult[0]?.total || 0,
            averageOrderValue: Math.round(avgOrderResult[0]?.avg || 0),
            paidOrders: completedCount,
        },
    };
}
