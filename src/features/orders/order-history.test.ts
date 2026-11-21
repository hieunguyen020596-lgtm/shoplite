import { describe, expect, it } from "vitest";
import { OrderError } from "./order-errors";
import { MAX_NOTE_LENGTH, normalizeNote, withStatusHistory } from "./order-history";
import type { Order } from "./types";

const legacyOrder = {
  id: "SL-20261001-OLD001",
  status: "cancelled",
  createdAt: "2026-10-01T02:00:00.000Z",
  updatedAt: "2026-10-01T05:00:00.000Z",
} as Order;

describe("normalizeNote", () => {
  it("bỏ khoảng trắng hai đầu", () => {
    expect(normalizeNote("  Đã kiểm hàng  ")).toBe("Đã kiểm hàng");
  });

  it("chuỗi rỗng hoặc chỉ có khoảng trắng coi như không có ghi chú", () => {
    expect(normalizeNote(undefined)).toBeUndefined();
    expect(normalizeNote("")).toBeUndefined();
    expect(normalizeNote("   ")).toBeUndefined();
  });

  it("chấp nhận ghi chú dài tối đa", () => {
    const note = "a".repeat(MAX_NOTE_LENGTH - 1);
    expect(normalizeNote(note)).toBe(note);
  });

  it("từ chối ghi chú quá dài với VALIDATION_ERROR", () => {
    let error: unknown;
    try {
      normalizeNote("a".repeat(MAX_NOTE_LENGTH + 1));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(OrderError);
    expect((error as OrderError).code).toBe("VALIDATION_ERROR");
    expect((error as OrderError).details).toHaveProperty("note");
  });
});

describe("withStatusHistory", () => {
  it("đơn cũ được suy ra một mục: trạng thái hiện tại, lúc cập nhật cuối, người thực hiện system", () => {
    expect(withStatusHistory(legacyOrder).statusHistory).toEqual([
      { status: "cancelled", at: "2026-10-01T05:00:00.000Z", actor: "system" },
    ]);
    expect(legacyOrder).not.toHaveProperty("statusHistory");
  });

  it("đơn đã có lịch sử được giữ nguyên", () => {
    const order = {
      ...legacyOrder,
      statusHistory: [
        { status: "pending", at: legacyOrder.createdAt, actor: "customer" },
        { status: "cancelled", at: legacyOrder.updatedAt, actor: "customer" },
      ],
    } as Order;
    expect(withStatusHistory(order)).toBe(order);
  });
});
