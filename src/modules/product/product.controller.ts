import { Request, Response } from "express";
import * as ProductService from "./product.service";

export async function getProduct(_req: Request, res: Response) {
  try {
    const result = await ProductService.getProduct();
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch product config", error: error.message });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const result = await ProductService.updateProduct(req.body);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to update product config", error: error.message });
  }
}
