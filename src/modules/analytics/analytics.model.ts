import { getDB } from "../../config/db";

export const getSiteVisitsCollection = () => getDB().collection("site_visits");
