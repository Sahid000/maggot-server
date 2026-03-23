"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCouponsCollection = getCouponsCollection;
const db_1 = require("../../config/db");
function getCouponsCollection() {
    return (0, db_1.getDB)().collection("coupons");
}
