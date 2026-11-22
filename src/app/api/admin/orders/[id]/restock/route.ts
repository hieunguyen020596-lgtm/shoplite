import { NextResponse } from "next/server";
import { z } from "zod";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { assertAdminRequest } from "@/features/orders/admin-auth";
import { OrderError } from "@/features/orders/order-errors";
import { orderService } from "@/features/orders/server";
import { handleRouteError } from "@/lib/http";

const restockOrderSchema = z.object(
  {
    note: z
      .string("Ghi chú phải là chuỗi ký tự")
      .trim()
      .max(200, "Ghi chú tối đa 200 ký tự")
      .optional(),
  },
  "Dữ liệu hoàn kho phải là một đối tượng JSON",
);

async function parseOptionalRestockBody(
  request: Request,
): Promise<string | undefined> {
  const rawText = await request.text();
  if (rawText.trim() === "") {
    return undefined;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    throw new OrderError("VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  const parsed = restockOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new OrderError(
      "VALIDATION_ERROR",
      "Dữ liệu hoàn kho không hợp lệ",
      toFieldErrors(parsed.error),
    );
  }

  return parsed.data.note || undefined;
}

/**
 * POST /api/admin/orders/:id/restock
 * Xác nhận nhận lại hàng hoàn kho 1 lần (idempotent) cho đơn đã hủy từ trạng thái đang giao:
 * 503/401 (assertAdminRequest) -> 400 (body rỗng hoặc JSON Zod) -> 404/409/200 (orderService).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/orders/[id]/restock">,
) {
  try {
    assertAdminRequest(request);

    const note = await parseOptionalRestockBody(request);
    const { id } = await ctx.params;
    const order = await orderService.restockCancelledOrder(id, note);

    const response = NextResponse.json({ order }, { status: 200 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = handleRouteError(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
