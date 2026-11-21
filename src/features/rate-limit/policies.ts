/** Nơi duy nhất dựng khóa và ngưỡng giới hạn (AD-25). */

export interface RateLimitPolicy {
  key: string;
  limit: number;
  windowSeconds: number;
}

export const ORDER_IP_LIMIT = 10;
export const ORDER_IP_WINDOW_SECONDS = 60 * 60;

/** Số đơn `pending` tối đa cho mỗi số điện thoại (đếm theo bảng orders, không dùng bộ đếm). */
export const MAX_PENDING_ORDERS_PER_PHONE = 3;

/** 10 đơn mỗi giờ cho mỗi IP. */
export function orderIpPolicy(ip: string): RateLimitPolicy {
  return {
    key: `order:ip:${encodeURIComponent(ip)}`,
    limit: ORDER_IP_LIMIT,
    windowSeconds: ORDER_IP_WINDOW_SECONDS,
  };
}
