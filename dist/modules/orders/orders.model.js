"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersCollection = void 0;
const db_1 = require("../../config/db");
const getOrdersCollection = () => (0, db_1.getDB)().collection("orders");
exports.getOrdersCollection = getOrdersCollection;
