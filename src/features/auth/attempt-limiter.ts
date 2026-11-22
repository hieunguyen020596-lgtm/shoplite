export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_ORDER = 5;
export const MAX_FAILURES_PER_IP = 20;
/** Chặn bộ nhớ phình ra khi bị dò Mã đơn bịa: quá số khóa này thì bỏ khóa cũ nhất. */
const MAX_TRACKED_KEYS = 10_000;

export type AttemptCheck =
  { allowed: true; remaining: number } | { allowed: false; retryAt: number };

export interface AttemptLimiterOptions {
  maxPerOrder?: number;
  maxPerIp?: number;
  windowMs?: number;
}

/**
 * Module duy nhất đếm số lần xác minh sai (AD-9): hai Map trong bộ nhớ, theo Mã đơn và theo IP.
 * Mỗi khóa giữ thời điểm các lần sai trong cửa sổ trượt 15 phút; reset khi khởi động lại (chỉ chạy một instance).
 */
export function createAttemptLimiter({
  maxPerOrder = MAX_FAILURES_PER_ORDER,
  maxPerIp = MAX_FAILURES_PER_IP,
  windowMs = ATTEMPT_WINDOW_MS,
}: AttemptLimiterOptions = {}) {
  const byOrder = new Map<string, number[]>();
  const byIp = new Map<string, number[]>();

  function recent(map: Map<string, number[]>, key: string, now: number) {
    const times = (map.get(key) ?? []).filter((t) => now - t < windowMs);
    if (times.length > 0) map.set(key, times);
    else map.delete(key);
    return times;
  }

  function push(map: Map<string, number[]>, key: string, now: number) {
    const times = recent(map, key, now);
    times.push(now);
    map.set(key, times);
    if (map.size > MAX_TRACKED_KEYS) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
  }

  return {
    /** Còn được thử hay không. Bị khóa thì trả thời điểm sớm nhất được thử lại (mili giây epoch). */
    check(orderId: string, ip: string, now: number): AttemptCheck {
      const orderTimes = recent(byOrder, orderId, now);
      const ipTimes = recent(byIp, ip, now);
      const blockedUntil: number[] = [];
      if (orderTimes.length >= maxPerOrder)
        blockedUntil.push(
          orderTimes[orderTimes.length - maxPerOrder] + windowMs,
        );
      if (ipTimes.length >= maxPerIp)
        blockedUntil.push(ipTimes[ipTimes.length - maxPerIp] + windowMs);
      if (blockedUntil.length > 0)
        return { allowed: false, retryAt: Math.max(...blockedUntil) };
      return {
        allowed: true,
        remaining: Math.min(
          maxPerOrder - orderTimes.length,
          maxPerIp - ipTimes.length,
        ),
      };
    },

    /** Ghi một lần sai cho cả Mã đơn và IP (Mã đơn không tồn tại cũng tính). */
    recordFailure(orderId: string, ip: string, now: number): void {
      push(byOrder, orderId, now);
      push(byIp, ip, now);
    },
  };
}

export type AttemptLimiter = ReturnType<typeof createAttemptLimiter>;
