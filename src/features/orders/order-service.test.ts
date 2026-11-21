import { describe, expect, it } from "vitest";
import type { StockLedger } from "@/features/inventory/stock-ledger";
import type { RunInTransaction } from "@/lib/db-tx";
import { OrderError } from "./order-errors";
import type { OrderRepository } from "./order-repository";
import { createOrderService, generateOrderId } from "./order-service";

// Các case ở đây đều bị chặn TRƯỚC transaction, nên mọi cổng ghi đều phải không được gọi.
const mustNotRun = () => {
  throw new Error("không được mở transaction hay ghi DB");
};
const service = createOrderService({
  runInTransaction: mustNotRun as unknown as RunInTransaction,
  repository: {
    insertOrder: mustNotRun,
    findAll: mustNotRun,
    findById: mustNotRun,
  } as unknown as OrderRepository,
  stockLedger: { reserveStock: mustNotRun } as unknown as StockLedger,
});

const validInput = (overrides: Record<string, unknown> = {}) => ({
  customer: {
    fullName: "Trần Thị B",
    phone: "0987654321",
    email: "",
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p010", quantity: 2 }],
  ...overrides,
});

async function expectOrderError(
  promise: Promise<unknown>,
  code: OrderError["code"],
) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(OrderError);
  expect((error as OrderError).code).toBe(code);
  return error as OrderError;
}

describe("placeOrder: chặn trước transaction", () => {
  it("VALIDATION_ERROR kèm chi tiết từng field", async () => {
    const error = await expectOrderError(
      service.placeOrder(
        validInput({ customer: { fullName: "", phone: "123", address: "" } }),
      ),
      "VALIDATION_ERROR",
    );
    expect(error.details).toHaveProperty(["customer.phone"]);
    expect(error.httpStatus).toBe(400);
  });

  it("từ chối giỏ hàng trống", async () => {
    await expectOrderError(
      service.placeOrder(validInput({ items: [] })),
      "VALIDATION_ERROR",
    );
  });

  it("PRODUCT_NOT_FOUND khi sản phẩm không có trong catalog", async () => {
    await expectOrderError(
      service.placeOrder(
        validInput({ items: [{ productId: "p999", quantity: 1 }] }),
      ),
      "PRODUCT_NOT_FOUND",
    );
  });

  it("400 khi hai dòng cùng sản phẩm gộp lại quá 10", async () => {
    const error = await expectOrderError(
      service.placeOrder(
        validInput({
          items: [
            { productId: "p010", quantity: 6 },
            { productId: "p010", quantity: 5 },
          ],
        }),
      ),
      "VALIDATION_ERROR",
    );
    expect(error.httpStatus).toBe(400);
  });
});

describe("generateOrderId", () => {
  it("có dạng SL-YYYYMMDD-XXXXXX", () => {
    expect(generateOrderId(new Date("2026-10-21T03:00:00.000Z"))).toMatch(
      /^SL-20261021-[0-9A-F]{6}$/,
    );
  });
});
