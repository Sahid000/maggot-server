import { ObjectId } from "mongodb";
import { getCouponsCollection } from "./coupons.model";

export async function createCoupon(payload: {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}) {
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = payload;

  if (!code || !discountType || discountValue === undefined) {
    return { status: 400, success: false, message: "Code, discountType, and discountValue are required" };
  }

  if (!["percent", "fixed"].includes(discountType)) {
    return { status: 400, success: false, message: "discountType must be 'percent' or 'fixed'" };
  }

  if (Number(discountValue) <= 0) {
    return { status: 400, success: false, message: "discountValue must be greater than 0" };
  }

  if (discountType === "percent" && Number(discountValue) > 100) {
    return { status: 400, success: false, message: "Percent discount cannot exceed 100" };
  }

  const existing = await getCouponsCollection().findOne({ code: code.toUpperCase().trim() });
  if (existing) {
    return { status: 400, success: false, message: "Coupon code already exists" };
  }

  const coupon = {
    code: code.toUpperCase().trim(),
    discountType,
    discountValue: Number(discountValue),
    minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
    maxUses: maxUses ? Number(maxUses) : null,
    usedCount: 0,
    isActive: true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await getCouponsCollection().insertOne(coupon);
  return { status: 201, success: true, message: "Coupon created successfully", data: { ...coupon, _id: result.insertedId } };
}

export async function getCoupons(query: { page?: string; limit?: string } = {}) {
  const pageNum = Math.max(1, parseInt(query.page ?? "1") || 1);
  const limitNum = Math.min(Math.max(1, parseInt(query.limit ?? "10") || 10), 500);
  const skip = (pageNum - 1) * limitNum;

  const collection = getCouponsCollection();
  const [coupons, total] = await Promise.all([
    collection.find({}).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
    collection.countDocuments(),
  ]);

  return {
    status: 200,
    success: true,
    data: coupons,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalCoupons: total,
      limit: limitNum,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  };
}

export async function toggleCoupon(id: string) {
  if (!ObjectId.isValid(id)) {
    return { status: 400, success: false, message: "Invalid coupon ID" };
  }

  const coupon = await getCouponsCollection().findOne({ _id: new ObjectId(id) });
  if (!coupon) return { status: 404, success: false, message: "Coupon not found" };

  const result = await getCouponsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { isActive: !coupon.isActive, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  return { status: 200, success: true, message: `Coupon ${result?.isActive ? "activated" : "deactivated"}`, data: result };
}

export async function deleteCoupon(id: string) {
  if (!ObjectId.isValid(id)) {
    return { status: 400, success: false, message: "Invalid coupon ID" };
  }

  const result = await getCouponsCollection().deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return { status: 404, success: false, message: "Coupon not found" };
  }

  return { status: 200, success: true, message: "Coupon deleted successfully" };
}

export async function validateCoupon(code: string, orderAmount: number) {
  if (!code) return { status: 400, success: false, message: "কুপন কোড প্রদান করুন" };

  const coupon = await getCouponsCollection().findOne({ code: code.toUpperCase().trim() });
  if (!coupon) {
    return { status: 404, success: false, message: "কুপন কোডটি বৈধ নয়" };
  }

  if (!coupon.isActive) {
    return { status: 400, success: false, message: "এই কুপন কোডটি আর সক্রিয় নেই" };
  }

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt as Date)) {
    return { status: 400, success: false, message: "কুপন কোডটির মেয়াদ শেষ হয়ে গেছে" };
  }

  if (coupon.maxUses !== null && (coupon.usedCount as number) >= (coupon.maxUses as number)) {
    return { status: 400, success: false, message: "এই কুপন কোডটির সর্বোচ্চ ব্যবহার সীমা পূর্ণ হয়ে গেছে" };
  }

  if (coupon.minOrderAmount && orderAmount < (coupon.minOrderAmount as number)) {
    return {
      status: 400,
      success: false,
      message: `এই কুপন ব্যবহার করতে ন্যূনতম অর্ডার মূল্য ৳${coupon.minOrderAmount} হতে হবে`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percent") {
    discountAmount = Math.round((orderAmount * (coupon.discountValue as number)) / 100);
  } else {
    discountAmount = Math.min(coupon.discountValue as number, orderAmount);
  }

  return {
    status: 200,
    success: true,
    message: "কুপন কোডটি সফলভাবে প্রয়োগ হয়েছে!",
    data: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    },
  };
}

export async function applyCouponUsage(code: string) {
  await getCouponsCollection().updateOne(
    { code: code.toUpperCase().trim() },
    { $inc: { usedCount: 1 }, $set: { updatedAt: new Date() } }
  );
}
