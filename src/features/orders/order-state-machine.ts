import { OrderError } from "./order-errors";
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderActor,
  type OrderStatus,
  type OrderStatusEvent,
} from "./types";

const MAX_NOTE_LENGTH = 200;

const ALLOWED_TRANSITIONS: Record<
  OrderActor,
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  staff: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipping", "cancelled"],
    shipping: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  },
  customer: {
    pending: ["cancelled"],
    confirmed: [],
    shipping: [],
    delivered: [],
    cancelled: [],
  },
};

export interface TransitionOrderInput {
  to: OrderStatus;
  actor: OrderActor;
  now?: Date;
  note?: string;
  expectedStatus?: OrderStatus;
}

export interface TransitionOrderResult {
  order: Order;
  shouldRestock: boolean;
}

function hasStatusHistory(
  order: Order,
): order is Order & { statusHistory: OrderStatusEvent[] } {
  return (order.statusHistory?.length ?? 0) > 0;
}

function cloneStatusHistory(
  history: readonly OrderStatusEvent[],
): OrderStatusEvent[] {
  return history.map((event) => ({ ...event }));
}

function getBaseStatusHistory(order: Order): OrderStatusEvent[] {
  return hasStatusHistory(order)
    ? cloneStatusHistory(order.statusHistory)
    : synthesizeStatusHistory(order);
}

function normalizeNow(now?: Date): string {
  const date = now ?? new Date();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new OrderError(
      "VALIDATION_ERROR",
      "Thời gian cập nhật không hợp lệ",
      {
        now: "Thời gian không hợp lệ",
      },
    );
  }
  return date.toISOString();
}

function normalizeNote(
  note: string | undefined,
  required: boolean,
): string | undefined {
  if (note !== undefined && typeof note !== "string") {
    throw new OrderError("VALIDATION_ERROR", "Ghi chú không hợp lệ", {
      note: "Ghi chú phải là chuỗi ký tự",
    });
  }

  const trimmed = note !== undefined ? note.trim() : "";

  if (required && trimmed.length === 0) {
    throw new OrderError(
      "VALIDATION_ERROR",
      "Vui lòng nhập lý do hủy đơn hàng",
      {
        note: "Lý do hủy đơn hàng không được để trống",
      },
    );
  }

  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new OrderError(
      "VALIDATION_ERROR",
      `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`,
      {
        note: `Ghi chú tối đa ${MAX_NOTE_LENGTH} ký tự`,
      },
    );
  }

  return trimmed.length > 0 ? trimmed : undefined;
}

function buildStatusEvent(
  params: Omit<OrderStatusEvent, "note"> & { note?: string },
): OrderStatusEvent {
  const { note, ...base } = params;
  return note !== undefined ? { ...base, note } : base;
}

/** Kiểm tra xem `actor` có được phép chuyển đơn từ `from` sang `to` theo ma trận 5×5 hay không. */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
): boolean {
  return ALLOWED_TRANSITIONS[actor]?.[from]?.includes(to) ?? false;
}

/** Trả về danh sách trạng thái kế tiếp hợp lệ cho `actor` tại trạng thái `from`. */
export function getAllowedNextStatuses(
  from: OrderStatus,
  actor: OrderActor,
): OrderStatus[] {
  return [...(ALLOWED_TRANSITIONS[actor]?.[from] ?? [])];
}

/**
 * Tổng hợp lịch sử trạng thái cho đơn hàng:
 * - Nếu đơn đã có `statusHistory`, trả về bản sao bất biến.
 * - Nếu là đơn lịch sử thiếu `statusHistory`, chỉ suy ra mốc `pending` (`createdAt`)
 *   và mốc trạng thái hiện tại (`updatedAt`, nếu khác `pending`), không tự chế mốc trung gian.
 */
export function synthesizeStatusHistory(order: Order): OrderStatusEvent[] {
  if (hasStatusHistory(order)) {
    return cloneStatusHistory(order.statusHistory);
  }

  const events: OrderStatusEvent[] = [
    {
      status: "pending",
      at: order.createdAt,
      actor: "customer",
      action: "transition",
    },
  ];

  if (order.status !== "pending") {
    events.push({
      status: order.status,
      at: order.updatedAt,
      actor: order.status === "cancelled" ? "customer" : "staff",
      action: "transition",
    });
  }

  return events;
}

