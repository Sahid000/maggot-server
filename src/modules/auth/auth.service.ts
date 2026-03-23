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

  const otpRecord = await otpCollection.findOne({
    userId: decoded.userId,
    email: decoded.email,
    otp,
  });

  if (!otpRecord) {
    return { status: 401, success: false, message: "Invalid OTP" };
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    await otpCollection.deleteOne({ _id: otpRecord._id });
    return { status: 401, success: false, message: "OTP has expired. Please request a new one." };
  }

  const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
  if (!user) {
    return { status: 404, success: false, message: "User not found" };
  }

  await otpCollection.deleteOne({ _id: otpRecord._id });

  const token = jwt.sign(
    { email: user.email, name: user.name, role: user.role },
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
