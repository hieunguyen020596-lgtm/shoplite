import { describe, expect, it } from "vitest";
import { OrderError, type OrderErrorCode } from "./order-errors";
import {
  canTransition,
  getAllowedNextStatuses,
  markOrderRestocked,
  synthesizeStatusHistory,
  transitionOrder,
} from "./order-state-machine";
import {
  ORDER_STATUSES,
  type Order,
  type OrderActor,
  type OrderStatus,
} from "./types";

const CREATED_AT = "2026-11-08T08:24:25.228Z";
const UPDATED_AT = "2026-11-08T09:00:00.000Z";
const TRANSITION_DATE = new Date("2026-11-21T10:15:30.000Z");

function createOrder(overrides: Partial<Order> = {}): Order {
  const status = overrides.status ?? "pending";
  return {
    id: "SL-20261108-TEST01",
    status,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    customer: {
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
      address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [
      {
        productId: "p006",
        slug: "chuot-khong-day-swiftclick",
        name: "Chuột không dây SwiftClick",
        image: { emoji: "🖱️", from: "#fae8ff", to: "#ddd6fe" },
        unitPrice: 450_000,
        quantity: 2,
        lineTotal: 900_000,
      },
    ],
    subtotal: 900_000,
    shippingFee: 0,
    total: 900_000,
    statusHistory: [
      {
        status: "pending",
        at: CREATED_AT,
        actor: "customer",
        action: "transition",
      },
    ],
    ...overrides,
  };
}

function expectOrderError(
  fn: () => unknown,
  code: OrderErrorCode,
  httpStatus: number,
): OrderError {
  try {
    fn();
    throw new Error(`Expected OrderError(${code}), but function did not throw`);
  } catch (error) {
    expect(error).toBeInstanceOf(OrderError);
    const orderError = error as OrderError;
    expect(orderError.code).toBe(code);
    expect(orderError.httpStatus).toBe(httpStatus);
    expect(orderError.message.length).toBeGreaterThan(0);
    return orderError;
  }
}

const EXPECTED_ALLOWED_MATRIX: Record<
  OrderActor,
  Record<OrderStatus, OrderStatus[]>
> = {
  staff: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipping", "cancelled"],
    shipping: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  },
  customer: {
    pending: ["cancelled"],
    confirmed: [],
    shipping: [],
    delivered: [],
    cancelled: [],
  },
};

describe("order-errors", () => {
  it("ánh xạ chính xác toàn bộ 7 mã lỗi sang HTTP status và giữ nguyên chuẩn Error", () => {
    const cases: Array<[OrderErrorCode, number]> = [
      ["VALIDATION_ERROR", 400],
      ["UNAUTHORIZED", 401],
      ["ORDER_NOT_FOUND", 404],
      ["INSUFFICIENT_STOCK", 409],
      ["INVALID_STATUS_TRANSITION", 409],
      ["PRODUCT_NOT_FOUND", 422],
      ["ADMIN_NOT_CONFIGURED", 503],
    ];

    for (const [code, expectedStatus] of cases) {
      const errWithDetails = new OrderError(code, "Thông báo lỗi", {
        field: "value",
      });
      expect(errWithDetails).toBeInstanceOf(Error);
      expect(errWithDetails.name).toBe("OrderError");
      expect(errWithDetails.code).toBe(code);
      expect(errWithDetails.httpStatus).toBe(expectedStatus);
      expect(errWithDetails.details).toEqual({ field: "value" });

      const errWithoutDetails = new OrderError(code, "Không có details");
      expect(errWithoutDetails).toBeInstanceOf(Error);
      expect(errWithoutDetails.name).toBe("OrderError");
      expect(errWithoutDetails.details).toBeUndefined();
    }
  });
});

