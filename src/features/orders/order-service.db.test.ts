import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertTestDatabase } from "../../../scripts/db-test-lib";
import { runInTransaction } from "@/db/transaction";
import type { Product } from "@/features/catalog/types";
import { pgStockLedger } from "@/features/inventory/stock-ledger.pg";
import { pgRateLimiter } from "@/features/rate-limit/rate-limiter.pg";
import { OrderError } from "./order-errors";
import { pgOrderRepository } from "./order-repository.pg";
import { createOrderService } from "./order-service";

let client: pg.Client | undefined;
let guardPassed = false;
const originalStock = new Map<string, number>();
const TOUCHED = ["p006", "p010", "p011"];

const deps = {
  runInTransaction,
  repository: pgOrderRepository,
  stockLedger: pgStockLedger,
  rateLimiter: pgRateLimiter,
  shopContactPhone: () => "0900000000",
};
const service = createOrderService(deps);

// Mỗi lần đặt dùng IP riêng và (mặc định) SĐT riêng để không chạm ngưỡng của test khác.
let seq = 0;
const nextIp = () => `198.51.100.${(seq++ % 250) + 1}`;
const uniquePhone = () => `09${String(10_000_000 + ++seq).slice(-8)}`;
const place = (
  svc: ReturnType<typeof createOrderService>,
  payload: unknown,
  ip = nextIp(),
) => svc.placeOrder(payload, { ip });

const input = (
  items: { productId: string; quantity: number }[],
  phone = uniquePhone(),
) => ({
  customer: {
    fullName: "Trần Thị B",
    phone,
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items,
});

const stockOf = async (id: string) =>
  (
    await client!.query("SELECT stock FROM inventory WHERE product_id = $1", [
      id,
    ])
  ).rows[0]?.stock;
const count = async (table: string) =>
  Number((await client!.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);

async function setStock(id: string, stock: number) {
  await client!.query(
    "INSERT INTO inventory (product_id, stock) VALUES ($1, $2) ON CONFLICT (product_id) DO UPDATE SET stock = $2",
    [id, stock],
  );
}

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  guardPassed = true;
  const rows = await client.query(
    "SELECT product_id, stock FROM inventory WHERE product_id = ANY($1)",
    [TOUCHED],
  );
  for (const r of rows.rows) originalStock.set(r.product_id, r.stock);
});

beforeEach(async () => {
  await client!.query(
    "TRUNCATE TABLE order_status_history, order_items, orders, rate_limits RESTART IDENTITY CASCADE",
  );
  await setStock("p010", 20);
  await setStock("p011", 3);
});

afterAll(async () => {
  try {
    if (guardPassed) {
      await client?.query(
        "TRUNCATE TABLE order_status_history, order_items, orders, rate_limits RESTART IDENTITY CASCADE",
      );
    }
  } finally {
    await client?.end().catch(() => {});
  }
});

