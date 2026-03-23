"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAdmin = exports.addAdmin = exports.listAdmins = exports.resetPassword = exports.resendResetOTP = exports.verifyResetOTP = exports.forgotPassword = exports.seedAdmin = exports.changePassword = exports.adminLogin = void 0;
exports.register = register;
exports.login = login;
exports.verifyOTP = verifyOTP;
exports.resendOTP = resendOTP;
const AuthService = __importStar(require("./auth.service"));
async function register(req, res) {
    const result = await AuthService.registerUser(req.body);
    res.status(result.status).json(result);
}
async function login(req, res) {
    const result = await AuthService.loginUser(req.body);
    res.status(result.status).json(result);
}
async function verifyOTP(req, res) {
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
    }
    catch (error) {
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
async function resendOTP(req, res) {
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
    }
    catch (error) {
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
const adminLogin = async (req, res) => {
    try {
        const result = await AuthService.adminLogin(req.body);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.adminLogin = adminLogin;
const changePassword = async (req, res) => {
    try {
        const user = req.user;
        const result = await AuthService.changePassword(user.userId, req.body);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.changePassword = changePassword;
const seedAdmin = async (req, res) => {
    const secret = req.query.secret;
    const expectedSecret = process.env.SEED_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }
    try {
        const result = await AuthService.seedAdminUser();
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.seedAdmin = seedAdmin;
const forgotPassword = async (req, res) => {
    try {
        const result = await AuthService.forgotPasswordSendOTP(req.body.email);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.forgotPassword = forgotPassword;
const verifyResetOTP = async (req, res) => {
    try {
        const token = req.headers["token"];
        const { otp } = req.body;
        const result = await AuthService.verifyResetOTP(token, otp);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.verifyResetOTP = verifyResetOTP;
const resendResetOTP = async (req, res) => {
    try {
        const token = req.headers["token"];
        const result = await AuthService.resendResetOTP(token);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.resendResetOTP = resendResetOTP;
const resetPassword = async (req, res) => {
    try {
        const token = req.headers["token"];
        const { newPassword } = req.body;
        const result = await AuthService.resetPassword(token, newPassword);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.resetPassword = resetPassword;
const listAdmins = async (_req, res) => {
    try {
        const result = await AuthService.listAdmins();
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.listAdmins = listAdmins;
const addAdmin = async (req, res) => {
    try {
        const result = await AuthService.addAdmin(req.body);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.addAdmin = addAdmin;
const removeAdmin = async (req, res) => {
    try {
        const requestingAdmin = req.user;
        const result = await AuthService.removeAdmin(req.params.id, requestingAdmin.userId);
        res.status(result.status).json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.removeAdmin = removeAdmin;
