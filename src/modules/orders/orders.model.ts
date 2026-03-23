import { getDB } from "../../config/db";

export const getOrdersCollection = () => getDB().collection("orders");
