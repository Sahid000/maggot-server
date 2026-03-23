export interface IStatusHistoryEntry {
  status: string;
  changedAt: Date;
  reason?: string;
}

export interface IOrder {
  _id?: string;
  orderId?: string;
  name: string;
  email?: string | null;
  phone: string;
  district: string;
  insideDhaka: boolean;
  address: string;
  quantity: number;
  pricePerKit: number;
  deliveryFee: number;
  discountAmount?: number;
  totalPrice: number;
  couponCode?: string | null;
  note?: string | null;
  status: "pending" | "approved" | "declined" | "cancelled" | "completed";
  statusHistory?: IStatusHistoryEntry[];
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOrderPayload {
  name: string;
  email?: string;
  phone: string;
  district: string;
  insideDhaka: boolean;
  address: string;
  quantity: number;
  note?: string;
  couponCode?: string;
}

export interface IOrdersQuery {
  page?: string;
  limit?: string;
  status?: string;
  insideDhaka?: string;
  orderDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}
