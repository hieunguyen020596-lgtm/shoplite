import { NextResponse } from "next/server";
import { createAdminLogoutCookieHeader } from "@/features/orders/admin-auth";

/** POST /api/admin/auth/logout - luôn trả 200 và xóa cookie phiên quản trị. */
export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.headers.set("Set-Cookie", createAdminLogoutCookieHeader());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
