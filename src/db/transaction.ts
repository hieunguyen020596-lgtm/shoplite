import "server-only";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { OrderError } from "@/features/orders/order-errors";
import type { DbTx, RunInTransaction } from "@/lib/db-tx";
import { extractSqlState } from "@/lib/safe-log";
import { getDb } from "./client";
import type * as schema from "./schema";

type DrizzleTx = Parameters<
  Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0];

/** Lỗi DB đã làm sạch: chỉ có `sqlState`, không message gốc, không `cause`. */
export class DbFailure extends Error {
  readonly sqlState?: string;

  constructor(sqlState?: string) {
    super("Database operation failed");
    this.name = "DbFailure";
    this.sqlState = sqlState;
  }
}

/** Hàm thuần: `OrderError` và `DbFailure` đi qua nguyên vẹn, mọi lỗi khác thành `DbFailure`. */
export function sanitizeDbError(error: unknown): Error {
  if (error instanceof OrderError || error instanceof DbFailure) return error;
  return new DbFailure(extractSqlState(error));
}

/** Mở đúng một transaction READ COMMITTED, không lồng, không retry. */
export const runInTransaction: RunInTransaction = async (work) => {
  try {
    return await getDb().transaction((tx) => work(tx as unknown as DbTx), {
      isolationLevel: "read committed",
    });
  } catch (error) {
    throw sanitizeDbError(error);
  }
};

/** Chạy truy vấn đọc ngoài transaction, lỗi được làm sạch như `runInTransaction`. */
export async function withDb<T>(
  work: (db: NodePgDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  try {
    return await work(getDb());
  } catch (error) {
    throw sanitizeDbError(error);
  }
}

export function toDrizzleTx(tx: DbTx): DrizzleTx {
  return tx as unknown as DrizzleTx;
}
