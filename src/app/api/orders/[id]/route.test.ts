// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderRepository } from "@/features/orders/order-repository";
import type { Order } from "@/features/orders/types";

const testState = vi.hoisted(() => ({
  repository: undefined as unknown as OrderRepository,
  nowMs: new Date("2026-11-21T08:00:00.000Z").getTime(),
}));

vi.mock("@/features/orders/server", async () => {
  const { createOrderService } =
    await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } =
    await import("@/features/orders/order-repository");

  testState.repository = createInMemoryOrderRepository();
  const proxyRepository: OrderRepository = {
    findAll: () => testState.repository.findAll(),
    findById: (id) => testState.repository.findById(id),
    save: (order) => testState.repository.save(order),
  };

  return {
    orderService: createOrderService({
      repository: proxyRepository,
      now: () => new Date(testState.nowMs),
    }),
  };
});

import { POST as createOrderPost } from "../route";
import { GET, PATCH } from "./route";

const validOrderPayload = {
  customer: {
    fullName: "Nguyễn Thị C",
    phone: "0912345678",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p006", quantity: 1 }],
};

async function createSampleOrder(): Promise<Order> {
  const response = await createOrderPost(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validOrderPayload),
    }),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as Order;
}

function getOrder(id: string) {
  return GET(new Request(`http://localhost/api/orders/${id}`), {
    params: Promise.resolve({ id }),
  });
}

function patchOrder(id: string, body: unknown, raw = false) {
  return PATCH(
    new Request(`http://localhost/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: raw ? String(body) : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("GET & PATCH /api/orders/:id", () => {
  beforeEach(async () => {
    const { createInMemoryOrderRepository } =
      await import("@/features/orders/order-repository");
    testState.repository = createInMemoryOrderRepository();
    testState.nowMs = new Date("2026-11-21T08:00:00.000Z").getTime();
  });

  describe("GET /api/orders/:id", () => {
    it("200 - trả về chi tiết đơn hàng gồm statusHistory khởi tạo", async () => {
      const created = await createSampleOrder();
      const response = await getOrder(created.id);

      expect(response.status).toBe(200);
      const order = (await response.json()) as Order;
      expect(order.id).toBe(created.id);
      expect(order.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
      ]);
    });

    it("404 - trả ORDER_NOT_FOUND khi :id không tồn tại", async () => {
      const response = await getOrder("SL-KHONG-CO");
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("ORDER_NOT_FOUND");
    });
  });

  describe("PATCH /api/orders/:id", () => {
    it("200 - khách hủy đơn pending mới: nối event actor customer và đặt inventoryRestocked = true", async () => {
      const created = await createSampleOrder();
      testState.nowMs += 60_000;

      const response = await patchOrder(created.id, { status: "cancelled" });
      expect(response.status).toBe(200);

      const cancelled = (await response.json()) as Order;
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.updatedAt).toBe(new Date(testState.nowMs).toISOString());
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
          at: new Date(testState.nowMs).toISOString(),
          actor: "customer",
          action: "transition",
        },
      ]);
    });

    it("200 - khách hủy đơn cũ thiếu statusHistory: tổng hợp lịch sử và đặt inventoryRestocked = true", async () => {
      const created = await createSampleOrder();
      const legacyOrder: Order = { ...created };
      delete legacyOrder.statusHistory;
      await testState.repository.save(legacyOrder);

      testState.nowMs += 120_000;
      const response = await patchOrder(created.id, { status: "cancelled" });
      expect(response.status).toBe(200);

      const cancelled = (await response.json()) as Order;
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
          at: new Date(testState.nowMs).toISOString(),
          actor: "customer",
          action: "transition",
        },
      ]);
    });

    it("không lưu note do khách hàng gửi kèm (kể cả sai kiểu hoặc > 200 ký tự) khi hủy qua PATCH /api/orders/:id", async () => {
      for (const note of ["Khách tự ghi chú", 123, null, "a".repeat(201)]) {
        const created = await createSampleOrder();
        const response = await patchOrder(created.id, {
          status: "cancelled",
          note,
        });

        expect(response.status).toBe(200);
        const cancelled = (await response.json()) as Order;
        expect(cancelled.status).toBe("cancelled");
        expect(cancelled.statusHistory?.at(-1)).not.toHaveProperty("note");
      }
    });

    it("400 - từ chối body không phải JSON, không phải object (null/[]), hoặc status khác cancelled", async () => {
      const created = await createSampleOrder();

      for (const [body, raw] of [
        ["{oops", true],
        ["", true],
        [null, false],
        [[], false],
        [{}, false],
        [{ status: "confirmed" }, false],
        [{ status: "delivered" }, false],
      ] as const) {
        const response = await patchOrder(created.id, body, raw);
        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
      }

      expect((await testState.repository.findById(created.id))?.status).toBe(
        "pending",
      );
    });

    it("404 - trả ORDER_NOT_FOUND khi :id không tồn tại", async () => {
      const response = await patchOrder("SL-KHONG-CO", { status: "cancelled" });
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("ORDER_NOT_FOUND");
    });

    it("409 - trả INVALID_STATUS_TRANSITION khi đơn không ở trạng thái pending", async () => {
      for (const status of [
        "confirmed",
        "shipping",
        "delivered",
        "cancelled",
      ] as const) {
        const created = await createSampleOrder();
        await testState.repository.save({ ...created, status });

        const response = await patchOrder(created.id, { status: "cancelled" });
        expect(response.status).toBe(409);
        expect((await response.json()).error.code).toBe(
          "INVALID_STATUS_TRANSITION",
        );
        expect((await testState.repository.findById(created.id))?.status).toBe(
          status,
        );
      }
    });
  });
});
