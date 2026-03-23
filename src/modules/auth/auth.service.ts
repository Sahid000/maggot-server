import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { ObjectId } from "mongodb";
import { getUsersCollection, getOTPCollection } from "./auth.model";
import {
  IRegisterPayload,
  ILoginPayload,
  IVerifyOTPPayload,
  IResendOTPPayload,
} from "./auth.interface";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOTPEmail(
  email: string,
  otp: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Login OTP - Maggot Donation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Login Verification</h2>
        <p>Hi ${name},</p>
        <p>Your OTP for login verification is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666;">This OTP will expire in 5 minutes.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">Maggot Donation Platform</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

export async function registerUser(payload: IRegisterPayload) {
  const { name, email, password } = payload;
  const usersCollection = getUsersCollection();

  const existingUser = await usersCollection.findOne({ email });
  if (existingUser) {
    return { status: 400, success: false, message: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await usersCollection.insertOne({ name, email, role: "user", password: hashedPassword });

  return { status: 201, success: true, message: "User registered successfully" };
}

export async function loginUser(payload: ILoginPayload) {
  const { email, password } = payload;
  const usersCollection = getUsersCollection();
  const otpCollection = getOTPCollection();

  const user = await usersCollection.findOne({ email });
  if (!user) {
    return { status: 401, success: false, message: "Invalid email or password" };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { status: 401, success: false, message: "Invalid email or password" };
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await otpCollection.deleteMany({ userId: user._id.toString() });
  await otpCollection.insertOne({
    userId: user._id.toString(),
    email: user.email,
    otp,
    expiresAt: otpExpires,
    createdAt: new Date(),
  });

  const emailResult = await sendOTPEmail(email, otp, user.name);
  if (!emailResult.success) {
    return { status: 500, success: false, message: "Failed to send OTP email. Please try again." };
  }

  const tempToken = jwt.sign(
    { email: user.email, userId: user._id.toString(), purpose: "otp_verification" },
    process.env.JWT_SECRET as string,
    { expiresIn: "10m" }
  );

  return {
    status: 200,
    success: true,
    message: "OTP sent to your email. Please verify to complete login.",
    tempToken,
  };
}

export async function verifyOTP(payload: IVerifyOTPPayload) {
  const { tempToken, otp } = payload;
  const usersCollection = getUsersCollection();
  const otpCollection = getOTPCollection();

  const decoded = jwt.verify(tempToken, process.env.JWT_SECRET as string) as any;

  if (decoded.purpose !== "otp_verification") {
    return { status: 401, success: false, message: "Invalid token purpose" };
  }

  // Check failed attempts (brute force protection)
  const recentFailKey = `fail_login_${decoded.userId}`;
  const failRecord = await otpCollection.findOne({ _id: recentFailKey as any });
  if (failRecord && (failRecord.attempts as number) >= 5) {
    return { status: 429, success: false, message: "Too many failed attempts. Please request a new OTP." };
  }

  const otpRecord = await otpCollection.findOne({
    userId: decoded.userId,
    email: decoded.email,
    otp,
  });

  if (!otpRecord) {
    // Increment failed attempts
    await otpCollection.updateOne(
      { _id: recentFailKey as any },
      { $inc: { attempts: 1 }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    const remaining = 4 - ((failRecord?.attempts as number) ?? 0);
    return { status: 401, success: false, message: `Invalid OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : "No attempts remaining."}` };
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    await otpCollection.deleteOne({ _id: otpRecord._id });
    return { status: 401, success: false, message: "OTP has expired. Please request a new one." };
  }

  // Clear failed attempts on success
  await otpCollection.deleteOne({ _id: recentFailKey as any });

  const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
  if (!user) {
    return { status: 404, success: false, message: "User not found" };
  }

  await otpCollection.deleteOne({ _id: otpRecord._id });

  const tokenVersion = (user.tokenVersion as number) ?? 1;

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, name: user.name, role: user.role, tokenVersion },
    process.env.JWT_SECRET as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: (process.env.EXPIRES_IN ?? "7d") as any }
  );

  return { status: 200, success: true, message: "Login successful", token };
}

export async function resendOTP(payload: IResendOTPPayload) {
  const { tempToken } = payload;
  const usersCollection = getUsersCollection();
  const otpCollection = getOTPCollection();

  const decoded = jwt.verify(tempToken, process.env.JWT_SECRET as string) as any;

  if (decoded.purpose !== "otp_verification") {
    return { status: 401, success: false, message: "Invalid token purpose" };
  }

  const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
  if (!user) {
    return { status: 404, success: false, message: "User not found" };
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await otpCollection.deleteMany({ userId: decoded.userId });
  await otpCollection.insertOne({
    userId: decoded.userId,
    email: user.email,
    otp,
    expiresAt: otpExpires,
    createdAt: new Date(),
  });

  const emailResult = await sendOTPEmail(user.email, otp, user.name);
  if (!emailResult.success) {
    return { status: 500, success: false, message: "Failed to send OTP email" };
  }

  const newTempToken = jwt.sign(
    { email: user.email, userId: user._id.toString(), purpose: "otp_verification" },
    process.env.JWT_SECRET as string,
    { expiresIn: "10m" }
  );

  return { status: 200, success: true, message: "New OTP sent to your email", tempToken: newTempToken };
}

export async function adminLogin(payload: { email: string; password: string }) {
  const { email, password } = payload;
  const usersCollection = getUsersCollection();
  const otpCollection = getOTPCollection();

  const user = await usersCollection.findOne({ email });
  if (!user) {
    return { status: 401, success: false, message: "Invalid email or password" };
  }

  if (user.role !== "admin") {
    return { status: 403, success: false, message: "Access denied. Admin only." };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { status: 401, success: false, message: "Invalid email or password" };
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  // Clear previous OTPs and reset fail counter on fresh login
  await otpCollection.deleteMany({ userId: user._id.toString() });
  await otpCollection.deleteOne({ _id: `fail_login_${user._id.toString()}` as any });
  await otpCollection.insertOne({
    userId: user._id.toString(),
    email: user.email,
    otp,
    expiresAt: otpExpires,
    createdAt: new Date(),
  });

  const emailResult = await sendOTPEmail(email, otp, user.name);
  if (!emailResult.success) {
    return { status: 500, success: false, message: "Failed to send OTP email. Please try again." };
  }

  const tempToken = jwt.sign(
    { email: user.email, userId: user._id.toString(), purpose: "otp_verification" },
    process.env.JWT_SECRET as string,
    { expiresIn: "10m" }
  );

  return {
    status: 200,
    success: true,
    message: "OTP sent to your email. Please verify to complete login.",
    data: { tempToken },
  };
}

function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
}

export async function changePassword(userId: string, payload: { oldPassword: string; newPassword: string }) {
  const { oldPassword, newPassword } = payload;
  const usersCollection = getUsersCollection();

  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) return { status: 400, success: false, message: passwordError };

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return { status: 404, success: false, message: "User not found" };
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    return { status: 401, success: false, message: "Current password is incorrect" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { password: hashedPassword, updatedAt: new Date() }, $inc: { tokenVersion: 1 } }
  );

  return { status: 200, success: true, message: "Password changed successfully" };
}

export async function seedAdminUser() {
  const usersCollection = getUsersCollection();
  const existingAdmin = await usersCollection.findOne({ role: "admin" });
  if (existingAdmin) {
    return { status: 200, success: true, message: "Admin user already exists" };
  }

  const adminEmail = process.env.EMAIL_USER;
  if (!adminEmail) {
    return { status: 500, success: false, message: "EMAIL_USER not set in environment" };
  }

  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    return { status: 500, success: false, message: "SEED_DEFAULT_PASSWORD not set in environment" };
  }

  const passwordError = validatePasswordStrength(seedPassword);
  if (passwordError) return { status: 400, success: false, message: `Seed password is too weak: ${passwordError}` };

  const hashedPassword = await bcrypt.hash(seedPassword, 10);
  await usersCollection.insertOne({
    name: "Admin",
    email: adminEmail,
    role: "admin",
    password: hashedPassword,
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { status: 201, success: true, message: `Admin seeded with email: ${adminEmail}` };
}

export async function forgotPasswordSendOTP(email: string) {
  const usersCollection = getUsersCollection();
  const otpCollection = getOTPCollection();

  const user = await usersCollection.findOne({ email });
  if (!user) {
    return { status: 404, success: false, message: "No account found with this email" };
  }

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await otpCollection.deleteMany({ userId: user._id.toString(), purpose: "reset" });
  await otpCollection.insertOne({
    userId: user._id.toString(),
    email: user.email,
    otp,
    purpose: "reset",
    expiresAt: otpExpires,
    createdAt: new Date(),
  });

  const emailResult = await sendOTPEmail(email, otp, user.name);
  if (!emailResult.success) {
    return { status: 500, success: false, message: "Failed to send OTP email" };
  }

  const forgetToken = jwt.sign(
    { userId: user._id.toString(), email: user.email, purpose: "forgot_password" },
    process.env.JWT_SECRET as string,
    { expiresIn: "10m" }
  );

  return { status: 200, success: true, message: "OTP sent to your email", data: { forgetToken } };
}

export async function verifyResetOTP(forgetToken: string, otp: string) {
  const usersCollection = getUsersCollection();
  const otpCollection = getOTPCollection();

  let decoded: any;
  try {
    decoded = jwt.verify(forgetToken, process.env.JWT_SECRET as string);
  } catch {
    return { status: 401, success: false, message: "Invalid or expired token" };
  }

  if (decoded.purpose !== "forgot_password") {
    return { status: 401, success: false, message: "Invalid token purpose" };
  }

  const otpRecord = await otpCollection.findOne({ userId: decoded.userId, otp, purpose: "reset" });
  if (!otpRecord) return { status: 401, success: false, message: "Invalid OTP" };
  if (new Date() > new Date(otpRecord.expiresAt)) {
    await otpCollection.deleteOne({ _id: otpRecord._id });
    return { status: 401, success: false, message: "OTP has expired" };
  }

  const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId as string) });
  if (!user) return { status: 404, success: false, message: "User not found" };

  await otpCollection.deleteOne({ _id: otpRecord._id });

  const resetToken = jwt.sign(
    { userId: user._id.toString(), purpose: "reset_password" },
    process.env.JWT_SECRET as string,
    { expiresIn: "10m" }
  );

  return { status: 200, success: true, message: "OTP verified", data: { forgetOtpMatchToken: resetToken } };
}

