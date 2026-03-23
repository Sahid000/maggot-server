"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductCollection = void 0;
const db_1 = require("../../config/db");
const getProductCollection = () => (0, db_1.getDB)().collection("product");
exports.getProductCollection = getProductCollection;
