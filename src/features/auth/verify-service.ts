import { phonesMatch } from "@/features/orders/phone";
import { AccessError } from "./access-errors";
import type { AttemptLimiter } from "./attempt-limiter";

export const WRONG_PHONE_MESSAGE = "Số điện thoại không khớp với đơn hàng này";
export const TOO_MANY_ATTEMPTS_MESSAGE =
  "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút";

export interface VerifyServiceDeps {
  limiter: AttemptLimiter;
  /** SĐT đặt hàng của đơn, hoặc null nếu đơn không tồn tại. */
  findOrderPhone: (orderId: string) => Promise<string | null>;
  now?: () => number;
}

export interface VerifyInput {
  orderId: string;
  phone: string;
  ip: string;
  /** Thiết bị đã đặt đơn hoặc có phiên nhân viên: không bị giới hạn và không bị tính lần sai. */
  exempt?: boolean;
}

function tooMany(retryAt: number) {
  return new AccessError("TOO_MANY_ATTEMPTS", TOO_MANY_ATTEMPTS_MESSAGE, {
    retryAt: new Date(retryAt).toISOString(),
  });
}

export function createVerifyService({
  limiter,
  findOrderPhone,
  now = Date.now,
}: VerifyServiceDeps) {
  return {
    /** Resolve khi SĐT khớp; ngược lại ném AccessError (FORBIDDEN hoặc TOO_MANY_ATTEMPTS). */
    async verify({
      orderId,
      phone,
      ip,
      exempt = false,
    }: VerifyInput): Promise<void> {
      if (!exempt) {
        const check = limiter.check(orderId, ip, now());
        if (!check.allowed) throw tooMany(check.retryAt);
      }

      const stored = await findOrderPhone(orderId);
      if (stored !== null && phonesMatch(stored, phone)) return;

      // Mã đơn không tồn tại và SĐT sai cho cùng phản hồi.
      if (exempt) throw new AccessError("FORBIDDEN", WRONG_PHONE_MESSAGE);
      limiter.recordFailure(orderId, ip, now());
      const after = limiter.check(orderId, ip, now());
      throw new AccessError(
        "FORBIDDEN",
        WRONG_PHONE_MESSAGE,
        after.allowed
          ? { remaining: String(after.remaining) }
          : { remaining: "0", retryAt: new Date(after.retryAt).toISOString() },
      );
    },
  };
}

export type VerifyService = ReturnType<typeof createVerifyService>;
