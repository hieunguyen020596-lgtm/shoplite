import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import type { ShippingMethod } from "@/features/checkout/pricing";
import { normalizePhone } from "./phone";
import type { Order, OrderCustomer, OrderItem, OrderStatus } from "./types";

/** SĐT đã chuẩn hóa về dạng 0xxxxxxxxx rồi che: `0912345678` -> `09****678`. */
export function maskPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length < 6) return "*".repeat(digits.length);
  return `${digits.slice(0, 2)}****${digits.slice(-3)}`;
}

export interface CustomerOrderView {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  /** Có thông tin cá nhân đầy đủ (`customer`) hay chỉ SĐT đã che (`maskedPhone`). */
  verified: boolean;
  customer?: OrderCustomer;
  maskedPhone?: string;
}

/**
 * Hàm chiếu duy nhất cho mọi bề mặt của khách (AD-8). Dựng đối tượng mới theo danh sách
 * field cho phép, nên field thêm vào `Order` về sau mặc định không lọt ra ngoài.
 */
export function toCustomerOrderView(
  order: Order,
  { verified = false }: { verified?: boolean } = {},
): CustomerOrderView {
  const view: CustomerOrderView = {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      image: { ...item.image },
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    verified,
  };

  if (verified) {
    view.customer = {
      fullName: order.customer.fullName,
      phone: order.customer.phone,
      email: order.customer.email,
      address: order.customer.address,
      note: order.customer.note,
    };
  } else {
    view.maskedPhone = maskPhone(order.customer.phone);
  }
  return view;
}
