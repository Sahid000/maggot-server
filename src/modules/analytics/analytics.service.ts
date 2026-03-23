import { getSiteVisitsCollection } from "./analytics.model";
import { getOrdersCollection } from "../orders/orders.model";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getYearRange(year: number) {
  const start = new Date(year, 0, 1); // Jan 1
  const end = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31
  return { start, end };
}

export async function trackVisit(ip?: string, userAgent?: string, page?: string) {
  await getSiteVisitsCollection().insertOne({
    ip: ip || null,
    userAgent: userAgent || null,
    page: page || "/",
    visitedAt: new Date(),
    createdAt: new Date(),
  });

  return { status: 200, success: true, message: "Visit tracked" };
}

export async function getDashboardCards() {
  const collection = getOrdersCollection();

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

export async function getVisitsAndOrdersByMonth(year: number) {
  const { start, end } = getYearRange(year);

  const [visitsRaw, ordersRaw] = await Promise.all([
    getSiteVisitsCollection()
      .aggregate([
        { $match: { visitedAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $month: "$visitedAt" }, count: { $sum: 1 } } },
      ])
      .toArray(),

    getOrdersCollection()
      .aggregate([
        { $match: { orderDate: { $gte: start, $lte: end } } },
        { $group: { _id: { $month: "$orderDate" }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const visitsMap: Record<number, number> = {};
  for (const v of visitsRaw) visitsMap[v._id] = v.count;

  const ordersMap: Record<number, number> = {};
  for (const o of ordersRaw) ordersMap[o._id] = o.count;

  const data = MONTHS.map((month, i) => ({
    month,
    visits: visitsMap[i + 1] || 0,
    orders: ordersMap[i + 1] || 0,
  }));

  return { status: 200, success: true, data };
}

export async function getOrdersByMonth(year: number) {
  const { start, end } = getYearRange(year);

  const raw = await getOrdersCollection()
    .aggregate([
      { $match: { orderDate: { $gte: start, $lte: end } } },
      { $group: { _id: { $month: "$orderDate" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const ordersMap: Record<number, number> = {};
  for (const r of raw) ordersMap[r._id] = r.orders;

  const data = MONTHS.map((month, i) => ({
    month,
    orders: ordersMap[i + 1] || 0,
  }));

  return { status: 200, success: true, data };
}

export async function getOrderStatusDistribution() {
  const collection = getOrdersCollection();

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

export async function getOrdersByDistrict(year?: number) {
  const filter: Record<string, any> = {};

  if (year) {
    const { start, end } = getYearRange(year);
    filter.orderDate = { $gte: start, $lte: end };
  }

  const raw = await getOrdersCollection()
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
