import { NextResponse } from "next/server";
import { orderService } from "@/features/orders/server";
import { handleRouteError, jsonError } from "@/lib/http";

/** GET /api/orders/:id */
export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await orderService.getOrder(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/orders/:id - Khách hàng không còn tự hủy đơn. Không đọc body, không chạm DB. */
export async function PATCH() {
  return jsonError(401, "UNAUTHORIZED", "Bạn không có quyền thực hiện thao tác này");
}
