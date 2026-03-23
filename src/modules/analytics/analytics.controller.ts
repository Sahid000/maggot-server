import { Request, Response } from "express";
import * as AnalyticsService from "./analytics.service";

export async function trackVisit(req: Request, res: Response) {
  try {
    const ip = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const { page } = req.body;
    const result = await AnalyticsService.trackVisit(ip, userAgent, page);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to track visit", error: error.message });
  }
}

export async function getDashboardCards(req: Request, res: Response) {
  try {
    const result = await AnalyticsService.getDashboardCards();
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch dashboard cards", error: error.message });
  }
}

export async function getVisitsAndOrdersByMonth(req: Request, res: Response) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const result = await AnalyticsService.getVisitsAndOrdersByMonth(year);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch chart data", error: error.message });
  }
}

export async function getOrdersByMonth(req: Request, res: Response) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const result = await AnalyticsService.getOrdersByMonth(year);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch orders monthly data", error: error.message });
  }
}

export async function getOrderStatusDistribution(req: Request, res: Response) {
  try {
    const result = await AnalyticsService.getOrderStatusDistribution();
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch status distribution", error: error.message });
  }
}

export async function getOrdersByDistrict(req: Request, res: Response) {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const result = await AnalyticsService.getOrdersByDistrict(year);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch district data", error: error.message });
  }
}

export async function getRevenueByMonth(req: Request, res: Response) {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const result = await AnalyticsService.getRevenueByMonth(year);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch revenue data", error: error.message });
  }
}

export async function getRevenueStats(req: Request, res: Response) {
  try {
    const result = await AnalyticsService.getRevenueStats();
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch revenue stats", error: error.message });
  }
}
