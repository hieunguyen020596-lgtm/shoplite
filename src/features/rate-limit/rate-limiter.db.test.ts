import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertTestDatabase } from "../../../scripts/db-test-lib";
import { runInTransaction } from "@/db/transaction";
import { OrderError } from "@/features/orders/order-errors";
import { orderIpPolicy } from "./policies";
import { pgRateLimiter } from "./rate-limiter.pg";

let client: pg.Client | undefined;
let guardPassed = false;

const countOf = async (key: string) =>
  (await client!.query("SELECT count FROM rate_limits WHERE key = $1", [key]))
    .rows[0]?.count;

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  guardPassed = true;
});

beforeEach(async () => {
  await client!.query("TRUNCATE TABLE rate_limits");
});

afterAll(async () => {
  try {
    if (guardPassed) await client?.query("TRUNCATE TABLE rate_limits");
  } finally {
    await client?.end().catch(() => {});
  }
});

const req = (key: string, limit = 3, windowSeconds = 3600) => ({
  key,
  limit,
  windowSeconds,
});

describe("rate limiter trên PostgreSQL", () => {
  it("khóa chính sách mã hóa ký tự đặc biệt của IP", () => {
    expect(orderIpPolicy("2001:db8::/64").key).toBe(
      "order:ip:2001%3Adb8%3A%3A%2F64",
    );
  });

  it("consume tăng đến ngưỡng rồi ném RATE_LIMITED và rollback lượt vượt", async () => {
    for (let i = 0; i < 3; i++) {
      await runInTransaction((tx) => pgRateLimiter.consume(tx, [req("k")]));
    }
    const error = await runInTransaction((tx) =>
      pgRateLimiter.consume(tx, [req("k")]),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OrderError);
    expect((error as OrderError).code).toBe("RATE_LIMITED");
    expect(await countOf("k")).toBe(3);
  });

  it("hết cửa sổ thì đếm lại từ 1 và neo cửa sổ mới", async () => {
    await runInTransaction((tx) => pgRateLimiter.consume(tx, [req("w")]));
    await client!.query(
      "UPDATE rate_limits SET window_started_at = now() - interval '2 hours', count = 3 WHERE key = 'w'",
    );
    const [receipt] = await runInTransaction((tx) =>
      pgRateLimiter.consume(tx, [req("w")]),
    );
    expect(await countOf("w")).toBe(1);
    expect(Date.now() - receipt.windowStartedAt.getTime()).toBeLessThan(60_000);
  });

  it("lỗi sau consume thì rollback bộ đếm", async () => {
    await runInTransaction(async (tx) => {
      await pgRateLimiter.consume(tx, [req("r")]);
      throw new Error("boom");
    }).catch(() => {});
    expect(await countOf("r")).toBeUndefined();
  });

  it("release hoàn một lượt, không âm, bỏ qua cửa sổ khác", async () => {
    const [receipt] = await runInTransaction((tx) =>
      pgRateLimiter.consume(tx, [req("rel")]),
    );
    await runInTransaction((tx) => pgRateLimiter.release(tx, [receipt]));
    expect(await countOf("rel")).toBe(0);
    await runInTransaction((tx) => pgRateLimiter.release(tx, [receipt]));
    expect(await countOf("rel")).toBe(0);

    await runInTransaction((tx) => pgRateLimiter.consume(tx, [req("rel")]));
    await runInTransaction((tx) =>
      pgRateLimiter.release(tx, [{ key: "rel", windowStartedAt: new Date(0) }]),
    );
    expect(await countOf("rel")).toBe(1);
  });

  it("race consume song song: đúng limit lượt thành công, count không sót", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        runInTransaction((tx) => pgRateLimiter.consume(tx, [req("p", 5)])),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(await countOf("p")).toBe(5);
  });

  it("race consume/release: không sót, không đếm đôi, không deadlock", async () => {
    const receipts = [];
    for (let i = 0; i < 4; i++) {
      receipts.push(
        ...(await runInTransaction((tx) =>
          pgRateLimiter.consume(tx, [req("a", 100), req("b", 100)]),
        )),
      );
    }
    const ra = receipts.filter((r) => r.key === "a");
    const rb = receipts.filter((r) => r.key === "b");
    const work = [
      ...ra.map((r, i) =>
        runInTransaction((tx) =>
          pgRateLimiter.release(tx, i % 2 ? [r] : [r, rb[i]]),
        ),
      ),
      ...Array.from({ length: 6 }, () =>
        runInTransaction((tx) =>
          // Truyền ngược thứ tự: bản cài đặt phải tự sắp theo key.
          pgRateLimiter.consume(tx, [req("b", 100), req("a", 100)]),
        ),
      ),
    ];
    const results = await Promise.allSettled(work);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(0);
    // a: 4 - 4 + 6 = 6; b: 4 - 2 + 6 = 8
    expect(await countOf("a")).toBe(6);
    expect(await countOf("b")).toBe(8);
  });
});
