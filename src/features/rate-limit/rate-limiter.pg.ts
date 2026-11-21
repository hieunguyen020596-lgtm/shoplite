import { sql } from "drizzle-orm";
import { toDrizzleTx } from "@/db/transaction";
import { OrderError } from "@/features/orders/order-errors";
import type { DbTx } from "@/lib/db-tx";
import {
  compareKey,
  type RateLimitReceipt,
  type RateLimitRequest,
  type RateLimiter,
} from "./rate-limiter";

export async function consume(
  tx: DbTx,
  requests: readonly RateLimitRequest[],
): Promise<RateLimitReceipt[]> {
  const db = toDrizzleTx(tx);
  const sorted = [...requests].sort((a, b) => compareKey(a.key, b.key));
  const receipts: RateLimitReceipt[] = [];

  for (const { key, limit, windowSeconds } of sorted) {
    // `now()` của database; cửa sổ neo tại lần đếm đầu, hết cửa sổ thì đếm lại từ 1.
    const result = await db.execute<{
      window_started_at: Date;
      count: number;
    }>(sql`
      INSERT INTO rate_limits (key, window_started_at, count)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        window_started_at = CASE
          WHEN rate_limits.window_started_at + make_interval(secs => ${windowSeconds}) <= now()
          THEN now() ELSE rate_limits.window_started_at END,
        count = CASE
          WHEN rate_limits.window_started_at + make_interval(secs => ${windowSeconds}) <= now()
          THEN 1 ELSE rate_limits.count + 1 END
      RETURNING window_started_at, count
    `);
    const row = result.rows[0];
    if (row.count > limit) {
      throw new OrderError("RATE_LIMITED", "Rate limited");
    }
    receipts.push({ key, windowStartedAt: new Date(row.window_started_at) });
  }
  return receipts;
}

export async function release(
  tx: DbTx,
  receipts: readonly RateLimitReceipt[],
): Promise<void> {
  const db = toDrizzleTx(tx);
  const sorted = [...receipts].sort((a, b) => compareKey(a.key, b.key));
  for (const { key, windowStartedAt } of sorted) {
    await db.execute(sql`
      UPDATE rate_limits SET count = GREATEST(count - 1, 0)
      WHERE key = ${key} AND window_started_at = ${windowStartedAt.toISOString()}::timestamptz
    `);
  }
}

export const pgRateLimiter: RateLimiter = { consume, release };
