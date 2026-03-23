import { getProductCollection } from "./product.model";
import { IProduct } from "./product.interface";

const DEFAULTS: Omit<IProduct, "_id"> = {
  pricePerKit: 230,
  deliveryFeeInsideDhaka: 60,
  deliveryFeeOutsideDhaka: 120,
  deliveryFeeThreshold: 5,
  updatedAt: new Date(),
};

export async function getProduct() {
  let product = await getProductCollection().findOne({});
  if (!product) {
    await getProductCollection().insertOne({ ...DEFAULTS });
    product = await getProductCollection().findOne({});
  }
  return { status: 200, success: true, data: product };
}

export async function updateProduct(payload: Partial<IProduct>) {
  const allowed: (keyof IProduct)[] = [
    "pricePerKit",
    "deliveryFeeInsideDhaka",
    "deliveryFeeOutsideDhaka",
    "deliveryFeeThreshold",
  ];

  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }

  const result = await getProductCollection().findOneAndUpdate(
    {},
    { $set: update },
    { upsert: true, returnDocument: "after" }
  );

  return { status: 200, success: true, message: "Product config updated", data: result };
}
