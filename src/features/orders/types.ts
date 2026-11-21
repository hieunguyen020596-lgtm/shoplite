import type { ProductImage } from "@/features/catalog/types";
import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import type { ShippingMethod } from "@/features/checkout/pricing";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipping",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Ai gây ra thay đổi trạng thái đơn. */
export type OrderActor = "customer" | "staff";

/** Một mục trong lịch sử trạng thái. "system" chỉ dùng cho mục suy ra từ đơn cũ. */
export interface OrderStatusEntry {
  status: OrderStatus;
  /** Thời điểm chuyển (ISO 8601, đồng hồ server). */
  at: string;
  actor: OrderActor | "system";
  note?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export interface OrderCustomer {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  image: ProductImage;
  /** Giá tại thời điểm đặt hàng (lấy từ catalog phía server). */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  /** Mã giảm giá đã dùng (chữ in hoa). Chỉ có khi đơn dùng mã. */
  couponCode?: string;
  /** Số tiền được giảm tại thời điểm đặt hàng. Đơn tạo trước khi có mã giảm giá không có trường này = 0. */
  discount?: number;
  shippingFee: number;
  total: number;
  /** Lịch sử trạng thái, chỉ ghi thêm. Đơn tạo trước khi có lịch sử không có trường này. */
  statusHistory?: OrderStatusEntry[];
}
