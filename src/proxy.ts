import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/features/orders/admin-auth";

/** Next.js 16 Proxy (Node runtime mặc định) bảo vệ các tuyến `/admin/*` trừ `/admin/login`. */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  let response: NextResponse;

  if (pathname === "/admin/login") {
    response = NextResponse.next();
  } else {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const status = verifyAdminSessionToken(token);

    if (status === "valid") {
      response = NextResponse.next();
    } else {
      const loginUrl = new URL("/admin/login", request.url);
      if (status === "expired") {
        loginUrl.searchParams.set("expired", "1");
      }
      response = NextResponse.redirect(loginUrl, 307);
    }
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
