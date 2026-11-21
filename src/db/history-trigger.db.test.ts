import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { assertTestDatabase } from "../../scripts/db-test-lib";

let client: pg.Client | undefined;
let guardPassed = false;

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  guardPassed = true;
  await client!.query(
    `INSERT INTO orders (id, status, customer_name, phone_normalized, address, shipping_method, payment_method, subtotal, shipping_fee, total)
     VALUES ('t-trigger', 'pending', 'A', '0900000000', 'B', 'standard', 'cod', 1, 0, 1)`,
  );
  await client!.query(
    `INSERT INTO order_status_history (order_id, event_type, to_status, actor_type, actor_name)
     VALUES ('t-trigger', 'order_created', 'pending', 'customer', 'Khách hàng')`,
  );
});

afterAll(async () => {
  try {
    if (guardPassed) {
      await client?.query(
        "TRUNCATE TABLE order_status_history, order_items, orders RESTART IDENTITY CASCADE",
      );
    }
  } finally {
    await client?.end().catch(() => {});
  }
});

describe("trigger Lịch sử append-only", () => {
  it("tồn tại trigger", async () => {
    const { rowCount } = await client!.query(
      "SELECT 1 FROM pg_trigger WHERE tgname = 'order_status_history_append_only'",
    );
    expect(rowCount).toBe(1);
  });

  it("từ chối UPDATE", async () => {
    await expect(
      client!.query("UPDATE order_status_history SET actor_name = 'X'"),
    ).rejects.toMatchObject({
      code: "23000",
    });
  });

  it("từ chối DELETE", async () => {
    await expect(
      client!.query("DELETE FROM order_status_history"),
    ).rejects.toMatchObject({
      code: "23000",
    });
  });
});
