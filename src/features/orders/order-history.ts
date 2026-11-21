import { OrderError } from "./order-errors";
import type { Order, OrderStatusEntry } from "./types";

export const MAX_NOTE_LENGTH = 200;

/** Bỏ khoảng trắng hai đầu; chuỗi rỗng coi như không có ghi chú. */
export function normalizeNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new OrderError("VALIDATION_ERROR", "Ghi chú không hợp lệ", {
      note: `Ghi chú tối đa ${MAX_NOTE_LENGTH} ký tự`,
    });
  }
  return trimmed;
}

/**
 * Đảm bảo đơn có lịch sử trạng thái. Đơn cũ (tạo trước khi có lịch sử) được suy ra
 * một mục duy nhất: trạng thái hiện tại tại thời điểm cập nhật cuối, người thực hiện "system".
 */
export function withStatusHistory(order: Order): Order & { statusHistory: OrderStatusEntry[] } {
  if (order.statusHistory) return order as Order & { statusHistory: OrderStatusEntry[] };
  return {
    ...order,
    statusHistory: [{ status: order.status, at: order.updatedAt, actor: "system" }],
  };
}
