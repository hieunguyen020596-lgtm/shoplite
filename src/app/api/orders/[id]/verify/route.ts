import { NextResponse } from "next/server";
import { AccessError } from "@/features/auth/access-errors";
import {
  isOrderVerified,
  rememberOrder,
  requireStaff,
} from "@/features/auth/guards";
import { attemptLimiter } from "@/features/auth/server";
import { verifyPhoneSchema } from "@/features/auth/staff-schema";
import { createVerifyService } from "@/features/auth/verify-service";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { OrderError } from "@/features/orders/order-errors";
import { orderService } from "@/features/orders/server";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

const verifyService = createVerifyService({
  limiter: attemptLimiter,
  async findOrderPhone(orderId) {
    try {
      return (await orderService.getOrder(orderId)).customer.phone;
    } catch (error) {
      if (error instanceof OrderError && error.code === "ORDER_NOT_FOUND")
        return null;
      throw error;
    }
  },
});

/** Nguồn yêu cầu: phần tử đầu của x-forwarded-for, hoặc x-real-ip. */
function clientIp(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

async function hasStaffSession(): Promise<boolean> {
  try {
    await requireStaff();
    return true;
  } catch (error) {
    if (error instanceof AccessError) return false;
    throw error;
  }
}

/** POST /api/orders/:id/verify { phone } - xác minh thiết bị này bằng SĐT đặt hàng. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]/verify">,
) {
  const { id } = await ctx.params;
  const parsed = verifyPhoneSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Dữ liệu không hợp lệ",
      toFieldErrors(parsed.error),
    );
  }

  try {
    const exempt = (await isOrderVerified(id)) || (await hasStaffSession());
    await verifyService.verify({
      orderId: id,
      phone: parsed.data.phone,
      ip: clientIp(request),
      exempt,
    });
    const response = NextResponse.json({ verified: true });
    await rememberOrder(response, id);
    return response;
  } catch (error) {
    const response = handleRouteError(error);
    if (
      error instanceof AccessError &&
      error.code === "TOO_MANY_ATTEMPTS" &&
      error.details?.retryAt
    ) {
      const seconds = Math.max(
        1,
        Math.ceil((Date.parse(error.details.retryAt) - Date.now()) / 1000),
      );
      response.headers.set("Retry-After", String(seconds));
    }
    return response;
  }
}
