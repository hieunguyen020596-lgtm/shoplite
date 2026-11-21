import { VN_PHONE_REGEX } from "./checkout-schema";

/**
 * Chuẩn hóa số di động Việt Nam về dạng `0xxxxxxxxx` (`+84...` thành `0...`).
 * Trả `null` nếu không phải số hợp lệ. Idempotent: số đã chuẩn hóa đi qua nguyên vẹn.
 */
export function normalizePhone(raw: string): string | null {
  const value = raw.trim();
  if (!VN_PHONE_REGEX.test(value)) return null;
  return value.startsWith("+84") ? `0${value.slice(3)}` : value;
}