/**
 * Chuyển trạng thái đơn hàng theo ma trận 5×5, kiểm tra khóa lạc quan `expectedStatus`,
 * chuẩn hóa/kiểm tra `note`, ghi nhận `statusHistory` và xác định cờ hoàn kho.
 * Hàm thuần, không đột biến đối tượng `order` đầu vào.
 */
export function transitionOrder(
  order: Order,
  input: TransitionOrderInput,
): TransitionOrderResult {
  if (
    input.expectedStatus !== undefined &&
    order.status !== input.expectedStatus
  ) {
    const currentLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
    throw new OrderError(
      "INVALID_STATUS_TRANSITION",
      `Trạng thái đơn hàng đã thay đổi (hiện tại là "${currentLabel}"), vui lòng tải lại`,
      {
        expectedStatus: input.expectedStatus,
        currentStatus: order.status,
      },
    );
  }

  if (!canTransition(order.status, input.to, input.actor)) {
    const fromLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
    const toLabel = ORDER_STATUS_LABELS[input.to] ?? input.to;
    throw new OrderError(
      "INVALID_STATUS_TRANSITION",
      `Không thể chuyển đơn hàng từ trạng thái "${fromLabel}" sang "${toLabel}"`,
      {
        from: order.status,
        to: input.to,
        actor: input.actor,
      },
    );
  }

  const requiresNote = input.actor === "staff" && input.to === "cancelled";
  const normalizedNote = normalizeNote(input.note, requiresNote);
  const at = normalizeNow(input.now);

  // Kiểm tra đơn lịch sử trước khi nối lịch sử tổng hợp để tránh cộng khống tồn kho chưa từng trừ.
  const isLegacyOrder = !hasStatusHistory(order);
  const baseHistory = getBaseStatusHistory(order);

  const event = buildStatusEvent({
    status: input.to,
    at,
    actor: input.actor,
    action: "transition",
    note: normalizedNote,
  });

  const nextOrder: Order = {
    ...order,
    status: input.to,
    updatedAt: at,
    statusHistory: [...baseHistory, event],
  };

  const alreadyAccountedFor =
    isLegacyOrder || order.inventoryRestocked === true;
  let shouldRestock = false;
  if (input.to === "cancelled") {
    shouldRestock =
      !alreadyAccountedFor &&
      (order.status === "pending" || order.status === "confirmed");
    nextOrder.inventoryRestocked = alreadyAccountedFor ? true : shouldRestock;
  } else if (alreadyAccountedFor) {
    nextOrder.inventoryRestocked = true;
  }

  return {
    order: nextOrder,
    shouldRestock,
  };
}

/**
 * Đánh dấu đơn đã hủy (từ trạng thái đang giao) đã nhận lại hàng hoàn kho đúng 1 lần (idempotent).
 * Hàm thuần, không đột biến đối tượng `order` đầu vào.
 */
export function markOrderRestocked(
  order: Order,
  input?: { now?: Date; note?: string },
): Order {
  if (order.status !== "cancelled") {
    throw new OrderError(
      "INVALID_STATUS_TRANSITION",
      "Chỉ có thể xác nhận hoàn kho cho đơn hàng đã hủy",
      { status: order.status },
    );
  }

  if (order.inventoryRestocked !== false) {
    const message =
      order.inventoryRestocked === true
        ? "Đơn hàng này đã được hoàn kho trước đó"
        : "Đơn hàng lịch sử không hỗ trợ đánh dấu hoàn kho";
    throw new OrderError("INVALID_STATUS_TRANSITION", message, {
      status: order.status,
    });
  }

  const normalizedNote = normalizeNote(input?.note, false);
  const at = normalizeNow(input?.now);
  const baseHistory = getBaseStatusHistory(order);

  const event = buildStatusEvent({
    status: "cancelled",
    at,
    actor: "staff",
    action: "restock",
    note: normalizedNote,
  });

  return {
    ...order,
    updatedAt: at,
    inventoryRestocked: true,
    statusHistory: [...baseHistory, event],
  };
}