describe("placeOrder trên PostgreSQL thật", () => {
  it("đặt đơn hợp lệ: trừ tồn, có đơn, dòng hàng và đúng một dòng order_created", async () => {
    const order = await place(
      service,
      input([{ productId: "p010", quantity: 2 }]),
    );
    expect(order).toMatchObject({
      status: "pending",
      subtotal: 300_000,
      total: 330_000,
    });
    expect(order.items[0]).toMatchObject({
      productId: "p010",
      quantity: 2,
      unitPrice: 150_000,
    });
    expect(await stockOf("p010")).toBe(18);
    expect(await service.getOrder(order.id)).toEqual(order);
    expect((await service.listOrders()).map((o) => o.id)).toEqual([order.id]);

    const history = (
      await client!.query(
        "SELECT * FROM order_status_history WHERE order_id = $1",
        [order.id],
      )
    ).rows;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      event_type: "order_created",
      from_status: null,
      to_status: "pending",
      reason_code: null,
      reason_text: null,
      refund_outcome: null,
      actor_type: "customer",
      actor_staff_id: null,
    });
  });

  it("SĐT +84 lưu thành 0...", async () => {
    const order = await place(
      service,
      input([{ productId: "p010", quantity: 1 }], "+84912345678"),
    );
    const row = (
      await client!.query("SELECT phone_normalized FROM orders WHERE id = $1", [
        order.id,
      ])
    ).rows[0];
    expect(row.phone_normalized).toBe("0912345678");
    expect(order.customer.phone).toBe("0912345678");
  });

  it("gộp các dòng trùng sản phẩm", async () => {
    const order = await place(
      service,
      input([
        { productId: "p010", quantity: 1 },
        { productId: "p010", quantity: 2 },
      ]),
    );
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(3);
    expect(await stockOf("p010")).toBe(17);
  });

  it("race: tồn 1, 8 request đồng thời, đúng 1 thành công", async () => {
    await setStock("p011", 1);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        place(service, input([{ productId: "p011", quantity: 1 }])),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(7);
    for (const f of failed) {
      expect(f.reason).toBeInstanceOf(OrderError);
      expect((f.reason as OrderError).code).toBe("INSUFFICIENT_STOCK");
    }
    expect(await stockOf("p011")).toBe(0);
    expect(await count("orders")).toBe(1);
    expect(await count("order_status_history")).toBe(1);
  });

  it("thiếu một dòng: không tạo đơn, không trừ dòng nào, details.lines đủ", async () => {
    const error = await place(
      service,
      input([
        { productId: "p010", quantity: 2 },
        { productId: "p011", quantity: 5 },
      ]),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OrderError);
    expect((error as OrderError).code).toBe("INSUFFICIENT_STOCK");
    expect((error as OrderError).details?.lines).toEqual([
      { productId: "p011", requested: 5, available: 3 },
    ]);
    expect(await stockOf("p010")).toBe(20);
    expect(await stockOf("p011")).toBe(3);
    expect(await count("orders")).toBe(0);
    expect(await count("order_status_history")).toBe(0);
  });

  it("sản phẩm thiếu dòng inventory: available = 0 và rollback", async () => {
    const ghost: Product = {
      ...(await import("@/features/catalog/catalog-service")).getProductById(
        "p010",
      )!,
      id: "x-no-inv",
    };
    const ghostService = createOrderService({
      ...deps,
      findProduct: (id) => (id === "x-no-inv" ? ghost : undefined),
    });
    const error = (await place(
      ghostService,
      input([{ productId: "x-no-inv", quantity: 2 }]),
    ).catch((e: unknown) => e)) as OrderError;
    expect(error.code).toBe("INSUFFICIENT_STOCK");
    expect(error.details?.lines).toEqual([
      { productId: "x-no-inv", requested: 2, available: 0 },
    ]);
    expect(await count("orders")).toBe(0);
  });

  it("lỗi DB giữa transaction: DbFailure, đơn, tồn kho, lịch sử giữ nguyên", async () => {
    const fixedId = "SL-DUP-000001";
    const dupService = createOrderService({
      ...deps,
      generateId: () => fixedId,
    });
    await place(dupService, input([{ productId: "p010", quantity: 1 }]));
    expect(await stockOf("p010")).toBe(19);

    // Lần hai: reserveStock thành công rồi insertOrder đụng khóa chính.
    const error = (await place(
      dupService,
      input([{ productId: "p010", quantity: 1 }]),
    ).catch((e: unknown) => e)) as Error;
    expect(error.name).toBe("DbFailure");
    expect((error as Error & { sqlState?: string }).sqlState).toBe("23505");
    expect(await stockOf("p010")).toBe(19);
    expect(await count("orders")).toBe(1);
    expect(await count("order_status_history")).toBe(1);
  });

  it("đơn hai sản phẩm: lineTotal đúng, trừ từng dòng, getOrder trả cùng dòng hàng", async () => {
    const order = await place(
      service,
      input([
        { productId: "p011", quantity: 2 },
        { productId: "p010", quantity: 3 },
      ]),
    );
    expect(
      order.items.map((i) => [i.productId, i.quantity, i.lineTotal]),
    ).toEqual([
      ["p010", 3, 450_000],
      ["p011", 2, 780_000],
    ]);
    expect(await stockOf("p010")).toBe(17);
    expect(await stockOf("p011")).toBe(1);
    expect((await service.getOrder(order.id)).items).toEqual(order.items);
  });

  it("hai đơn tuần tự: listOrders mới nhất trước, mỗi đơn đúng dòng hàng", async () => {
    const first = await place(
      service,
      input([{ productId: "p010", quantity: 1 }]),
    );
    const second = await place(
      service,
      input([
        { productId: "p011", quantity: 1 },
        { productId: "p010", quantity: 2 },
      ]),
    );
    const list = await service.listOrders();
    expect(list.map((o) => o.id)).toEqual([second.id, first.id]);
    expect(list[0].items).toEqual(second.items);
    expect(list[1].items).toEqual(first.items);
    expect(list[1].items.map((i) => i.productId)).toEqual(["p010"]);
  });

  it("bỏ qua giá client gửi lên", async () => {
    const payload = input([{ productId: "p010", quantity: 1 }]);
    payload.items = [{ productId: "p010", quantity: 1, price: 1 } as never];
    const order = await place(service, payload);
    expect(order.items[0].unitPrice).toBe(150_000);
    expect(order.subtotal).toBe(150_000);
  });

  it("email, note round-trip; không có thì undefined", async () => {
    const withExtra = input([{ productId: "p010", quantity: 1 }]);
    Object.assign(withExtra.customer, {
      email: "a@b.vn",
      note: "Giao giờ hành chính",
    });
    const a = await place(service, withExtra);
    const b = await place(service, input([{ productId: "p010", quantity: 1 }]));
    expect((await service.getOrder(a.id)).customer).toMatchObject({
      email: "a@b.vn",
      note: "Giao giờ hành chính",
    });
    const plain = (await service.getOrder(b.id)).customer;
    expect(plain.email).toBeUndefined();
    expect(plain.note).toBeUndefined();
  });

  it("đảo thứ tự dòng đồng thời: không deadlock, tồn cuối đúng", async () => {
    await setStock("p010", 20);
    await setStock("p011", 20);
    const n = 8;
    const results = await Promise.allSettled(
      Array.from({ length: n }, (_, i) =>
        place(
          service,
          input(
            i % 2 === 0
              ? [
                  { productId: "p010", quantity: 1 },
                  { productId: "p011", quantity: 1 },
                ]
              : [
                  { productId: "p011", quantity: 1 },
                  { productId: "p010", quantity: 1 },
                ],
          ),
        ),
      ),
    );
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(
      failures.map((f) => (f.reason as { sqlState?: string }).sqlState),
    ).not.toContain("40P01");
    expect(failures).toHaveLength(0);
    expect(await stockOf("p010")).toBe(20 - n);
    expect(await stockOf("p011")).toBe(20 - n);
  });

  it("đơn cuối: đặt hết tồn thì tồn về 0", async () => {
    await setStock("p011", 2);
    await place(service, input([{ productId: "p011", quantity: 2 }]));
    expect(await stockOf("p011")).toBe(0);
  });
});

