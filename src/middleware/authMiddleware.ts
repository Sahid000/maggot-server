import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getUsersCollection } from "../modules/auth/auth.model";
import { ObjectId } from "mongodb";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["token"] as string;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["token"] as string;
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }

  if (decoded.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
  }

  // Verify tokenVersion matches DB — invalidates tokens after password change
  try {
    const user = await getUsersCollection().findOne({ _id: new ObjectId(decoded.userId as string) });
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }
    const dbVersion = (user.tokenVersion as number) ?? 1;
    const tokenVersion = (decoded.tokenVersion as number) ?? 1;
    if (tokenVersion !== dbVersion) {
      return res.status(401).json({ success: false, message: "Unauthorized: Token is no longer valid. Please login again." });
    }
  } catch {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }

  (req as any).user = decoded;
  next();
}
