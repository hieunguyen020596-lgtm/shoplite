import { NextResponse } from "next/server";
import { AccessError } from "@/features/auth/access-errors";
import { isOrderVerified } from "@/features/auth/guards";
import { toCustomerOrderView } from "@/features/orders/customer-view";
import { orderService } from "@/features/orders/server";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/** GET /api/orders/:id */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  const { id } = await ctx.params;
  try {
    const order = await orderService.getOrder(id);
    return NextResponse.json(
      toCustomerOrderView(order, { verified: await isOrderVerified(id) }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/orders/:id - cập nhật trạng thái đơn hàng.
 * Hiện chỉ hỗ trợ khách hàng tự hủy đơn: body { "status": "cancelled" }.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  const { id } = await ctx.params;
  const body = (await readJsonBody(request)) as
    { status?: unknown } | undefined;

  if (body?.status !== "cancelled") {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      'Chỉ hỗ trợ cập nhật { "status": "cancelled" }',
    );
  }

  try {
    // Biết Mã đơn là chưa đủ: chỉ thiết bị đã đặt/xác minh đơn mới được hủy.
    const verified = await isOrderVerified(id);
    if (!verified)
      throw new AccessError(
        "FORBIDDEN",
        "Bạn cần xác minh đơn hàng trước khi hủy",
      );
    const order = await orderService.cancelOrder(id);
    return NextResponse.json(toCustomerOrderView(order, { verified }));
  } catch (error) {
    return handleRouteError(error);
  }
}