describe("chống đơn ảo", () => {
  const item = [{ productId: "p010", quantity: 1 }];
  const counterOf = async (ip: string) =>
    (
      await client!.query("SELECT count FROM rate_limits WHERE key = $1", [
        `order:ip:${encodeURIComponent(ip)}`,
      ])
    ).rows[0]?.count;
  const codeOf = async (work: Promise<unknown>) => {
    const error = await work.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OrderError);
    return error as OrderError;
  };

  it("đơn thứ 11 trong 1 giờ từ cùng IP: 429, không tạo đơn, không trừ kho", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < 10; i++) await place(service, input(item), ip);
    expect(await stockOf("p010")).toBe(10);
    const error = await codeOf(place(service, input(item), ip));
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.httpStatus).toBe(429);
    expect(error.message).toBe(
      "Bạn đã đặt quá nhiều đơn. Vui lòng thử lại sau hoặc liên hệ shop qua 0900000000.",
    );
    expect(await stockOf("p010")).toBe(10);
    expect(await count("orders")).toBe(10);
    expect(await counterOf(ip)).toBe(10);
  });

  it("hết cửa sổ: đếm lại từ 1", async () => {
    const ip = "203.0.113.51";
    for (let i = 0; i < 10; i++) await place(service, input(item), ip);
    await client!.query(
      "UPDATE rate_limits SET window_started_at = now() - interval '2 hours'",
    );
    await place(service, input(item), ip);
    expect(await counterOf(ip)).toBe(1);
  });

  it("đơn lỗi (thiếu hàng, lỗi DB) không làm tăng bộ đếm IP", async () => {
    const ip = "203.0.113.52";
    const out = await codeOf(
      place(service, input([{ productId: "p011", quantity: 5 }]), ip),
    );
    expect(out.code).toBe("INSUFFICIENT_STOCK");
    expect(await counterOf(ip)).toBeUndefined();

    const dup = createOrderService({ ...deps, generateId: () => "SL-DUP-1" });
    await place(dup, input(item), nextIp());
    const error = (await place(dup, input(item), ip).catch(
      (e: unknown) => e,
    )) as Error & { sqlState?: string };
    expect(error.name).toBe("DbFailure");
    expect(error.sqlState).toBe("23505");
    expect(await counterOf(ip)).toBeUndefined();
  });

  it("3 đơn pending cùng SĐT (kể cả +84): đơn thứ 4 bị 429, không trừ kho", async () => {
    await place(service, input(item, "0912345670"));
    await place(service, input(item, "+84912345670"));
    await place(service, input(item, "0912345670"));
    expect(await stockOf("p010")).toBe(17);
    const ip = "203.0.113.53";
    const error = await codeOf(place(service, input(item, "+84912345670"), ip));
    expect(error.code).toBe("RATE_LIMITED");
    expect(await stockOf("p010")).toBe(17);
    expect(await count("orders")).toBe(3);
    expect(await counterOf(ip)).toBeUndefined();
  });

  it("đơn không còn pending thì không tính vào giới hạn SĐT", async () => {
    for (let i = 0; i < 3; i++) await place(service, input(item, "0912345671"));
    await client!.query(
      "UPDATE orders SET status = 'cancelled' WHERE id IN (SELECT id FROM orders LIMIT 1)",
    );
    await place(service, input(item, "0912345671"));
    expect(await count("orders")).toBe(4);
  });

  it("race: 10 request cùng SĐT khác IP, tối đa 3 đơn pending", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        place(service, input(item, "0912345672")),
      ),
    );
    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    for (const f of failed) {
      expect((f.reason as OrderError).code).toBe("RATE_LIMITED");
    }
    expect(await count("orders")).toBe(3);
    expect(await stockOf("p010")).toBe(17);
  });

  it("race: 15 request cùng IP khác SĐT, đúng 10 đơn, bộ đếm = 10", async () => {
    await setStock("p010", 50);
    const ip = "203.0.113.54";
    const results = await Promise.allSettled(
      Array.from({ length: 15 }, () => place(service, input(item), ip)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    expect(await count("orders")).toBe(10);
    expect(await counterOf(ip)).toBe(10);
    expect(await stockOf("p010")).toBe(40);
  });
});
