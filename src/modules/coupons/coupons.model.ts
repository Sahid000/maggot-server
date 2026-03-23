import { getDB } from "../../config/db";

export function getCouponsCollection() {
  return getDB().collection("coupons");
}
