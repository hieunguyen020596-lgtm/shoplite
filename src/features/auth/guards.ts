import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { AccessError } from "./access-errors";
import type { StaffIdentity } from "./auth-service";
import { authService } from "./server";
import { ORDERS_COOKIE, ORDERS_COOKIE_SECONDS, STAFF_COOKIE } from "./session";

/** Guard cho handler/page nhân viên: trả nhân viên hiện tại hoặc ném UNAUTHENTICATED. */
export async function requireStaff(): Promise<StaffIdentity> {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  const staff = authService.readSession(token);
  if (!staff)
    throw new AccessError("UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục");
  return staff;
}

/** Thiết bị này đã đặt (hoặc đã xác minh) đơn `orderId` hay chưa. Cookie hỏng thì coi là chưa. */
export async function isOrderVerified(orderId: string): Promise<boolean> {
  const token = (await cookies()).get(ORDERS_COOKIE)?.value;
  return authService.readVerifiedOrders(token).includes(orderId);
}

/** Các Mã đơn thiết bị này đã đặt/xác minh (đã ký). Cookie hỏng thì rỗng. */
export async function verifiedOrderIds(): Promise<string[]> {
  const token = (await cookies()).get(ORDERS_COOKIE)?.value;
  return authService.readVerifiedOrders(token);
}

/** Gắn cookie `sl_orders` (đã thêm `orderId`) vào response. Không làm gì nếu thiếu SESSION_SECRET. */
export async function rememberOrder(
  response: { cookies: Pick<NextResponse["cookies"], "set"> },
  orderId: string,
): Promise<void> {
  const current = (await cookies()).get(ORDERS_COOKIE)?.value;
  const token = authService.addVerifiedOrder(current, orderId);
  if (!token) return;
  response.cookies.set(ORDERS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ORDERS_COOKIE_SECONDS,
  });
}
