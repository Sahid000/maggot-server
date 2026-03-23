"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.verifyOTP = verifyOTP;
exports.resendOTP = resendOTP;
exports.adminLogin = adminLogin;
exports.changePassword = changePassword;
exports.seedAdminUser = seedAdminUser;
exports.forgotPasswordSendOTP = forgotPasswordSendOTP;
exports.verifyResetOTP = verifyResetOTP;
exports.resendResetOTP = resendResetOTP;
exports.listAdmins = listAdmins;
exports.addAdmin = addAdmin;
exports.removeAdmin = removeAdmin;
exports.resetPassword = resetPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const mongodb_1 = require("mongodb");
const auth_model_1 = require("./auth.model");
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});
function generateOTP() {
    return crypto_1.default.randomInt(100000, 999999).toString();
}
async function sendOTPEmail(email, otp, name) {
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
    }
    catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message };
    }
}
async function registerUser(payload) {
    const { name, email, password } = payload;
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
        return { status: 400, success: false, message: "User already exists" };
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    await usersCollection.insertOne({ name, email, role: "user", password: hashedPassword });
    return { status: 201, success: true, message: "User registered successfully" };
}
async function loginUser(payload) {
    const { email, password } = payload;
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const otpCollection = (0, auth_model_1.getOTPCollection)();
    const user = await usersCollection.findOne({ email });
    if (!user) {
        return { status: 401, success: false, message: "Invalid email or password" };
    }
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
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
    const tempToken = jsonwebtoken_1.default.sign({ email: user.email, userId: user._id.toString(), purpose: "otp_verification" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return {
        status: 200,
        success: true,
        message: "OTP sent to your email. Please verify to complete login.",
        tempToken,
    };
}
async function verifyOTP(payload) {
    const { tempToken, otp } = payload;
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const otpCollection = (0, auth_model_1.getOTPCollection)();
    const decoded = jsonwebtoken_1.default.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.purpose !== "otp_verification") {
        return { status: 401, success: false, message: "Invalid token purpose" };
    }
    // Check failed attempts (brute force protection)
    const recentFailKey = `fail_login_${decoded.userId}`;
    const failRecord = await otpCollection.findOne({ _id: recentFailKey });
    if (failRecord && failRecord.attempts >= 5) {
        return { status: 429, success: false, message: "Too many failed attempts. Please request a new OTP." };
    }
    const otpRecord = await otpCollection.findOne({
        userId: decoded.userId,
        email: decoded.email,
        otp,
    });
    if (!otpRecord) {
        // Increment failed attempts
        await otpCollection.updateOne({ _id: recentFailKey }, { $inc: { attempts: 1 }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        const remaining = 4 - (failRecord?.attempts ?? 0);
        return { status: 401, success: false, message: `Invalid OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : "No attempts remaining."}` };
    }
    if (new Date() > new Date(otpRecord.expiresAt)) {
        await otpCollection.deleteOne({ _id: otpRecord._id });
        return { status: 401, success: false, message: "OTP has expired. Please request a new one." };
    }
    // Clear failed attempts on success
    await otpCollection.deleteOne({ _id: recentFailKey });
    const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(decoded.userId) });
    if (!user) {
        return { status: 404, success: false, message: "User not found" };
    }
    await otpCollection.deleteOne({ _id: otpRecord._id });
    const tokenVersion = user.tokenVersion ?? 1;
    const token = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, name: user.name, role: user.role, tokenVersion }, process.env.JWT_SECRET, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: (process.env.EXPIRES_IN ?? "7d") });
    return { status: 200, success: true, message: "Login successful", token };
}
async function resendOTP(payload) {
    const { tempToken } = payload;
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const otpCollection = (0, auth_model_1.getOTPCollection)();
    const decoded = jsonwebtoken_1.default.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.purpose !== "otp_verification") {
        return { status: 401, success: false, message: "Invalid token purpose" };
    }
    const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(decoded.userId) });
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
    const newTempToken = jsonwebtoken_1.default.sign({ email: user.email, userId: user._id.toString(), purpose: "otp_verification" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return { status: 200, success: true, message: "New OTP sent to your email", tempToken: newTempToken };
}
async function adminLogin(payload) {
    const { email, password } = payload;
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const otpCollection = (0, auth_model_1.getOTPCollection)();
    const user = await usersCollection.findOne({ email });
    if (!user) {
        return { status: 401, success: false, message: "Invalid email or password" };
    }
    if (user.role !== "admin") {
        return { status: 403, success: false, message: "Access denied. Admin only." };
    }
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        return { status: 401, success: false, message: "Invalid email or password" };
    }
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    // Clear previous OTPs and reset fail counter on fresh login
    await otpCollection.deleteMany({ userId: user._id.toString() });
    await otpCollection.deleteOne({ _id: `fail_login_${user._id.toString()}` });
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
    const tempToken = jsonwebtoken_1.default.sign({ email: user.email, userId: user._id.toString(), purpose: "otp_verification" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return {
        status: 200,
        success: true,
        message: "OTP sent to your email. Please verify to complete login.",
        data: { tempToken },
    };
}
function validatePasswordStrength(password) {
    if (!password || password.length < 8)
        return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password))
        return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password))
        return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password))
        return "Password must contain at least one number";
    if (!/[^A-Za-z0-9]/.test(password))
        return "Password must contain at least one special character";
    return null;
}
async function changePassword(userId, payload) {
    const { oldPassword, newPassword } = payload;
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError)
        return { status: 400, success: false, message: passwordError };
    const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(userId) });
    if (!user) {
        return { status: 404, success: false, message: "User not found" };
    }
    const isPasswordValid = await bcrypt_1.default.compare(oldPassword, user.password);
    if (!isPasswordValid) {
        return { status: 401, success: false, message: "Current password is incorrect" };
    }
    const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
    await usersCollection.updateOne({ _id: new mongodb_1.ObjectId(userId) }, { $set: { password: hashedPassword, updatedAt: new Date() }, $inc: { tokenVersion: 1 } });
    return { status: 200, success: true, message: "Password changed successfully" };
}
async function seedAdminUser() {
    const usersCollection = (0, auth_model_1.getUsersCollection)();
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
    if (passwordError)
        return { status: 400, success: false, message: `Seed password is too weak: ${passwordError}` };
    const hashedPassword = await bcrypt_1.default.hash(seedPassword, 10);
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
async function forgotPasswordSendOTP(email) {
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const otpCollection = (0, auth_model_1.getOTPCollection)();
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
    const forgetToken = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, purpose: "forgot_password" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return { status: 200, success: true, message: "OTP sent to your email", data: { forgetToken } };
}
async function verifyResetOTP(forgetToken, otp) {
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const otpCollection = (0, auth_model_1.getOTPCollection)();
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(forgetToken, process.env.JWT_SECRET);
    }
    catch {
        return { status: 401, success: false, message: "Invalid or expired token" };
    }
    if (decoded.purpose !== "forgot_password") {
        return { status: 401, success: false, message: "Invalid token purpose" };
    }
    const otpRecord = await otpCollection.findOne({ userId: decoded.userId, otp, purpose: "reset" });
    if (!otpRecord)
        return { status: 401, success: false, message: "Invalid OTP" };
    if (new Date() > new Date(otpRecord.expiresAt)) {
        await otpCollection.deleteOne({ _id: otpRecord._id });
        return { status: 401, success: false, message: "OTP has expired" };
    }
    const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(decoded.userId) });
    if (!user)
        return { status: 404, success: false, message: "User not found" };
    await otpCollection.deleteOne({ _id: otpRecord._id });
    const resetToken = jsonwebtoken_1.default.sign({ userId: user._id.toString(), purpose: "reset_password" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return { status: 200, success: true, message: "OTP verified", data: { forgetOtpMatchToken: resetToken } };
}
async function resendResetOTP(forgetToken) {
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const otpCollection = (0, auth_model_1.getOTPCollection)();
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(forgetToken, process.env.JWT_SECRET);
    }
    catch {
        return { status: 401, success: false, message: "Invalid or expired token" };
    }
    const user = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(decoded.userId) });
    if (!user)
        return { status: 404, success: false, message: "User not found" };
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
    const newForgetToken = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, purpose: "forgot_password" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return { status: 200, success: true, message: "New OTP sent", data: { forgetToken: newForgetToken } };
}
async function listAdmins() {
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const admins = await usersCollection
        .find({ role: "admin" }, { projection: { password: 0 } })
        .sort({ createdAt: 1 })
        .toArray();
    return { status: 200, success: true, data: admins };
}
async function addAdmin(payload) {
    const { name, email, password } = payload;
    if (!name || !email || !password) {
        return { status: 400, success: false, message: "Name, email, and password are required" };
    }
    const passwordError = validatePasswordStrength(password);
    if (passwordError)
        return { status: 400, success: false, message: passwordError };
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const existing = await usersCollection.findOne({ email });
    if (existing) {
        return { status: 400, success: false, message: "An account with this email already exists" };
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
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
async function removeAdmin(targetId, requestingAdminId) {
    if (!mongodb_1.ObjectId.isValid(targetId)) {
        return { status: 400, success: false, message: "Invalid admin ID" };
    }
    if (targetId === requestingAdminId) {
        return { status: 400, success: false, message: "নিজের অ্যাকাউন্ট মুছতে পারবেন না" };
    }
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const target = await usersCollection.findOne({ _id: new mongodb_1.ObjectId(targetId), role: "admin" });
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
    await usersCollection.deleteOne({ _id: new mongodb_1.ObjectId(targetId) });
    return { status: 200, success: true, message: "Admin removed successfully" };
}
async function resetPassword(resetToken, newPassword) {
    const usersCollection = (0, auth_model_1.getUsersCollection)();
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError)
        return { status: 400, success: false, message: passwordError };
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(resetToken, process.env.JWT_SECRET);
    }
    catch {
        return { status: 401, success: false, message: "Invalid or expired reset token" };
    }
    if (decoded.purpose !== "reset_password") {
        return { status: 401, success: false, message: "Invalid token purpose" };
    }
    const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
    await usersCollection.updateOne({ _id: new mongodb_1.ObjectId(decoded.userId) }, { $set: { password: hashedPassword, updatedAt: new Date() }, $inc: { tokenVersion: 1 } });
    return { status: 200, success: true, message: "Password reset successfully" };
}
