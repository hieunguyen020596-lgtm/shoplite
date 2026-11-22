import { z } from "zod";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { OrderError } from "./order-errors";
import { ORDER_STATUSES, type OrderStatus } from "./types";

/** "finished" là bộ lọc gộp cho chip "Đã kết thúc" (đã giao + đã hủy + giao thất bại). */
export const STATUS_FILTERS = [...ORDER_STATUSES, "finished"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Bốn chip của Danh sách đơn, theo thứ tự hiển thị. */
export const QUEUE_CHIPS: { filter: StatusFilter; label: string }[] = [
  { filter: "pending", label: "Chờ xác nhận" },
  { filter: "confirmed", label: "Đã xác nhận" },
  { filter: "shipping", label: "Đang giao" },
  { filter: "finished", label: "Đã kết thúc" },
];

export const DEFAULT_STATUS_FILTER: StatusFilter = "pending";

const FINISHED_STATUSES: readonly OrderStatus[] = [
  "delivered",
  "cancelled",
  "failed",
];

export function matchesStatusFilter(
  status: OrderStatus,
  filter: StatusFilter,
): boolean {
  return filter === "finished"
    ? FINISHED_STATUSES.includes(status)
    : status === filter;
}

export const staffOrdersQuerySchema = z.object({
  status: z.enum(STATUS_FILTERS, "Trạng thái không hợp lệ").optional(),
  q: z.string().trim().optional(),
});

export type StaffOrdersQuery = z.infer<typeof staffOrdersQuerySchema>;

/** Parse query string; sai thì ném OrderError VALIDATION_ERROR (400). */
export function parseStaffOrdersQuery(
  params: URLSearchParams,
): StaffOrdersQuery {
  const parsed = staffOrdersQuerySchema.safeParse({
    status: params.get("status") || undefined,
    q: params.get("q") || undefined,
  });
  if (!parsed.success) {
    throw new OrderError(
      "VALIDATION_ERROR",
      "Bộ lọc không hợp lệ",
      toFieldErrors(parsed.error),
    );
  }
  return parsed.data;
}
