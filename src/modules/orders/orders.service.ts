import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getOrdersCollection } from "./orders.model";
import { ICreateOrderPayload, IOrdersQuery } from "./orders.interface";
import { sendEmail } from "../../utils/mailer";
import { getDB } from "../../config/db";

const VALID_STATUSES = ["pending", "approved", "declined", "cancelled", "completed"];
const PRICE_PER_KIT = 230; // BDT — update here when price changes

async function generateOrderId(): Promise<string> {
  const today = new Date();
  const dateKey = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const counters = getDB().collection("counters");
  const result = await counters.findOneAndUpdate(
    { _id: `order_seq_${dateKey}` as any },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = result!.seq as number;
  return `MF-${dateKey}-${String(seq).padStart(4, "0")}`;
}

export async function createOrder(payload: ICreateOrderPayload) {
  const { name, email, phone, district, insideDhaka, address, quantity, note } = payload;

  if (!name || !phone || !district || insideDhaka === undefined || !address || !quantity) {
    return {
      status: 400,
      success: false,
      message: "Name, phone, district, insideDhaka, address, and quantity are required",
    };
  }

  if (quantity <= 0) {
    return { status: 400, success: false, message: "Quantity must be greater than 0" };
  }

  const orderId = await generateOrderId();

  const newOrder = {
    orderId,
    name,
    email: email || null,
    phone,
    district,
    insideDhaka: Boolean(insideDhaka),
    address,
    quantity: Number(quantity),
    pricePerKit: PRICE_PER_KIT,
    totalPrice: PRICE_PER_KIT * Number(quantity),
    note: note || null,
    status: "pending" as const,
    orderDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await getOrdersCollection().insertOne(newOrder);

  const trackingToken = jwt.sign(
    { orderId, purpose: "order_tracking" },
    process.env.JWT_SECRET as string,
    { expiresIn: "30d" }
  );

  if (email) {
    sendOrderTrackingEmail(email, name, orderId).catch(console.error);
  }

  return {
    status: 201,
    success: true,
    message: "Order created successfully",
    data: { trackingToken, ...newOrder },
  };
}

async function sendOrderTrackingEmail(email: string, name: string, orderId: string) {
  const token = jwt.sign(
    { orderId, purpose: "order_tracking" },
    process.env.JWT_SECRET as string,
    { expiresIn: "30d" }
  );

  const trackingUrl = `${process.env.WEBSITE_URL}/track?id=${orderId}&t=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">Order Confirmed!</h2>
      <p>Hi ${name},</p>
      <p>Thank you for your order. We have received it and it is currently being processed.</p>
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #666;">Order ID</p>
        <p style="margin: 5px 0 0; font-weight: bold; font-size: 16px;">${orderId}</p>
      </div>
      <p>You can track your order status anytime using the link below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${trackingUrl}"
           style="background-color: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
          Track My Order
        </a>
      </div>
      <p style="color: #666; font-size: 13px;">This tracking link is valid for 30 days.</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #999; font-size: 12px;">Maggot Donation Platform</p>
    </div>
  `;

  await sendEmail(email, "Order Confirmation - Maggot Donation", html);
}

export async function updateOrderStatus(id: string, status: string) {
  if (!ObjectId.isValid(id)) {
    return { status: 400, success: false, message: "Invalid order ID" };
  }

  if (!status || !VALID_STATUSES.includes(status.toLowerCase())) {
    return {
      status: 400,
      success: false,
      message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
    };
  }

  const result = await getOrdersCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status: status.toLowerCase(), updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) {
    return { status: 404, success: false, message: "Order not found" };
  }

  return { status: 200, success: true, message: "Order status updated successfully", data: result };
}

export async function getOrders(query: IOrdersQuery) {
  const {
    page = "1",
    limit = "10",
    status,
    insideDhaka,
    orderDate,
    search,
    sortBy = "orderDate",
    sortOrder = "desc",
  } = query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, any> = {};

  if (status) filter.status = status.toLowerCase();
  if (insideDhaka !== undefined) filter.insideDhaka = insideDhaka === "true";

  if (orderDate) {
    const startDate = new Date(orderDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(orderDate);
    endDate.setHours(23, 59, 59, 999);
    filter.orderDate = { $gte: startDate, $lte: endDate };
  }

  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
  const collection = getOrdersCollection();

  const totalOrders = await collection.countDocuments(filter);
  const totalPages = Math.ceil(totalOrders / limitNum);
  const orders = await collection.find(filter).sort(sort).skip(skip).limit(limitNum).toArray();

  return {
    status: 200,
    success: true,
    data: orders,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalOrders,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
}

export async function getOrderById(id: string) {
  if (!ObjectId.isValid(id)) {
    return { status: 400, success: false, message: "Invalid order ID" };
  }

  const order = await getOrdersCollection().findOne({ _id: new ObjectId(id) });
  if (!order) {
    return { status: 404, success: false, message: "Order not found" };
  }

  return { status: 200, success: true, data: order };
}

export async function deleteOrder(id: string) {
  if (!ObjectId.isValid(id)) {
    return { status: 400, success: false, message: "Invalid order ID" };
  }

  const result = await getOrdersCollection().deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return { status: 404, success: false, message: "Order not found" };
  }

  return { status: 200, success: true, message: "Order deleted successfully" };
}

export async function getOrderStats() {
  const collection = getOrdersCollection();

  const [
    totalOrders,
    pendingOrders,
    approvedOrders,
    declinedOrders,
    cancelledOrders,
    completedOrders,
    insideDhakaOrders,
    outsideDhakaOrders,
    quantityResult,
  ] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ status: "pending" }),
    collection.countDocuments({ status: "approved" }),
    collection.countDocuments({ status: "declined" }),
    collection.countDocuments({ status: "cancelled" }),
    collection.countDocuments({ status: "completed" }),
    collection.countDocuments({ insideDhaka: true }),
    collection.countDocuments({ insideDhaka: false }),
    collection.aggregate([{ $group: { _id: null, totalQuantity: { $sum: "$quantity" } } }]).toArray(),
  ]);

  return {
    status: 200,
    success: true,
    data: {
      totalOrders,
      pendingOrders,
      approvedOrders,
      declinedOrders,
      cancelledOrders,
      completedOrders,
      insideDhakaOrders,
      outsideDhakaOrders,
      totalQuantity: quantityResult[0]?.totalQuantity || 0,
    },
  };
}

export async function trackOrder(id: string, token: string) {
  if (!id || !token) {
    return { status: 400, success: false, message: "Order ID and tracking token are required" };
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return { status: 401, success: false, message: "Invalid or expired tracking token" };
  }

  if (decoded.purpose !== "order_tracking" || decoded.orderId !== id) {
    return { status: 401, success: false, message: "Tracking token does not match this order" };
  }

  const order = await getOrdersCollection().findOne({ orderId: id });
  if (!order) {
    return { status: 404, success: false, message: "Order not found" };
  }

  return { status: 200, success: true, data: order };
}
