import { NextResponse } from "next/server";
import { z } from "zod";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import {
  createAdminSessionCookieHeader,
  createAdminSessionToken,
  isAdminConfigured,
  verifyAdminPasscode,
} from "@/features/orders/admin-auth";
import { OrderError } from "@/features/orders/order-errors";
import { handleRouteError, readJsonBody } from "@/lib/http";

const adminLoginSchema = z.object(
  {
    passcode: z
      .string("Vui lòng nhập mật khẩu quản trị")
      .refine(
        (value) => value.trim().length > 0,
        "Mật khẩu quản trị không được để trống",
      ),
  },
  "Dữ liệu đăng nhập phải là một đối tượng JSON",
);

/** POST /api/admin/auth/login - xác thực fail-closed: 503 -> 400 -> 401 -> 200. */
export async function POST(request: Request) {
  try {
    if (!isAdminConfigured()) {
      throw new OrderError(
        "ADMIN_NOT_CONFIGURED",
        "Hệ thống chưa cấu hình mật khẩu quản trị",
      );
    }

    const body = await readJsonBody(request);
    if (body === undefined) {
      throw new OrderError("VALIDATION_ERROR", "Body phải là JSON hợp lệ");
    }

    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new OrderError(
        "VALIDATION_ERROR",
        "Dữ liệu đăng nhập không hợp lệ",
        toFieldErrors(parsed.error),
      );
    }

    verifyAdminPasscode(parsed.data.passcode);
    const token = createAdminSessionToken();

    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.headers.set("Set-Cookie", createAdminSessionCookieHeader(token));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
