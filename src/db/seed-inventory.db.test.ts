import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertTestDatabase, seedInventory } from "../../scripts/db-test-lib";

let client: pg.Client | undefined;

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
});

afterAll(async () => {
  await client?.end().catch(() => {});
});

describe("seedInventory", () => {
  it("chạy lại không ghi đè tồn đã đổi", async () => {
    await client!.query("BEGIN");
    try {
      await client!.query(
        "UPDATE inventory SET stock = 1 WHERE product_id = 'p001'",
      );
      await seedInventory(client!);
      const { rows } = await client!.query(
        "SELECT stock FROM inventory WHERE product_id = 'p001'",
      );
      expect(rows[0].stock).toBe(1);
    } finally {
      await client!.query("ROLLBACK");
    }
  });
});
