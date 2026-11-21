import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/lib/env";
import { extractSqlState, logServerError } from "@/lib/safe-log";
import * as schema from "./schema";

const CONNECTION_TIMEOUT_MS = 3000;
export const LOCK_TIMEOUT_MS = 3000;
export const STATEMENT_TIMEOUT_MS = 5000;
export const IDLE_IN_TRANSACTION_TIMEOUT_MS = 10000;

type DbGlobal = typeof globalThis & {
  __shopliteDb?: { pool: Pool; db: NodePgDatabase<typeof schema> };
};

/** Pool singleton lazy trên globalThis (sống qua HMR). Không kết nối cho đến khi có truy vấn đầu tiên. */
export function getDb(): NodePgDatabase<typeof schema> {
  const g = globalThis as DbGlobal;
  if (!g.__shopliteDb) {
    const pool = new Pool({
      connectionString: getServerEnv().DATABASE_URL,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      lock_timeout: LOCK_TIMEOUT_MS,
      statement_timeout: STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
    });
    // Không log lỗi gốc vì có thể chứa chuỗi kết nối: chỉ log sqlState.
    // Listener trên từng client bắt cả lúc client đang được mượn, khi pool không nghe.
    pool.on("connect", (client) => {
      client.on("error", (error) => {
        logServerError("db.pool", {
          name: "DbFailure",
          sqlState: extractSqlState(error),
        });
      });
    });
    // Pool bắt buộc có listener; lỗi đã được ghi ở listener của client.
    pool.on("error", () => {});
    g.__shopliteDb = { pool, db: drizzle(pool, { schema }) };
  }
  return g.__shopliteDb.db;
}
