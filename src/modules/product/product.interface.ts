export interface IProduct {
  _id?: string;
  pricePerKit: number;
  deliveryFeeInsideDhaka: number;
  deliveryFeeOutsideDhaka: number;
  deliveryFeeThreshold: number; // every N items = +1 delivery charge (e.g. 5 → qty 9 = ceil(9/5)=2x)
  updatedAt: Date;
}
