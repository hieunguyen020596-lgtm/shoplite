import { createHmac, timingSafeEqual } from "node:crypto";

export const STAFF_COOKIE = "sl_staff";
export const STAFF_SESSION_SECONDS = 12 * 60 * 60;

export interface StaffSession {
  username: string;
  /** Thời điểm hết hạn, tính bằng mili giây epoch. */
  exp: number;
}

const sign = (data: string, secret: string) =>
  createHmac("sha256", secret).update(data).digest("base64url");

/** Tạo token dạng base64url(payload).base64url(HMAC-SHA256). */
export function signSession(session: StaffSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Trả về phiên nếu token đúng chữ ký, đúng định dạng và chưa hết hạn; ngược lại null. */
export function verifySession(
  token: string,
  secret: string,
  now: number,
): StaffSession | null {
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return null;

  try {
    const data: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (typeof data !== "object" || data === null) return null;
    const { username, exp } = data as Record<string, unknown>;
    if (typeof username !== "string" || !username) return null;
    if (typeof exp !== "number" || !Number.isFinite(exp) || exp <= now)
      return null;
    return { username, exp };
  } catch {
    return null;
  }
}

export const ORDERS_COOKIE = "sl_orders";
/** Số Mã đơn tối đa giữ trong cookie; mã cũ nhất bị bỏ trước. */
export const ORDERS_COOKIE_MAX_IDS = 20;
export const ORDERS_COOKIE_SECONDS = 30 * 24 * 60 * 60;

/** Token danh sách Mã đơn đã xác minh: base64url(JSON mảng).base64url(HMAC-SHA256). */
export function signOrderIds(ids: string[], secret: string): string {
  const payload = Buffer.from(JSON.stringify(ids)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Trả về danh sách Mã đơn nếu token đúng chữ ký và định dạng; ngược lại mảng rỗng (không ném lỗi). */
export function verifyOrderIds(token: string, secret: string): string[] {
  if (!secret) return [];
  const parts = token.split(".");
  if (parts.length !== 2) return [];
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return [];

  try {
    const data: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (!Array.isArray(data)) return [];
    return data.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  } catch {
    return [];
  }
}
