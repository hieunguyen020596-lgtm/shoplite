import { NextResponse, type NextRequest } from "next/server";
import { STAFF_PATH_HEADER } from "@/features/auth/next-path";
import { STAFF_COOKIE } from "@/features/auth/session";

/**
 * Chuyển hướng lạc quan: thiếu cookie nhân viên thì về trang đăng nhập.
 * Không thay thế guard: page vẫn tự gọi requireStaff() vì proxy không kiểm chữ ký.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/staff/login" || pathname.startsWith("/staff/login/")) {
    return NextResponse.next();
  }

  if (!request.cookies.get(STAFF_COOKIE)?.value) {
    const url = new URL("/staff/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Cho page biết đường dẫn gốc để chuyển hướng đúng nếu cookie hỏng/hết hạn.
  const headers = new Headers(request.headers);
  headers.set(STAFF_PATH_HEADER, pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/staff", "/staff/:path*"],
};
