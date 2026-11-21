import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertTestDatabase } from "../../../scripts/db-test-lib";
import { runInTransaction } from "@/db/transaction";
import { OrderError } from "@/features/orders/order-errors";
import { reserveStock } from "./stock-ledger.pg";

let client: pg.Client | undefined;
let guardPassed = false;

const stockOf = async (id: string) =>
  (
    await client!.query("SELECT stock FROM inventory WHERE product_id = $1", [
      id,
    ])
  ).rows[0]?.stock;

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  guardPassed = true;
});

beforeEach(async () => {
  await client!.query("DELETE FROM inventory WHERE product_id LIKE 'sl-%'");
  await client!.query(
    "INSERT INTO inventory (product_id, stock) VALUES ('sl-a', 5), ('sl-b', 1), ('sl-c', 0)",
  );
});

afterAll(async () => {
  try {
    if (guardPassed)
      await client?.query("DELETE FROM inventory WHERE product_id LIKE 'sl-%'");
  } finally {
    await client?.end().catch(() => {});
  }
});

async function lines(work: Promise<unknown>) {
  const error = await work.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(OrderError);
  expect((error as OrderError).code).toBe("INSUFFICIENT_STOCK");
  return (error as OrderError).details?.lines;
}

describe("reserveStock", () => {
  it("trừ tồn khi đủ hàng", async () => {
    await runInTransaction((tx) =>
      reserveStock(tx, [
        { productId: "sl-b", quantity: 1 },
        { productId: "sl-a", quantity: 3 },
      ]),
    );
    expect(await stockOf("sl-a")).toBe(2);
    expect(await stockOf("sl-b")).toBe(0);
  });

  it("thiếu một dòng: báo đủ dòng thiếu và rollback mọi dòng", async () => {
    const result = await lines(
      runInTransaction((tx) =>
        reserveStock(tx, [
          { productId: "sl-a", quantity: 2 },
          { productId: "sl-b", quantity: 4 },
          { productId: "sl-c", quantity: 1 },
        ]),
      ),
    );
    expect(result).toEqual([
      { productId: "sl-b", requested: 4, available: 1 },
      { productId: "sl-c", requested: 1, available: 0 },
    ]);
    expect(await stockOf("sl-a")).toBe(5);
    expect(await stockOf("sl-b")).toBe(1);
  });

  it("available = min(tồn, requested - 1)", async () => {
    const result = await lines(
      runInTransaction((tx) =>
        reserveStock(tx, [{ productId: "sl-a", quantity: 6 }]),
      ),
    );
    expect(result).toEqual([{ productId: "sl-a", requested: 6, available: 5 }]);
  });

  it("sản phẩm không có dòng inventory: available = 0", async () => {
    const result = await lines(
      runInTransaction((tx) =>
        reserveStock(tx, [{ productId: "sl-none", quantity: 2 }]),
      ),
    );
    expect(result).toEqual([
      { productId: "sl-none", requested: 2, available: 0 },
    ]);
  });
});
