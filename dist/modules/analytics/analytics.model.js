"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiteVisitsCollection = void 0;
const db_1 = require("../../config/db");
const getSiteVisitsCollection = () => (0, db_1.getDB)().collection("site_visits");
exports.getSiteVisitsCollection = getSiteVisitsCollection;
