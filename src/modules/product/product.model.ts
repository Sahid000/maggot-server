import { getDB } from "../../config/db";

export const getProductCollection = () => getDB().collection("product");
