// @vitest-environment node
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertTestDatabase } from "../../../../scripts/db-test-lib";
import { readStock } from "@/features/inventory/server";
import { GET as GET_ONE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

let client: pg.Client | undefined;
let guardPassed = false;
let originalStock: number | undefined;

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  guardPassed = true;
  const { rows } = await client.query<{ stock: number }>(
    "SELECT stock FROM inventory WHERE product_id = 'p006'",
  );
  originalStock = rows[0]?.stock;
});

beforeEach(async () => {
  await client!.query(
    "TRUNCATE TABLE order_status_history, order_items, orders, rate_limits RESTART IDENTITY CASCADE",
  );
  await client!.query(
    "UPDATE inventory SET stock = 1 WHERE product_id = 'p006'",
  );
});

afterAll(async () => {
  try {
    if (guardPassed) {
      await client?.query(
        "TRUNCATE TABLE order_status_history, order_items, orders, rate_limits RESTART IDENTITY CASCADE",
      );
      if (originalStock !== undefined) {
        await client?.query(
          "UPDATE inventory SET stock = $1 WHERE product_id = 'p006'",
          [originalStock],
        );
      }
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
    expect((await post()).status).toBe(201);
    const { orders } = await (await GET()).json();
    expect(orders).toHaveLength(1);
    expect((await PATCH()).status).toBe(401);
  });
});

describe("giới hạn đơn ảo qua API", () => {
  it("đơn pending thứ 4 cùng SĐT: 429 RATE_LIMITED, tồn không đổi", async () => {
    await client!.query(
      "UPDATE inventory SET stock = 10 WHERE product_id = 'p006'",
    );
    expect((await post()).status).toBe(201);
    expect((await post()).status).toBe(201);
    expect((await post()).status).toBe(201);
    const response = await post();
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.message).toBe(
      `Bạn đã đặt quá nhiều đơn. Vui lòng thử lại sau hoặc liên hệ shop qua ${process.env.SHOP_CONTACT_PHONE}.`,
    );
    expect((await readStock(["p006"])).p006).toBe(7);
  });
});

describe("đầu vào biên của API đơn hàng", () => {
  const getOne = (id: string) =>
    GET_ONE(new Request("http://localhost/api/orders/x"), {
      params: Promise.resolve({ id }),
    });

  it("GET /api/orders/:id không tồn tại hoặc có byte NUL: 404", async () => {
    for (const id of ["SL-KHONG-CO", `SL${String.fromCharCode(0)}X`]) {
      const res = await getOne(id);
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("ORDER_NOT_FOUND");
    }
  });

  it("POST có byte NUL trong text: 400, không tạo đơn", async () => {
    const res = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName: `Phạm${String.fromCharCode(0)}Minh`,
            phone: "0356789012",
            address: "99 Hai Bà Trưng, Huế",
          },
          shippingMethod: "standard",
          paymentMethod: "cod",
          items: [{ productId: "p006", quantity: 1 }],
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect((await readStock(["p006"])).p006).toBe(1);
  });
});
