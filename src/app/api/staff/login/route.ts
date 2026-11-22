import { NextResponse } from "next/server";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { authService } from "@/features/auth/server";
import { STAFF_COOKIE, STAFF_SESSION_SECONDS } from "@/features/auth/session";
import { loginSchema } from "@/features/auth/staff-schema";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", toFieldErrors(parsed.error));
  }

  try {
    const { staff, token } = authService.login(parsed.data.username, parsed.data.password);
    const response = NextResponse.json(staff);
    response.cookies.set(STAFF_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: STAFF_SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
