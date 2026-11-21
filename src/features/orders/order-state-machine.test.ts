import { describe, expect, it } from "vitest";
import { OrderError } from "./order-errors";
import { ALLOWED_TRANSITIONS, canTransition, transitionOrder } from "./order-state-machine";
import { ORDER_STATUSES, type Order, type OrderStatus } from "./types";

const CREATED_AT = "2026-11-20T01:00:00.000Z";
const AT = new Date("2026-11-20T02:30:00.000Z");

function makeOrder(status: OrderStatus): Order {
  return {
    id: "SL-20261120-AAAAAA",
    status,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    customer: { fullName: "Trần Văn Minh", phone: "0912345678", address: "12 Nguyễn Huệ, Quận 1" },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [
      {
        productId: "p005",
        slug: "ban-phim-co-keypro-75",
        name: "Bàn phím cơ KeyPro 75%",
        image: { emoji: "⌨️", from: "#dcfce7", to: "#a7f3d0" },
        unitPrice: 1_890_000,
        quantity: 1,
        lineTotal: 1_890_000,
      },
    ],
    subtotal: 1_890_000,
    discount: 0,
    shippingFee: 0,
    total: 1_890_000,
  };
}

function catchError(fn: () => unknown): OrderError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(OrderError);
    return error as OrderError;
  }
  throw new Error("Mong đợi OrderError nhưng không có lỗi nào");
}

describe("transitionOrder", () => {
  it("nhân viên xác nhận đơn chờ xác nhận: trả đơn mới, cập nhật updatedAt", () => {
    const order = makeOrder("pending");
    const confirmed = transitionOrder(order, "confirmed", { actor: "staff", at: AT });

    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.updatedAt).toBe(AT.toISOString());
    expect(confirmed).not.toBe(order);
    expect(order.status).toBe("pending");
    expect(order.updatedAt).toBe(CREATED_AT);
  });

  it("từ chối nhảy cóc kèm trạng thái hiện tại trong details", () => {
    const error = catchError(() =>
      transitionOrder(makeOrder("pending"), "delivered", { actor: "staff", at: AT }),
    );
    expect(error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(error.httpStatus).toBe(409);
    expect(error.details).toEqual({ currentStatus: "pending" });
    expect(error.message).toBe('Không thể chuyển đơn từ "Chờ xác nhận" sang "Đã giao"');
  });

  it("không chuyển ra khỏi trạng thái cuối", () => {
    for (const status of ["delivered", "cancelled"] as const) {
      for (const to of ORDER_STATUSES) {
        expect(() => transitionOrder(makeOrder(status), to, { actor: "staff", at: AT })).toThrow(
          OrderError,
        );
      }
    }
  });

  it("từ chối chuyển sang chính trạng thái hiện tại (bấm đúp)", () => {
    const error = catchError(() =>
      transitionOrder(makeOrder("confirmed"), "confirmed", { actor: "staff", at: AT }),
    );
    expect(error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("khách chỉ hủy được đơn chờ xác nhận", () => {
    const cancelled = transitionOrder(makeOrder("pending"), "cancelled", {
      actor: "customer",
      at: AT,
    });
    expect(cancelled.status).toBe("cancelled");

    const error = catchError(() =>
      transitionOrder(makeOrder("confirmed"), "cancelled", { actor: "customer", at: AT }),
    );
    expect(error.code).toBe("INVALID_STATUS_TRANSITION");
  });
});

describe("ma trận chuyển trạng thái", () => {
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      // Bảng kỳ vọng cho nhân viên và khách hàng
      const staffAllowed = ALLOWED_TRANSITIONS[from].includes(to);
      const customerAllowed = from === "pending" && to === "cancelled";

      it(`nhân viên: ${from} → ${to} ${staffAllowed ? "hợp lệ" : "bị từ chối"}`, () => {
        expect(canTransition(from, to, "staff")).toBe(staffAllowed);
      });

      it(`khách hàng: ${from} → ${to} ${customerAllowed ? "hợp lệ" : "bị từ chối"}`, () => {
        expect(canTransition(from, to, "customer")).toBe(customerAllowed);
      });
    }
  }
});

describe("lịch sử trạng thái", () => {
  const withHistory = (status: OrderStatus): Order => ({
    ...makeOrder(status),
    statusHistory: [{ status: "pending", at: CREATED_AT, actor: "customer" }],
  });

  it("nối đúng một mục mới với ghi chú đã bỏ khoảng trắng, giữ nguyên các mục cũ", () => {
    const confirmed = transitionOrder(withHistory("pending"), "confirmed", {
      actor: "staff",
      at: AT,
      note: "  Đã kiểm hàng ",
    });

    expect(confirmed.statusHistory).toEqual([
      { status: "pending", at: CREATED_AT, actor: "customer" },
      { status: "confirmed", at: AT.toISOString(), actor: "staff", note: "Đã kiểm hàng" },
    ]);
    expect(confirmed.statusHistory?.at(-1)?.status).toBe(confirmed.status);
  });

  it("ghi chú chỉ có khoảng trắng: mục mới không có trường note", () => {
    const confirmed = transitionOrder(withHistory("pending"), "confirmed", {
      actor: "staff",
      at: AT,
      note: "   ",
    });
    expect(confirmed.statusHistory?.at(-1)).not.toHaveProperty("note");
  });

  it("ghi chú quá dài bị từ chối với VALIDATION_ERROR", () => {
    const error = catchError(() =>
      transitionOrder(withHistory("pending"), "confirmed", {
        actor: "staff",
        at: AT,
        note: "a".repeat(201),
      }),
    );
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toHaveProperty("note");
  });

  it("bước chuyển bị từ chối không thêm mục lịch sử", () => {
    const order = withHistory("delivered");
    expect(() => transitionOrder(order, "cancelled", { actor: "staff", at: AT })).toThrow(
      OrderError,
    );
    expect(order.statusHistory).toHaveLength(1);
  });

  it("đơn cũ chưa có lịch sử: lịch sử mới gồm mục suy ra và mục vừa chuyển", () => {
    const shipped = transitionOrder(makeOrder("confirmed"), "shipping", { actor: "staff", at: AT });
    expect(shipped.statusHistory).toEqual([
      { status: "confirmed", at: CREATED_AT, actor: "system" },
      { status: "shipping", at: AT.toISOString(), actor: "staff" },
    ]);
  });
});