export async function resendResetOTP(forgetToken: string) {
  const usersCollection = getUsersCollection();
  const otpCollection = getOTPCollection();

  let decoded: any;
  try {
    decoded = jwt.verify(forgetToken, process.env.JWT_SECRET as string);
  } catch {
    return { status: 401, success: false, message: "Invalid or expired token" };
  }

  const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId as string) });
  if (!user) return { status: 404, success: false, message: "User not found" };

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await otpCollection.deleteMany({ userId: decoded.userId, purpose: "reset" });
  await otpCollection.insertOne({
    userId: decoded.userId,
    email: user.email,
    otp,
    purpose: "reset",
    expiresAt: otpExpires,
    createdAt: new Date(),
  });

  await sendOTPEmail(user.email, otp, user.name);

  const newForgetToken = jwt.sign(
    { userId: user._id.toString(), email: user.email, purpose: "forgot_password" },
    process.env.JWT_SECRET as string,
    { expiresIn: "10m" }
  );

  return { status: 200, success: true, message: "New OTP sent", data: { forgetToken: newForgetToken } };
}

export async function listAdmins() {
  const usersCollection = getUsersCollection();
  const admins = await usersCollection
    .find({ role: "admin" }, { projection: { password: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
  return { status: 200, success: true, data: admins };
}

export async function addAdmin(payload: { name: string; email: string; password: string }) {
  const { name, email, password } = payload;
  if (!name || !email || !password) {
    return { status: 400, success: false, message: "Name, email, and password are required" };
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) return { status: 400, success: false, message: passwordError };

  const usersCollection = getUsersCollection();
  const existing = await usersCollection.findOne({ email });
  if (existing) {
    return { status: 400, success: false, message: "An account with this email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await usersCollection.insertOne({
    name,
    email,
    role: "admin",
    password: hashedPassword,
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    status: 201,
    success: true,
    message: `Admin account created for ${email}`,
    data: { _id: result.insertedId, name, email, role: "admin" },
  };
}

export async function removeAdmin(targetId: string, requestingAdminId: string) {
  if (!ObjectId.isValid(targetId)) {
    return { status: 400, success: false, message: "Invalid admin ID" };
  }

  if (targetId === requestingAdminId) {
    return { status: 400, success: false, message: "নিজের অ্যাকাউন্ট মুছতে পারবেন না" };
  }

  const usersCollection = getUsersCollection();

  const target = await usersCollection.findOne({ _id: new ObjectId(targetId), role: "admin" });
  if (!target) {
    return { status: 404, success: false, message: "Admin not found" };
  }

  // Primary admin (EMAIL_USER) can never be deleted
  const primaryEmail = process.env.EMAIL_USER;
  if (primaryEmail && target.email === primaryEmail) {
    return { status: 403, success: false, message: "প্রাথমিক অ্যাডমিন অ্যাকাউন্ট মুছে ফেলা যাবে না" };
  }

  const adminCount = await usersCollection.countDocuments({ role: "admin" });
  if (adminCount <= 1) {
    return { status: 400, success: false, message: "সর্বশেষ অ্যাডমিন মুছে ফেলা যাবে না" };
  }

  await usersCollection.deleteOne({ _id: new ObjectId(targetId) });
  return { status: 200, success: true, message: "Admin removed successfully" };
}

export async function resetPassword(resetToken: string, newPassword: string) {
  const usersCollection = getUsersCollection();

  const passwordError = validatePasswordStrength(newPassword);
  if (passwordError) return { status: 400, success: false, message: passwordError };

  let decoded: any;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET as string);
  } catch {
    return { status: 401, success: false, message: "Invalid or expired reset token" };
  }

  if (decoded.purpose !== "reset_password") {
    return { status: 401, success: false, message: "Invalid token purpose" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await usersCollection.updateOne(
    { _id: new ObjectId(decoded.userId as string) },
    { $set: { password: hashedPassword, updatedAt: new Date() }, $inc: { tokenVersion: 1 } }
  );

  return { status: 200, success: true, message: "Password reset successfully" };
}
