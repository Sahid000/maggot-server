"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProduct = getProduct;
exports.updateProduct = updateProduct;
const product_model_1 = require("./product.model");
const DEFAULTS = {
    pricePerKit: 230,
    deliveryFeeInsideDhaka: 60,
    deliveryFeeOutsideDhaka: 120,
    deliveryFeeThreshold: 5,
    updatedAt: new Date(),
};
async function getProduct() {
    let product = await (0, product_model_1.getProductCollection)().findOne({});
    if (!product) {
        await (0, product_model_1.getProductCollection)().insertOne({ ...DEFAULTS });
        product = await (0, product_model_1.getProductCollection)().findOne({});
    }
    return { status: 200, success: true, data: product };
}
async function updateProduct(payload) {
    const allowed = [
        "pricePerKit",
        "deliveryFeeInsideDhaka",
        "deliveryFeeOutsideDhaka",
        "deliveryFeeThreshold",
    ];
    const update = { updatedAt: new Date() };
    for (const key of allowed) {
        if (payload[key] !== undefined)
            update[key] = payload[key];
    }
    const result = await (0, product_model_1.getProductCollection)().findOneAndUpdate({}, { $set: update }, { upsert: true, returnDocument: "after" });
    return { status: 200, success: true, message: "Product config updated", data: result };
}
