import { getDB } from "../../config/db";

export const getUsersCollection = () => getDB().collection("users");
export const getOTPCollection = () => getDB().collection("otp_verifications");
