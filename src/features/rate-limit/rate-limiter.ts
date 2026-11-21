import type { DbTx } from "@/lib/db-tx";
import type { RateLimitPolicy } from "./policies";

export type RateLimitRequest = RateLimitPolicy;

/** Biên lai của một lượt đếm, dùng để hoàn lượt đúng cửa sổ. */
export interface RateLimitReceipt {
  key: string;
  windowStartedAt: Date;
}

/** Bộ đếm giới hạn. Cài đặt PostgreSQL ở `rate-limiter.pg.ts`. */
export interface RateLimiter {
  /**
   * Tăng bộ đếm từng khóa (theo `key` tăng dần) trong transaction của người gọi.
   * Vượt ngưỡng thì ném `OrderError` `RATE_LIMITED`.
   */
  consume(
    tx: DbTx,
    requests: readonly RateLimitRequest[],
  ): Promise<RateLimitReceipt[]>;
  /** Hoàn một lượt đếm cho mỗi biên lai, nếu cửa sổ chưa đổi. */
  release(tx: DbTx, receipts: readonly RateLimitReceipt[]): Promise<void>;
}

export function compareKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
