import { Request, Response } from "express";
import * as CouponsService from "./coupons.service";

export async function createCoupon(req: Request, res: Response) {
  try {
    const result = await CouponsService.createCoupon(req.body);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create coupon", error: error.message });
  }
}

export async function getCoupons(req: Request, res: Response) {
  try {
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await CouponsService.getCoupons({ page, limit });
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to get coupons", error: error.message });
  }
}

export async function toggleCoupon(req: Request, res: Response) {
  try {
    const result = await CouponsService.toggleCoupon(req.params.id);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update coupon", error: error.message });
  }
}

export async function deleteCoupon(req: Request, res: Response) {
  try {
    const result = await CouponsService.deleteCoupon(req.params.id);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete coupon", error: error.message });
  }
}

export async function validateCoupon(req: Request, res: Response) {
  try {
    const { code, orderAmount } = req.body;
    if (!code || orderAmount === undefined) {
      return res.status(400).json({ success: false, message: "code and orderAmount are required" });
    }
    const result = await CouponsService.validateCoupon(code, Number(orderAmount));
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to validate coupon", error: error.message });
  }
}