describe("order-state-machine", () => {
  describe("ma trận chuyển trạng thái 5×5 cho staff và customer", () => {
    const actors: OrderActor[] = ["staff", "customer"];

    for (const actor of actors) {
      it(`getAllowedNextStatuses(${actor}) trả về đúng tập trạng thái kế tiếp`, () => {
        for (const from of ORDER_STATUSES) {
          expect(getAllowedNextStatuses(from, actor)).toEqual(
            EXPECTED_ALLOWED_MATRIX[actor][from],
          );
        }
      });

      for (const from of ORDER_STATUSES) {
        for (const to of ORDER_STATUSES) {
          const allowed = EXPECTED_ALLOWED_MATRIX[actor][from].includes(to);

          it(`${actor}: ${from} -> ${to} phải ${allowed ? "hợp lệ" : "bị từ chối (409)"}`, () => {
            expect(canTransition(from, to, actor)).toBe(allowed);

            const order = createOrder({ status: from });
            const note =
              actor === "staff" && to === "cancelled"
                ? "Lý do hợp lệ"
                : undefined;

            if (allowed) {
              const result = transitionOrder(order, {
                to,
                actor,
                now: TRANSITION_DATE,
                note,
              });
              expect(result.order.status).toBe(to);
              expect(result.order.updatedAt).toBe(
                TRANSITION_DATE.toISOString(),
              );
              expect(result.order.statusHistory?.at(-1)).toMatchObject({
                status: to,
                at: TRANSITION_DATE.toISOString(),
                actor,
                action: "transition",
              });
            } else {
              const error = expectOrderError(
                () =>
                  transitionOrder(order, {
                    to,
                    actor,
                    now: TRANSITION_DATE,
                    note,
                  }),
                "INVALID_STATUS_TRANSITION",
                409,
              );
              expect(error.details).toEqual({ from, to, actor });
            }
          });
        }
      }
    }

    it("xử lý an toàn input lạ ở runtime cho canTransition, getAllowedNextStatuses và transitionOrder", () => {
      const unknownStatus = "unknown_status" as OrderStatus;
      const unknownActor = "unknown_actor" as OrderActor;

      expect(canTransition(unknownStatus, "confirmed", "staff")).toBe(false);
      expect(canTransition("pending", unknownStatus, "staff")).toBe(false);
      expect(canTransition("pending", "confirmed", unknownActor)).toBe(false);

      expect(getAllowedNextStatuses(unknownStatus, "staff")).toEqual([]);
      expect(getAllowedNextStatuses("pending", unknownActor)).toEqual([]);

      const weirdOrder = createOrder({ status: unknownStatus });
      const err = expectOrderError(
        () =>
          transitionOrder(weirdOrder, {
            to: "confirmed",
            actor: "staff",
            now: TRANSITION_DATE,
          }),
        "INVALID_STATUS_TRANSITION",
        409,
      );
      expect(err.details).toEqual({
        from: "unknown_status",
        to: "confirmed",
        actor: "staff",
      });
    });
  });

  describe("chuyển tiến hợp lệ của staff", () => {
    it("chuyển pending -> confirmed -> shipping -> delivered và nối đủ statusHistory", () => {
      const initial = createOrder({ status: "pending" });

      const step1 = transitionOrder(initial, {
        to: "confirmed",
        actor: "staff",
        now: new Date("2026-11-21T10:00:00.000Z"),
      });
      expect(step1.shouldRestock).toBe(false);
      expect(step1.order.inventoryRestocked).toBeUndefined();
      expect(step1.order.statusHistory).toHaveLength(2);
      expect(step1.order.statusHistory?.[1]).toEqual({
        status: "confirmed",
        at: "2026-11-21T10:00:00.000Z",
        actor: "staff",
        action: "transition",
      });

      const step2 = transitionOrder(step1.order, {
        to: "shipping",
        actor: "staff",
        now: new Date("2026-11-21T11:00:00.000Z"),
        note: "  Đã bàn giao GHN  ",
      });
      expect(step2.shouldRestock).toBe(false);
      expect(step2.order.statusHistory).toHaveLength(3);
      expect(step2.order.statusHistory?.[2]).toEqual({
        status: "shipping",
        at: "2026-11-21T11:00:00.000Z",
        actor: "staff",
        action: "transition",
        note: "Đã bàn giao GHN",
      });

      const step3 = transitionOrder(step2.order, {
        to: "delivered",
        actor: "staff",
        now: new Date("2026-11-21T12:00:00.000Z"),
      });
      expect(step3.shouldRestock).toBe(false);
      expect(step3.order.status).toBe("delivered");
      expect(step3.order.statusHistory).toHaveLength(4);
      expect(step3.order.statusHistory?.[3]).toEqual({
        status: "delivered",
        at: "2026-11-21T12:00:00.000Z",
        actor: "staff",
        action: "transition",
      });
    });

    it("bỏ qua note toàn khoảng trắng khi chuyển tiến confirmed -> shipping", () => {
      const order = createOrder({ status: "confirmed" });
      const result = transitionOrder(order, {
        to: "shipping",
        actor: "staff",
        now: TRANSITION_DATE,
        note: "   \t\n  ",
      });

      const lastEvent = result.order.statusHistory?.at(-1);
      expect(lastEvent).toEqual({
        status: "shipping",
        at: TRANSITION_DATE.toISOString(),
        actor: "staff",
        action: "transition",
      });
      expect(lastEvent).not.toHaveProperty("note");
    });
  });

  describe("khóa lạc quan expectedStatus", () => {
    it("cho phép chuyển đổi khi expectedStatus khớp order.status", () => {
      const order = createOrder({ status: "pending" });
      const result = transitionOrder(order, {
        to: "confirmed",
        actor: "staff",
        expectedStatus: "pending",
        now: TRANSITION_DATE,
      });
      expect(result.order.status).toBe("confirmed");
    });

    it("ném INVALID_STATUS_TRANSITION (409) kèm details khi expectedStatus không khớp", () => {
      const order = createOrder({ status: "confirmed" });
      const err = expectOrderError(
        () =>
          transitionOrder(order, {
            to: "shipping",
            actor: "staff",
            expectedStatus: "pending",
            now: TRANSITION_DATE,
          }),
        "INVALID_STATUS_TRANSITION",
        409,
      );
      expect(err.details).toEqual({
        expectedStatus: "pending",
        currentStatus: "confirmed",
      });
    });
  });

  describe("validation trường note (0, 200, 201 ký tự, sai kiểu) và now", () => {
    it("từ chối nhân viên hủy đơn khi thiếu note hoặc note chỉ có khoảng trắng", () => {
      const order = createOrder({ status: "pending" });

      const missingErr = expectOrderError(
        () => transitionOrder(order, { to: "cancelled", actor: "staff" }),
        "VALIDATION_ERROR",
        400,
      );
      expect(missingErr.details).toHaveProperty("note");

      const emptyErr = expectOrderError(
        () =>
          transitionOrder(order, { to: "cancelled", actor: "staff", note: "" }),
        "VALIDATION_ERROR",
        400,
      );
      expect(emptyErr.details).toHaveProperty("note");

      const blankErr = expectOrderError(
        () =>
          transitionOrder(order, {
            to: "cancelled",
            actor: "staff",
            note: "   ",
          }),
        "VALIDATION_ERROR",
        400,
      );
      expect(blankErr.details).toHaveProperty("note");
    });

    it("chấp nhận note đúng 200 ký tự sau trim và từ chối 201 ký tự", () => {
      const order = createOrder({ status: "confirmed" });
      const exact200 = "a".repeat(200);
      const over201 = "a".repeat(201);

      const okCancel = transitionOrder(order, {
        to: "cancelled",
        actor: "staff",
        note: `  ${exact200}  `,
        now: TRANSITION_DATE,
      });
      expect(okCancel.order.statusHistory?.at(-1)?.note).toBe(exact200);

      const okForward = transitionOrder(order, {
        to: "shipping",
        actor: "staff",
        note: exact200,
        now: TRANSITION_DATE,
      });
      expect(okForward.order.statusHistory?.at(-1)?.note).toBe(exact200);

      const overCancelErr = expectOrderError(
        () =>
          transitionOrder(order, {
            to: "cancelled",
            actor: "staff",
            note: over201,
          }),
        "VALIDATION_ERROR",
        400,
      );
      expect(overCancelErr.details).toHaveProperty("note");

      const overForwardErr = expectOrderError(
        () =>
          transitionOrder(order, {
            to: "shipping",
            actor: "staff",
            note: over201,
          }),
        "VALIDATION_ERROR",
        400,
      );
      expect(overForwardErr.details).toHaveProperty("note");
    });

    it("từ chối note sai kiểu runtime và now không hợp lệ (Invalid Date), đồng thời hỗ trợ mặc định không truyền now", () => {
      const order = createOrder({ status: "pending" });

      for (const badNote of [123, null, {}]) {
        const err = expectOrderError(
          () =>
            transitionOrder(order, {
              to: "confirmed",
              actor: "staff",
              note: badNote as unknown as string,
            }),
          "VALIDATION_ERROR",
          400,
        );
        expect(err.details).toHaveProperty("note");
      }

      for (const badNow of [
        new Date("invalid"),
        "2026-11-21" as unknown as Date,
      ]) {
        const err = expectOrderError(
          () =>
            transitionOrder(order, {
              to: "confirmed",
              actor: "staff",
              now: badNow,
            }),
          "VALIDATION_ERROR",
          400,
        );
        expect(err.details).toHaveProperty("now");
      }

      const defaultNowResult = transitionOrder(order, {
        to: "confirmed",
        actor: "staff",
      });
      expect(Number.isNaN(Date.parse(defaultNowResult.order.updatedAt))).toBe(
        false,
      );
      expect(defaultNowResult.order.statusHistory?.at(-1)?.at).toBe(
        defaultNowResult.order.updatedAt,
      );
    });

    it("cho phép customer hủy đơn pending không cần note và kiểm tra giới hạn 200 ký tự nếu có note", () => {
      const order = createOrder({ status: "pending" });

      const noNote = transitionOrder(order, {
        to: "cancelled",
        actor: "customer",
        now: TRANSITION_DATE,
      });
      expect(noNote.order.statusHistory?.at(-1)).not.toHaveProperty("note");

      const blankNote = transitionOrder(order, {
        to: "cancelled",
        actor: "customer",
        note: "   ",
        now: TRANSITION_DATE,
      });
      expect(blankNote.order.statusHistory?.at(-1)).not.toHaveProperty("note");

      expectOrderError(
        () =>
          transitionOrder(order, {
            to: "cancelled",
            actor: "customer",
            note: "x".repeat(201),
          }),
        "VALIDATION_ERROR",
        400,
      );
    });
  });

  describe("hoàn kho khi hủy đơn và tương thích đơn cũ", () => {
    it("customer hủy đơn pending có statusHistory đặt inventoryRestocked=true và shouldRestock=true", () => {
      const order = createOrder({ status: "pending" });
      const result = transitionOrder(order, {
        to: "cancelled",
        actor: "customer",
        now: TRANSITION_DATE,
      });

      expect(result.shouldRestock).toBe(true);
      expect(result.order.inventoryRestocked).toBe(true);
      expect(result.order.status).toBe("cancelled");
    });

    it("staff hủy đơn pending hoặc confirmed đặt inventoryRestocked=true và shouldRestock=true", () => {
      for (const status of ["pending", "confirmed"] as const) {
        const order = createOrder({ status });
        const result = transitionOrder(order, {
          to: "cancelled",
          actor: "staff",
          note: "Hết hàng",
          now: TRANSITION_DATE,
        });

        expect(result.shouldRestock).toBe(true);
        expect(result.order.inventoryRestocked).toBe(true);
        expect(result.order.statusHistory?.at(-1)).toEqual({
          status: "cancelled",
          at: TRANSITION_DATE.toISOString(),
          actor: "staff",
          action: "transition",
          note: "Hết hàng",
        });
      }
    });

    it("staff hủy đơn shipping đặt inventoryRestocked=false và shouldRestock=false", () => {
      const order = createOrder({ status: "shipping" });
      const result = transitionOrder(order, {
        to: "cancelled",
        actor: "staff",
        note: "Khách từ chối nhận hàng",
        now: TRANSITION_DATE,
      });

      expect(result.shouldRestock).toBe(false);
      expect(result.order.inventoryRestocked).toBe(false);
      expect(result.order.status).toBe("cancelled");
    });

    it("đơn cũ thiếu statusHistory hoặc rỗng [] khi hủy đặt inventoryRestocked=true nhưng shouldRestock=false và giữ trường phụ", () => {
      for (const emptyHistory of [undefined, []]) {
        const legacyOrder = {
          ...createOrder({
            status: "pending",
            statusHistory: emptyHistory,
            inventoryRestocked: undefined,
          }),
          discount: 50_000,
          couponCode: "GIAM50K",
        } as Order & { discount: number; couponCode: string };

        const customerResult = transitionOrder(legacyOrder, {
          to: "cancelled",
          actor: "customer",
          now: TRANSITION_DATE,
        });

        expect(customerResult.shouldRestock).toBe(false);
        expect(customerResult.order.inventoryRestocked).toBe(true);
        expect(customerResult.order.status).toBe("cancelled");
        expect(customerResult.order.statusHistory).toEqual([
          {
            status: "pending",
            at: CREATED_AT,
            actor: "customer",
            action: "transition",
          },
          {
            status: "cancelled",
            at: TRANSITION_DATE.toISOString(),
            actor: "customer",
            action: "transition",
          },
        ]);
        expect((customerResult.order as typeof legacyOrder).discount).toBe(
          50_000,
        );
        expect((customerResult.order as typeof legacyOrder).couponCode).toBe(
          "GIAM50K",
        );

        const staffResult = transitionOrder(legacyOrder, {
          to: "cancelled",
          actor: "staff",
          note: "Hết hàng",
          now: TRANSITION_DATE,
        });
        expect(staffResult.shouldRestock).toBe(false);
        expect(staffResult.order.inventoryRestocked).toBe(true);
      }
    });

    it("đơn cũ chuyển tiến rồi mới hủy (pending -> confirmed -> cancelled và pending -> confirmed -> shipping -> cancelled) không cộng khống kho", () => {
      for (const emptyHistory of [undefined, []]) {
        const legacyOrder = createOrder({
          status: "pending",
          statusHistory: emptyHistory,
          inventoryRestocked: undefined,
        });

        const confirmed = transitionOrder(legacyOrder, {
          to: "confirmed",
          actor: "staff",
          now: new Date("2026-11-21T10:00:00.000Z"),
        });
        expect(confirmed.shouldRestock).toBe(false);
        expect(confirmed.order.inventoryRestocked).toBe(true);

        const cancelledAfterConfirm = transitionOrder(confirmed.order, {
          to: "cancelled",
          actor: "staff",
          note: "Khách đổi ý",
          now: new Date("2026-11-21T10:30:00.000Z"),
        });
        expect(cancelledAfterConfirm.shouldRestock).toBe(false);
        expect(cancelledAfterConfirm.order.inventoryRestocked).toBe(true);

        const shipping = transitionOrder(confirmed.order, {
          to: "shipping",
          actor: "staff",
          now: new Date("2026-11-21T11:00:00.000Z"),
        });
        expect(shipping.shouldRestock).toBe(false);
        expect(shipping.order.inventoryRestocked).toBe(true);

        const cancelledAfterShipping = transitionOrder(shipping.order, {
          to: "cancelled",
          actor: "staff",
          note: "Không liên lạc được",
          now: new Date("2026-11-21T12:00:00.000Z"),
        });
        expect(cancelledAfterShipping.shouldRestock).toBe(false);
        expect(cancelledAfterShipping.order.inventoryRestocked).toBe(true);
      }
    });

    it("đơn đã có inventoryRestocked=true không hoàn kho đúp khi hủy ở pending, confirmed hoặc shipping", () => {
      for (const status of ["pending", "confirmed", "shipping"] as const) {
        const order = createOrder({
          status,
          inventoryRestocked: true,
        });
        const cancelled = transitionOrder(order, {
          to: "cancelled",
          actor: "staff",
          note: "Hủy đơn đã đánh dấu kho",
          now: TRANSITION_DATE,
        });

        expect(cancelled.shouldRestock).toBe(false);
        expect(cancelled.order.inventoryRestocked).toBe(true);
      }
    });
  });

  describe("markOrderRestocked", () => {
    it("đánh dấu hoàn kho 1 lần cho đơn cancelled có inventoryRestocked=false (kể cả mặc định không truyền now)", () => {
      const cancelledFromShipping = createOrder({
        status: "cancelled",
        inventoryRestocked: false,
      });

      const restocked = markOrderRestocked(cancelledFromShipping, {
        now: TRANSITION_DATE,
        note: "  Đã nhập lại kho nguyên vẹn  ",
      });

      expect(restocked.inventoryRestocked).toBe(true);
      expect(restocked.updatedAt).toBe(TRANSITION_DATE.toISOString());
      expect(restocked.statusHistory?.at(-1)).toEqual({
        status: "cancelled",
        at: TRANSITION_DATE.toISOString(),
        actor: "staff",
        action: "restock",
        note: "Đã nhập lại kho nguyên vẹn",
      });

      const defaultNowRestocked = markOrderRestocked(cancelledFromShipping);
      expect(defaultNowRestocked.inventoryRestocked).toBe(true);
      expect(Number.isNaN(Date.parse(defaultNowRestocked.updatedAt))).toBe(
        false,
      );
      expect(defaultNowRestocked.statusHistory?.at(-1)).toEqual({
        status: "cancelled",
        at: defaultNowRestocked.updatedAt,
        actor: "staff",
        action: "restock",
      });
    });

    it("hỗ trợ fallback lịch sử nhất quán khi statusHistory rỗng [] trong markOrderRestocked", () => {
      const orderWithEmptyHistory = createOrder({
        status: "cancelled",
        updatedAt: UPDATED_AT,
        statusHistory: [],
        inventoryRestocked: false,
      });

      const restocked = markOrderRestocked(orderWithEmptyHistory, {
        now: TRANSITION_DATE,
      });
      expect(restocked.inventoryRestocked).toBe(true);
      expect(restocked.statusHistory).toEqual([
        {
          status: "pending",
          at: CREATED_AT,
          actor: "customer",
          action: "transition",
        },
        {
          status: "cancelled",
          at: UPDATED_AT,
          actor: "customer",
          action: "transition",
        },
        {
          status: "cancelled",
          at: TRANSITION_DATE.toISOString(),
          actor: "staff",
          action: "restock",
        },
      ]);
    });

    it("bỏ qua note toàn khoảng trắng, kiểm tra giới hạn 200 ký tự, sai kiểu và Invalid Date trong markOrderRestocked", () => {
      const order = createOrder({
        status: "cancelled",
        inventoryRestocked: false,
      });

      const withoutNote = markOrderRestocked(order, {
        now: TRANSITION_DATE,
        note: "   ",
      });
      expect(withoutNote.statusHistory?.at(-1)).not.toHaveProperty("note");

      const with200 = markOrderRestocked(order, {
        now: TRANSITION_DATE,
        note: "b".repeat(200),
      });
      expect(with200.statusHistory?.at(-1)?.note).toBe("b".repeat(200));

      const overErr = expectOrderError(
        () =>
          markOrderRestocked(order, {
            now: TRANSITION_DATE,
            note: "b".repeat(201),
          }),
        "VALIDATION_ERROR",
        400,
      );
      expect(overErr.details).toHaveProperty("note");

      const badTypeErr = expectOrderError(
        () =>
          markOrderRestocked(order, {
            now: TRANSITION_DATE,
            note: 42 as unknown as string,
          }),
        "VALIDATION_ERROR",
        400,
      );
      expect(badTypeErr.details).toHaveProperty("note");

      const invalidDateErr = expectOrderError(
        () =>
          markOrderRestocked(order, {
            now: new Date("invalid"),
          }),
        "VALIDATION_ERROR",
        400,
      );
      expect(invalidDateErr.details).toHaveProperty("now");
    });

    it("từ chối khi inventoryRestocked=true, undefined, hoặc status !== cancelled (idempotent) kèm details và thông báo phân biệt", () => {
      const alreadyRestocked = createOrder({
        status: "cancelled",
        inventoryRestocked: true,
      });
      const legacyCancelled = createOrder({
        status: "cancelled",
        statusHistory: undefined,
        inventoryRestocked: undefined,
      });

      const alreadyErr = expectOrderError(
        () => markOrderRestocked(alreadyRestocked),
        "INVALID_STATUS_TRANSITION",
        409,
      );
      expect(alreadyErr.details).toEqual({ status: "cancelled" });
      expect(alreadyErr.message).toContain("đã được hoàn kho");

      const legacyErr = expectOrderError(
        () => markOrderRestocked(legacyCancelled),
        "INVALID_STATUS_TRANSITION",
        409,
      );
      expect(legacyErr.details).toEqual({ status: "cancelled" });
      expect(legacyErr.message).toContain("lịch sử");

      for (const status of [
        "pending",
        "confirmed",
        "shipping",
        "delivered",
      ] as const) {
        const activeOrder = createOrder({ status, inventoryRestocked: false });
        const err = expectOrderError(
          () => markOrderRestocked(activeOrder),
          "INVALID_STATUS_TRANSITION",
          409,
        );
        expect(err.details).toEqual({ status });
      }
    });
  });

  describe("synthesizeStatusHistory", () => {
    it("trả về bản sao statusHistory nếu đơn hàng đã có lịch sử", () => {
      const order = createOrder({
        status: "confirmed",
        statusHistory: [
          {
            status: "pending",
            at: CREATED_AT,
            actor: "customer",
            action: "transition",
          },
          {
            status: "confirmed",
            at: UPDATED_AT,
            actor: "staff",
            action: "transition",
          },
        ],
      });

      const synthesized = synthesizeStatusHistory(order);
      expect(synthesized).toEqual(order.statusHistory);
      expect(synthesized).not.toBe(order.statusHistory);
      synthesized[0].note = "changed";
      expect(order.statusHistory?.[0].note).toBeUndefined();
    });

    it("chỉ trả về mốc pending (createdAt) cho đơn cũ ở trạng thái pending hoặc có statusHistory rỗng []", () => {
      for (const emptyHistory of [undefined, []]) {
        const legacyPending = createOrder({
          status: "pending",
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
          statusHistory: emptyHistory,
        });

        expect(synthesizeStatusHistory(legacyPending)).toEqual([
          {
            status: "pending",
            at: CREATED_AT,
            actor: "customer",
            action: "transition",
          },
        ]);
      }
    });

    it("chỉ trả về mốc pending (createdAt) và mốc hiện tại (updatedAt) cho đơn cũ ở confirmed/shipping/delivered/cancelled, không bịa bước giữa", () => {
      for (const status of ["confirmed", "shipping", "delivered"] as const) {
        const legacyStaffOrder = createOrder({
          status,
          createdAt: CREATED_AT,
          updatedAt: UPDATED_AT,
          statusHistory: undefined,
        });

        expect(synthesizeStatusHistory(legacyStaffOrder)).toEqual([
          {
            status: "pending",
            at: CREATED_AT,
            actor: "customer",
            action: "transition",
          },
          {
            status,
            at: UPDATED_AT,
            actor: "staff",
            action: "transition",
          },
        ]);
      }

      const legacyCancelled = createOrder({
        status: "cancelled",
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
        statusHistory: [],
      });

      expect(synthesizeStatusHistory(legacyCancelled)).toEqual([
        {
          status: "pending",
          at: CREATED_AT,
          actor: "customer",
          action: "transition",
        },
        {
          status: "cancelled",
          at: UPDATED_AT,
          actor: "customer",
          action: "transition",
        },
      ]);
    });
  });

  describe("tính bất biến (immutability)", () => {
    it("không đột biến đối tượng Order và mảng statusHistory đầu vào", () => {
      const originalHistory = [
        {
          status: "pending" as const,
          at: CREATED_AT,
          actor: "customer" as const,
          action: "transition" as const,
        },
      ];
      const original = createOrder({
        status: "pending",
        statusHistory: originalHistory,
      });
      const snapshot = structuredClone(original);

      const { order: confirmed } = transitionOrder(original, {
        to: "confirmed",
        actor: "staff",
        now: TRANSITION_DATE,
      });
      expect(original).toEqual(snapshot);
      expect(originalHistory).toHaveLength(1);
      expect(confirmed).not.toBe(original);
      expect(confirmed.statusHistory).not.toBe(original.statusHistory);

      const cancelledFromShipping = createOrder({
        status: "cancelled",
        inventoryRestocked: false,
      });
      const cancelledSnapshot = structuredClone(cancelledFromShipping);
      const restocked = markOrderRestocked(cancelledFromShipping, {
        now: TRANSITION_DATE,
        note: "Hoàn kho",
      });
      expect(cancelledFromShipping).toEqual(cancelledSnapshot);
      expect(restocked).not.toBe(cancelledFromShipping);
      expect(restocked.statusHistory).not.toBe(
        cancelledFromShipping.statusHistory,
      );
    });
  });

  describe("biên bổ sung sau code review 5.2", () => {
    it("từ chối now: null bằng VALIDATION_ERROR và chấp nhận note đúng 1 ký tự sau trim", () => {
      const order = createOrder({ status: "confirmed" });

      const nullDateErr = expectOrderError(
        () =>
          transitionOrder(order, {
            to: "cancelled",
            actor: "staff",
            note: "Hủy",
            now: null as unknown as Date,
          }),
        "VALIDATION_ERROR",
        400,
      );
      expect(nullDateErr.details).toHaveProperty("now");

      const { order: oneCharCancelled } = transitionOrder(order, {
        to: "cancelled",
        actor: "staff",
        note: "  a  ",
        now: TRANSITION_DATE,
      });
      expect(oneCharCancelled.statusHistory?.at(-1)?.note).toBe("a");
    });

    it("bảo toàn trường phụ discount/couponCode và không lỗi TypeError khi statusHistory không phải mảng", () => {
      const legacyWithDiscount = {
        ...createOrder({
          status: "pending",
          statusHistory: "corrupted" as unknown as Order["statusHistory"],
        }),
        discount: 50_000,
        couponCode: "GIAM50K",
      } as Order & { discount: number; couponCode: string };

      const { order: cancelled, shouldRestock } = transitionOrder(
        legacyWithDiscount,
        {
          to: "cancelled",
          actor: "customer",
          now: TRANSITION_DATE,
        },
      );

      expect(shouldRestock).toBe(false);
      expect(cancelled.inventoryRestocked).toBe(true);
      expect(cancelled).toMatchObject({
        discount: 50_000,
        couponCode: "GIAM50K",
      });
    });

    it("ngăn chặn gọi đúp tuần tự markOrderRestocked trên chính kết quả đã hoàn kho", () => {
      const cancelledFromShipping = createOrder({
        status: "cancelled",
        inventoryRestocked: false,
      });

      const once = markOrderRestocked(cancelledFromShipping, {
        now: TRANSITION_DATE,
        note: "Đã nhận hoàn kho",
      });
      expect(once.inventoryRestocked).toBe(true);

      const err = expectOrderError(
        () => markOrderRestocked(once, { now: TRANSITION_DATE }),
        "INVALID_STATUS_TRANSITION",
        409,
      );
      expect(err.details).toEqual({ status: "cancelled" });
    });
  });
});
