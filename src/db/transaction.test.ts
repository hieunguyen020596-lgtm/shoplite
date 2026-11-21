import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderError } from "@/features/orders/order-errors";
import {
  DbFailure,
  runInTransaction,
  sanitizeDbError,
  withDb,
} from "./transaction";

// Không dùng vi.fn cho promise bị từ chối: vitest báo lỗi chưa xử lý giả.
let failWith: unknown;
vi.mock("./client", () => ({
  getDb: () => ({ transaction: () => Promise.reject(failWith) }),
}));

const pgError = () =>
  Object.assign(new Error("connect postgresql://u:pw@host/db failed"), {
    severity: "ERROR",
    code: "57P01",
  });

describe("sanitizeDbError", () => {
  it("lỗi driver thành DbFailure chỉ có sqlState, không message, không cause", () => {
    const raw = pgError();
    const out = sanitizeDbError(raw);
    expect(out).toBeInstanceOf(DbFailure);
    expect(out.message).toBe("Database operation failed");
    expect((out as DbFailure).sqlState).toBe("57P01");
    expect(out.cause).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain("pw");
  });

  it("lấy sqlState từ cause khi Drizzle bọc lỗi", () => {
    const out = sanitizeDbError(
      Object.assign(new Error("q"), {
        cause: { severity: "ERROR", code: "23514" },
      }),
    );
    expect((out as DbFailure).sqlState).toBe("23514");
  });

  it("lỗi không có SQLSTATE vẫn thành DbFailure", () => {
    expect(
      (sanitizeDbError(new Error("boom")) as DbFailure).sqlState,
    ).toBeUndefined();
  });

  it("OrderError và DbFailure đi qua nguyên vẹn", () => {
    const o = new OrderError("INSUFFICIENT_STOCK", "x");
    const d = new DbFailure("40001");
    expect(sanitizeDbError(o)).toBe(o);
    expect(sanitizeDbError(d)).toBe(d);
  });
});

describe("runInTransaction và withDb", () => {
  beforeEach(() => {
    failWith = undefined;
  });

  it("runInTransaction đổi lỗi driver thành DbFailure có sqlState, không cause", async () => {
    failWith = pgError();
    const err = await runInTransaction(async () => 1).catch((e) => e);
    expect(err).toBeInstanceOf(DbFailure);
    expect(err.sqlState).toBe("57P01");
    expect(err.cause).toBeUndefined();
  });

  it("runInTransaction giữ nguyên instance OrderError", async () => {
    const o = new OrderError("INSUFFICIENT_STOCK", "x");
    failWith = o;
    await expect(runInTransaction(async () => 1)).rejects.toBe(o);
  });

  it("withDb đổi lỗi driver thành DbFailure và giữ OrderError", async () => {
    const err = await withDb(async () => {
      throw pgError();
    }).catch((e) => e);
    expect(err).toBeInstanceOf(DbFailure);
    expect(err.sqlState).toBe("57P01");
    expect(err.cause).toBeUndefined();
    const o = new OrderError("ORDER_NOT_FOUND", "x");
    await expect(
      withDb(async () => {
        throw o;
      }),
    ).rejects.toBe(o);
  });
});
