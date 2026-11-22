import { NextResponse } from "next/server";
import { requireStaff } from "@/features/auth/guards";
import { handleRouteError } from "@/lib/http";
import { parseStaffOrdersQuery } from "./staff-order-schema";
import { orderService } from "./server";

/**
 * Handler dùng chung cho GET /api/orders và GET /api/staff/orders (chỉ nhân viên).
 * Trả nguyên Order, nên bắt buộc qua requireStaff() trước khi đọc dữ liệu.
 */
export async function listOrdersForStaff(request: Request) {
  try {
    await requireStaff();
    const { status, q } = parseStaffOrdersQuery(
      new URL(request.url).searchParams,
    );
    const orders = q
      ? await orderService.searchOrders(q)
      : await orderService.listOrders({ status });
    return NextResponse.json({ orders });
  } catch (error) {
    return handleRouteError(error);
  }
}
