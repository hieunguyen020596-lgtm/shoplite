import { beforeEach, describe, expect, it } from "vitest";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { OrderError } from "./order-errors";
import {
  createInMemoryOrderRepository,
  type OrderRepository,
} from "./order-repository";
import {
  createOrderService,
  generateOrderId,
  type OrderService,
} from "./order-service";

const FIXED_DATE = new Date("2026-10-21T03:00:00.000Z");

const validInput = (overrides: Record<string, unknown> = {}) => ({
  customer: {
    fullName: "Trần Thị B",
    phone: "0987654321",
    email: "",
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p010", quantity: 2 }], // Cáp USB-C 150.000đ
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

describe("orderService", () => {
  let repository: OrderRepository;
  let service: OrderService;

  beforeEach(() => {
    repository = createInMemoryOrderRepository();
    let counter = 0;
    service = createOrderService({
      repository,
      now: () => FIXED_DATE,
      generateId: () => `SL-TEST-${++counter}`,
    });
  });

  describe("placeOrder", () => {
    it("tạo đơn hàng với giá lấy từ catalog và lưu vào repository", async () => {
      const order = await service.placeOrder(validInput());

      expect(order).toMatchObject({
        id: "SL-TEST-1",
        status: "pending",
        createdAt: FIXED_DATE.toISOString(),
        subtotal: 300_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 330_000,
      });
      expect(order.items[0]).toMatchObject({
        productId: "p010",
        unitPrice: 150_000,
        lineTotal: 300_000,
      });
      expect(order.customer.email).toBeUndefined();
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("khởi tạo statusHistory gồm 1 mục pending với actor customer", async () => {
      const order = await service.placeOrder(validInput());

      expect(order.statusHistory).toEqual([
        {
          status: "pending",
          at: order.createdAt,
          actor: "customer",
          action: "transition",
        },
      ]);
      expect((await repository.findById(order.id))?.statusHistory).toEqual(
        order.statusHistory,
      );
    });

    it("bỏ qua giá do client gửi lên", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p010", quantity: 1, price: 1 }] }),
      );
      expect(order.items[0].unitPrice).toBe(150_000);
    });

    it("gộp các dòng trùng sản phẩm", async () => {
      const order = await service.placeOrder(
        validInput({
          items: [
            { productId: "p010", quantity: 1 },
            { productId: "p010", quantity: 2 },
          ],
        }),
      );
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(3);
    });

    it("miễn phí giao hàng tiêu chuẩn cho đơn từ 500.000đ", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p001", quantity: 1 }] }),
      );
      expect(order.shippingFee).toBe(0);
    });

    it("trả lỗi VALIDATION_ERROR kèm chi tiết từng field", async () => {
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

    it("trả lỗi PRODUCT_NOT_FOUND khi sản phẩm không tồn tại", async () => {
      await expectOrderError(
        service.placeOrder(
          validInput({ items: [{ productId: "p999", quantity: 1 }] }),
        ),
        "PRODUCT_NOT_FOUND",
      );
    });

    it("trả lỗi INSUFFICIENT_STOCK khi vượt tồn kho hoặc hết hàng", async () => {
      // Giá đỡ laptop (p011) chỉ còn 3 sản phẩm, micro (p004) đã hết hàng
      await expectOrderError(
        service.placeOrder(
          validInput({ items: [{ productId: "p011", quantity: 4 }] }),
        ),
        "INSUFFICIENT_STOCK",
      );
      await expectOrderError(
        service.placeOrder(
          validInput({ items: [{ productId: "p004", quantity: 1 }] }),
        ),
        "INSUFFICIENT_STOCK",
      );
    });
  });

  describe("listOrders / getOrder", () => {
    it("liệt kê đơn hàng mới nhất trước", async () => {
      let time = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date((time += 60_000)),
      });
      const first = await timedService.placeOrder(validInput());
      const second = await timedService.placeOrder(validInput());

      const orders = await timedService.listOrders();
      expect(orders.map((order) => order.id)).toEqual([second.id, first.id]);
    });

    it("trả lỗi ORDER_NOT_FOUND với mã đơn không tồn tại", async () => {
      await expectOrderError(
        service.getOrder("SL-KHONG-CO"),
        "ORDER_NOT_FOUND",
      );
    });
  });

  describe("cancelOrder", () => {
    it("hủy đơn đang chờ xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled.status).toBe("cancelled");
      expect((await service.getOrder(order.id)).status).toBe("cancelled");
    });

    it("không cho hủy đơn đã hủy hoặc đã xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      await repository.save({ ...order, status: "confirmed" });
      await expectOrderError(
        service.cancelOrder(order.id),
        "INVALID_STATUS_TRANSITION",
      );
    });

    it("ghi nhận statusHistory và đặt inventoryRestocked = true khi khách hủy đơn mới", async () => {
      let currentMs = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date(currentMs),
        generateId: () => "SL-CANCEL-NEW",
      });

      const created = await timedService.placeOrder(validInput());
      currentMs += 120_000;
      const cancelled = await timedService.cancelOrder(created.id);

      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.updatedAt).toBe(new Date(currentMs).toISOString());
      expect(cancelled.inventoryRestocked).toBe(true);
      expect(cancelled.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
        {
          status: "cancelled",
          at: new Date(currentMs).toISOString(),
          actor: "customer",
          action: "transition",
        },
      ]);
    });

    it("hỗ trợ khách hủy đơn cũ thiếu statusHistory: tổng hợp lịch sử và đặt inventoryRestocked = true", async () => {
      let currentMs = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date(currentMs),
        generateId: () => "SL-LEGACY-CANCEL",
      });

      const created = await timedService.placeOrder(validInput());
      const legacyOrder = { ...created };
      delete legacyOrder.statusHistory;
      await repository.save(legacyOrder);

      currentMs += 300_000;
      const cancelled = await timedService.cancelOrder(created.id);

      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.inventoryRestocked).toBe(true);
      expect(cancelled.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
        {
          status: "cancelled",
          at: new Date(currentMs).toISOString(),
          actor: "customer",
          action: "transition",
        },
      ]);
    });

    it("trả lỗi ORDER_NOT_FOUND khi hủy mã đơn không tồn tại", async () => {
      await expectOrderError(
        service.cancelOrder("SL-KHONG-CO"),
        "ORDER_NOT_FOUND",
      );
    });
  });

  describe("transitionOrderStatus", () => {
    it("chuyển tuần tự pending -> confirmed -> shipping (có note & expectedStatus) -> delivered và lưu đủ 4 mốc", async () => {
      let currentMs = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date(currentMs),
        generateId: () => "SL-FLOW-1",
      });

      const created = await timedService.placeOrder(validInput());

      currentMs += 60_000;
      const confirmed = await timedService.transitionOrderStatus(created.id, {
        status: "confirmed",
        actor: "staff",
      });
      expect(confirmed.status).toBe("confirmed");

      currentMs += 60_000;
      const shipping = await timedService.transitionOrderStatus(created.id, {
        status: "shipping",
        actor: "staff",
        note: "  Giao qua GHN - mã vận đơn 123  ",
        expectedStatus: "confirmed",
      });
      expect(shipping.status).toBe("shipping");

      currentMs += 60_000;
      const delivered = await timedService.transitionOrderStatus(created.id, {
        status: "delivered",
        actor: "staff",
        expectedStatus: "shipping",
      });
      expect(delivered.status).toBe("delivered");
      expect(delivered.updatedAt).toBe(new Date(currentMs).toISOString());
      expect(delivered.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
        {
          status: "confirmed",
          at: new Date(FIXED_DATE.getTime() + 60_000).toISOString(),
          actor: "staff",
          action: "transition",
        },
        {
          status: "shipping",
          at: new Date(FIXED_DATE.getTime() + 120_000).toISOString(),
          actor: "staff",
          action: "transition",
          note: "Giao qua GHN - mã vận đơn 123",
        },
        {
          status: "delivered",
          at: new Date(FIXED_DATE.getTime() + 180_000).toISOString(),
          actor: "staff",
          action: "transition",
        },
      ]);
      expect(await timedService.getOrder(created.id)).toEqual(delivered);
    });

    it("đặt inventoryRestocked = true khi staff hủy đơn pending/confirmed và false khi hủy từ shipping", async () => {
      const pendingOrder = await service.placeOrder(validInput());
      const cancelledPending = await service.transitionOrderStatus(
        pendingOrder.id,
        {
          status: "cancelled",
          actor: "staff",
          note: "  Khách yêu cầu hủy qua hotline ",
        },
      );
      expect(cancelledPending.inventoryRestocked).toBe(true);
      expect(cancelledPending.statusHistory?.at(-1)).toMatchObject({
        status: "cancelled",
        actor: "staff",
        action: "transition",
        note: "Khách yêu cầu hủy qua hotline",
      });

      const confirmedOrder = await service.placeOrder(validInput());
      await service.transitionOrderStatus(confirmedOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      const cancelledConfirmed = await service.transitionOrderStatus(
        confirmedOrder.id,
        {
          status: "cancelled",
          actor: "staff",
          note: "Hết hàng kiểm đếm",
        },
      );
      expect(cancelledConfirmed.inventoryRestocked).toBe(true);

      const shippingOrder = await service.placeOrder(validInput());
      await service.transitionOrderStatus(shippingOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await service.transitionOrderStatus(shippingOrder.id, {
        status: "shipping",
        actor: "staff",
      });
      const cancelledShipping = await service.transitionOrderStatus(
        shippingOrder.id,
        {
          status: "cancelled",
          actor: "staff",
          note: "Khách bom hàng",
        },
      );
      expect(cancelledShipping.inventoryRestocked).toBe(false);
    });

    it("đơn cũ thiếu statusHistory ở trạng thái shipping khi staff hủy vẫn đặt inventoryRestocked = true", async () => {
      const created = await service.placeOrder(validInput());
      const legacyShipping = { ...created, status: "shipping" as const };
      delete legacyShipping.statusHistory;
      await repository.save(legacyShipping);

      const cancelled = await service.transitionOrderStatus(created.id, {
        status: "cancelled",
        actor: "staff",
        note: "Đơn cũ thất lạc",
      });
      expect(cancelled.inventoryRestocked).toBe(true);
      expect(cancelled.statusHistory).toHaveLength(3);
      expect(cancelled.statusHistory?.at(-1)).toMatchObject({
        status: "cancelled",
        actor: "staff",
        note: "Đơn cũ thất lạc",
      });
    });

    it("ném INVALID_STATUS_TRANSITION và không ghi đè khi expectedStatus lệch hoặc sai ma trận", async () => {
      const created = await service.placeOrder(validInput());
      await service.transitionOrderStatus(created.id, {
        status: "confirmed",
        actor: "staff",
      });

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "shipping",
          actor: "staff",
          expectedStatus: "pending",
        }),
        "INVALID_STATUS_TRANSITION",
      );
      expect((await service.getOrder(created.id)).status).toBe("confirmed");

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "pending",
          actor: "staff",
        }),
        "INVALID_STATUS_TRANSITION",
      );
      expect((await service.getOrder(created.id)).status).toBe("confirmed");
    });

    it("ném VALIDATION_ERROR khi staff hủy thiếu/rỗng note hoặc note > 200 ký tự và giữ nguyên đơn", async () => {
      const created = await service.placeOrder(validInput());

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "cancelled",
          actor: "staff",
          note: "   ",
        }),
        "VALIDATION_ERROR",
      );

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "confirmed",
          actor: "staff",
          note: "a".repeat(201),
        }),
        "VALIDATION_ERROR",
      );

      expect((await service.getOrder(created.id)).status).toBe("pending");
    });

    it("ném ORDER_NOT_FOUND với mã đơn không tồn tại", async () => {
      await expectOrderError(
        service.transitionOrderStatus("SL-KHONG-CO", {
          status: "confirmed",
          actor: "staff",
        }),
        "ORDER_NOT_FOUND",
      );
    });
  });
});

describe("generateOrderId", () => {
  it("có dạng SL-YYYYMMDD-XXXXXX", () => {
    expect(generateOrderId(FIXED_DATE)).toMatch(/^SL-20261021-[0-9A-F]{6}$/);
  });
});
