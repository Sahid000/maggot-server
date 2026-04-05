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

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.adminLogin(req.body);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await AuthService.changePassword(user.userId, req.body);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const seedAdmin = async (req: Request, res: Response) => {
  const secret = req.query.secret as string;
  const expectedSecret = process.env.SEED_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const result = await AuthService.seedAdminUser();
    res.status(result.status).json(result);
  } catch (err) {
    console.error("[seedAdmin] Error:", err);
    res.status(500).json({ success: false, message: "Internal server error", error: (err as Error).message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.forgotPasswordSendOTP(req.body.email);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const verifyResetOTP = async (req: Request, res: Response) => {
  try {
    const token = req.headers["token"] as string;
    const { otp } = req.body;
    const result = await AuthService.verifyResetOTP(token, otp);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const resendResetOTP = async (req: Request, res: Response) => {
  try {
    const token = req.headers["token"] as string;
    const result = await AuthService.resendResetOTP(token);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const token = req.headers["token"] as string;
    const { newPassword } = req.body;
    const result = await AuthService.resetPassword(token, newPassword);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const listAdmins = async (_req: Request, res: Response) => {
  try {
    const result = await AuthService.listAdmins();
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const addAdmin = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.addAdmin(req.body);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const removeAdmin = async (req: Request, res: Response) => {
  try {
    const requestingAdmin = (req as any).user;
    const result = await AuthService.removeAdmin(req.params.id, requestingAdmin.userId);
    res.status(result.status).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
