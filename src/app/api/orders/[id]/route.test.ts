// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/features/orders/types";
import { POST } from "../route";
import { PATCH } from "./route";

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ; giữ repository để dựng dữ liệu.
const { repository } = vi.hoisted(() => ({
  repository: {} as import("@/features/orders/order-repository").OrderRepository,
}));

vi.mock("@/features/orders/server", async () => {
  const { createOrderService } = await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } = await import("@/features/orders/order-repository");
  Object.assign(repository, createInMemoryOrderRepository());
  let sequence = 0;
  return {
    orderService: createOrderService({
      repository,
      now: () => new Date("2026-10-21T08:00:00.000Z"),
      generateId: () => `SL-20261021-${String(++sequence).padStart(6, "0")}`,
    }),
  };
});

const validBody = {
  customer: { fullName: "Phạm Minh D", phone: "0356789012", address: "99 Hai Bà Trưng, Huế" },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p006", quantity: 1 }],
};

async function placeOrder(): Promise<Order> {
  const response = await POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    }),
  );
  return response.json();
}

const patchOrder = (id: string, body: unknown) =>
  PATCH(
    new Request(`http://localhost/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

describe("PATCH /api/orders/:id", () => {
  it("200 - hủy đơn đang chờ xác nhận", async () => {
    const order = await placeOrder();

    const response = await patchOrder(order.id, { status: "cancelled" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: order.id, status: "cancelled" });
  });

  it("400 - chỉ nhận status cancelled, đơn giữ nguyên", async () => {
    const order = await placeOrder();

    const response = await patchOrder(order.id, { status: "confirmed" });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect((await repository.findById(order.id))?.status).toBe("pending");
  });

  it("400 - body không phải JSON", async () => {
    const order = await placeOrder();

    const response = await patchOrder(order.id, "{oops");

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("404 - mã đơn không tồn tại", async () => {
    const response = await patchOrder("SL-KHONG-CO", { status: "cancelled" });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("ORDER_NOT_FOUND");
  });

  it("409 - đơn đã hủy thì không hủy lại được", async () => {
    const order = await placeOrder();
    await patchOrder(order.id, { status: "cancelled" });

    const response = await patchOrder(order.id, { status: "cancelled" });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("409 - đơn đã xác nhận thì không hủy được", async () => {
    const order = await placeOrder();
    await repository.save({ ...order, status: "confirmed" });

    const response = await patchOrder(order.id, { status: "cancelled" });

    expect(response.status).toBe(409);
    expect((await repository.findById(order.id))?.status).toBe("confirmed");
  });
});
