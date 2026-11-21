import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { DbTx, RunInTransaction } from "@/lib/db-tx";
import { getDb } from "./client";
import type * as schema from "./schema";

type DrizzleTx = Parameters<
  Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0];

/** Mở đúng một transaction READ COMMITTED, không lồng, không retry. */
export const runInTransaction: RunInTransaction = (work) =>
  getDb().transaction((tx) => work(tx as unknown as DbTx), {
    isolationLevel: "read committed",
  });

export function toDrizzleTx(tx: DbTx): DrizzleTx {
  return tx as unknown as DrizzleTx;
}
