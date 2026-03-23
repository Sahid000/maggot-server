import { Request, Response } from "express";
import * as OrdersService from "./orders.service";

export async function createOrder(req: Request, res: Response) {
  try {
    const result = await OrdersService.createOrder(req.body);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const result = await OrdersService.updateOrderStatus(req.params.id, req.body.status);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update order", error: error.message });
  }
}

export async function getOrders(req: Request, res: Response) {
  try {
    const result = await OrdersService.getOrders(req.query as any);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
  }
}

export async function getOrderById(req: Request, res: Response) {
  try {
    const result = await OrdersService.getOrderById(req.params.id);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch order", error: error.message });
  }
}

export async function deleteOrder(req: Request, res: Response) {
  try {
    const result = await OrdersService.deleteOrder(req.params.id);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete order", error: error.message });
  }
}

export async function getOrderStats(_req: Request, res: Response) {
  try {
    const result = await OrdersService.getOrderStats();
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch statistics", error: error.message });
  }
}

export async function trackOrder(req: Request, res: Response) {
  try {
    const { id, t } = req.query as { id: string; t: string };
    const result = await OrdersService.trackOrder(id, t);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to track order", error: error.message });
  }
}
