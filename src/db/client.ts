import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/lib/env";
import { extractSqlState, logServerError } from "@/lib/safe-log";
import * as schema from "./schema";

const CONNECTION_TIMEOUT_MS = 3000;

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
    });
    // Không log lỗi gốc vì có thể chứa chuỗi kết nối: chỉ log sqlState.
    pool.on("error", (error) => {
      logServerError("db.pool", {
        name: "DbFailure",
        sqlState: extractSqlState(error),
      });
    });
    g.__shopliteDb = { pool, db: drizzle(pool, { schema }) };
  }
  return g.__shopliteDb.db;
}
