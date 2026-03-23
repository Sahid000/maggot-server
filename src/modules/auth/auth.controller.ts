import { Request, Response } from "express";
import * as AuthService from "./auth.service";

export async function register(req: Request, res: Response) {
  const result = await AuthService.registerUser(req.body);
  res.status(result.status).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await AuthService.loginUser(req.body);
  res.status(result.status).json(result);
}

export async function verifyOTP(req: Request, res: Response) {
  const { tempToken, otp } = req.body;

  if (!tempToken || !otp) {
    return res.status(400).json({
      success: false,
      message: "Temporary token and OTP are required",
    });
  }

  try {
    const result = await AuthService.verifyOTP(req.body);
    res.status(result.status).json(result);
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Temporary token has expired. Please login again.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid temporary token",
      });
    }
    res.status(500).json({ success: false, message: "Token verification failed" });
  }
}

export async function resendOTP(req: Request, res: Response) {
  const { tempToken } = req.body;

  if (!tempToken) {
    return res.status(400).json({
      success: false,
      message: "Temporary token is required",
    });
  }

  try {
    const result = await AuthService.resendOTP(req.body);
    res.status(result.status).json(result);
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid temporary token",
      });
    }
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
}
