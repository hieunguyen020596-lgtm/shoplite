// @vitest-environment node
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertTestDatabase } from "../../../../scripts/db-test-lib";
import { readStock } from "@/features/inventory/server";
import { PATCH } from "./[id]/route";
import { GET, POST } from "./route";

let client: pg.Client | undefined;
let guardPassed = false;
let originalStock: number | undefined;

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  guardPassed = true;
  await client.query(
    "TRUNCATE TABLE order_status_history, order_items, orders RESTART IDENTITY CASCADE",
  );
  await client.query(
    "UPDATE inventory SET stock = 1 WHERE product_id = 'p006'",
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

const post = () =>
  POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: {
          fullName: "Phạm Minh D",
          phone: "0356789012",
          address: "99 Hai Bà Trưng, Huế",
        },
        shippingMethod: "express",
        paymentMethod: "bank_transfer",
        items: [{ productId: "p006", quantity: 1 }],
      }),
    }),
  );

describe("API đơn hàng trên PostgreSQL", () => {
  it("201 rồi 409 khi hết tồn, tồn cuối 0", async () => {
    const first = await post();
    expect(first.status).toBe(201);
    const order = await first.json();
    expect(order).toMatchObject({
      status: "pending",
      subtotal: 450_000,
      shippingFee: 60_000,
    });

    const second = await post();
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(body.error.details.lines).toEqual([
      { productId: "p006", requested: 1, available: 0 },
    ]);
    expect((await readStock(["p006"])).p006).toBe(0);
  });

  it("GET đọc từ PostgreSQL; PATCH luôn 401", async () => {
    const { orders } = await (await GET()).json();
    expect(orders).toHaveLength(1);
    expect((await PATCH()).status).toBe(401);
  });
});
