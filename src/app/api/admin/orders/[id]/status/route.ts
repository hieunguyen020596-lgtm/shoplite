import { NextResponse } from "next/server";
import { z } from "zod";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { assertAdminRequest } from "@/features/orders/admin-auth";
import { OrderError } from "@/features/orders/order-errors";
import { orderService } from "@/features/orders/server";
import { ORDER_STATUSES } from "@/features/orders/types";
import { handleRouteError, readJsonBody } from "@/lib/http";

const updateAdminOrderStatusSchema = z
  .object(
    {
      status: z.enum(ORDER_STATUSES, "Trạng thái đơn hàng không hợp lệ"),
      note: z
        .string("Ghi chú phải là chuỗi ký tự")
        .trim()
        .max(200, "Ghi chú tối đa 200 ký tự")
        .optional(),
      expectedStatus: z
        .enum(ORDER_STATUSES, "Trạng thái kỳ vọng không hợp lệ")
        .optional(),
    },
    "Dữ liệu cập nhật trạng thái phải là một đối tượng JSON",
  )
  .superRefine((data, ctx) => {
    if (data.status === "cancelled" && (!data.note || data.note.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Vui lòng nhập lý do hủy đơn hàng",
      });
    }
  });

/**
 * PATCH /api/admin/orders/:id/status
 * Chuyển trạng thái hoặc hủy đơn có lý do cho nhân viên:
 * 503/401 (assertAdminRequest) -> 400 (readJsonBody + Zod) -> 404/409/200 (orderService).
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/orders/[id]/status">,
) {
  try {
    assertAdminRequest(request);

    const body = await readJsonBody(request);
    if (body === undefined) {
      throw new OrderError("VALIDATION_ERROR", "Body phải là JSON hợp lệ");
    }

    const parsed = updateAdminOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new OrderError(
        "VALIDATION_ERROR",
        "Dữ liệu cập nhật trạng thái không hợp lệ",
        toFieldErrors(parsed.error),
      );
    }

    const { id } = await ctx.params;
    const order = await orderService.transitionOrderStatus(id, {
      status: parsed.data.status,
      actor: "staff",
      note: parsed.data.note,
      expectedStatus: parsed.data.expectedStatus,
    });

    const response = NextResponse.json({ order }, { status: 200 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
