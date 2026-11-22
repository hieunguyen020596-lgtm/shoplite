import { NextResponse } from "next/server";
import { rememberOrder } from "@/features/auth/guards";
import { toCustomerOrderView } from "@/features/orders/customer-view";
import { orderService } from "@/features/orders/server";
import { listOrdersForStaff } from "@/features/orders/staff-orders-route";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/** GET /api/orders - danh sách đơn hàng, chỉ dành cho nhân viên (401 nếu chưa đăng nhập). */
export async function GET(request: Request) {
  return listOrdersForStaff(request);
}

/** POST /api/orders - tạo đơn hàng mới. Body: PlaceOrderInput (xem checkout-schema.ts). */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  try {
    const order = await orderService.placeOrder(body);
    // Trình duyệt vừa đặt đơn được xác minh luôn: ghi Mã đơn vào cookie sl_orders.
    const response = NextResponse.json(
      toCustomerOrderView(order, { verified: true }),
      {
        status: 201,
      },
    );
    await rememberOrder(response, order.id);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
