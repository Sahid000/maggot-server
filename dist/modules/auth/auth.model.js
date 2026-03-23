"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOTPCollection = exports.getUsersCollection = void 0;
const db_1 = require("../../config/db");
const getUsersCollection = () => (0, db_1.getDB)().collection("users");
exports.getUsersCollection = getUsersCollection;
const getOTPCollection = () => (0, db_1.getDB)().collection("otp_verifications");
exports.getOTPCollection = getOTPCollection;
