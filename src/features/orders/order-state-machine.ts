import { OrderError } from "./order-errors";
import { ORDER_STATUS_LABELS, type Order, type OrderActor, type OrderStatus } from "./types";

/** Các bước chuyển hợp lệ của nhân viên. Trạng thái cuối (delivered, cancelled) không có bước nào. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Khách hàng chỉ có một thao tác: hủy đơn đang chờ xác nhận. */
export function canTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean {
  if (actor === "customer") return from === "pending" && to === "cancelled";
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface TransitionOptions {
  actor: OrderActor;
  at: Date;
}

/**
 * Hàm thuần - chỗ duy nhất tạo đơn có trạng thái mới (AD-4).
 * Không đọc đồng hồ, không I/O, không sửa đơn đầu vào.
 */
export function transitionOrder(
  order: Order,
  to: OrderStatus,
  { actor, at }: TransitionOptions,
): Order {
  if (!canTransition(order.status, to, actor)) {
    throw new OrderError(
      "INVALID_STATUS_TRANSITION",
      `Không thể chuyển đơn từ "${ORDER_STATUS_LABELS[order.status]}" sang "${ORDER_STATUS_LABELS[to]}"`,
      { currentStatus: order.status },
    );
  }
  return { ...order, status: to, updatedAt: at.toISOString() };
}
