import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type pg from "pg";
import { inventorySeed } from "@/data/inventory-seed";

export const TEST_DATABASE_NAME = "shoplite_test";

export function describeSqlState(error: unknown): string {
  for (const candidate of [
    error,
    (error as { cause?: unknown } | null)?.cause,
  ]) {
    const { severity, code } = (candidate ?? {}) as {
      severity?: unknown;
      code?: unknown;
    };
    if (
      typeof severity === "string" &&
      typeof code === "string" &&
      /^[0-9A-Z]{5}$/.test(code)
    ) {
      return ` (sqlState ${code})`;
    }
  }
  return "";
}

/** Dừng nếu database đang kết nối không phải shoplite_test. Không log giá trị URL. */
export async function assertTestDatabase(client: pg.Client): Promise<void> {
  const result = await client.query<{ name: string }>(
    "SELECT current_database() AS name",
  );
  if (result.rows[0]?.name !== TEST_DATABASE_NAME) {
    throw new Error(
      `TEST_DATABASE_URL khong tro toi database ${TEST_DATABASE_NAME}`,
    );
  }
}

export async function seedInventory(client: pg.Client): Promise<void> {
  await client.query(
    `INSERT INTO inventory (product_id, stock)
     SELECT * FROM unnest($1::text[], $2::int[])
     ON CONFLICT DO NOTHING`,
    [
      inventorySeed.map((row) => row.productId),
      inventorySeed.map((row) => row.stock),
    ],
  );
}

export async function migrateDb(client: pg.Client): Promise<void> {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
}

export async function truncateAll(client: pg.Client): Promise<void> {
  await client.query(
    "TRUNCATE TABLE order_status_history, order_items, orders, inventory, rate_limits RESTART IDENTITY CASCADE",
  );
}

/** Thứ tự AD-31: guard, migrate, truncate, seed. */
export async function prepareTestDb(client: pg.Client): Promise<void> {
  await assertTestDatabase(client);
  await migrateDb(client);
  await truncateAll(client);
  await seedInventory(client);
}
